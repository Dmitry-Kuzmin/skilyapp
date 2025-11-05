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
