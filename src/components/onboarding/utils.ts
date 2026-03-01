import { COUNTRIES, CountryConfig, DEFAULT_COUNTRY } from "@/config/countries";

export const detectUserCountry = (): CountryConfig => {
    if (typeof window === "undefined") return DEFAULT_COUNTRY;

    const locale = navigator.language;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    console.log("[CountryDetection] Locale:", locale, "TimeZone:", timeZone);

    // Логика для Испании
    if (timeZone.includes("Madrid") || timeZone.includes("Canary") || locale.toLowerCase().includes("es-es")) {
        return COUNTRIES.find(c => c.code === "ES") || DEFAULT_COUNTRY;
    }

    // Логика для России
    if (
        timeZone.includes("Moscow") ||
        timeZone.includes("Samara") ||
        timeZone.includes("Yekaterinburg") ||
        timeZone.includes("Novosibirsk") ||
        locale.toLowerCase().includes("ru")
    ) {
        return COUNTRIES.find(c => c.code === "RU") || DEFAULT_COUNTRY;
    }

    // Fallback на дефолтную (Испания)
    return DEFAULT_COUNTRY;
};
