import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import postgres from "https://deno.land/x/postgresjs@v3.3.3/mod.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sql } = await req.json();

    if (!sql) {
      return new Response(
        JSON.stringify({ error: 'SQL query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dbUrl = Deno.env.get('DATABASE_URL') || Deno.env.get('SUPABASE_DB_URL');
    if (!dbUrl) {
      return new Response(
        JSON.stringify({ error: 'Neither DATABASE_URL nor SUPABASE_DB_URL is set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Connect to Postgres
    const sql_client = postgres(dbUrl);

    console.log('[apply-sql] Executing SQL via postgresjs...');

    // Execute SQL
    const result = await sql_client.unsafe(sql);

    await sql_client.end();

    console.log('[apply-sql] ✅ SQL executed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SQL executed successfully',
        result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[apply-sql] ❌ Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
