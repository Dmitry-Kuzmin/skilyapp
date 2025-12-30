import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StartTestSessionRequest {
  user_id: string;
  session_id: string;
  test_id?: string;
  questions_count: number;
  mode?: string;
}

interface TestSession {
  session_id: string;
  user_id: string;
  test_id: string | null;
  questions_count: number;
  mode: string | null;
  started_at: string;
  status: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createPooledSupabaseClient();
    const body: StartTestSessionRequest = await req.json();
    const { user_id, session_id, test_id, questions_count, mode } = body;

    if (!user_id || !session_id || !questions_count || questions_count <= 0) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const startedAt = new Date().toISOString();

    const { data: existingSession } = await supabase
      .from('test_sessions')
      .select('*')
      .eq('session_id', session_id)
      .maybeSingle() as { data: TestSession | null };

    if (existingSession) {
      return new Response(JSON.stringify({
        success: true,
        session_id: existingSession.session_id,
        started_at: existingSession.started_at,
        message: "Test session already started"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: newSession, error: insertError } = await supabase
      .from('test_sessions')
      .insert({
        session_id,
        user_id,
        test_id: test_id || null,
        questions_count,
        mode: mode || null,
        started_at: startedAt,
        status: 'started',
      })
      .select('*')
      .select('*')
      .single() as { data: TestSession | null, error: unknown };

    if (insertError) {
      console.error('[start-test-session] Insert error:', insertError);
      return new Response(JSON.stringify({ error: "Failed to create session" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!newSession) {
      throw new Error('Session created but not returned');
    }

    return new Response(JSON.stringify({
      success: true,
      session_id: newSession.session_id,
      started_at: newSession.started_at,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    console.error('[start-test-session] Error:', error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
