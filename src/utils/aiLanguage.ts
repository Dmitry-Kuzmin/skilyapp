/**
 * AI Language Detection для Skily Global Brain
 * Определяет язык ответа ИИ на основе языка браузера/профиля
 */

export type AILanguage = 'Spanish' | 'Russian' | 'English' | 'Ukrainian';

/**
 * Определяет язык для AI инструкций
 * Приоритет: настройки профиля > язык браузера > English (fallback)
 */
export const getAIInstructionLanguage = (userProfileLanguage?: string): AILanguage => {
    // 1. Сначала смотрим настройки профиля (если юзер выбрал вручную)
    if (userProfileLanguage) {
        const normalized = userProfileLanguage.toLowerCase();
        if (normalized === 'es' || normalized === 'spanish') return 'Spanish';
        if (normalized === 'ru' || normalized === 'russian') return 'Russian';
        if (normalized === 'uk' || normalized === 'ukrainian') return 'Ukrainian';
        if (normalized === 'en' || normalized === 'english') return 'English';
    }

    // 2. Если настроек нет, смотрим на язык браузера
    const browserLang = typeof navigator !== 'undefined'
        ? navigator.language.slice(0, 2).toLowerCase()
        : 'en';

    switch (browserLang) {
        case 'es':
            return 'Spanish'; // Родной режим
        case 'ru':
            return 'Russian'; // Режим экспата
        case 'uk':
            return 'Ukrainian';
        case 'en':
        default:
            return 'English'; // Fallback для всех
    }
};

/**
 * Генерирует языковую инструкцию для промпта
 * - Испанцы: чистый испанский
 * - Иностранцы: гибридный режим (логика на родном, термины на испанском)
 */
export const getLanguageInstruction = (language: AILanguage): string => {
    if (language === 'Spanish') {
        // 🇪🇸 ДЛЯ ИСПАНЦЕВ (Native Mode)
        return `
IDIOMA DE RESPUESTA: ESPAÑOL (España).
TONO: Instructor de autoescuela profesional pero amigable.
IMPORTANTE: Usa terminología oficial de la DGT.
Tutea al estudiante (tú, no usted).
`;
    }

    // 🌍 ДЛЯ ИНОСТРАНЦЕВ (Hybrid Mode)
    const langName = language === 'Russian' ? 'РУССКИЙ'
        : language === 'Ukrainian' ? 'УКРАИНСКИЙ'
            : 'ENGLISH';

    const hybridRule = language === 'Russian'
        ? `
1. Объясняй логику, советы и encouragement на РУССКОМ языке.
2. НО ВСЕ термины ПДД, названия знаков, типы дорог — пиши НА ИСПАНСКОМ (в скобках или в контексте).
   Пример: "Ты выехал на *Autopista* (автомагистраль), поэтому лимит 120 км/ч".
   НЕ пиши: "Ты выехал на автомагистраль" — так ученик не выучит термин для экзамена!
3. Названия статей закона сохраняй как "Art. XX RGC".
`
        : language === 'Ukrainian'
            ? `
1. Пояснюй логіку, поради та підтримку УКРАЇНСЬКОЮ мовою.
2. АЛЕ ВСІ терміни ПДР, назви знаків, типи доріг — пиши ІСПАНСЬКОЮ (в дужках або в контексті).
   Приклад: "Ти виїхав на *Autopista* (автомагістраль), тому ліміт 120 км/год".
3. Назви статей закону зберігай як "Art. XX RGC".
`
            : `
1. Explain logic, tips and encouragement in ENGLISH.
2. BUT keep ALL traffic terms, road types, sign names in SPANISH (in brackets or in context).
   Example: "You entered an *Autopista* (highway), so the limit is 120 km/h".
   DON'T write: "You entered a highway" — the student needs to learn the Spanish terms for the exam!
3. Keep law references as "Art. XX RGC".
`;

    return `
ЯЗЫК ОТВЕТА / RESPONSE LANGUAGE: ${langName}

КРИТИЧЕСКОЕ ПРАВИЛО ЛОКАЛИЗАЦИИ / LOCALIZATION RULE:
${hybridRule}
`;
};

/**
 * Получает приветствие на нужном языке
 */
export const getGreetingPrefix = (language: AILanguage, name: string): string => {
    switch (language) {
        case 'Spanish':
            return `¡Hola, ${name}!`;
        case 'Russian':
            return `Привет, ${name}!`;
        case 'Ukrainian':
            return `Привіт, ${name}!`;
        case 'English':
        default:
            return `Hey ${name}!`;
    }
};
