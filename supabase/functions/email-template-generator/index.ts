// =====================================================
// Email Template Generator
// =====================================================
// Генерирует премиальные HTML шаблоны для email уведомлений
// с темным дизайном в стиле приложения (Cyberpunk/Fintech)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailTemplateRequest {
  template_type: 'password_changed' | 'email_changed' | 'phone_changed' | 
                 'identity_linked' | 'identity_unlinked' | 
                 'mfa_enrolled' | 'mfa_unenrolled' | 'suspicious_login';
  title: string;
  message: string;
  variables?: Record<string, string>;
  cta_text?: string;
  cta_url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: EmailTemplateRequest = await req.json();
    const { template_type, title, message, variables = {}, cta_text, cta_url } = body;

    // Генерируем HTML шаблон с темным дизайном
    const html = generateEmailTemplate({
      template_type,
      title,
      message,
      variables,
      cta_text,
      cta_url,
    });

    return new Response(
      JSON.stringify({
        success: true,
        html,
        text: stripHtml(message), // Plain text версия
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[EmailTemplateGenerator] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateEmailTemplate(params: EmailTemplateRequest): string {
  const { title, message, variables, cta_text, cta_url } = params;
  
  // Заменяем переменные в сообщении
  let processedMessage = message;
  Object.entries(variables || {}).forEach(([key, value]) => {
    processedMessage = processedMessage.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });

  // Премиальный темный HTML шаблон
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #020617 0%, #0f172a 100%);
      color: #e4e4e7;
      line-height: 1.6;
      padding: 40px 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: #18181b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    .email-header {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      padding: 32px 24px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .email-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.5px;
      position: relative;
      z-index: 1;
    }
    .email-content {
      padding: 32px 24px;
    }
    .email-title {
      font-size: 24px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 16px;
      letter-spacing: -0.3px;
    }
    .email-message {
      font-size: 16px;
      color: #d4d4d8;
      line-height: 1.7;
      margin-bottom: 24px;
    }
    .email-cta {
      margin-top: 32px;
      text-align: center;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background: #ffffff;
      color: #020617;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
    }
    .cta-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(255, 255, 255, 0.3);
    }
    .email-footer {
      padding: 24px;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: #0f0f11;
    }
    .footer-text {
      font-size: 12px;
      color: #71717a;
      line-height: 1.6;
    }
    .security-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 6px;
      font-size: 13px;
      color: #60a5fa;
      margin-top: 16px;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        border-radius: 0;
      }
      .email-content {
        padding: 24px 20px;
      }
      .email-title {
        font-size: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="logo">Skily</div>
    </div>
    <div class="email-content">
      <h1 class="email-title">${title}</h1>
      <div class="email-message">
        ${processedMessage.replace(/\n/g, '<br>')}
      </div>
      ${cta_text && cta_url ? `
        <div class="email-cta">
          <a href="${cta_url}" class="cta-button">${cta_text}</a>
        </div>
      ` : ''}
      <div class="security-badge">
        <span>🔐</span>
        <span>Безопасное уведомление</span>
      </div>
    </div>
    <div class="email-footer">
      <p class="footer-text">
        Это автоматическое уведомление о безопасности вашего аккаунта.<br>
        Если вы не совершали это действие, немедленно свяжитесь с поддержкой.
      </p>
      <p class="footer-text" style="margin-top: 12px;">
        © ${new Date().getFullYear()} Skily. Все права защищены.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}





