import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const BONUS_AMOUNT = 100;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ success: false, error: "Unauthorized" }, 401);
    const authUserId = user.id;

    // profiles.id = auth.users.id для email-юзеров, profiles.user_id = auth.users.id для Telegram.
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, demo_bonus_claimed_at, coins")
      .or(`id.eq.${authUserId},user_id.eq.${authUserId}`)
      .maybeSingle();

    if (profileErr) {
      console.error("[claim-demo-bonus] profile lookup err:", profileErr);
      return json({ success: false, error: "internal_error" }, 500);
    }
    if (!profile) return json({ success: false, error: "profile_not_found" }, 404);

    if (profile.demo_bonus_claimed_at) {
      return json({
        success: false,
        error: "already_claimed",
        claimed_at: profile.demo_bonus_claimed_at,
      }, 409);
    }

    // Два атомарных шага:
    // 1. Флаг claimed — WHERE IS NULL гарантирует что только один запрос пройдёт.
    // 2. Инкремент монет через RPC (coins = coins + N на стороне БД, без read-modify-write).
    const { data: claimed, error: claimErr } = await admin
      .from("profiles")
      .update({ demo_bonus_claimed_at: new Date().toISOString() })
      .eq("id", profile.id)
      .is("demo_bonus_claimed_at", null)
      .select("id")
      .maybeSingle();

    if (claimErr) {
      console.error("[claim-demo-bonus] claim err:", claimErr);
      return json({ success: false, error: "update_failed" }, 500);
    }
    if (!claimed) {
      return json({ success: false, error: "already_claimed" }, 409);
    }

    // Атомарный инкремент — БД сама считает coins + 100, не мы.
    const { error: coinsErr } = await admin.rpc("increment_profile_value", {
      p_profile_id: profile.id,
      p_column: "coins",
      p_amount: BONUS_AMOUNT,
    });
    if (coinsErr) console.error("[claim-demo-bonus] coins increment err:", coinsErr);

    // Записываем в историю монет (fire-and-forget, не блокируем ответ)
    admin.from("transactions").insert({
      user_id: profile.id,
      transaction_type: "coins_earned_signup_bonus",
      amount: BONUS_AMOUNT,
      metadata: { source: "demo_cta" },
    }).then(({ error: txErr }) => {
      if (txErr) console.error("[claim-demo-bonus] tx insert err:", txErr);
    });

    return json({
      success: true,
      amount: BONUS_AMOUNT,
    });
  } catch (err) {
    console.error("[claim-demo-bonus] unexpected:", err);
    return json({ success: false, error: "internal_error" }, 500);
  }
});
