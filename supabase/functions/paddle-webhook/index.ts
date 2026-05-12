import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaddleTransaction {
  id: string;
  custom_data?: Record<string, any>;
  subscription_id?: string;
  total?: string;
}

interface PaddleEvent {
  event_id: string;
  event_type: string;
  data: PaddleTransaction;
}

interface Purchase {
  id: string;
  user_id: string;
  item_type: string;
  item_id: string;
  metadata?: Record<string, any>;
}

async function verifyPaddleSignature(payload: string, signatureHeader: string, signatureKey: string): Promise<boolean> {
  if (!signatureHeader || !signatureKey) return false;

  try {
    const parts = signatureHeader.split(';');
    let timestamp = '';
    let signatureValue = '';

    for (const part of parts) {
      if (part.startsWith('ts=')) timestamp = part.split('=')[1];
      else if (part.startsWith('h1=')) signatureValue = part.split('=')[1];
    }

    if (!timestamp || !signatureValue) return false;

    const message = `${timestamp}:${payload}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(signatureKey);
    const messageData = encoder.encode(message);

    const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const computedSignature = await crypto.subtle.sign("HMAC", key, messageData);
    // Paddle uses hex-encoded HMAC-SHA256, not base64
    const computedHex = Array.from(new Uint8Array(computedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return computedHex === signatureValue;
  } catch { return false; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const paddleSignatureKey = Deno.env.get("PADDLE_SIGNATURE_KEY");
    if (!paddleSignatureKey) {
      return new Response(JSON.stringify({ error: "PADDLE_SIGNATURE_KEY not configured" }), { status: 500, headers: corsHeaders });
    }

    const supabase = createPooledSupabaseClient();
    const signatureHeader = req.headers.get("paddle-signature") || "";
    const bodyText = await req.text();

    const isValidSignature = await verifyPaddleSignature(bodyText, signatureHeader, paddleSignatureKey);
    if (!isValidSignature) {
      // Debug: log header details without leaking the key
      const parts = signatureHeader.split(';');
      let h1 = '';
      for (const p of parts) { if (p.startsWith('h1=')) h1 = p.split('=')[1]; }
      console.error("[paddle-webhook] Invalid signature. Header present:", !!signatureHeader, "h1 len:", h1.length, "key len:", paddleSignatureKey.length, "key prefix:", paddleSignatureKey.slice(0, 8));
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
    }

    const event: PaddleEvent = JSON.parse(bodyText);
    console.log("[paddle-webhook] Event:", event.event_type, event.event_id);

    switch (event.event_type) {
      case "transaction.completed": {
        const transaction = event.data;
        const transactionId = transaction.id;

        const { data: purchase, error: findError } = await supabase
          .from("purchases")
          .select("*")
          .eq("paddle_transaction_id", transactionId)
          .maybeSingle() as { data: Purchase | null, error: any };

        if (findError || !purchase) {
          return new Response(JSON.stringify({ error: "Purchase not found" }), { status: 404, headers: corsHeaders });
        }

        await supabase.from("purchases").update({
          status: "completed",
          completed_at: new Date().toISOString(),
          metadata: { ...purchase.metadata, paddle_webhook_data: event.data },
        }).eq("id", purchase.id);

        const userId = purchase.user_id;
        const itemType = purchase.item_type;
        const itemId = purchase.item_id;
        const purchaseCatalogKey = (purchase.metadata?.catalog_key as string) || '';
        const purchaseAmount = transaction.total ? parseFloat(transaction.total) : 0;

        if (itemType === "premium") {
          // Skip grant for trials — subscription.created handles them with status='trial'
          if (!purchaseCatalogKey.includes("trial")) {
            const days = itemId.includes("yearly") ? 365 : 30;
            await supabase.rpc("grant_premium_access", { p_user_id: userId, p_days: days });
          }
        } else if (itemType === "coins_pack") {
          const coins = purchase.metadata?.coins || 0;
          await supabase.rpc("add_coins", { p_user_id: userId, p_amount: coins });
        }

        if (purchaseAmount > 0) {
          await supabase.rpc("add_partner_commission_for_paddle_payment", {
            p_user_id: userId,
            p_purchase_amount: purchaseAmount,
            p_purchase_id: purchase.id,
          }).catch(() => { });
        }

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      case "transaction.payment_failed": {
        await supabase.from("purchases").update({ status: "failed", metadata: { paddle_webhook_data: event.data } }).eq("paddle_transaction_id", event.data.id);
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      case "subscription.created":
      case "subscription.updated": {
        const sub = event.data as any;
        const customData = (sub.custom_data || {}) as Record<string, any>;
        const userId = customData.user_id as string | undefined;
        const dbType = customData.db_type as string | undefined;
        const catalogKey = (customData.catalog_key as string) || '';
        const status = sub.status as string;

        // Link subscription ID to purchase record
        if (userId && sub.id) {
          await supabase.from("purchases")
            .update({ paddle_subscription_id: sub.id, metadata: { paddle_subscription_data: sub } })
            .eq("user_id", userId)
            .eq("item_type", "premium")
            .eq("status", "pending");
        }
        // Also try matching by existing subscription_id (for updates)
        await supabase.from("purchases")
          .update({ metadata: { paddle_subscription_data: sub } })
          .eq("paddle_subscription_id", sub.id);

        // Grant premium when subscription becomes active or trialing
        if (userId && dbType === "premium" && (status === "trialing" || status === "active")) {
          // isTrial: only when Paddle status is 'trialing' — not when trial converts to paid (status='active')
          const isTrial = status === "trialing" && catalogKey.includes("trial");

          if (isTrial) {
            // Trial period start: set subscription_status='trial' and trial_until
            const trialDays = 3;
            const trialUntil = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
            await supabase.from("profiles").update({
              subscription_status: "trial",
              trial_until: trialUntil,
            }).eq("id", userId);
            console.log(`[paddle-webhook] Trial granted: userId=${userId}, trial_until=${trialUntil}`);
          } else {
            // Paid subscription (or trial-to-paid conversion): use grant_premium_access
            const days = catalogKey.includes("yearly") ? 365
              : catalogKey.includes("biannual") ? 180
              : catalogKey.includes("quarterly") ? 90
              : 30;
            await supabase.rpc("grant_premium_access", { p_user_id: userId, p_days: days });
            console.log(`[paddle-webhook] Premium granted: userId=${userId}, days=${days}`);
          }

          // Mark purchase as completed — match by subscription_id (specific) or
          // fall back to the single pending premium purchase for this user.
          const { error: markErr } = await supabase.from("purchases")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("paddle_subscription_id", sub.id);
          if (markErr || !sub.id) {
            // Fallback: mark only the LATEST pending premium purchase
            const { data: latestPending } = await supabase.from("purchases")
              .select("id")
              .eq("user_id", userId)
              .eq("item_type", "premium")
              .eq("status", "pending")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (latestPending?.id) {
              await supabase.from("purchases")
                .update({ status: "completed", completed_at: new Date().toISOString() })
                .eq("id", latestPending.id);
            }
          }
        }

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      case "subscription.cancelled": {
        await supabase.from("purchases").update({
          paddle_subscription_id: event.data.id,
          metadata: { paddle_subscription_data: event.data },
        }).eq("paddle_subscription_id", event.data.id);
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      default:
        return new Response(JSON.stringify({ success: true, processed: false }), { headers: corsHeaders });
    }
  } catch (error: any) {
    console.error("[paddle-webhook] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
