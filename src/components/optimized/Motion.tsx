'use client';

import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';

/**
 * Оптимизированная обертка для Framer Motion
 * Использует LazyMotion с domAnimation (~7KB вместо ~50KB)
 * Для сложных анимаций использует динамическую загрузку полного Framer Motion
 */

// Базовые анимации (только необходимые для 95% случаев)
export const Motion = ({ children }: { children: React.ReactNode }) => (
  <LazyMotion features={domAnimation} strict>
    {children}
  </LazyMotion>
);

// Re-export оптимизированных компонентов
export const MotionDiv = m.div;
export const MotionSpan = m.span;
export const MotionButton = m.button;
export const MotionSection = m.section;
export const MotionArticle = m.article;

export { AnimatePresence, m };

// Динамическая загрузка полного Framer Motion для сложных анимаций
let fullMotion: typeof import('framer-motion') | null = null;

export const loadFullMotion = async (): Promise<typeof import('framer-motion')> => {
  if (fullMotion) return fullMotion;
  
  try {
    fullMotion = await import('framer-motion');
    return fullMotion;
  } catch (error) {
    console.error('Failed to load full Framer Motion:', error);
    throw new Error('Не удалось загрузить полную библиотеку анимаций');
  }
};

// Компоненты для сложных анимаций (загружаются динамически)
export const ComplexMotion = {
  async div(props: any) {
    const motion = await loadFullMotion();
    return motion.m.div(props);
  },
  async section(props: any) {
    const motion = await loadFullMotion();
    return motion.m.section(props);
  },
  // Добавьте другие элементы по необходимости
};