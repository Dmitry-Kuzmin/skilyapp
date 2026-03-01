import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RewardRequest {
    user_id: string;
    test_id: string;
    mode: string;
    score: number;
    total: number;
    time_spent: number;
    marathon_rounds?: number;
    country: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { user_id, mode, score, total, marathon_rounds = 1 } = await req.json() as RewardRequest;

        console.log(`[calculate-test-reward] 🚀 Calculating reward for ${mode}:`, { score, total, marathon_rounds });

        let sp_awarded = 0;
        let xp_awarded = 0;

        if (mode === 'marathon' || mode === 'mastery') {
            // SMART FORMULA: Rewards decrease with more rounds
            // Max 20 SP / 20 XP for finishing in 1 round
            // Award = Max / Rounds (rounded up)

            const maxSP = 20;
            const maxXP = 20;

            sp_awarded = Math.ceil(maxSP / marathon_rounds);
            xp_awarded = Math.ceil(maxXP / marathon_rounds);

            // Safety cap (min 1 point)
            sp_awarded = Math.max(1, sp_awarded);
            xp_awarded = Math.max(1, xp_awarded);
        } else {
            // Standard calculation for other modes if needed
            sp_awarded = Math.floor(score / 5);
            xp_awarded = score;
        }

        console.log(`[calculate-test-reward] ✅ Final calculation: ${sp_awarded} SP, ${xp_awarded} XP`);

        return new Response(
            JSON.stringify({
                sp_awarded,
                xp_awarded,
                coins_awarded: Math.floor(score / 10) // Basic coins reward
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
