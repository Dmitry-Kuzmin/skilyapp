import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Maps destination slug → full URL on skilyapp.com
const DESTINATION_MAP: Record<string, string> = {
  home: "https://skilyapp.com/",
  premium: "https://skilyapp.com/pricing",
  "test-essential": "https://skilyapp.com/tests?category=essential",
  "test-priority": "https://skilyapp.com/tests?category=priority",
  payment: "https://skilyapp.com/pricing",
};

const FALLBACK_URL = "https://skilyapp.com/";

serve(async (req) => {
  const url = new URL(req.url);
  // Expected path: /partner-redirect/<link_code>
  const pathParts = url.pathname.split("/").filter(Boolean);
  const linkCode = pathParts[pathParts.length - 1]?.toUpperCase();

  if (!linkCode) {
    return Response.redirect(FALLBACK_URL, 302);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey);

    const { data, error } = await client.rpc("get_partner_link_info", {
      p_link_code: linkCode,
    });

    if (error || !data || data.length === 0 || !data[0].success) {
      return Response.redirect(FALLBACK_URL, 302);
    }

    const info = data[0];
    const destination = DESTINATION_MAP[info.destination] ?? FALLBACK_URL;

    // Track click async (fire-and-forget — don't delay the redirect)
    const sessionId = crypto.randomUUID();
    client.rpc("track_partner_conversion", {
      p_partner_code: info.partner_code,
      p_event_type: "click",
      p_session_id: sessionId,
      p_utm_campaign: info.utm_campaign ?? null,
      p_landing_page: info.destination ?? null,
      p_fingerprint_hash: null,
    }).catch(() => {/* ignore */});

    // Add UTM params to destination so the landing page can pick up the ref
    const destUrl = new URL(destination);
    destUrl.searchParams.set("ref", info.partner_code);
    if (info.utm_campaign) destUrl.searchParams.set("utm_campaign", info.utm_campaign);
    destUrl.searchParams.set("utm_source", "partner_link");

    // Set partner code cookie (30 days) so conversion can be attributed later
    const cookieValue = `partner_code=${info.partner_code}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: destUrl.toString(),
        "Set-Cookie": cookieValue,
        "Cache-Control": "no-store",
      },
    });
  } catch (_err) {
    return Response.redirect(FALLBACK_URL, 302);
  }
});
