/**
 * Multi-Country Support Configuration
 * 
 * Этот файл содержит конфигурацию для всех поддерживаемых стран.
 * Добавление новой страны: просто создай новый объект в массиве COUNTRIES.
 */

export interface CountryConfig {
    /** Уникальный код страны (ISO 3166-1 alpha-2) */
    code: string;

    /** Название страны на английском */
    nameEn: string;

    /** Название страны на русском (для UI) */
    nameRu: string;

    /** Название экзамена на английском */
    examNameEn: string;

    /** Флаг-эмодзи страны */
    flag: string;

    /** Название экзаменационного органа (например, DGT, DVLA, etc.) */
    authority: string;

    /** Активна ли страна (для постепенного релиза) */
    isActive: boolean;

    /** Дефолтная локаль для этой страны */
    defaultLocale: string;

    /** Доступные категории прав */
    availableCategories: string[];

    /** Языки, на которых можно сдавать экзамен в этой стране */
    examLanguages: string[];

    /** Валюта страны */
    currency: string;

    /** Доступен ли "умный переводчик" на русский (полезно для Испании) */
    smartTranslatorAvailable?: boolean;

    /** URL официального сайта экзамена */
    officialUrl?: string;

    /** Дополнительные метаданные */
    metadata?: {
        /** Минимальный проходной балл */
        passingScore?: number;
        /** Количество вопросов */
        totalQuestions?: number;
        /** Время на экзамен (в минутах) */
        examDuration?: number;
    };
}

/**
 * Список всех поддерживаемых стран
 */
export const COUNTRIES: CountryConfig[] = [
    {
        code: 'ES',
        nameEn: 'Spain',
        nameRu: 'Испания',
        examNameEn: 'Driving Theory Test',
        flag: '🇪🇸',
        authority: 'DGT',
        isActive: true,
        defaultLocale: 'es-ES',
        availableCategories: ['B'],
        examLanguages: ['es', 'en'],
        currency: 'EUR',
        smartTranslatorAvailable: true,
        officialUrl: 'https://sede.dgt.gob.es',
        metadata: {
            passingScore: 90,
            totalQuestions: 30,
            examDuration: 30,
        },
    },
    {
        code: 'RU',
        nameEn: 'Russia',
        nameRu: 'Россия',
        examNameEn: 'Driving Theory Test',
        flag: '🇷🇺',
        authority: 'ГИБДД',
        isActive: true,
        defaultLocale: 'ru-RU',
        availableCategories: ['A', 'B', 'C', 'D'],
        examLanguages: ['ru'],
        currency: 'RUB',
        officialUrl: 'https://гибдд.рф',
        metadata: {
            passingScore: 90,
            totalQuestions: 20,
            examDuration: 20,
        },
    },
    {
        code: 'PL',
        nameEn: 'Poland',
        nameRu: 'Польша',
        examNameEn: 'Driving Theory Test',
        flag: '🇵🇱',
        authority: 'WORD',
        isActive: false,
        defaultLocale: 'pl-PL',
        availableCategories: ['B'],
        examLanguages: ['pl', 'en', 'ru'],
        currency: 'PLN',
        officialUrl: 'https://www.gov.pl/web/infrastruktura/prawo-jazdy',
        metadata: {
            passingScore: 68,
            totalQuestions: 32,
            examDuration: 25,
        },
    },
    {
        code: 'DE',
        nameEn: 'Germany',
        nameRu: 'Германия',
        examNameEn: 'Driving Theory Test',
        flag: '🇩🇪',
        authority: 'TÜV',
        isActive: false,
        defaultLocale: 'de-DE',
        availableCategories: ['B'],
        examLanguages: ['de', 'en', 'ru', 'es', 'fr', 'it', 'pl', 'pt', 'ro', 'ru', 'tr'],
        currency: 'EUR',
        officialUrl: 'https://www.tuev-sued.de',
        metadata: {
            passingScore: 90,
            totalQuestions: 30,
            examDuration: 45,
        },
    },
];

export const COUNTRY_CONFIG = COUNTRIES.reduce((acc, country) => {
    acc[country.code] = country;
    return acc;
}, {} as Record<string, CountryConfig>);

/**
 * Получить конфигурацию страны по коду
 */
export const getCountryByCode = (code: string): CountryConfig | undefined => {
    return COUNTRIES.find((country) => country.code === code);
};

/**
 * Получить список активных стран
 */
export const getActiveCountries = (): CountryConfig[] => {
    return COUNTRIES.filter((country) => country.isActive);
};

/**
 * Дефолтная страна (Испания - изначальная база)
 */
export const DEFAULT_COUNTRY: CountryConfig = COUNTRIES[0];

/**
 * Ключ для сохранения выбранной страны в localStorage
 */
export const COUNTRY_STORAGE_KEY = 'selected_country';
