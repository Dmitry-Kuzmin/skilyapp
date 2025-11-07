// ⚠️ ВРЕМЕННАЯ ФУНКЦИЯ - УДАЛИТЬ ПОСЛЕ ИСПОЛЬЗОВАНИЯ!
// Эта функция выполняет SQL через Service Role Key
// УДАЛИТЬ после применения всех миграций!

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Service Role Key not found' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Создаем клиент с Service Role Key
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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

    console.log('[execute-sql] Executing SQL:', sql.substring(0, 100) + '...');

    // Выполняем SQL через RPC функцию или напрямую через pg
    // Supabase JS Client не поддерживает произвольный SQL напрямую
    // Используем прямой запрос к PostgreSQL через REST API
    
    // Попробуем использовать supabase.rpc для выполнения SQL
    // Но на самом деле, нужно использовать прямой SQL запрос
    
    // Разбиваем SQL на отдельные команды
    const sqlCommands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('--'));

    console.log(`[execute-sql] Found ${sqlCommands.length} commands to execute`);

    // Выполняем каждую команду через supabase.rpc или напрямую
    // Но Supabase не предоставляет прямой endpoint для SQL
    // Поэтому используем альтернативный метод - создаем RPC функцию
    
    return new Response(
      JSON.stringify({ 
        error: 'Direct SQL execution not supported via REST API',
        message: 'Please use Supabase Dashboard SQL Editor or create a RPC function',
        sql_editor_url: 'https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new',
        alternative: 'Use Supabase CLI or apply SQL manually'
      }),
      { 
        status: 501, 
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
