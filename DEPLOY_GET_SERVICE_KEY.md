# 🚀 Развертывание функции get-service-key

## 📋 Пошаговая инструкция

### Шаг 1: Откройте Supabase Dashboard

1. Перейдите: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions
2. Войдите в аккаунт (если требуется)

### Шаг 2: Создайте новую функцию

1. На странице **Edge Functions** нажмите **"New Function"** (или кнопку **"+"**)
2. Введите название функции: `get-service-key`
3. Нажмите **"Create function"** или **"Continue"**

### Шаг 3: Скопируйте код функции

Откройте файл `supabase/functions/get-service-key/index.ts` и скопируйте **ВЕСЬ** код:

```typescript
// ⚠️ ВРЕМЕННАЯ ФУНКЦИЯ - УДАЛИТЬ ПОСЛЕ ИСПОЛЬЗОВАНИЯ!
// Эта функция возвращает Service Role Key для настройки автоматизации
// УДАЛИТЬ НЕМЕДЛЕННО после получения ключа!

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const projectRef = Deno.env.get('SUPABASE_PROJECT_REF');

    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Service Role Key not found in environment' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // ⚠️ ВНИМАНИЕ: Эта функция возвращает секретный ключ!
    // УДАЛИТЬ ПОСЛЕ ИСПОЛЬЗОВАНИЯ!
    return new Response(
      JSON.stringify({
        warning: '⚠️ ВРЕМЕННАЯ ФУНКЦИЯ - УДАЛИТЬ ПОСЛЕ ИСПОЛЬЗОВАНИЯ!',
        service_role_key: serviceRoleKey,
        supabase_url: supabaseUrl,
        project_ref: projectRef,
        instruction: 'Скопируйте service_role_key и сохраните в безопасном месте. Затем УДАЛИТЕ эту функцию!'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
```

### Шаг 4: Вставьте код и задеплойте

1. Вставьте скопированный код в редактор функции
2. Убедитесь, что функция называется `get-service-key`
3. Нажмите **"Deploy"** или **"Save"**

### Шаг 5: Проверьте развертывание

После успешного развертывания:

1. Откройте в браузере:
   ```
   https://ijijcrucqqnnjbkclqhb.supabase.co/functions/v1/get-service-key
   ```

2. Вы должны увидеть JSON с `service_role_key`

3. Скопируйте значение `service_role_key` и сохраните в `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY="ваш-ключ-здесь"
   ```

### Шаг 6: УДАЛИТЕ функцию (КРИТИЧЕСКИ ВАЖНО!)

После получения ключа:

1. Вернитесь на страницу Edge Functions
2. Найдите функцию `get-service-key`
3. Нажмите **три точки** (⋮) рядом с функцией
4. Выберите **Delete**
5. Подтвердите удаление

---

## 🔗 Прямые ссылки

- **Edge Functions**: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions
- **Функция после развертывания**: https://ijijcrucqqnnjbkclqhb.supabase.co/functions/v1/get-service-key
- **Settings → API** (альтернативный способ получить ключ): https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/settings/api

---

## ⚠️ Альтернативный способ получения ключа

Если не хотите создавать временную функцию:

1. Откройте: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/settings/api
2. Найдите раздел **"Project API keys"**
3. Скопируйте **"service_role"** key (секретный!)
4. Сохраните в `.env.local`

Это более безопасный способ, но требует доступа к Settings.


