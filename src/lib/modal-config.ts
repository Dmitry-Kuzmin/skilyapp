/**
 * Единая конфигурация для всех модалок в приложении
 * 
 * Использование:
 * - Все модалки должны использовать эти настройки по умолчанию
 * - Skeleton анимация применяется автоматически при loading состоянии
 * - Фиксированная высота предотвращает изменение размера при загрузке
 */

export const MODAL_CONFIG = {
  // Размеры для Desktop
  desktop: {
    maxWidth: 'max-w-4xl',
    height: 'h-[85vh]',
    maxHeight: 'max-h-[85vh]',
  },
  
  // Размеры для Mobile/Telegram
  mobile: {
    height: 'h-[90vh]',
    maxHeight: 'max-h-[90vh]',
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
  
  // Настройки для разных типов модалок
  types: {
    shop: {
      desktop: { maxWidth: 'max-w-lg', height: 'h-[85vh]' },
      mobile: { height: 'h-[90vh]' },
    },
    duelPass: {
      desktop: { maxWidth: 'max-w-4xl', height: 'h-[85vh]' },
      mobile: { height: 'h-[90vh]' },
    },
    profile: {
      desktop: { maxWidth: 'max-w-2xl', height: 'h-[85vh]' },
      mobile: { height: 'h-[90vh]' },
    },
    default: {
      desktop: { maxWidth: 'max-w-lg', height: 'h-[85vh]' },
      mobile: { height: 'h-[90vh]' },
    },
  },
} as const;

/**
 * Получить конфигурацию для типа модалки
 */
export function getModalConfig(type: keyof typeof MODAL_CONFIG.types = 'default') {
  return MODAL_CONFIG.types[type] || MODAL_CONFIG.types.default;
}

/**
 * Классы для DialogContent с фиксированной высотой
 */
export function getDialogContentClasses(type: keyof typeof MODAL_CONFIG.types = 'default', isMobile = false) {
  const config = getModalConfig(type);
  const sizeConfig = isMobile ? config.mobile : config.desktop;
  
  return [
    sizeConfig.maxWidth || MODAL_CONFIG.desktop.maxWidth,
    sizeConfig.height || MODAL_CONFIG.desktop.height,
    sizeConfig.maxHeight || MODAL_CONFIG.desktop.maxHeight,
    'overflow-hidden flex flex-col p-0',
  ].filter(Boolean).join(' ');
}

/**
 * Классы для SheetContent с фиксированной высотой
 * Для Telegram Web App используем bottom sheet с поддержкой свайпа
 */
export function getSheetContentClasses(type: keyof typeof MODAL_CONFIG.types = 'default', isMobile = false) {
  const config = getModalConfig(type);
  const sizeConfig = isMobile ? config.mobile : config.desktop;
  
  return [
    sizeConfig.height || MODAL_CONFIG.mobile.height,
    sizeConfig.maxHeight || MODAL_CONFIG.mobile.maxHeight,
    'overflow-hidden flex flex-col p-0',
    // Убираем пустое пространство снизу
    'pb-safe',
  ].filter(Boolean).join(' ');
}

/**
 * Определяет, нужно ли использовать Sheet вместо Dialog
 * Sheet используется для мобильных устройств и Telegram Web App
 */
export function shouldUseSheet(isMobile: boolean, isTelegram: boolean = false) {
  return isMobile || isTelegram;
}


