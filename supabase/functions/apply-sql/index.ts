// ⚠️ ВРЕМЕННАЯ ФУНКЦИЯ - УДАЛИТЬ ПОСЛЕ ИСПОЛЬЗОВАНИЯ!
// Эта функция выполняет SQL напрямую через PostgreSQL
// УДАЛИТЬ после применения всех миграций!

import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Получаем SQL из тела запроса
    const { sql } = await req.json();

    if (!sql) {
      return new Response(
        JSON.stringify({ error: 'SQL query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[apply-sql] Executing SQL:', sql.substring(0, 100) + '...');

    // Парсим DB URL из переменных окружения
    const dbUrl = Deno.env.get('DATABASE_URL');
    if (!dbUrl) {
      return new Response(
        JSON.stringify({ error: 'DATABASE_URL not found in environment' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Подключаемся к PostgreSQL
    const client = new Client(dbUrl);
    await client.connect();

    try {
      // Выполняем SQL
      const result = await client.queryObject(sql);
      
      console.log('[apply-sql] ✅ SQL executed successfully');
      console.log('[apply-sql] Result:', result);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'SQL executed successfully',
          result: result
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('[apply-sql] ❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});


