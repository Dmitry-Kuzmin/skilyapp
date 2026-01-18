'use client';

import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';

/**
 * Оптимизированная обертка для Framer Motion
 * Использует LazyMotion с domAnimation (~7KB вместо ~50KB)
 * Для сложных анимаций использует динамическую загрузку полного Framer Motion
 */

// Базовые анимации (только необходимые для 95% случаев)
export const Motion = ({ children }: { children: React.ReactNode }) => (
  <LazyMotion features={domAnimation}>
    {children}
  </LazyMotion>
);

// Создаем объект motion с ленивой загрузкой базовых анимаций
export const motion = {
  div: m.div,
  span: m.span,
  button: m.button,
  section: m.section,
  article: m.article,
  aside: m.aside,
  nav: m.nav,
  li: m.li,
  ul: m.ul,
  h1: m.h1,
  h2: m.h2,
  h3: m.h3,
  p: m.p,
  circle: m.circle,
  svg: m.svg,
  path: m.path,
  g: m.g,
  rect: m.rect,
  // Добавьте другие элементы по необходимости
};

export { AnimatePresence };

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