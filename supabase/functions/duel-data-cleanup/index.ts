import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Получаем ключи из переменных окружения
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[duel-data-cleanup] Starting cleanup process...');

    // Вызываем функцию очистки через RPC
    const { data, error } = await supabase.rpc('delete_old_duel_data');

    if (error) {
      console.error('[duel-data-cleanup] Error calling delete_old_duel_data:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const result = Array.isArray(data) && data.length > 0 ? data[0] : data;
    
    console.log('[duel-data-cleanup] Cleanup completed:', result);

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          deleted_answers: result?.deleted_answers || 0,
          deleted_exploits: result?.deleted_exploits || 0,
          cleaned_duels: result?.cleaned_duels || 0,
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[duel-data-cleanup] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

