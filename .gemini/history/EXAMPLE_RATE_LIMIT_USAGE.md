# 📝 Пример использования Rate Limiting

## Пример для `duel-manager/index.ts`

Добавьте в начало функции (после импортов):

```typescript
import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 🛑 RATE LIMITING - защита от DDoS
  const clientIP = getClientIP(req);
  const rateLimit = await checkRateLimit({
    identifier: clientIP,
    limit: 100, // 100 запросов
    windowMs: 60000, // в минуту
  });
  
  if (!rateLimit.allowed) {
    console.warn('[duel-manager] Rate limit exceeded:', {
      ip: clientIP,
      remaining: rateLimit.remaining,
      resetAt: new Date(rateLimit.resetAt).toISOString(),
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      }),
      { 
        status: 429,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  // Остальной код функции...
  try {
    const { action, ...body } = await req.json();
    // ...
  } catch (error) {
    // ...
  }
});
```

## Пример для `coins-spend/index.ts`

```typescript
import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Более строгий лимит для платежных операций
  const clientIP = getClientIP(req);
  const rateLimit = await checkRateLimit({
    identifier: clientIP,
    limit: 50, // 50 запросов (строже)
    windowMs: 60000, // в минуту
  });
  
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      }),
      { 
        status: 429,
        headers: { 
          ...corsHeaders,
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  // Остальной код...
});
```

## Пример для `ai-chat/index.ts`

```typescript
import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Лимит для AI (дорогая операция)
  const clientIP = getClientIP(req);
  const rateLimit = await checkRateLimit({
    identifier: clientIP,
    limit: 30, // 30 запросов (AI дорогое)
    windowMs: 60000, // в минуту
  });
  
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded',
        message: 'AI chat is rate limited. Please wait before trying again.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      }),
      { 
        status: 429,
        headers: { 
          ...corsHeaders,
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  // Остальной код...
});
```

## Настройка лимитов

Рекомендуемые лимиты:

| Функция | Лимит | Причина |
|---------|-------|---------|
| `duel-manager` | 100/мин | Основная функция, но не критична |
| `coins-spend` | 50/мин | Платежная операция, строже |
| `ai-chat` | 30/мин | Дорогая операция (AI API) |
| `premium-status` | 200/мин | Часто вызывается, но легкая |
| `claim-daily-bonus` | 10/мин | Один раз в день, строго |

---

## Тестирование

После добавления rate limiting:

1. **Проверьте нормальный запрос:**
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/duel-manager \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"action": "create_duel", ...}'
   ```
   Должен вернуть 200 OK

2. **Проверьте лимит:**
   ```bash
   # Сделайте 101 запрос подряд
   for i in {1..101}; do
     curl -X POST https://your-project.supabase.co/functions/v1/duel-manager \
       -H "Authorization: Bearer YOUR_TOKEN" \
       -d '{"action": "create_duel", ...}'
   done
   ```
   После 100-го запроса должен вернуть 429

---

## Мониторинг

Проверяйте логи в Upstash Dashboard:
- Количество rate limit проверок
- Количество заблокированных запросов
- Использование Redis

