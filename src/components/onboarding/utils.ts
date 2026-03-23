import { COUNTRIES, CountryConfig, DEFAULT_COUNTRY } from "@/config/countries";

export const detectUserCountry = async (): Promise<CountryConfig> => {
    if (typeof window === "undefined") return DEFAULT_COUNTRY;

    try {
        const ipResponse = await fetch('https://ipapi.co/json/', {
            signal: AbortSignal.timeout(3000)
        });
        
        if (ipResponse.ok) {
            const ipData = await ipResponse.json();
            const countryCode = ipData.country_code;
            
            if (countryCode === 'ES') return COUNTRIES.find(c => c.code === "ES") || DEFAULT_COUNTRY;
            if (countryCode === 'RU' || countryCode === 'BY' || countryCode === 'KZ') return COUNTRIES.find(c => c.code === "RU") || DEFAULT_COUNTRY;
            if (countryCode === 'PL') return COUNTRIES.find(c => c.code === "PL") || DEFAULT_COUNTRY;
            if (countryCode === 'DE') return COUNTRIES.find(c => c.code === "DE") || DEFAULT_COUNTRY;
        }
    } catch (e) {
        console.warn("[CountryDetection] IP fetch failed, falling back to locale/timezone", e);
    }

    const locale = navigator.language.toLowerCase();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    console.log("[CountryDetection] Locale:", locale, "TimeZone:", timeZone);

    // Логика для Испании
    if (timeZone.includes("Madrid") || timeZone.includes("Canary") || locale.includes("es")) {
        return COUNTRIES.find(c => c.code === "ES") || DEFAULT_COUNTRY;
    }

    // Логика для России
    if (
        timeZone.includes("Moscow") ||
        timeZone.includes("Samara") ||
        timeZone.includes("Yekaterinburg") ||
        timeZone.includes("Novosibirsk") ||
        locale.includes("ru")
    ) {
        return COUNTRIES.find(c => c.code === "RU") || DEFAULT_COUNTRY;
    }

    // Fallback на дефолтную (Испания)
    return DEFAULT_COUNTRY;
};
