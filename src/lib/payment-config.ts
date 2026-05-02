/**
 * Конфигурация методов оплаты
 * 
 * Используется для управления доступностью различных платежных методов
 * в зависимости от юридического статуса и платформы
 */

export type PaymentMethod = 'telegram_stars' | 'paypal' | 'cryptomus' | 'paddle' | 'ton';

export interface PaymentConfig {
  /** Включен ли PayPal */
  paypalEnabled: boolean;
  /** Включен ли Telegram Stars */
  telegramStarsEnabled: boolean;
  /** Включен ли Paddle (Merchant of Record, не требует autónomo) */
  paddleEnabled: boolean;
  /** Включен ли Cryptomus */
  cryptomusEnabled: boolean;
  /** Включен ли TON (AppKit) */
  tonEnabled: boolean;
}

/**
 * Текущая конфигурация платежей
 * 
 * Telegram Stars работает без регистрации и является основным методом
 * Cryptomus - криптоплатежи без регистрации (для крипто-аудитории)
 * PayPal можно использовать как альтернативу для веб-версии
 * Paddle - Merchant of Record, не требует autónomo (рекомендуется для веб)
 */
export const PAYMENT_CONFIG: PaymentConfig = {
  paypalEnabled: true,
  telegramStarsEnabled: true,
  cryptomusEnabled: true,
  paddleEnabled: true,
  tonEnabled: false, // TON_DISABLED: временно отключен (восстановить: true)
};

/**
 * Получить доступные методы оплаты для текущей платформы
 */
export function getAvailablePaymentMethods(platform: 'telegram' | 'web' | 'mobile'): PaymentMethod[] {
  const methods: PaymentMethod[] = [];

  // Telegram Stars: только внутри настоящего Telegram Mini App
  // Проверяем initData — он непустой только в реальном Telegram (мок оставляет его пустым)
  if (PAYMENT_CONFIG.telegramStarsEnabled) {
    const twa = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
    // Реальный Telegram initData ВСЕГДА содержит auth_date= и hash=
    // Мок и пустые строки не содержат этих полей
    const isMockInitData = !twa?.initData ||
      twa.initData === 'mock_init_data' ||
      twa.initData.startsWith('mock_') ||
      !twa.initData.includes('hash=');
    const hasRealInitData = !isMockInitData;
    if (platform === 'telegram' || hasRealInitData) {
      methods.push('telegram_stars');
    }
  }

  // Cryptomus доступен везде (когда включен и токен есть)
  if (PAYMENT_CONFIG.cryptomusEnabled) {
    // Временно разрешаем без токена для обратной совместимости, 
    // но в идеале нужно проверять через env
    methods.push('cryptomus');
  }

  // Paddle доступен везде (когда включен и токен есть)
  if (PAYMENT_CONFIG.paddleEnabled) {
    // ВАЖНО: Мы могли бы проверять isPaddleEnabled() здесь, 
    // но это может привести к внезапному исчезновению кнопок у пользователя.
    // Вместо этого мы оставим кнопки, но handlePurchase выдаст ошибку,
    // если токена нет, ИЛИ мы можем добавить проверку здесь.
    methods.push('paddle');
  }

  // PayPal доступен везде (когда включен)
  if (PAYMENT_CONFIG.paypalEnabled) {
    methods.push('paypal');
  }
  
  // TON доступен везде (когда включен)
  if (PAYMENT_CONFIG.tonEnabled) {
    methods.push('ton');
  }

  return methods;
}

/**
 * Проверить, доступен ли конкретный метод оплаты
 */
export function isPaymentMethodAvailable(method: PaymentMethod, platform: 'telegram' | 'web' | 'mobile'): boolean {
  const methods = getAvailablePaymentMethods(platform);
  if (!methods.includes(method)) return false;

  // Техническая проверка: есть ли конфиг в env
  if (method === 'paddle') {
    return !!import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  }

  if (method === 'cryptomus') {
    return true; // Cryptomus не требует клиентского токена (только серверный)
  }

  if (method === 'ton') {
    return true; // TON всегда доступен если включен
  }

  return true;
}

/**
 * Получить основной метод оплаты для платформы
 * (приоритет: Stars > Paddle > Cryptomus > PayPal)
 */
export function getPrimaryPaymentMethod(platform: 'telegram' | 'web' | 'mobile'): PaymentMethod | null {
  const methods = getAvailablePaymentMethods(platform);
  return methods[0] || null;
}

