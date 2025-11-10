import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

// Import cheerio - using default import for better Deno compatibility
// @deno-types="https://deno.land/x/types/cheerio/index.d.ts"
import { load } from 'https://esm.sh/cheerio@1.0.0-rc.12';

// Import XLSX - using namespace import
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'https://teorica.practicavial.com';

interface ScrapeRequest {
  username?: string;
  password?: string;
  cookies?: string;
  topics?: number[]; // Optional: specific topics to scrape, if not provided, scrape all
}

/**
 * Очищает и валидирует cookies, удаляя недопустимые символы и ненужные cookies
 */
function sanitizeCookies(cookieString: string): string {
  if (!cookieString || !cookieString.trim()) {
    return '';
  }

  // Разбиваем cookies на пары
  const cookiePairs = cookieString.split(';').map(c => c.trim()).filter(c => c);
  const validCookies: string[] = [];

  // Список важных cookies для авторизации (не включаем аналитические)
  const importantCookieNames = [
    'practica_session',
    'PHPSESSID',
    'XSRF-TOKEN',
    'practicavialwp_logged_in',
    'wfwaf-authcookie',
    'wordpress_sec',
    'wordpress_logged_in',
    'laravel_session',
    'session',
  ];

  for (const cookie of cookiePairs) {
    const equalIndex = cookie.indexOf('=');
    if (equalIndex === -1) continue;

    const name = cookie.substring(0, equalIndex).trim();
    const value = cookie.substring(equalIndex + 1).trim();

    // Пропускаем пустые значения
    if (!name || !value) continue;

    // Проверяем, является ли cookie важной для авторизации
    const isImportant = importantCookieNames.some(importantName => 
      name.toLowerCase().includes(importantName.toLowerCase())
    );

    // Пропускаем аналитические cookies (Google Analytics, etc)
    if (!isImportant && (
      name.startsWith('_ga') ||
      name.startsWith('_gid') ||
      name.startsWith('_gcl') ||
      name.startsWith('_dc_gtm') ||
      name.startsWith('__') ||
      name.includes('analytics') ||
      name.includes('tracking')
    )) {
      continue;
    }

    // Очищаем значение от недопустимых символов для HTTP заголовков
    // Удаляем управляющие символы, но оставляем обычные символы включая $, %, &
    // Проблема может быть в переносах строк или других управляющих символах
    let cleanValue = value
      .replace(/[\r\n\t]/g, '') // Удаляем переносы строк и табуляции
      .replace(/[\x00-\x1F\x7F]/g, ''); // Удаляем управляющие символы

    // Проверяем, что значение не пустое после очистки
    if (cleanValue.length > 0) {
      validCookies.push(`${name}=${cleanValue}`);
    }
  }

  const result = validCookies.join('; ');
  console.log('[sanitizeCookies] Original cookies count:', cookiePairs.length);
  console.log('[sanitizeCookies] Valid cookies count:', validCookies.length);
  console.log('[sanitizeCookies] Valid cookie names:', validCookies.map(c => c.split('=')[0]).join(', '));
  
  return result;
}

interface Topic {
  number: number;
  title: string;
  testLinks: TestLink[];
}

interface TestLink {
  url: string;
  testNumber: string;
  isFree: boolean;
}

interface Question {
  source_id: string;
  topic_number: number;
  topic_id?: string;
  test_number: string;
  question_number: number;
  question_es: string;
  image_url?: string;
  explanation_es?: string;
  answers: Answer[];
  is_premium: boolean;
}

interface Answer {
  text_es: string;
  is_correct: boolean;
  position: number;
}

