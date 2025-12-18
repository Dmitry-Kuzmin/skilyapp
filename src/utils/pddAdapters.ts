/**
 * Адаптеры для преобразования данных разных стран к универсальному формату
 * Паттерн Adapter для работы с TestSession
 */

import { UniversalQuestion, UniversalAnswer } from '@/types/pdd';
import { PDDRussiaQuestion, PDDRussiaAnswer } from '@/types/pdd';
import { DGTQuestion } from '@/types/pdd';

/**
 * Преобразует вопрос ПДД России в универсальный формат
 */
export function mapRussiaQuestionToUniversal(
  russiaQ: PDDRussiaQuestion,
  answers?: PDDRussiaAnswer[]
): UniversalQuestion {
  // Если answers не переданы, используем из объекта вопроса
  const questionAnswers = answers || russiaQ.answers || [];

  return {
    id: russiaQ.id,
    text: russiaQ.question_text,
    image: russiaQ.image_url,
    answers: questionAnswers
      .sort((a, b) => a.position - b.position)
      .map((a): UniversalAnswer => ({
        id: a.id,
        text: a.answer_text,
        isCorrect: a.is_correct,
        position: a.position,
      })),
    explanation: russiaQ.explanation,
    topics: russiaQ.topics || [],
    difficulty: russiaQ.difficulty as 'easy' | 'medium' | 'hard' || 'medium',
  };
}

/**
 * Преобразует вопрос DGT (Испания) в универсальный формат
 */
export function mapDGTQuestionToUniversal(dgtQ: DGTQuestion): UniversalQuestion {
  const answers: UniversalAnswer[] = [
    {
      id: 'a',
      text: dgtQ.option_a_es,
      isCorrect: dgtQ.correct_answer === 'a',
      position: 1,
    },
    {
      id: 'b',
      text: dgtQ.option_b_es,
      isCorrect: dgtQ.correct_answer === 'b',
      position: 2,
    },
    {
      id: 'c',
      text: dgtQ.option_c_es,
      isCorrect: dgtQ.correct_answer === 'c',
      position: 3,
    },
  ];

  return {
    id: dgtQ.id,
    text: dgtQ.question_es,
    image: dgtQ.image_filename,
    answers,
    explanation: dgtQ.explanation_es,
    topics: dgtQ.category ? [dgtQ.category] : [],
    difficulty: 'medium',
  };
}

/**
 * Получает URL изображения из разных источников
 */
export function getQuestionImageUrl(image: string | null | undefined): string | null {
  if (!image) return null;
  
  // Если уже полный URL
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }
  
  // Если путь к Supabase Storage
  if (image.startsWith('/storage/') || image.includes('supabase.co')) {
    return image;
  }
  
  // Для DGT может быть просто имя файла
  // Для России - уже полный URL из Storage
  
  return image;
}

