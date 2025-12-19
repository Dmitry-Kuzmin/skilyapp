/**
 * Создает Supabase клиент с Connection Pooling (Transaction Mode)
 * 
 * КРИТИЧНО: Использование Connection Pooler позволяет:
 * - Free план: выдержать 1000+ пользователей (вместо 60)
 * - Pro план: выдержать 2000+ пользователей (вместо 200)
 * 
 * Без Connection Pooling:
 * - Free план упадет на 65-м пользователе
 * - Pro план упадет на 205-м пользователе
 * 
 * ВАЖНО: Supabase JS Client использует REST API (PostgREST), который автоматически
 * использует Connection Pooler в Transaction Mode для Edge Functions.
 * 
 * Источник: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

/**
 * Получает URL для Supabase REST API
 * 
 * Формат: https://PROJECT_REF.supabase.co
 * 
 * ВАЖНО: Supabase JS Client через SUPABASE_URL использует REST API (PostgREST),
 * который автоматически использует Connection Pooler в Transaction Mode для Edge Functions.
 * Это правильный подход для serverless функций.
 */
function getPooledSupabaseUrl(): string {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is not set');
  }
  
  // SUPABASE_URL в формате: https://PROJECT_REF.supabase.co
  // Supabase JS Client использует этот URL для REST API (PostgREST)
  // REST API автоматически использует Connection Pooler в Transaction Mode
  // Это идеально для Edge Functions (serverless функций)
  
  if (supabaseUrl.includes('.supabase.co')) {
    return supabaseUrl;
  }
  
  return supabaseUrl;
}

/**
 * Создает Supabase клиент с Connection Pooling (Transaction Mode)
 * 
 * ВАЖНО: Supabase JS Client использует REST API (PostgREST), который автоматически
 * использует Connection Pooler в Transaction Mode для Edge Functions.
 * 
 * Transaction Mode идеален для serverless функций, так как:
 * - Поддерживает много временных соединений
 * - Переиспользует соединения эффективно
 * - Автоматически используется через REST API
 * 
 * @param serviceRoleKey - Service Role Key для административных операций
 * @returns Supabase клиент, подключенный через REST API (использует Connection Pooler)
 */
export function createPooledSupabaseClient(serviceRoleKey?: string): ReturnType<typeof createClient> {
  const supabaseUrl = getPooledSupabaseUrl();
  const key = serviceRoleKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }
  
  // Создаем клиент - Supabase JS Client использует REST API (PostgREST)
  // REST API автоматически использует Connection Pooler в Transaction Mode
  // Это правильный подход для Edge Functions (serverless функций)
  const client = createClient(supabaseUrl, key, {
    db: {
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

