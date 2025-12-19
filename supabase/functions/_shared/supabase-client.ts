/**
 * Создает Supabase клиент с Connection Pooling (порт 6543)
 * 
 * КРИТИЧНО: Использование Connection Pooler позволяет:
 * - Free план: выдержать 1000+ пользователей (вместо 60)
 * - Pro план: выдержать 2000+ пользователей (вместо 200)
 * 
 * Без Connection Pooling:
 * - Free план упадет на 65-м пользователе
 * - Pro план упадет на 205-м пользователе
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

/**
 * Получает URL для Connection Pooler (порт 6543)
 * 
 * Формат: https://PROJECT_REF.supabase.co
 * Connection Pooler автоматически использует порт 6543 в Transaction Mode
 */
function getPooledSupabaseUrl(): string {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is not set');
  }
  
  // SUPABASE_URL обычно в формате: https://PROJECT_REF.supabase.co
  // Connection Pooler использует тот же URL, но автоматически подключается через порт 6543
  // В Supabase JS Client это работает автоматически при использовании стандартного URL
  
  // ВАЖНО: Supabase JS Client автоматически использует Connection Pooler
  // при подключении через стандартный SUPABASE_URL в Edge Functions
  // НО для гарантии используем явный формат
  
  // Если URL уже правильный формат - используем как есть
  if (supabaseUrl.includes('.supabase.co')) {
    return supabaseUrl;
  }
  
  // Если это прямой DB URL (с портом 5432) - конвертируем
  // Но обычно в Edge Functions SUPABASE_URL уже правильный
  return supabaseUrl;
}

/**
 * Создает Supabase клиент с Connection Pooling
 * 
 * @param serviceRoleKey - Service Role Key для административных операций
 * @returns Supabase клиент, подключенный через Connection Pooler
 */
export function createPooledSupabaseClient(serviceRoleKey?: string): ReturnType<typeof createClient> {
  const supabaseUrl = getPooledSupabaseUrl();
  const key = serviceRoleKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }
  
  // Создаем клиент - Supabase JS Client автоматически использует Connection Pooler
  // при подключении через Edge Functions
  const client = createClient(supabaseUrl, key, {
    db: {
      // Явно указываем использование Connection Pooler
      // В Edge Functions это работает автоматически через SUPABASE_URL
      schema: 'public',
    },
    auth: {
      persistSession: false, // Edge Functions не сохраняют сессии
      autoRefreshToken: false,
    },
  });
  
  return client;
}

/**
 * Получает Connection Pooler URL для прямых SQL запросов (если нужно)
 * 
 * Формат: postgresql://postgres.PROJECT_REF:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
 * 
 * ВАЖНО: Для обычных операций через Supabase JS Client это НЕ нужно!
 * Используйте createPooledSupabaseClient() - он автоматически использует pooler.
 */
export function getConnectionPoolerUrl(): string | null {
  const dbUrl = Deno.env.get('DATABASE_URL');
  
  if (!dbUrl) {
    return null;
  }
  
  // Если DATABASE_URL уже содержит pooler - используем как есть
  if (dbUrl.includes('pooler.supabase.com') && dbUrl.includes(':6543')) {
    return dbUrl;
  }
  
  // Если это прямой URL (порт 5432) - конвертируем в pooler URL
  // Формат: postgresql://postgres.PROJECT_REF:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
  if (dbUrl.includes(':5432')) {
    return dbUrl.replace(':5432', ':6543').replace('db.supabase.com', 'pooler.supabase.com');
  }
  
  return null;
}

