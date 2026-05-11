import { speedQuestionsDB, SpeedQuestion, SpeedOption } from './speedQuestions';

export type { SpeedQuestion, SpeedOption };

const SUPPORTED_LANGS = ['ru', 'es', 'en'] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const getQuestionsForLang = (lang: string): SpeedQuestion[] => {
  const key = (SUPPORTED_LANGS as readonly string[]).includes(lang)
    ? (lang as SupportedLang)
    : 'es';
  const questions = speedQuestionsDB[key];
  if (Array.isArray(questions) && questions.length > 0) return questions;
  const fallback = speedQuestionsDB['es'];
  return Array.isArray(fallback) && fallback.length > 0 ? fallback : [];
};