serve(async (req) => {
  console.log('[scrape-practicavial] Request received:', {
    method: req.method,
    url: req.url,
    hasAuth: !!req.headers.get('Authorization'),
  });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[scrape-practicavial] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated client
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify user authentication
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error('[scrape-practicavial] Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: isAdmin, error: roleError } = await supabaseAuth.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[scrape-practicavial] Admin user verified:', user.email);

    // Parse request body
    let requestData: ScrapeRequest;
    try {
      const bodyText = await req.text();
      if (!bodyText) {
        throw new Error('Empty request body');
      }
      requestData = JSON.parse(bodyText);
    } catch (error) {
      console.error('[scrape-practicavial] Error parsing request body:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid request body', details: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { username, password, cookies, topics } = requestData;

    // Validate input - either cookies or username/password must be provided
    if (!cookies && (!username || !password)) {
      console.error('[scrape-practicavial] Missing cookies or username/password');
      return new Response(
        JSON.stringify({ error: 'Either cookies or username and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[scrape-practicavial] Starting scrape for topics:', topics || 'all');

    // Create service role client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get topics map from database
    const { data: dbTopics } = await supabase
      .from('topics')
      .select('id, number');
    
    const topicMap = new Map(dbTopics?.map(t => [t.number, t.id]) || []);

    // Step 1: Get session cookies - either from user or authenticate
    let session: string;
    
    if (cookies) {
      // Use provided cookies from browser
      console.log('[scrape-practicavial] Using provided cookies from browser...');
      console.log('[scrape-practicavial] Raw cookies length:', cookies.length);
      
      // Очищаем и валидируем cookies
      session = sanitizeCookies(cookies);
      
      if (!session || session.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Ошибка: Не удалось извлечь валидные cookies',
            details: 'Пожалуйста, убедитесь, что вы скопировали cookies с сайта teorica.practicavial.com после авторизации. Важны cookies: practica_session, PHPSESSID, XSRF-TOKEN и другие связанные с сессией.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[scrape-practicavial] Sanitized cookies length:', session.length);
      
      // Verify cookies by accessing a protected page
      console.log('[scrape-practicavial] Verifying cookies...');
      
      let testResponse;
      try {
        testResponse = await fetch(`${BASE_URL}/permiso/b/tests/tema/all`, {
          method: 'GET',
          headers: {
            'Cookie': session,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          },
        });
      } catch (error) {
        console.error('[scrape-practicavial] Error making verification request:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Ошибка при проверке cookies',
            details: error instanceof Error ? error.message : 'Неизвестная ошибка при отправке запроса с cookies. Возможно, cookies содержат недопустимые символы.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!testResponse.ok) {
        console.error('[scrape-practicavial] Cookies verification failed, status:', testResponse.status);
        const testHtml = await testResponse.text();
        const isLoginPage = testHtml.includes('login') || testHtml.includes('Iniciar sesión');
        
        if (isLoginPage) {
          return new Response(
            JSON.stringify({ 
              error: 'Ошибка: Cookies недействительны или сессия истекла',
              details: 'Пожалуйста, обновите cookies. Убедитесь, что вы авторизованы на сайте PracticaVial и скопировали актуальные cookies.'
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        console.log('[scrape-practicavial] Cookies verified successfully');
      }
    } else {
      // Authenticate using username/password
      console.log('[scrape-practicavial] Authenticating on PracticaVial...');
      session = await authenticatePracticaVial(username, password);
      
      if (!session) {
        return new Response(
          JSON.stringify({ 
            error: 'Ошибка аутентификации',
            details: 'Не удалось авторизоваться на PracticaVial. Проверьте логин и пароль, или используйте cookies из браузера.'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[scrape-practicavial] Authentication successful');
    }

    // Step 2: Get list of topics and tests
    console.log('Fetching topics and tests...');
    const topicsList = await fetchTopicsAndTests(session);
    
    // Filter topics if specific topics are requested
    const topicsToScrape = topics 
      ? topicsList.filter(t => topics.includes(t.number))
      : topicsList;

    console.log(`Found ${topicsToScrape.length} topics to scrape`);

    // Step 3: Scrape questions from each test
    const allQuestions: Question[] = [];
    const scrapeResults = {
      topicsProcessed: 0,
      testsProcessed: 0,
      questionsProcessed: 0,
      questionsByTopic: {} as Record<number, number>,
      errors: [] as string[],
    };

    for (const topic of topicsToScrape) {
      console.log(`Processing Topic ${topic.number}: ${topic.title}`);
      const topicId = topicMap.get(topic.number);
      
      if (!topicId) {
        scrapeResults.errors.push(`Topic ${topic.number} not found in database`);
        console.warn(`Topic ${topic.number} not found in database, skipping...`);
        continue;
      }

      let topicQuestionsCount = 0;

      for (const testLink of topic.testLinks) {
        try {
          console.log(`  Scraping test ${testLink.testNumber}...`);
          const testQuestions = await scrapeTest(session, testLink.url, topic.number, testLink.testNumber, testLink.isFree);
          
          for (const question of testQuestions) {
            question.topic_id = topicId;
            allQuestions.push(question);
            topicQuestionsCount++;
            scrapeResults.questionsProcessed++;
          }
          
          scrapeResults.testsProcessed++;
        } catch (error) {
          const errorMsg = `Error scraping test ${testLink.testNumber} in topic ${topic.number}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          scrapeResults.errors.push(errorMsg);
        }
      }

      scrapeResults.questionsByTopic[topic.number] = topicQuestionsCount;
      scrapeResults.topicsProcessed++;
    }

    // Step 4: Save questions to database
    console.log(`Saving ${allQuestions.length} questions to database...`);
    const saveResults = await saveQuestionsToDatabase(supabase, allQuestions);
    
    // Step 5: Generate Excel file
    console.log('Generating Excel file...');
    const excelFile = await generateExcelFile(allQuestions, scrapeResults);

    // Step 6: Upload Excel to Supabase Storage or return as base64
    const excelBase64 = excelFile;

    const result = {
      success: true,
      ...scrapeResults,
      ...saveResults,
      excelFile: excelBase64, // Base64 encoded Excel file
      timestamp: new Date().toISOString(),
    };

    console.log('Scraping completed:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[scrape-practicavial] Unexpected error:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Check if it's an authentication error
    if (errorMessage.includes('login') || errorMessage.includes('authentication') || errorMessage.includes('Login failed')) {
      return new Response(
        JSON.stringify({ 
          error: 'Ошибка аутентификации на PracticaVial',
          details: `Не удалось войти на сайт PracticaVial. Проверьте правильность логина и пароля. Детали: ${errorMessage}`,
          timestamp: new Date().toISOString()
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorStack ? errorStack.substring(0, 500) : undefined,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Authenticate on PracticaVial and return session cookies
async function authenticatePracticaVial(username: string, password: string): Promise<string | null> {
  try {
    console.log('[authenticatePracticaVial] Starting authentication...');
    console.log('[authenticatePracticaVial] Login URL:', `${BASE_URL}/login`);
    
    // First, get the login page to get CSRF token and session
    const loginPageResponse = await fetch(`${BASE_URL}/login`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });

    console.log('[authenticatePracticaVial] Login page response status:', loginPageResponse.status);
    
    if (!loginPageResponse.ok) {
      console.error('[authenticatePracticaVial] Failed to fetch login page:', loginPageResponse.status, loginPageResponse.statusText);
      const errorText = await loginPageResponse.text();
      console.error('[authenticatePracticaVial] Error response:', errorText.substring(0, 500));
      return null;
    }

    // Extract all cookies from response - handle multiple Set-Cookie headers
    const setCookieHeaders = loginPageResponse.headers.get('set-cookie');
    const cookies: string[] = [];
    
    if (setCookieHeaders) {
      // Parse Set-Cookie headers - they can be comma-separated or in array
      // Note: Multiple Set-Cookie headers might be returned as array
      const cookieHeaderArray = Array.isArray(setCookieHeaders) 
        ? setCookieHeaders 
        : setCookieHeaders.split(',').map(c => c.trim());
      
      for (const cookieStr of cookieHeaderArray) {
        // Extract cookie name and value (before first semicolon)
        const match = cookieStr.match(/^([^=]+)=([^;]+)/);
        if (match) {
          cookies.push(`${match[1]}=${match[2]}`);
        }
      }
    }
    
    const cookieString = cookies.join('; ');
    console.log('[authenticatePracticaVial] Initial cookies:', cookieString ? 'Found' : 'None');
    
    const loginPageHtml = await loginPageResponse.text();
    console.log('[authenticatePracticaVial] Login page HTML length:', loginPageHtml.length);
    
    const $ = load(loginPageHtml);
    
    // Try to find login form - exclude registration forms
    const allForms = $('form');
    let loginForm = $();
    
    // First, try to find form with login-specific attributes
    allForms.each((_, form) => {
      const $form = $(form);
      const action = $form.attr('action') || '';
      const method = $form.attr('method') || 'get';
      const id = $form.attr('id') || '';
      const className = $form.attr('class') || '';
      const formText = $form.text().toLowerCase();
      
      // Skip registration forms
      if (action.includes('register') || 
          id.includes('register') || 
          className.includes('register') ||
          formText.includes('registr') ||
          $form.find('input[name*="register"]').length > 0) {
        return;
      }
      
      // Look for login forms
      if (action.includes('login') || 
          id.includes('login') || 
          className.includes('login') ||
          (method.toLowerCase() === 'post' && !action.includes('register'))) {
        loginForm = $form;
        return false; // Break loop
      }
    });
    
    // If no specific login form found, use first POST form that's not registration
    if (loginForm.length === 0) {
      allForms.each((_, form) => {
        const $form = $(form);
        const action = $form.attr('action') || '';
        const method = $form.attr('method') || 'get';
        
        // Skip registration
        if (action.includes('register') || $form.find('input[name*="register"]').length > 0) {
          return;
        }
        
        // Use POST form
        if (method.toLowerCase() === 'post') {
          loginForm = $form;
          return false;
        }
      });
    }
    
    if (loginForm.length === 0) {
      console.warn('[authenticatePracticaVial] No login form found, will try to find inputs directly');
    } else {
      console.log('[authenticatePracticaVial] Login form found:', {
        action: loginForm.attr('action'),
        method: loginForm.attr('method'),
        id: loginForm.attr('id'),
      });
    }
    
    // Try to find CSRF token if present (common in Laravel/PHP apps)
    let csrfToken = '';
    if (loginForm.length > 0) {
      csrfToken = loginForm.find('input[name="_token"]').val() as string || '';
    }
    if (!csrfToken) {
      csrfToken = $('input[name="_token"]').not('[name*="register"]').val() as string || '';
    }
    if (!csrfToken) {
      csrfToken = $('meta[name="csrf-token"]').attr('content') || '';
    }
    if (!csrfToken) {
      csrfToken = $('input[name="csrf_token"]').val() as string || '';
    }
    if (!csrfToken) {
      csrfToken = $('input[type="hidden"][name*="token"]').not('[name*="register"]').val() as string || '';
    }
    
    console.log('[authenticatePracticaVial] CSRF token:', csrfToken ? 'Found' : 'Not found');
    
    // Prepare form data - check what fields the form actually uses
    const formData = new URLSearchParams();
    
    // Find username field - exclude registration fields
    let usernameInput = $();
    if (loginForm.length > 0) {
      usernameInput = loginForm.find('input[name="username"], input[name="user"], input[name="email"]')
        .not('[name*="register"]')
        .first();
    }
    if (usernameInput.length === 0) {
      // Look for text inputs that are not registration fields
      usernameInput = $('input[type="text"]:not([name*="register"]), input[type="email"]:not([name*="register"])')
        .filter((_, input) => {
          const name = $(input).attr('name') || '';
          const placeholder = $(input).attr('placeholder') || '';
          return name.includes('user') || 
                 name.includes('email') || 
                 name.includes('login') ||
                 placeholder.toLowerCase().includes('usuario') ||
                 placeholder.toLowerCase().includes('email');
        })
        .first();
    }
    
    // Find password field
    let passwordInput = $();
    if (loginForm.length > 0) {
      passwordInput = loginForm.find('input[type="password"]').first();
    }
    if (passwordInput.length === 0) {
      passwordInput = $('input[type="password"]:not([name*="register"])').first();
    }
    
    const usernameField = usernameInput.attr('name') || 'username';
    const passwordField = passwordInput.attr('name') || 'password';
    
    console.log('[authenticatePracticaVial] Form fields - username:', usernameField, 'password:', passwordField);
    console.log('[authenticatePracticaVial] Username input found:', usernameInput.length > 0);
    console.log('[authenticatePracticaVial] Password input found:', passwordInput.length > 0);
    
    // Validate that we're not using registration fields
    if (usernameField.includes('register')) {
      console.error('[authenticatePracticaVial] ERROR: Found registration field instead of login field!');
      console.error('[authenticatePracticaVial] Trying alternative approach...');
      
      // Try to find login-specific inputs by placeholder or label
      const loginInputs = $('input').filter((_, input) => {
        const $input = $(input);
        const placeholder = ($input.attr('placeholder') || '').toLowerCase();
        const name = ($input.attr('name') || '').toLowerCase();
        const id = ($input.attr('id') || '').toLowerCase();
        
        return (placeholder.includes('usuario') || 
                placeholder.includes('email') ||
                placeholder.includes('login')) &&
               !name.includes('register') &&
               !id.includes('register') &&
               ($input.attr('type') === 'text' || $input.attr('type') === 'email');
      });
      
      if (loginInputs.length > 0) {
        const loginInput = $(loginInputs[0]);
        const loginFieldName = loginInput.attr('name') || 'username';
        console.log('[authenticatePracticaVial] Using alternative login field:', loginFieldName);
        formData.append(loginFieldName, username);
      } else {
        // Last resort: use common login field names
        console.log('[authenticatePracticaVial] Using default login fields');
        formData.append('username', username);
        formData.append('email', username);
      }
    } else {
      // Use the field names found in the form
      formData.append(usernameField, username);
      formData.append(passwordField, password);
    }
    
    // Always add password if we found it
    if (passwordInput.length > 0 && !formData.has(passwordField)) {
      formData.append(passwordField, password);
    }
    
    if (csrfToken) {
      formData.append('_token', csrfToken);
    }
    
    // Check form action URL
    let formAction = '/login';
    if (loginForm.length > 0) {
      formAction = loginForm.attr('action') || '/login';
    }
    
    // If action is empty or just '#', use /login
    if (!formAction || formAction === '#' || formAction === '') {
      formAction = '/login';
    }
    
    const loginUrl = formAction.startsWith('http') 
      ? formAction 
      : `${BASE_URL}${formAction.startsWith('/') ? '' : '/'}${formAction}`;
    
    console.log('[authenticatePracticaVial] Form action URL:', loginUrl);
    console.log('[authenticatePracticaVial] Form data keys:', Array.from(formData.keys()));
    console.log('[authenticatePracticaVial] Form data (without password):', 
      Array.from(formData.entries())
        .filter(([key]) => key !== 'password')
        .map(([key, value]) => `${key}=${value.substring(0, 10)}...`)
        .join(', '));

    // Submit login form - try both JSON and form-data approaches
    console.log('[authenticatePracticaVial] Submitting login form...');
    
    // Prepare JSON payload (since form uses AJAX)
    const loginPayload = {
      login_username: username,
      login_password: password,
      _token: csrfToken,
    };
    
    // Try different endpoints and formats
    // Based on HTML, the form uses data-url="https://teorica.practicavial.com/login"
    // But there's also a register-popup endpoint, so maybe there's a login-popup too
    
    let loginResponse: Response | null = null;
    let lastError: string = '';
    
    // Strategy 1: Try /login with form-data (standard form submission)
    console.log('[authenticatePracticaVial] Trying form-data to /login...');
    try {
      loginResponse = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookieString,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Referer': `${BASE_URL}/login`,
          'Origin': BASE_URL,
        },
        body: formData.toString(),
        redirect: 'manual',
      });
      
      if (loginResponse.status === 200 || loginResponse.status === 302 || loginResponse.status === 301) {
        console.log('[authenticatePracticaVial] Form-data to /login succeeded');
      } else {
        console.log('[authenticatePracticaVial] Form-data to /login failed with status:', loginResponse.status);
        lastError = `Form-data /login: ${loginResponse.status}`;
      }
    } catch (e) {
      console.error('[authenticatePracticaVial] Form-data /login error:', e);
      lastError = `Form-data /login error: ${e instanceof Error ? e.message : 'Unknown'}`;
    }
    
    // Strategy 2: If form-data failed, try JSON to /login
    if (!loginResponse || (loginResponse.status !== 200 && loginResponse.status !== 302 && loginResponse.status !== 301)) {
      console.log('[authenticatePracticaVial] Trying JSON to /login...');
      try {
        loginResponse = await fetch(`${BASE_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieString,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Referer': `${BASE_URL}/login`,
            'Origin': BASE_URL,
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify(loginPayload),
          redirect: 'manual',
        });
        
        if (loginResponse.status === 200 || loginResponse.status === 302 || loginResponse.status === 301) {
          console.log('[authenticatePracticaVial] JSON to /login succeeded');
        } else {
          console.log('[authenticatePracticaVial] JSON to /login failed with status:', loginResponse.status);
          lastError += ` | JSON /login: ${loginResponse.status}`;
        }
      } catch (e) {
        console.error('[authenticatePracticaVial] JSON /login error:', e);
        lastError += ` | JSON /login error: ${e instanceof Error ? e.message : 'Unknown'}`;
      }
    }
    
    // Strategy 3: Try /login-popup endpoint (like register-popup)
    if (!loginResponse || (loginResponse.status !== 200 && loginResponse.status !== 302 && loginResponse.status !== 301)) {
      console.log('[authenticatePracticaVial] Trying form-data to /login-popup...');
      try {
        loginResponse = await fetch(`${BASE_URL}/login-popup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookieString,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/html, */*',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Referer': `${BASE_URL}/login`,
            'Origin': BASE_URL,
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: formData.toString(),
          redirect: 'manual',
        });
        
        if (loginResponse.status === 200 || loginResponse.status === 302 || loginResponse.status === 301) {
          console.log('[authenticatePracticaVial] Form-data to /login-popup succeeded');
        } else {
          console.log('[authenticatePracticaVial] Form-data to /login-popup failed with status:', loginResponse.status);
          lastError += ` | Form-data /login-popup: ${loginResponse.status}`;
        }
      } catch (e) {
        console.error('[authenticatePracticaVial] Form-data /login-popup error:', e);
        lastError += ` | Form-data /login-popup error: ${e instanceof Error ? e.message : 'Unknown'}`;
      }
    }
    
    if (!loginResponse) {
      console.error('[authenticatePracticaVial] All login attempts failed');
      throw new Error(`All login attempts failed. Last errors: ${lastError}`);
    }
    
    console.log('[authenticatePracticaVial] Login response status:', loginResponse.status);
    console.log('[authenticatePracticaVial] Login response headers:', {
      location: loginResponse.headers.get('location'),
      setCookie: loginResponse.headers.get('set-cookie') ? 'Present' : 'None',
    });

    // Get updated cookies from login response
    const loginSetCookie = loginResponse.headers.get('set-cookie');
    let finalCookies = cookieString;
    
    if (loginSetCookie) {
      const newCookies: string[] = cookies;
      const newCookieStrings = loginSetCookie.split(',').map(c => c.trim());
      for (const cookieStr of newCookieStrings) {
        const match = cookieStr.match(/^([^=]+)=([^;]+)/);
        if (match) {
          const cookieName = match[1];
          const cookieValue = match[2];
          // Update or add cookie
          const index = newCookies.findIndex(c => c.startsWith(`${cookieName}=`));
          if (index >= 0) {
            newCookies[index] = `${cookieName}=${cookieValue}`;
          } else {
            newCookies.push(`${cookieName}=${cookieValue}`);
          }
        }
      }
      finalCookies = newCookies.join('; ');
    }
    
    // Check if login was successful
    // Usually returns 302 redirect or 200 with success message
    if (loginResponse.status === 200 || loginResponse.status === 302 || loginResponse.status === 301) {
      console.log('[authenticatePracticaVial] Login response suggests success, verifying...');
      
      // Check location header for redirect
      const location = loginResponse.headers.get('location');
      if (location) {
        console.log('[authenticatePracticaVial] Redirect location:', location);
      }
      
      // Verify by accessing a protected page
      const testResponse = await fetch(`${BASE_URL}/permiso/b/tests/tema/all`, {
        method: 'GET',
        headers: {
          'Cookie': finalCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Referer': `${BASE_URL}/login`,
        },
      });

      console.log('[authenticatePracticaVial] Test page response status:', testResponse.status);
      
      if (testResponse.ok) {
        const testHtml = await testResponse.text();
        // Check if we're still on login page (login failed)
        const isLoginPage = testHtml.includes('login') || 
                           testHtml.includes('Iniciar sesión') || 
                           testHtml.includes('Usuario y/o password incorrecto') ||
                           testHtml.toLowerCase().includes('incorrecto');
        
        if (!isLoginPage) {
          console.log('[authenticatePracticaVial] Authentication successful - accessed protected page');
          return finalCookies;
        } else {
          console.error('[authenticatePracticaVial] Still on login page - authentication failed');
          // Try to extract error message
          const $test = load(testHtml);
          const errorMsg = $test('.error, .alert-danger, [class*="error"], #error-login-message').text().trim();
          const errorText = errorMsg || 'Usuario y/o password incorrecto';
          console.error('[authenticatePracticaVial] Error message:', errorText);
          throw new Error(`Login failed: ${errorText}`);
        }
      } else {
        console.error('[authenticatePracticaVial] Failed to access protected page:', testResponse.status);
        throw new Error(`Failed to access protected page after login. Status: ${testResponse.status}`);
      }
    } else {
      // Get response body to see error message
      let responseText = '';
      try {
        responseText = await loginResponse.text();
      } catch (e) {
        console.error('[authenticatePracticaVial] Could not read response body:', e);
      }
      
      console.error('[authenticatePracticaVial] Login failed, status:', loginResponse.status);
      console.error('[authenticatePracticaVial] Response headers:', {
        'content-type': loginResponse.headers.get('content-type'),
        'content-length': loginResponse.headers.get('content-length'),
        location: loginResponse.headers.get('location'),
      });
      
      let errorDetails = `HTTP ${loginResponse.status}`;
      
      if (responseText) {
        console.error('[authenticatePracticaVial] Response body length:', responseText.length);
        console.error('[authenticatePracticaVial] Response body (first 1000 chars):', responseText.substring(0, 1000));
        
        // Try to parse JSON response first
        try {
          const jsonResponse = JSON.parse(responseText);
          if (jsonResponse.error || jsonResponse.message) {
            errorDetails = jsonResponse.error || jsonResponse.message || errorDetails;
            console.error('[authenticatePracticaVial] JSON error:', errorDetails);
          } else if (Array.isArray(jsonResponse) && jsonResponse.length === 0) {
            errorDetails = 'Empty response from server. Possible validation error.';
          }
        } catch (e) {
          // Not JSON, try HTML
          try {
            const $error = load(responseText);
            const errorMsg = $error('.error, .alert-danger, .alert, [class*="error"], [class*="alert"], #error-login-message').text().trim();
            if (errorMsg) {
              errorDetails = errorMsg.substring(0, 200);
              console.error('[authenticatePracticaVial] Error message from page:', errorDetails);
            }
            
            // Check if we're redirected to login page with error
            const hasLoginError = responseText.includes('Usuario y/o password incorrecto') ||
                                 responseText.includes('incorrecto') ||
                                 responseText.includes('error');
            if (hasLoginError) {
              console.error('[authenticatePracticaVial] Page contains login error message');
              errorDetails = 'Usuario y/o password incorrecto';
            }
          } catch (e) {
            console.error('[authenticatePracticaVial] Could not parse response:', e);
          }
        }
      } else {
        console.error('[authenticatePracticaVial] Response body is empty or could not be read');
        errorDetails = 'Empty response from server';
      }
      
      throw new Error(`Login failed: ${errorDetails}. Status: ${loginResponse.status}`);
    }
    
    // Should not reach here, but just in case
    throw new Error('Login failed: Unknown error');
  } catch (error) {
    console.error('[authenticatePracticaVial] Authentication error:', error);
    // Re-throw the error so it can be caught by the main handler
    throw error;
  }
}

// Fetch topics and tests from the main page
async function fetchTopicsAndTests(sessionCookies: string): Promise<Topic[]> {
  try {
    const response = await fetch(`${BASE_URL}/permiso/b/tests/tema/all`, {
      method: 'GET',
      headers: {
        'Cookie': sessionCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Referer': `${BASE_URL}/`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch topics page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = load(html);
    
    const topics: Topic[] = [];
    
    // Multiple strategies for finding topics
    // Strategy 1: Look for heading elements with "Tema X:" pattern
    const headings = $('h1, h2, h3, h4, h5, h6, .topic-title, [class*="topic"]');
    
    headings.each((_, element) => {
      const $heading = $(element);
      const text = $heading.text().trim();
      const temaMatch = text.match(/Tema\s+(\d+)[:\.]\s*(.+)/i);
      
      if (temaMatch) {
        const topicNumber = parseInt(temaMatch[1]);
        const topicTitle = temaMatch[2].trim();
        
        const testLinks: TestLink[] = [];
        
        // Find test links - multiple strategies
        // Strategy 1: Look in next siblings until next topic
        let $current = $heading.next();
        while ($current.length && !$current.is('h1, h2, h3, h4, h5, h6')) {
          $current.find('a').each((_, link) => {
            const $link = $(link);
            const linkText = $link.text().trim();
            const href = $link.attr('href');
            
            // Match patterns like "Test Tema 1 Nº: 001" or "Test Tema 1  Nº: 001"
            const testMatch = linkText.match(/Test\s+Tema\s+\d+\s+N[º°]:\s*(\d+)/i) ||
                            linkText.match(/Test\s+Tema\s+\d+\s+N[º°]\s*(\d+)/i) ||
                            linkText.match(/Test\s+.*?N[º°]:\s*(\d+)/i);
            
            if (testMatch && href) {
              const testNumber = testMatch[1];
              const isFree = linkText.includes('¡Contenido gratuito!') || 
                           $link.closest('li, div').text().includes('¡Contenido gratuito!');
              
              const fullUrl = href.startsWith('http') 
                ? href 
                : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
              
              // Avoid duplicates
              if (!testLinks.find(t => t.url === fullUrl)) {
                testLinks.push({
                  url: fullUrl,
                  testNumber: testNumber.padStart(3, '0'),
                  isFree,
                });
              }
            }
          });
          
          $current = $current.next();
        }
        
        // Strategy 2: Look in parent container
        if (testLinks.length === 0) {
          const $parent = $heading.parent();
          $parent.find('a').each((_, link) => {
            const $link = $(link);
            const linkText = $link.text().trim();
            const href = $link.attr('href');
            const testMatch = linkText.match(/Test\s+Tema\s+\d+\s+N[º°]:\s*(\d+)/i);
            
            if (testMatch && href && parseInt(testMatch[1]) <= 50) { // Reasonable limit
              const testNumber = testMatch[1];
              const isFree = linkText.includes('¡Contenido gratuito!');
              const fullUrl = href.startsWith('http') 
                ? href 
                : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
              
              if (!testLinks.find(t => t.url === fullUrl)) {
                testLinks.push({
                  url: fullUrl,
                  testNumber: testNumber.padStart(3, '0'),
                  isFree,
                });
              }
            }
          });
        }
        
        // Only add topic if we found test links or if it's a valid topic number (1-10)
        if (testLinks.length > 0 || (topicNumber >= 1 && topicNumber <= 10)) {
          // Check if topic already exists
          const existingTopic = topics.find(t => t.number === topicNumber);
          if (existingTopic) {
            // Merge test links
            testLinks.forEach(testLink => {
              if (!existingTopic.testLinks.find(t => t.url === testLink.url)) {
                existingTopic.testLinks.push(testLink);
              }
            });
          } else {
            topics.push({
              number: topicNumber,
              title: topicTitle,
              testLinks,
            });
          }
        }
      }
    });
    
    // Strategy 2: If no topics found, try finding by list structure
    if (topics.length === 0) {
      // Look for lists or sections with test links
      $('ul, ol, .test-list, [class*="test"]').each((_, listElement) => {
        const $list = $(listElement);
        const listText = $list.text();
        
        // Try to extract topic number from context
        const topicMatch = listText.match(/Tema\s+(\d+)/i);
        if (topicMatch) {
          const topicNumber = parseInt(topicMatch[1]);
          
          $list.find('a').each((_, link) => {
            const $link = $(link);
            const linkText = $link.text().trim();
            const href = $link.attr('href');
            const testMatch = linkText.match(/Test\s+.*?N[º°]:\s*(\d+)/i);
            
            if (testMatch && href) {
              let topic = topics.find(t => t.number === topicNumber);
              if (!topic) {
                topic = {
                  number: topicNumber,
                  title: `Tema ${topicNumber}`,
                  testLinks: [],
                };
                topics.push(topic);
              }
              
              const testNumber = testMatch[1];
              const isFree = linkText.includes('¡Contenido gratuito!');
              const fullUrl = href.startsWith('http') 
                ? href 
                : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
              
              if (!topic.testLinks.find(t => t.url === fullUrl)) {
                topic.testLinks.push({
                  url: fullUrl,
                  testNumber: testNumber.padStart(3, '0'),
                  isFree,
                });
              }
            }
          });
        }
      });
    }

    // Sort by topic number
    const sortedTopics = topics.sort((a, b) => a.number - b.number);
    
    console.log(`Found ${sortedTopics.length} topics with ${sortedTopics.reduce((sum, t) => sum + t.testLinks.length, 0)} tests`);
    
    return sortedTopics;
  } catch (error) {
    console.error('Error fetching topics and tests:', error);
    throw error;
  }
}

// Scrape a single test page
async function scrapeTest(
  sessionCookies: string,
  testUrl: string,
  topicNumber: number,
  testNumber: string,
  isFree: boolean
): Promise<Question[]> {
  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Cookie': sessionCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch test page: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    
    const questions: Question[] = [];
    
    // Multiple strategies for parsing questions
    // Strategy 1: Look for common question container patterns
    let questionElements = $('.question, [class*="question"], .test-question, .pregunta, [id*="question"]');
    
    // Strategy 2: If no questions found, try finding by question numbers or text patterns
    if (questionElements.length === 0) {
      questionElements = $('div, li, article').filter((_, el) => {
        const text = $(el).text();
        return /^\d+[\.\)]\s/.test(text.trim()) || 
               $(el).find('input[type="radio"], input[type="checkbox"]').length > 0;
      });
    }
    
    // Strategy 3: Look for forms with radio buttons (common in test pages)
    if (questionElements.length === 0) {
      const formElements = $('form, .test-form, [class*="test"]');
      if (formElements.length > 0) {
        // Try to split by question markers
        const allText = $('body').text();
        // This is a fallback - we'll parse the entire page structure
        questionElements = $('div, section, article').filter((_, el) => {
          return $(el).find('input[type="radio"]').length >= 2;
        });
      }
    }
    
    questionElements.each((index, element) => {
      try {
        const questionNumber = index + 1;
        
        // Extract question text - try multiple selectors
        let questionText = $(element).find('.question-text, .question-title, .pregunta-texto, [class*="question-text"], [class*="pregunta"]').first().text().trim();
        
        if (!questionText) {
          // Try to find text before answer options
          const questionPart = $(element).clone();
          questionPart.find('.answer, .option, input[type="radio"], [class*="answer"], [class*="option"]').remove();
          questionText = questionPart.text().trim().split('\n')[0].replace(/^\d+[\.\)]\s*/, '');
        }
        
        if (!questionText) {
          // Last resort: get first paragraph or text node
          questionText = $(element).find('p').first().text().trim() || 
                        $(element).contents().filter(function() {
                          return this.nodeType === 3; // Text node
                        }).first().text().trim();
        }
        
        // Clean up question text
        questionText = questionText.replace(/^\d+[\.\)]\s*/, '').trim();
        
        // Extract image if present
        const imageElement = $(element).find('img').first();
        let imageUrl: string | undefined;
        if (imageElement.length) {
          let src = imageElement.attr('src') || imageElement.attr('data-src') || imageElement.attr('data-lazy-src');
          if (src) {
            // Remove query parameters that might cause issues
            src = src.split('?')[0];
            imageUrl = src.startsWith('http') ? src : `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
          }
        }
        
        // Extract answers - multiple strategies
        const answers: Answer[] = [];
        
        // Strategy 1: Look for answer containers
        let answerElements = $(element).find('.answer, .option, .respuesta, [class*="answer"], [class*="option"], [class*="respuesta"]');
        
        // Strategy 2: Look for radio buttons and their labels
        if (answerElements.length === 0) {
          $(element).find('input[type="radio"], input[type="checkbox"]').each((_, input) => {
            const $input = $(input);
            const value = $input.attr('value') || '';
            const id = $input.attr('id');
            let labelText = '';
            
            if (id) {
              labelText = $(element).find(`label[for="${id}"]`).text().trim();
            }
            
            if (!labelText) {
              labelText = $input.closest('label').text().trim();
            }
            
            if (!labelText) {
              labelText = $input.parent().text().trim();
            }
            
            if (!labelText && value) {
              labelText = value;
            }
            
            // Clean up label text
            labelText = labelText.replace(/^[a-z]\)\s*/i, '').replace(/^\d+[\.\)]\s*/, '').trim();
            
            if (labelText) {
              const isCorrect = $input.hasClass('correct') || 
                               $input.attr('data-correct') === 'true' ||
                               $input.is(':checked') ||
                               $input.attr('checked') !== undefined;
              
              answers.push({
                text_es: labelText,
                is_correct: isCorrect,
                position: answers.length + 1,
              });
            }
          });
        } else {
          // Parse answer containers
          answerElements.each((ansIndex, ansElement) => {
            const $ansEl = $(ansElement);
            let answerText = $ansEl.text().trim();
            
            // Remove checkbox/radio indicator
            answerText = answerText.replace(/^[☐☑✓✗]\s*/, '').replace(/^[a-z]\)\s*/i, '').replace(/^\d+[\.\)]\s*/, '').trim();
            
            const isCorrect = $ansEl.hasClass('correct') || 
                             $ansEl.hasClass('is-correct') ||
                             $ansEl.hasClass('respuesta-correcta') ||
                             $ansEl.attr('data-correct') === 'true' ||
                             $ansEl.find('.correct-mark, .check-mark, .correcto').length > 0 ||
                             $ansEl.find('input:checked').length > 0;
            
            if (answerText) {
              answers.push({
                text_es: answerText,
                is_correct: isCorrect,
                position: answers.length + 1,
              });
            }
          });
        }
        
        // Extract explanation if present
        let explanation = $(element).find('.explanation, .solution, .explicacion, [class*="explanation"], [class*="explicacion"]').text().trim();
        if (!explanation) {
          // Look for explanation in siblings
          explanation = $(element).next('.explanation, .solution, .explicacion').text().trim();
        }
        
        // Only add question if we have both question text and at least one answer
        if (questionText && answers.length >= 2) {
          const sourceId = `PV-T${topicNumber}-T${testNumber}-Q${questionNumber.toString().padStart(3, '0')}`;
          
          questions.push({
            source_id: sourceId,
            topic_number: topicNumber,
            test_number: testNumber,
            question_number: questionNumber,
            question_es: questionText,
            image_url: imageUrl,
            explanation_es: explanation || undefined,
            answers,
            is_premium: !isFree,
          });
        }
      } catch (error) {
        console.error(`Error parsing question ${index + 1}:`, error);
      }
    });
    
    // If still no questions found, log the HTML structure for debugging
    if (questions.length === 0) {
      console.warn(`No questions found for test ${testNumber}. Page structure:`, {
        url: testUrl,
        bodyClasses: $('body').attr('class'),
        mainContent: $('main, .content, .test-content').length,
        forms: $('form').length,
        inputs: $('input[type="radio"]').length,
      });
    }
    
    return questions;
  } catch (error) {
    console.error(`Error scraping test ${testNumber}:`, error);
    throw error;
  }
}

// Save questions to database
async function saveQuestionsToDatabase(
  supabase: any,
  questions: Question[]
): Promise<{ saved: number; errors: number; errorMessages: string[] }> {
  let saved = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  for (const question of questions) {
    try {
      // Upsert question
      const { data: questionData, error: questionError } = await supabase
        .from('questions_new')
        .upsert({
          source_id: question.source_id,
          topic_id: question.topic_id,
          difficulty: 'medium',
          is_premium: question.is_premium,
          type: 'single',
          image_url: question.image_url || null,
          source: 'PracticaVial',
          question_es: question.question_es,
          question_ru: '',
          question_en: '',
          explanation_es: question.explanation_es || null,
          explanation_ru: null,
          explanation_en: null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'source_id',
          ignoreDuplicates: false,
        })
        .select('id')
        .single();

      if (questionError) {
        errors++;
        errorMessages.push(`Error saving question ${question.source_id}: ${questionError.message}`);
        continue;
      }

      // Delete old answer options
      await supabase
        .from('answer_options')
        .delete()
        .eq('question_id', questionData.id);

      // Insert answer options
      if (question.answers.length > 0) {
        const answerOptions = question.answers.map((answer, index) => ({
          question_id: questionData.id,
          text_es: answer.text_es,
          text_ru: '',
          text_en: '',
          is_correct: answer.is_correct,
          position: answer.position,
        }));

        const { error: answersError } = await supabase
          .from('answer_options')
          .insert(answerOptions);

        if (answersError) {
          errors++;
          errorMessages.push(`Error saving answers for question ${question.source_id}: ${answersError.message}`);
          continue;
        }
      }

      saved++;
    } catch (error) {
      errors++;
      errorMessages.push(`Error processing question ${question.source_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { saved, errors, errorMessages };
}

// Generate Excel file
async function generateExcelFile(
  questions: Question[],
  scrapeResults: any
): Promise<string> {
  try {
    const workbook = XLSX.utils.book_new();

    // Questions sheet
    const questionsData = questions.map(q => ({
      source_id: q.source_id,
      topic_number: q.topic_number,
      difficulty: 'medium',
      is_premium: q.is_premium ? 'true' : 'false',
      type: 'single',
      image_url: q.image_url || '',
      source: 'PracticaVial',
      question_es: q.question_es,
      question_ru: '',
      question_en: '',
      explanation_es: q.explanation_es || '',
      explanation_ru: '',
      explanation_en: '',
      answer_1_es: q.answers[0]?.text_es || '',
      is_correct_1: q.answers[0]?.is_correct ? 'true' : 'false',
      answer_2_es: q.answers[1]?.text_es || '',
      is_correct_2: q.answers[1]?.is_correct ? 'true' : 'false',
      answer_3_es: q.answers[2]?.text_es || '',
      is_correct_3: q.answers[2]?.is_correct ? 'true' : 'false',
      answer_4_es: q.answers[3]?.text_es || '',
      is_correct_4: q.answers[3]?.is_correct ? 'true' : 'false',
    }));

    const questionsSheet = XLSX.utils.json_to_sheet(questionsData);
    XLSX.utils.book_append_sheet(workbook, questionsSheet, 'Questions');

    // Answer Options sheet
    const answerOptionsData: any[] = [];
    questions.forEach((q, qIndex) => {
      q.answers.forEach((answer, aIndex) => {
        answerOptionsData.push({
          question_source_id: q.source_id,
          text_es: answer.text_es,
          text_ru: '',
          text_en: '',
          is_correct: answer.is_correct ? 'true' : 'false',
          position: answer.position,
        });
      });
    });

    const answersSheet = XLSX.utils.json_to_sheet(answerOptionsData);
    XLSX.utils.book_append_sheet(workbook, answersSheet, 'Answer Options');

    // Summary sheet
    const summaryData = [
      { Metric: 'Total Topics Processed', Value: scrapeResults.topicsProcessed },
      { Metric: 'Total Tests Processed', Value: scrapeResults.testsProcessed },
      { Metric: 'Total Questions Processed', Value: scrapeResults.questionsProcessed },
      { Metric: '', Value: '' },
      { Metric: 'Questions by Topic', Value: '' },
      ...Object.entries(scrapeResults.questionsByTopic).map(([topic, count]) => ({
        Metric: `Topic ${topic}`,
        Value: count,
      })),
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Convert to base64
    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const base64 = btoa(String.fromCharCode(...new Uint8Array(excelBuffer)));
    
    return base64;
  } catch (error) {
    console.error('Error generating Excel file:', error);
    throw error;
  }
}

