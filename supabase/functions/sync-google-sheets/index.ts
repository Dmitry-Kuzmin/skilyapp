import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Proper CSV parser that handles quoted fields with commas
function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
}

// Check if text contains Cyrillic characters
function hasCyrillic(text: string): boolean {
  return /[а-яА-ЯЁё]/.test(text);
}

interface QuestionRow {
  source_id?: string;
  topic_number?: number;
  difficulty?: string;
  is_premium?: string;
  type?: string;
  image_url?: string;
  sign_code?: string;
  source?: string;
  question_ru?: string;
  question_es?: string;
  question_en?: string;
  explanation_ru?: string;
  explanation_es?: string;
  explanation_en?: string;
  tags?: string;
  answer_1_ru?: string;
  answer_1_es?: string;
  answer_1_en?: string;
  is_correct_1?: string;
  answer_2_ru?: string;
  answer_2_es?: string;
  answer_2_en?: string;
  is_correct_2?: string;
  answer_3_ru?: string;
  answer_3_es?: string;
  answer_3_en?: string;
  is_correct_3?: string;
  answer_4_ru?: string;
  answer_4_es?: string;
  answer_4_en?: string;
  is_correct_4?: string;
  notes?: string;
}

interface TopicRow {
  number?: number;
  title_ru?: string;
  title_es?: string;
  title_en?: string;
  cover_image?: string;
  is_premium?: string;
  gradient_from?: string;
  gradient_to?: string;
}

interface LanguageTermRow {
  source_id?: string;
  term?: string;
  translation?: string;
  description?: string;
  difficulty?: string;
  category?: string; // Comma-separated topic numbers like "1,3" or "4,6"
  image_url?: string;
  audio_url?: string;
  description_translation?: string;
}

interface RoadSignRow {
  source_id?: string;
  name?: string;
  description?: string;
  sign_type?: string;
  image_url?: string;
  created_at?: string;
  name_translation?: string;
  description_translation?: string;
  sign_number?: string;
}

