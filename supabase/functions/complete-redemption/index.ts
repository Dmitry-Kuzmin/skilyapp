import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { user_id, failed_questions } = await req.json();

        if (!user_id || !failed_questions || !Array.isArray(failed_questions)) {
            return new Response(JSON.stringify({ error: "Missing user_id or failed_questions" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        console.log(`[complete-redemption] Processing redemption for user ${user_id}, questions:`, failed_questions.map(q => q.questionId));

        // 1. Mark questions as mastered
        const questionIds = failed_questions.map((q: any) => q.id || q.questionId);

        // Cleanup: remove from active challenge questions (or mark mastered)
        const { error: masteredError } = await supabase
            .from('user_challenge_questions')
            .update({
                mastered: true,
                updated_at: new Date().toISOString(),
                times_reviewed: 1 // Increment reviewed count or similar logic if needed
            })
            .eq('user_id', user_id)
            .in('question_id', questionIds);

        if (masteredError) {
            console.error("Mastery Update Error:", masteredError);
            // We continue even if this fails, as SP is more important for the user
        }

        // 2. Award SP (Redemption Bonus)
        // Redemption typically recovers 50% of what was lost, or a fixed bonus.
        // Here we use a fixed bonus + dynamic part
        const spAward = Math.max(30, 15 * questionIds.length);

        let spData: any = null;
        try {
            const spResponse = await supabase.functions.invoke("season-sp", {
                body: {
                    user_id,
                    source_type: "redemption_success",
                    metadata: {
                        sp_earned: spAward,
                        questions_recovered: questionIds.length,
                        recovered_ids: questionIds
                    }
                },
            });
            spData = spResponse.data;
        } catch (spError) {
            console.error("SP Award Invoke Error:", spError);
        }

        // 3. Log transaction
        await supabase.from("transactions").insert({
            user_id,
            transaction_type: "redemption_bonus",
            amount: spAward,
            metadata: {
                questions_count: questionIds.length,
                recovered_ids: questionIds
            }
        });

        return new Response(JSON.stringify({
            success: true,
            sp_awarded: spAward,
            new_level: spData?.level,
            message: "Навык успешно восстановлен!"
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error: any) {
        console.error("Redemption Critical Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
