export type OnboardingData = {
    countryCode: string;
    category: string;
    examLanguage: string;
    smartTranslator: boolean;
};

export type OnboardingStep = 'welcome' | 'category' | 'language' | 'finish';