interface FlashcardRow {
  id?: string;
  topic?: number;
  question_ru?: string;
  question_es?: string;
  question_eng?: string;
  answer_ru?: string;
  answer_es?: string;
  answer_eng?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body first (can only be read once)
    let syncType = 'all';
    try {
      const bodyText = await req.text();
      if (bodyText) {
        const body = JSON.parse(bodyText);
        syncType = body.syncType || 'all';
      }
    } catch {
      // If body parsing fails, use default
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT to verify authentication
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
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role using the has_role function
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

    console.log('Admin user verified:', user.email);
    console.log('Sync type:', syncType);

    // Create service role client for actual operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const sheetsId = Deno.env.get('GOOGLE_SHEETS_ID');
    if (!sheetsId) {
      throw new Error('GOOGLE_SHEETS_ID not configured');
    }

    console.log('Starting Google Sheets sync...');

    // Fetch Topics sheet (always needed for topic mapping)
    const topicsUrl = `https://docs.google.com/spreadsheets/d/${sheetsId}/gviz/tq?tqx=out:csv&sheet=Topics`;
    const topicsResponse = await fetch(topicsUrl);
    const topicsCsv = await topicsResponse.text();
    const topicsRows = topicsCsv.split('\n').slice(1).filter(row => row.trim());

    console.log(`Found ${topicsRows.length} topics`);

    // Parse and upsert topics
    let topicsProcessed = 0;
    for (const row of topicsRows) {
      const columns = parseCSVRow(row);
      
      if (!columns[0] || !columns[1]) continue; // Skip empty rows

      const topicData: TopicRow = {
        number: parseInt(columns[0]),
        title_ru: columns[1],
        title_es: columns[2],
        title_en: columns[3],
        cover_image: columns[4],
        is_premium: columns[5],
        gradient_from: columns[6] || '#00BFFF',
        gradient_to: columns[7] || '#39FF14',
      };

      const parseBool = (val?: string): boolean => {
        if (!val) return false;
        return val.toLowerCase() === 'true' || val === '✔' || val === '1' || val.toLowerCase() === 'yes';
      };

      const { error } = await supabase
        .from('topics')
        .upsert({
          number: topicData.number,
          title_ru: topicData.title_ru,
          title_es: topicData.title_es,
          title_en: topicData.title_en,
          cover_image: topicData.cover_image || null,
          is_premium: parseBool(topicData.is_premium),
          gradient_from: topicData.gradient_from,
          gradient_to: topicData.gradient_to,
        }, { onConflict: 'number' });

      if (error) {
        console.error('Error upserting topic:', error);
      } else {
        topicsProcessed++;
      }
    }

    // Fetch Questions sheet (only if needed)
    let questionsRows: string[] = [];
    if (syncType === 'all' || syncType === 'questions') {
      const questionsUrl = `https://docs.google.com/spreadsheets/d/${sheetsId}/gviz/tq?tqx=out:csv&sheet=Questions`;
      const questionsResponse = await fetch(questionsUrl);
      const questionsCsv = await questionsResponse.text();
      questionsRows = questionsCsv.split('\n').slice(1).filter(row => row.trim());

      console.log(`Found ${questionsRows.length} questions`);
    }

    // Get topics map
    const { data: topics } = await supabase
      .from('topics')
      .select('id, number');
    
    const topicMap = new Map(topics?.map(t => [t.number, t.id]) || []);

    // Get tags map
    const { data: tags } = await supabase
      .from('tags')
      .select('id, name_en');
    
    const tagMap = new Map(tags?.map(t => [t.name_en.toLowerCase(), t.id]) || []);

    let questionsProcessed = 0;
    let questionsSkipped = 0;
    let questionsUpdated = 0;
    let questionsInserted = 0;
    const skipReasons: string[] = [];
    const warnings: string[] = [];

    if (syncType === 'all' || syncType === 'questions') {
      for (const row of questionsRows) {
      const columns = parseCSVRow(row);
      
      // Log parsed columns for debugging
      const rowNumber = questionsProcessed + questionsSkipped + 1;
      console.log(`Parsed ${columns.length} columns for row ${rowNumber}`);
      
      // Debug: log first few columns to see what's being parsed
      if (rowNumber <= 3) {
        console.log(`Row ${rowNumber} first 3 columns:`, {
          col0: columns[0],
          col1: columns[1],
          col2: columns[2],
          col0_trimmed: columns[0]?.trim(),
          col0_length: columns[0]?.length,
          raw_row_preview: row.substring(0, 100)
        });
      }
      
      // source_id is now in column 0 (first column)
      // topic_number is now in column 1 (second column)
      const questionData: QuestionRow = {
        source_id: columns[0]?.trim() || null,
        topic_number: parseInt(columns[1]),
        difficulty: columns[2],
        is_premium: columns[3],
        type: columns[4],
        image_url: columns[5],
        sign_code: columns[6],
        source: columns[7],
        question_ru: columns[8],
        question_es: columns[9],
        question_en: columns[10],
        explanation_ru: columns[11],
        explanation_es: columns[12],
        explanation_en: columns[13],
        tags: columns[14],
        answer_1_ru: columns[15],
        answer_1_es: columns[16],
        answer_1_en: columns[17],
        is_correct_1: columns[18],
        answer_2_ru: columns[19],
        answer_2_es: columns[20],
        answer_2_en: columns[21],
        is_correct_2: columns[22],
        answer_3_ru: columns[23],
        answer_3_es: columns[24],
        answer_3_en: columns[25],
        is_correct_3: columns[26],
        answer_4_ru: columns[27],
        answer_4_es: columns[28],
        answer_4_en: columns[29],
        is_correct_4: columns[30],
        notes: columns[31],
      };
      
      // Validate source_id with detailed logging
      if (!questionData.source_id || !questionData.source_id.trim()) {
        const debugInfo = {
          rowNumber: rowNumber + 1,
          columnsCount: columns.length,
          firstColumn: columns[0],
          firstColumnTrimmed: columns[0]?.trim(),
          firstColumnLength: columns[0]?.length,
          firstColumnAfterTrim: columns[0]?.trim()?.length
        };
        console.warn(`Missing source_id for row ${rowNumber + 1}:`, debugInfo);
        skipReasons.push(`Вопрос пропущен: отсутствует source_id (строка ${rowNumber + 1}, колонок: ${columns.length}, первая колонка: "${columns[0] || '(пусто)'}")`);
        questionsSkipped++;
        continue;
      }
      
      // Validate data
      if (questionData.question_es && hasCyrillic(questionData.question_es)) {
        warnings.push(`⚠️ Русские буквы в question_es (строка ${questionsProcessed + questionsSkipped + 2}): "${questionData.question_es.substring(0, 50)}..."`);
      }
      
      // Validate answer lengths
      for (let i = 1; i <= 4; i++) {
        const answerEs = questionData[`answer_${i}_es` as keyof QuestionRow] as string;
        const answerRu = questionData[`answer_${i}_ru` as keyof QuestionRow] as string;
        
        if (answerEs && answerEs.length > 200) {
          warnings.push(`⚠️ Ответ ${i} (ES) слишком длинный: ${answerEs.length} символов (строка ${questionsProcessed + questionsSkipped + 2})`);
        }
        if (answerRu && answerRu.length > 200) {
          warnings.push(`⚠️ Ответ ${i} (RU) слишком длинный: ${answerRu.length} символов (строка ${questionsProcessed + questionsSkipped + 2})`);
        }
        if (answerEs && hasCyrillic(answerEs)) {
          warnings.push(`⚠️ Русские буквы в answer_${i}_es (строка ${questionsProcessed + questionsSkipped + 2}): "${answerEs.substring(0, 50)}..."`);
        }
      }

      if (!questionData.question_ru || !questionData.question_es || !questionData.question_en) {
        skipReasons.push(`Вопрос пропущен: отсутствуют тексты вопроса (строка ${questionsSkipped + questionsProcessed + 2})`);
        questionsSkipped++;
        continue;
      }

      const topicId = questionData.topic_number ? topicMap.get(questionData.topic_number) : null;
      
      if (!topicId && questionData.topic_number) {
        const reason = `Тема ${questionData.topic_number} не найдена в базе (вопрос: "${questionData.question_ru?.substring(0, 50)}...")`;
        console.warn(reason);
        skipReasons.push(reason);
        questionsSkipped++;
        continue;
      }

      const parseBool = (val?: string): boolean => {
        if (!val) return false;
        return val.toLowerCase() === 'true' || val === '✔' || val === '1' || val.toLowerCase() === 'yes';
      };

      // Map difficulty number to enum value
      const difficultyMap: Record<string, 'easy' | 'medium' | 'hard'> = {
        '1': 'easy',
        '2': 'medium',
        '3': 'hard',
        'easy': 'easy',
        'medium': 'medium',
        'hard': 'hard',
      };
      const difficulty = questionData.difficulty 
        ? (difficultyMap[questionData.difficulty.toLowerCase()] || 'medium')
        : 'medium';

      // Upsert question (insert or update if source_id exists)
      // Check if question exists by comparing created_at and updated_at after upsert
      const { data: question, error: questionError } = await supabase
        .from('questions_new')
        .upsert({
          source_id: questionData.source_id.trim(),
          topic_id: topicId,
          difficulty: difficulty,
          is_premium: parseBool(questionData.is_premium),
          type: questionData.type || 'single',
          image_url: questionData.image_url || null,
          sign_code: questionData.sign_code || null,
          source: questionData.source || null,
          question_ru: questionData.question_ru,
          question_es: questionData.question_es,
          question_en: questionData.question_en,
          explanation_ru: questionData.explanation_ru || null,
          explanation_es: questionData.explanation_es || null,
          explanation_en: questionData.explanation_en || null,
          notes: questionData.notes || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'source_id',
          ignoreDuplicates: false
        })
        .select('id, created_at, updated_at')
        .single();

      if (questionError) {
        const reason = `Ошибка upsert вопроса: ${questionError.message} (source_id: ${questionData.source_id}, тема: ${questionData.topic_number})`;
        console.error(reason);
        skipReasons.push(reason);
        questionsSkipped++;
        continue;
      }
      
      // Determine if question was new or updated by comparing timestamps
      // If created_at and updated_at are very close (within 1 second), it's likely a new question
      const createdAt = new Date(question.created_at).getTime();
      const updatedAt = new Date(question.updated_at).getTime();
      const timeDiff = Math.abs(updatedAt - createdAt);
      const isNewQuestion = timeDiff < 2000; // Less than 2 seconds difference
      
      // Update statistics
      if (isNewQuestion) {
        questionsInserted++;
      } else {
        questionsUpdated++;
        // Delete old answer_options for this question (if updating)
        await supabase
          .from('answer_options')
          .delete()
          .eq('question_id', question.id);
        
        // Delete old question_tags for this question (if updating)
        await supabase
          .from('question_tags')
          .delete()
          .eq('question_id', question.id);
      }

      // Insert answer options
      const answers = [];
      
      for (let i = 1; i <= 4; i++) {
        const answerRu = questionData[`answer_${i}_ru` as keyof QuestionRow];
        const answerEs = questionData[`answer_${i}_es` as keyof QuestionRow];
        const answerEn = questionData[`answer_${i}_en` as keyof QuestionRow];
        const isCorrect = questionData[`is_correct_${i}` as keyof QuestionRow];

        if (answerRu || answerEs || answerEn) {
          answers.push({
            question_id: question.id,
            text_ru: answerRu || '',
            text_es: answerEs || '',
            text_en: answerEn || '',
            is_correct: parseBool(isCorrect as string),
            position: i,
          });
        }
      }

      if (answers.length > 0) {
        const { error: answersError } = await supabase
          .from('answer_options')
          .insert(answers);

        if (answersError) {
          console.error('Error inserting answers:', answersError);
        }
      }

      // Process tags (insert new tags)
      if (questionData.tags) {
        const tagNames = questionData.tags.split(',').map(t => t.trim().toLowerCase());
        const questionTags = [];

        for (const tagName of tagNames) {
          const tagId = tagMap.get(tagName);
          if (tagId) {
            questionTags.push({
              question_id: question.id,
              tag_id: tagId,
            });
          }
        }

        if (questionTags.length > 0) {
          // Use upsert to avoid duplicates
          await supabase
            .from('question_tags')
            .upsert(questionTags, {
              onConflict: 'question_id,tag_id',
              ignoreDuplicates: false
            });
        }
      }

      questionsProcessed++;
      }
    }

    // Sync language_terms if needed
    let termsProcessed = 0;
    let termsInserted = 0;
    let termsUpdated = 0;
    let termsSkipped = 0;
    const termsSkipReasons: string[] = [];
    const termsWarnings: string[] = [];

    if (syncType === 'all' || syncType === 'terms') {
      // Fetch Language Terms sheet
      const termsUrl = `https://docs.google.com/spreadsheets/d/${sheetsId}/gviz/tq?tqx=out:csv&sheet=language_terms`;
      const termsResponse = await fetch(termsUrl);
      const termsCsv = await termsResponse.text();
      const termsRows = termsCsv.split('\n').slice(1).filter(row => row.trim());

      console.log(`Found ${termsRows.length} language terms`);

      for (const row of termsRows) {
        const columns = parseCSVRow(row);
        
        // Log parsed columns for debugging
        const rowNumber = termsProcessed + termsSkipped + 1;
        if (rowNumber <= 3) {
          console.log(`Term row ${rowNumber} first 3 columns:`, {
            col0: columns[0],
            col1: columns[1],
            col2: columns[2],
          });
        }

        // source_id is in column 0 (first column)
        const termData: LanguageTermRow = {
          source_id: columns[0]?.trim() || null,
          term: columns[1],
          translation: columns[2],
          description: columns[3],
          difficulty: columns[4],
          category: columns[5], // Comma-separated topic numbers
          image_url: columns[6],
          audio_url: columns[7],
          description_translation: columns[8],
        };

        // Validate source_id
        if (!termData.source_id || !termData.source_id.trim()) {
          termsSkipReasons.push(`Термин пропущен: отсутствует source_id (строка ${rowNumber + 1})`);
          termsSkipped++;
          continue;
        }

        // Validate required fields
        if (!termData.term || !termData.translation) {
          termsSkipReasons.push(`Термин пропущен: отсутствуют обязательные поля (строка ${rowNumber + 1})`);
          termsSkipped++;
          continue;
        }

        // Parse category (comma-separated topic numbers) and get first topic_id
        let topicId: string | null = null;
        if (termData.category) {
          const topicNumbers = termData.category.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
          if (topicNumbers.length > 0) {
            // Get topic_id for the first topic number
            topicId = topicMap.get(topicNumbers[0]) || null;
            if (!topicId) {
              termsWarnings.push(`Тема ${topicNumbers[0]} не найдена для термина ${termData.source_id}`);
            }
          }
        }

        // Map difficulty
        const difficultyMap: Record<string, 'easy' | 'medium' | 'hard'> = {
          '1': 'easy',
          '2': 'medium',
          '3': 'hard',
          'easy': 'easy',
          'medium': 'medium',
          'hard': 'hard',
        };
        const difficulty = termData.difficulty 
          ? (difficultyMap[termData.difficulty.toLowerCase()] || 'medium')
          : 'medium';

        // Upsert language term
        const { data: term, error: termError } = await supabase
          .from('language_terms')
          .upsert({
            source_id: termData.source_id.trim(),
            term_es: termData.term,
            term_ru: termData.translation,
            description_es: termData.description || '',
            description_ru: termData.description_translation || termData.description || '',
            difficulty: difficulty,
            topic_id: topicId,
            image_url: termData.image_url || null,
            audio_url: termData.audio_url || null,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'source_id',
            ignoreDuplicates: false
          })
          .select('id, created_at, updated_at')
          .single();

        if (termError) {
          const reason = `Ошибка upsert термина: ${termError.message} (source_id: ${termData.source_id})`;
          console.error(reason);
          termsSkipReasons.push(reason);
          termsSkipped++;
          continue;
        }

        // Determine if term was new or updated
        const createdAt = new Date(term.created_at).getTime();
        const updatedAt = new Date(term.updated_at).getTime();
        const timeDiff = Math.abs(updatedAt - createdAt);
        const isNewTerm = timeDiff < 2000;

        if (isNewTerm) {
          termsInserted++;
        } else {
          termsUpdated++;
        }

        termsProcessed++;
      }
    }

    // Sync road_signs if needed
    let signsProcessed = 0;
    let signsInserted = 0;
    let signsUpdated = 0;
    let signsSkipped = 0;
    const signsSkipReasons: string[] = [];
    const signsWarnings: string[] = [];

    if (syncType === 'all' || syncType === 'signs') {
      // Fetch Road Signs sheet
      const signsUrl = `https://docs.google.com/spreadsheets/d/${sheetsId}/gviz/tq?tqx=out:csv&sheet=road_signs_rows`;
      const signsResponse = await fetch(signsUrl);
      const signsCsv = await signsResponse.text();
      const signsRows = signsCsv.split('\n').slice(1).filter(row => row.trim());

      console.log(`Found ${signsRows.length} road signs`);

      for (const row of signsRows) {
        const columns = parseCSVRow(row);
        
        // Log parsed columns for debugging
        const rowNumber = signsProcessed + signsSkipped + 1;
        if (rowNumber <= 3) {
          console.log(`Sign row ${rowNumber} first 3 columns:`, {
            col0: columns[0],
            col1: columns[1],
            col2: columns[2],
          });
        }

        // source_id is in column 0 (first column)
        const signData: RoadSignRow = {
          source_id: columns[0]?.trim() || null,
          name: columns[1],
          description: columns[2],
          sign_type: columns[3],
          image_url: columns[4],
          created_at: columns[5],
          name_translation: columns[6],
          description_translation: columns[7],
          sign_number: columns[8],
        };

        // Validate source_id
        if (!signData.source_id || !signData.source_id.trim()) {
          signsSkipReasons.push(`Знак пропущен: отсутствует source_id (строка ${rowNumber + 1})`);
          signsSkipped++;
          continue;
        }

        // Validate required fields
        if (!signData.name || !signData.name_translation) {
          signsSkipReasons.push(`Знак пропущен: отсутствуют обязательные поля (строка ${rowNumber + 1})`);
          signsSkipped++;
          continue;
        }

        // Upsert road sign
        const { data: sign, error: signError } = await supabase
          .from('road_signs')
          .upsert({
            source_id: signData.source_id.trim(),
            name_es: signData.name,
            name_ru: signData.name_translation,
            description_es: signData.description || '',
            description_ru: signData.description_translation || signData.description || '',
            sign_type: signData.sign_type || 'information',
            sign_number: signData.sign_number || null,
            image_url: signData.image_url || null,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'source_id',
            ignoreDuplicates: false
          })
          .select('id, created_at, updated_at')
          .single();

        if (signError) {
          const reason = `Ошибка upsert знака: ${signError.message} (source_id: ${signData.source_id})`;
          console.error(reason);
          signsSkipReasons.push(reason);
          signsSkipped++;
          continue;
        }

        // Determine if sign was new or updated
        const createdAt = new Date(sign.created_at).getTime();
        const updatedAt = new Date(sign.updated_at).getTime();
        const timeDiff = Math.abs(updatedAt - createdAt);
        const isNewSign = timeDiff < 2000;

        if (isNewSign) {
          signsInserted++;
        } else {
          signsUpdated++;
        }

        signsProcessed++;
      }
    }

    // Sync flashcards if needed
    let flashcardsProcessed = 0;
    let flashcardsInserted = 0;
    let flashcardsUpdated = 0;
    let flashcardsSkipped = 0;
    const flashcardsSkipReasons: string[] = [];
    const flashcardsWarnings: string[] = [];

    if (syncType === 'all' || syncType === 'flashcards') {
      // Fetch Flashcards sheet - пробуем разные варианты названий
      let flashcardsUrl = `https://docs.google.com/spreadsheets/d/${sheetsId}/gviz/tq?tqx=out:csv&sheet=flashcards`;
      let flashcardsResponse = await fetch(flashcardsUrl);
      let flashcardsCsv = await flashcardsResponse.text();
      
      // Если не получилось, пробуем с заглавной буквы
      if (flashcardsCsv.includes('error') || flashcardsCsv.length < 10) {
        console.log('Trying "Flashcards" with capital F');
        flashcardsUrl = `https://docs.google.com/spreadsheets/d/${sheetsId}/gviz/tq?tqx=out:csv&sheet=Flashcards`;
        flashcardsResponse = await fetch(flashcardsUrl);
        flashcardsCsv = await flashcardsResponse.text();
      }
      
      const flashcardsRows = flashcardsCsv.split('\n').slice(1).filter(row => row.trim());

      console.log(`Found ${flashcardsRows.length} flashcards rows`);
      if (flashcardsRows.length > 0) {
        console.log(`First row sample: ${flashcardsRows[0].substring(0, 100)}`);
      }

      for (const row of flashcardsRows) {
        const columns = parseCSVRow(row);
        
        const rowNumber = flashcardsProcessed + flashcardsSkipped + 1;

        // Логируем первые несколько строк для отладки
        if (rowNumber <= 3) {
          console.log(`Flashcard row ${rowNumber} columns:`, {
            col0: columns[0]?.substring(0, 20),
            col1: columns[1],
            col2: columns[2]?.substring(0, 30),
            totalCols: columns.length
          });
        }

        // Структура: id, topic, Вопрос (РУС), Вопрос (ESP), Вопрос (ENG), Ответ (РУС), Ответ (ESP), Ответ (ENG)
        const flashcardData: FlashcardRow = {
          id: columns[0]?.trim() || null,
          topic: columns[1] ? parseInt(columns[1]) : null,
          question_ru: columns[2],
          question_es: columns[3],
          question_eng: columns[4],
          answer_ru: columns[5],
          answer_es: columns[6],
          answer_eng: columns[7],
        };

        // Validate source_id (id)
        if (!flashcardData.id || !flashcardData.id.trim()) {
          flashcardsSkipReasons.push(`Карточка пропущена: отсутствует id (строка ${rowNumber + 1})`);
          flashcardsSkipped++;
          continue;
        }

        // Validate topic
        if (!flashcardData.topic || isNaN(flashcardData.topic)) {
          flashcardsSkipReasons.push(`Карточка пропущена: отсутствует или неверный topic (строка ${rowNumber + 1})`);
          flashcardsSkipped++;
          continue;
        }

        // Validate required fields - делаем более мягкую проверку
        const hasQuestion = flashcardData.question_ru || flashcardData.question_es || flashcardData.question_eng;
        const hasAnswer = flashcardData.answer_ru || flashcardData.answer_es || flashcardData.answer_eng;
        
        if (!hasQuestion || !hasAnswer) {
          const missingFields = [];
          if (!flashcardData.question_ru && !flashcardData.question_es && !flashcardData.question_eng) missingFields.push('question');
          if (!flashcardData.answer_ru && !flashcardData.answer_es && !flashcardData.answer_eng) missingFields.push('answer');
          flashcardsSkipReasons.push(`Карточка пропущена: отсутствуют обязательные поля (${missingFields.join(', ')}) (строка ${rowNumber + 1})`);
          flashcardsSkipped++;
          continue;
        }

        // Upsert flashcard - используем значения по умолчанию, если поле пустое
        const { data: flashcard, error: flashcardError } = await supabase
          .from('flashcards')
          .upsert({
            source_id: flashcardData.id.trim(),
            topic: flashcardData.topic,
            question_ru: (flashcardData.question_ru || '').trim() || flashcardData.question_es || flashcardData.question_eng || '',
            question_es: (flashcardData.question_es || '').trim() || flashcardData.question_ru || flashcardData.question_eng || '',
            question_eng: (flashcardData.question_eng || '').trim() || flashcardData.question_ru || flashcardData.question_es || '',
            answer_ru: (flashcardData.answer_ru || '').trim() || flashcardData.answer_es || flashcardData.answer_eng || '',
            answer_es: (flashcardData.answer_es || '').trim() || flashcardData.answer_ru || flashcardData.answer_eng || '',
            answer_eng: (flashcardData.answer_eng || '').trim() || flashcardData.answer_ru || flashcardData.answer_es || '',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'source_id',
            ignoreDuplicates: false
          })
          .select('id, created_at, updated_at')
          .single();

        if (flashcardError) {
          const reason = `Ошибка upsert карточки: ${flashcardError.message} (source_id: ${flashcardData.id})`;
          console.error(reason);
          flashcardsSkipReasons.push(reason);
          flashcardsSkipped++;
          continue;
        }

        // Determine if flashcard was new or updated
        const createdAt = new Date(flashcard.created_at).getTime();
        const updatedAt = new Date(flashcard.updated_at).getTime();
        const timeDiff = Math.abs(updatedAt - createdAt);
        const isNewFlashcard = timeDiff < 2000;

        if (isNewFlashcard) {
          flashcardsInserted++;
        } else {
          flashcardsUpdated++;
        }

        flashcardsProcessed++;
      }
    }

    const result = {
      success: true,
      topicsProcessed: topicsProcessed,
      questionsProcessed: syncType === 'all' || syncType === 'questions' ? questionsProcessed : 0,
      questionsInserted: syncType === 'all' || syncType === 'questions' ? questionsInserted : 0,
      questionsUpdated: syncType === 'all' || syncType === 'questions' ? questionsUpdated : 0,
      questionsSkipped: syncType === 'all' || syncType === 'questions' ? questionsSkipped : 0,
      termsProcessed: syncType === 'all' || syncType === 'terms' ? termsProcessed : 0,
      termsInserted: syncType === 'all' || syncType === 'terms' ? termsInserted : 0,
      termsUpdated: syncType === 'all' || syncType === 'terms' ? termsUpdated : 0,
      termsSkipped: syncType === 'all' || syncType === 'terms' ? termsSkipped : 0,
      signsProcessed: syncType === 'all' || syncType === 'signs' ? signsProcessed : 0,
      signsInserted: syncType === 'all' || syncType === 'signs' ? signsInserted : 0,
      signsUpdated: syncType === 'all' || syncType === 'signs' ? signsUpdated : 0,
      signsSkipped: syncType === 'all' || syncType === 'signs' ? signsSkipped : 0,
      flashcardsProcessed: syncType === 'all' || syncType === 'flashcards' ? flashcardsProcessed : 0,
      flashcardsInserted: syncType === 'all' || syncType === 'flashcards' ? flashcardsInserted : 0,
      flashcardsUpdated: syncType === 'all' || syncType === 'flashcards' ? flashcardsUpdated : 0,
      flashcardsSkipped: syncType === 'all' || syncType === 'flashcards' ? flashcardsSkipped : 0,
      skipReasons: skipReasons.slice(0, 10), // First 10 reasons
      termsSkipReasons: termsSkipReasons.slice(0, 10), // First 10 reasons for terms
      signsSkipReasons: signsSkipReasons.slice(0, 10), // First 10 reasons for signs
      flashcardsSkipReasons: flashcardsSkipReasons.slice(0, 10), // First 10 reasons for flashcards
      warnings: warnings.slice(0, 20), // First 20 warnings
      termsWarnings: termsWarnings.slice(0, 20), // First 20 warnings for terms
      signsWarnings: signsWarnings.slice(0, 20), // First 20 warnings for signs
      flashcardsWarnings: flashcardsWarnings.slice(0, 20), // First 20 warnings for flashcards
      timestamp: new Date().toISOString(),
      availableTopics: Array.from(topicMap.keys()).sort((a, b) => a - b),
    };

    console.log('Sync completed:', result);
    console.log('Available topics in DB:', Array.from(topicMap.keys()).sort((a, b) => a - b));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-google-sheets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
