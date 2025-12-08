import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StartTestSessionRequest {
  user_id: string;
  session_id: string;
  test_id?: string;
  questions_count: number;
  mode?: string; // 'practice', 'exam', 'blitz', 'mastery', 'sequential', 'module', 'challenge-bank', 'dgt'
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      user_id,
      session_id,
      test_id,
      questions_count,
      mode,
    }: StartTestSessionRequest = await req.json();

    // Валидация входных данных
    if (!user_id || !session_id || !questions_count || questions_count <= 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, session_id, questions_count" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // КРИТИЧНО: Используем серверное время UTC (не клиентское!)
    const startedAt = new Date().toISOString();

    // Проверка: если сессия уже существует - возвращаем существующую
    const { data: existingSession, error: checkError } = await supabase
      .from('test_sessions')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (existingSession) {
      console.log('[start-test-session] Session already exists:', session_id);
      return new Response(
        JSON.stringify({
          success: true,
          session_id: existingSession.session_id,
          started_at: existingSession.started_at,
          message: "Test session already started"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Создаем новую сессию
    const { data: newSession, error: insertError } = await supabase
      .from('test_sessions')
      .insert({
        session_id,
        user_id,
        test_id: test_id || null,
        questions_count,
        mode: mode || null,
        started_at: startedAt, // Серверное время
        status: 'started',
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('[start-test-session] Error creating session:', insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create test session", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[start-test-session] Session created:', {
      session_id,
      user_id,
      started_at: startedAt,
      questions_count
    });

    return new Response(
      JSON.stringify({
        success: true,
        session_id: newSession.session_id,
        started_at: newSession.started_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[start-test-session] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

