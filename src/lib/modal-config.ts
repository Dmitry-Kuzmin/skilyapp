/**
 * Единая конфигурация для всех модалок в приложении
 * 
 * Использование:
 * - Все модалки должны использовать эти настройки по умолчанию
 * - Skeleton анимация применяется автоматически при loading состоянии
 * - Фиксированная высота предотвращает изменение размера при загрузке
 * 
 * Размеры стандартизированы (кратно 80px) для единообразия:
 * - small: 400px (5 * 80) - маленькие формы, подтверждения
 * - medium: 560px (7 * 80) - стандартные модалки
 * - large: 720px (9 * 80) - большие модалки с таблицами
 * - xlarge: 880px (11 * 80) - очень большие (duelPass, leaderboard)
 * - xxlarge: 1040px (13 * 80) - максимальные (админ панели)
 */

export const MODAL_CONFIG = {
  // Размеры для Desktop (стандартизированы, кратно 80px)
  desktop: {
    maxWidth: 'max-w-[720px]', // 9 * 80 = 720px (large)
    maxHeight: 'max-h-[80vh]', // 75-80% высоты экрана
  },
  
  // Размеры для Mobile/Telegram
  mobile: {
    maxHeight: 'max-h-[85vh]', // 75-85% высоты экрана
  },
  
  // Общие настройки
  common: {
    // Классы для skeleton анимации
    skeletonBase: 'animate-pulse rounded-md bg-muted',
    skeletonShimmer: 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
    
    // Задержка перед показом skeleton (мс)
    skeletonDelay: 100,
    
    // Интервал автообновления данных (мс)
    autoRefreshInterval: 30000,
  },
  
  // Настройки для разных типов модалок (размеры кратно 80px)
  types: {
    // Маленькие формы, подтверждения, алерты
    small: {
      desktop: { maxWidth: 'max-w-[400px]', maxHeight: 'max-h-[75vh]' }, // 5 * 80 = 400px
      mobile: { maxHeight: 'max-h-[80vh]' },
    },
    // Магазин, стандартные формы
    shop: {
      desktop: { maxWidth: 'max-w-[560px]', maxHeight: 'max-h-[80vh]' }, // 7 * 80 = 560px
      mobile: { maxHeight: 'max-h-[85vh]' },
    },
    // Профиль, настройки
    profile: {
      desktop: { maxWidth: 'max-w-[720px]', maxHeight: 'max-h-[80vh]' }, // 9 * 80 = 720px
      mobile: { maxHeight: 'max-h-[85vh]' },
    },
    // Duel Pass, Leaderboard - большие модалки
    duelPass: {
      desktop: { maxWidth: 'max-w-[880px]', maxHeight: 'max-h-[85vh]' }, // 11 * 80 = 880px
      mobile: { maxHeight: 'max-h-[90vh]' },
    },
    // Админ панели, редакторы - максимальные
    admin: {
      desktop: { maxWidth: 'max-w-[1040px]', maxHeight: 'max-h-[90vh]' }, // 13 * 80 = 1040px
      mobile: { maxHeight: 'max-h-[90vh]' },
    },
    // Стандартная модалка по умолчанию
    default: {
      desktop: { maxWidth: 'max-w-[560px]', maxHeight: 'max-h-[80vh]' }, // 7 * 80 = 560px
      mobile: { maxHeight: 'max-h-[85vh]' },
    },
  },
} as const;

/**
 * Тип модалки
 * 
 * Рекомендации по выбору размера:
 * - small (400px): подтверждения, алерты, простые формы
 * - shop (560px): магазин, стандартные формы с несколькими полями
 * - profile (720px): профиль, настройки, формы с таблицами
 * - duelPass (880px): большие модалки с большим количеством контента
 * - admin (1040px): админ панели, редакторы, максимальные модалки
 * - default (560px): стандартная модалка, если не уверены
 */
export type ModalType = keyof typeof MODAL_CONFIG.types;

/**
 * Получить конфигурацию для типа модалки
 * 
 * @param type - Тип модалки (small, shop, profile, duelPass, admin, default)
 * @returns Конфигурация с размерами для desktop и mobile
 */
export function getModalConfig(type: ModalType = 'default') {
  return MODAL_CONFIG.types[type] || MODAL_CONFIG.types.default;
}

/**
 * Классы для DialogContent с фиксированной высотой
 */
export function getDialogContentClasses(type: keyof typeof MODAL_CONFIG.types = 'default', isMobile = false) {
  const config = getModalConfig(type);
  const sizeConfig = isMobile ? config.mobile : config.desktop;
  const fallback = isMobile ? MODAL_CONFIG.mobile : MODAL_CONFIG.desktop;
  const widthClass = isMobile ? undefined : (sizeConfig.maxWidth || MODAL_CONFIG.desktop.maxWidth);
  
  return [
    widthClass,
    sizeConfig.maxHeight || fallback.maxHeight,
    'overflow-hidden flex flex-col p-0',
    'overflow-x-hidden', // Предотвращаем горизонтальный скролл
  ].filter(Boolean).join(' ');
}

/**
 * Классы для SheetContent с фиксированной высотой
 * Для Telegram Web App используем bottom sheet с поддержкой свайпа
 */
export function getSheetContentClasses(type: keyof typeof MODAL_CONFIG.types = 'default', isMobile = false) {
  const config = getModalConfig(type);
  const sizeConfig = isMobile ? config.mobile : config.desktop;
  const fallback = isMobile ? MODAL_CONFIG.mobile : MODAL_CONFIG.desktop;
  
  return [
    sizeConfig.maxHeight || fallback.maxHeight,
    'overflow-hidden flex flex-col p-0',
    'overflow-x-hidden', // Предотвращаем горизонтальный скролл
    // Убираем пустое пространство снизу
    'pb-safe',
  ].filter(Boolean).join(' ');
}

/**
 * Определяет, нужно ли использовать Sheet вместо Dialog
 * Sheet используется ТОЛЬКО в Telegram Web App (со свайпом снизу)
 * В браузере (включая мобильный) всегда используется Dialog по центру
 */
export function shouldUseSheet(isMobile: boolean, isTelegram: boolean = false) {
  // В браузере (не Telegram) - всегда Dialog, даже на мобильных
  // В Telegram Web App - Sheet снизу со свайпом
  return isTelegram; // Только для Telegram Web App
}


