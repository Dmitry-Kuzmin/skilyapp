/**
 * 🧠 UNIFIED AI PROMPTS SYSTEM
 * Единая система промптов для всего приложения Skily
 * 
 * Используется в:
 * - SmartDebriefCard (разбор ошибок в тестах)
 * - AIChatWidget (общий AI помощник)
 * - Будущие AI фичи
 */

import { getAIInstructionLanguage, getLanguageInstruction } from '@/utils/aiLanguage';
import { generateConflictTable } from '@/components/test-results/aiConstants';

export interface AIStudentStats {
    name: string;
    xp: number;
    streak: number;
    prevWeakness?: string | null;
    trend?: 'rising' | 'stable' | 'falling';
}

export interface AIQuestionContext {
    questionId?: string;
    questionText: string;
    userAnswer?: string;
    correctAnswer: string;
    topic?: string;
    explanation?: string;
    isCorrect?: boolean;
    imageUrl?: string | null;
}

import { getRussiaChatPrompt, getRussiaDebriefPrompt } from './prompts/russia';
import { getSpainChatPrompt, getSpainDebriefPrompt } from './prompts/spain';

/**
 * ГЕНЕРАТОР УЛЬТИМАТИВНЫХ ПРОМПТОВ (V9 - SPLIT CORE)
 * Создает изолированные личности для каждой страны.
 * Используется в AI виджете для общих вопросов.
 */
export function generateAIChatPrompt(
    questionContext?: AIQuestionContext,
    country: string = 'russia',
    studentStats?: AIStudentStats,
    language?: string
): string {
    const targetLang = getAIInstructionLanguage(language); // Язык ответа (напр. 'Russian')

    // Определяем уровень для тональности
    const isBeginner = !studentStats || studentStats.xp < 1000;
    const toneInstruction = isBeginner
        ? "Тон: Наставнический, терпеливый, объясняй 'на пальцах'. Используй аналогии."
        : "Тон: Профессиональный, краткий, 'военный'. Сразу к сути.";

    if (country === 'spain') {
        return getSpainChatPrompt(questionContext, studentStats, isBeginner, toneInstruction, targetLang);
    }

    return getRussiaChatPrompt(questionContext, studentStats, isBeginner, toneInstruction, targetLang);
}

/**
 * ПРОМПТ для разбора ошибок в тестах
 * Используется в SmartDebriefCard
 */
export function generateDebriefPrompt(
    failedQuestions: AIQuestionContext[],
    country: string = 'russia',
    studentStats?: AIStudentStats,
    language?: string
): string {
    const targetLang = getAIInstructionLanguage(language);
    const languageInstruction = getLanguageInstruction(targetLang);

    const isSpain = country === 'spain';
    const isRussianUserInSpain = isSpain && targetLang === 'Russian';

    const legalContext = isSpain
        ? 'Юридическая база: Reglamento General de Circulación (RGC), статьи DGT.'
        : 'Юридическая база: ПДД РФ, разделы и пункты.';

    // ✂️ TRUNCATE: Функция обрезки для экономии токенов
    const truncate = (str: string, limit: number) =>
        str && str.length > limit ? str.substring(0, limit) + '...' : str;

    // Структурированные данные с обрезкой длинных строк
    const structuredErrors = failedQuestions.map(q => {
        const isSkipped = !q.userAnswer || q.userAnswer === 'NO_ANSWER_GIVEN';

        return {
            id: q.questionId || 'unknown',
            question: truncate(q.questionText, 200),
            user_choice: truncate(q.userAnswer || 'NO_ANSWER', 100),
            correct_answer: truncate(q.correctAnswer, 100),
            topic: q.topic || 'General',
            is_skipped: isSkipped
        };
    });

    // Получаем текущие проблемные темы
    const currentTopics = [...new Set(failedQuestions.map(q => q.topic).filter(Boolean))];

    // Проверяем, исправил ли ученик прошлую проблему
    const prevWeaknessFixed = studentStats?.prevWeakness &&
        !currentTopics.some(t => t?.toLowerCase().includes(studentStats.prevWeakness?.toLowerCase() || ''));

    // Определяем уровень опыта для персонализации стиля
    const experienceLevel = studentStats
        ? (studentStats.xp > 5000 ? 'veteran' : studentStats.xp > 1500 ? 'intermediate' : 'beginner')
        : 'unknown';

    // Контекст студента
    const studentContext = studentStats ? `
# 🧠 AI MEMORY — STUDENT PROFILE:
| Параметр | Значение |
|----------|----------|
| Имя | ${studentStats.name} |
| XP | ${studentStats.xp} |
| Уровень | ${experienceLevel === 'veteran' ? 'Опытный (5000+ XP)' : experienceLevel === 'intermediate' ? 'Продвинутый (1500+ XP)' : 'Новичок'} |
| Streak | ${studentStats.streak} дней |
| Прошлая слабость | ${studentStats.prevWeakness || 'Нет данных'} |
| Прогресс | ${prevWeaknessFixed ? '✅ Исправил прошлую проблему!' : 'Работает над ней'} |

# 🎭 ПЕРСОНАЛИЗАЦИЯ ПО УРОВНЮ:
${experienceLevel === 'beginner' ? `
- Стиль: ПОДДЕРЖИВАЮЩИЙ и ОБОДРЯЮЩИЙ
- Приветствие: \"${studentStats.name}, добро пожаловать на борт!\" или \"Отличное начало, ${studentStats.name}!\"
- Не пугай сложными терминами сразу
- Объясняй ПОЧЕМУ правило такое (логику)
` : experienceLevel === 'intermediate' ? `
- Стиль: КОУЧИНГОВЫЙ и ДЕЛОВОЙ
- Приветствие: \"${studentStats.name}, давай разберём детали\" или \"Хорошая практика!\"
- Можешь использовать термины с пояснениями
- Указывай на паттерны ошибок
` : `
- Стиль: ЭКСПЕРТНЫЙ и АНАЛИТИЧЕСКИЙ
- Приветствие: \"${studentStats.name}, интересный кейс!\" или \"Давай покопаемся глубже\"
- Используй профессиональные термины
- Анализируй глубинные причины
`}
${studentStats.streak > 3 ? `🔥 ОБЯЗАТЕЛЬНО похвали за ${studentStats.streak} дней подряд!` : ''}
${prevWeaknessFixed ? `🎉 ОБЯЗАТЕЛЬНО отметь прогресс: \"${studentStats.name} справился с проблемой [${studentStats.prevWeakness}]!\"` : ''}
` : '';

    if (country === 'spain') {
        return getSpainDebriefPrompt(structuredErrors, studentContext, languageInstruction, targetLang);
    }
    return getRussiaDebriefPrompt(structuredErrors, studentContext, languageInstruction);
}
