// supabase/functions/edge-tts/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Функция генерации Sec-MS-GEC
async function generateSecMsGec() {
    const time = Date.now() / 1000;
    // Конвертация в Windows File Time (наносекунды с 1601 года)
    const ticks = BigInt(Math.floor(time + 11644473600) * 10000000);
    // Округляем вниз до ближайших 5 минут
    const roundedTicks = ticks - (ticks % 3000000000n);
    const strToHash = roundedTicks.toString() + TRUSTED_CLIENT_TOKEN;

    const encoder = new TextEncoder();
    const data = encoder.encode(strToHash);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
}

function generateGuid() {
    return crypto.randomUUID().replace(/-/g, "");
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const secMsGec = await generateSecMsGec();
        const connectionId = generateGuid();
        const muid = generateGuid();

        const wssUrl = new URL("wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1");
        wssUrl.searchParams.set("TrustedClientToken", TRUSTED_CLIENT_TOKEN);
        wssUrl.searchParams.set("ConnectionId", connectionId);
        wssUrl.searchParams.set("Sec-MS-GEC", secMsGec);
        wssUrl.searchParams.set("Sec-MS-GEC-Version", "1-130.0.2849.68");

        return new Response(
            JSON.stringify({
                url: wssUrl.toString(),
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
                    "X-Ms-User-Id": muid
                }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
});
