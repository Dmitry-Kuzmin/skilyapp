export interface QuestionData {
    id: string;
    question_ru: string;
    question_es: string;
    question_en: string;
    profileId?: string | null;
    image_url: string | null;
    explanation_ru: string | null;
    explanation_es: string | null;
    explanation_en: string | null;
    topics: {
        title_ru: string;
        title_es: string;
    } | null;
    answer_options?: {
        id: string;
        text_ru: string;
        text_es: string;
        text_en: string;
        is_correct: boolean;
        position: number;
    }[];
}

export interface Answer {
    questionId: string;
    selectedAnswerId: string;
    isCorrect: boolean;
}
