// Edge Function для выполнения SQL через Supabase JS клиент
// Использует service_role для полного доступа

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Используем встроенные переменные Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Выполняем SQL через rpc или напрямую
    // Используем postgres extension для raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      // Если функция exec_sql не существует, попробуем создать её
      if (error.message.includes('exec_sql')) {
        return new Response(
          JSON.stringify({
            error: 'Function exec_sql not found. Please create it first.',
            hint: 'Run: CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS json AS $$ BEGIN RETURN (SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM pg_catalog.pg_tables LIMIT 1) t); END; $$ LANGUAGE plpgsql SECURITY DEFINER;'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      throw error;
    }

    console.log('[apply-sql] ✅ SQL executed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SQL executed successfully',
        result: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

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
