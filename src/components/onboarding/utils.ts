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
        console.warn("[CountryDetection] IP fetch failed, falling back to timezone", e);
    }

    // Timezone-only fallback — locale alone is NOT reliable
    // (Russian speakers in Spain have 'ru' locale but should get Spain)
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    console.log("[CountryDetection] TimeZone:", timeZone);

    if (timeZone.includes("Madrid") || timeZone.includes("Canary")) {
        return COUNTRIES.find(c => c.code === "ES") || DEFAULT_COUNTRY;
    }

    if (
        timeZone.includes("Moscow") ||
        timeZone.includes("Samara") ||
        timeZone.includes("Yekaterinburg") ||
        timeZone.includes("Novosibirsk") ||
        timeZone.includes("Krasnoyarsk") ||
        timeZone.includes("Omsk")
    ) {
        return COUNTRIES.find(c => c.code === "RU") || DEFAULT_COUNTRY;
    }

    // Default to Spain — our primary market
    return DEFAULT_COUNTRY;
};
