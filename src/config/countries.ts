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

    /** Название экзамена на английском */
    examNameEn: string;

    /** Флаг-эмодзи страны */
    flag: string;

    /** Название экзаменационного органа (например, DGT, DVLA, etc.) */
    authority: string;

    /** Активна ли страна (для постепенного релиза) */
    isActive: boolean;

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
        code: 'es',
        nameEn: 'Spain',
        examNameEn: 'Driving Theory Test',
        flag: '🇪🇸',
        authority: 'DGT',
        isActive: true,
        officialUrl: 'https://sede.dgt.gob.es',
        metadata: {
            passingScore: 90,
            totalQuestions: 30,
            examDuration: 30,
        },
    },
    {
        code: 'pl',
        nameEn: 'Poland',
        examNameEn: 'Driving Theory Test',
        flag: '🇵🇱',
        authority: 'WORD',
        isActive: false, // Скоро будет активировано
        officialUrl: 'https://www.gov.pl/web/infrastruktura/prawo-jazdy',
        metadata: {
            passingScore: 68,
            totalQuestions: 32,
            examDuration: 25,
        },
    },
    {
        code: 'de',
        nameEn: 'Germany',
        examNameEn: 'Driving Theory Test',
        flag: '🇩🇪',
        authority: 'TÜV',
        isActive: false, // Скоро будет активировано
        officialUrl: 'https://www.tuev-sued.de',
        metadata: {
            passingScore: 90,
            totalQuestions: 30,
            examDuration: 45,
        },
    },
    {
        code: 'international',
        nameEn: 'International',
        examNameEn: 'Driving Theory',
        flag: '🌍',
        authority: 'International',
        isActive: true,
        metadata: {
            passingScore: 90,
            totalQuestions: 30,
            examDuration: 30,
        },
    },
];

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
