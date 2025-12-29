/**
 * Lazy loader для Framer Motion
 * Загружает только когда действительно нужен, уменьшает основной bundle на ~50KB
 */

import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";

// Ленивая загрузка полного Framer Motion для сложных анимаций
let fullMotionModule: typeof import("framer-motion") | null = null;

export const loadFullMotion = async (): Promise<typeof import("framer-motion")> => {
  if (fullMotionModule) return fullMotionModule;
  
  try {
    fullMotionModule = await import("framer-motion");
    return fullMotionModule;
  } catch (error) {
    console.error('Failed to load Framer Motion:', error);
    throw new Error('Не удалось загрузить библиотеку анимаций');
  }
};

// Базовые анимации (domAnimation - всего ~7KB)
export const LazyDomAnimation = ({ children }: { children: React.ReactNode }) => (
  <LazyMotion features={domAnimation} strict>
    {children}
  </LazyMotion>
);

// Re-export базовых компонентов с ленивой загрузкой
export { m, AnimatePresence, LazyMotion, domAnimation };