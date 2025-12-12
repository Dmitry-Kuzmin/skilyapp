/**
 * Конфигурация методов оплаты
 * 
 * Используется для управления доступностью различных платежных методов
 * в зависимости от юридического статуса и платформы
 */

export type PaymentMethod = 'telegram_stars' | 'paypal' | 'cryptomus' | 'paddle';

export interface PaymentConfig {
  /** Включен ли PayPal */
  paypalEnabled: boolean;
  /** Включен ли Telegram Stars */
  telegramStarsEnabled: boolean;
  /** Включен ли Cryptomus */
  cryptomusEnabled: boolean;
  /** Включен ли Paddle (Merchant of Record, не требует autónomo) */
  paddleEnabled: boolean;
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
  paypalEnabled: true,  // Можно использовать без autónomo (на начальном этапе)
  telegramStarsEnabled: true, // Работает без регистрации
  cryptomusEnabled: true, // Криптоплатежи без регистрации
  paddleEnabled: true, // Merchant of Record, не требует autónomo (рекомендуется для веб)
};

/**
 * Получить доступные методы оплаты для текущей платформы
 */
export function getAvailablePaymentMethods(platform: 'telegram' | 'web' | 'mobile'): PaymentMethod[] {
  const methods: PaymentMethod[] = [];

  // Telegram Stars доступен только в Telegram Mini App
  if (PAYMENT_CONFIG.telegramStarsEnabled && platform === 'telegram') {
    methods.push('telegram_stars');
  }

  // Cryptomus доступен везде (когда включен)
  if (PAYMENT_CONFIG.cryptomusEnabled) {
    methods.push('cryptomus');
  }

  // Paddle доступен везде (когда включен)
  // ВАЖНО: Paddle доступен на всех платформах (web, mobile, telegram)
  // В Telegram Mini App можно использовать и Paddle, и Stars (пользователь выбирает)
  if (PAYMENT_CONFIG.paddleEnabled) {
    methods.push('paddle');
  }

  // PayPal доступен везде (когда включен)
  if (PAYMENT_CONFIG.paypalEnabled) {
    methods.push('paypal');
  }

  return methods;
}

/**
 * Проверить, доступен ли конкретный метод оплаты
 */
export function isPaymentMethodAvailable(method: PaymentMethod, platform: 'telegram' | 'web' | 'mobile'): boolean {
  return getAvailablePaymentMethods(platform).includes(method);
}

/**
 * Получить основной метод оплаты для платформы
 * (приоритет: Stars > Paddle > Cryptomus > PayPal)
 */
export function getPrimaryPaymentMethod(platform: 'telegram' | 'web' | 'mobile'): PaymentMethod | null {
  const methods = getAvailablePaymentMethods(platform);
  return methods[0] || null;
}

