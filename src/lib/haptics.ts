// Telegram Haptic Feedback utilities
import { getTelegramWebApp } from './telegram';

type HapticType = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'selection_changed';
type NotificationType = 'error' | 'success' | 'warning';

class HapticManager {
  private enabled: boolean = true;

  constructor() {
    // Enable haptics if in Telegram
    const tg = getTelegramWebApp();
    this.enabled = !!tg;
  }

  private trigger(type: HapticType) {
    if (!this.enabled) return;

    try {
      const tg = getTelegramWebApp();
      const hapticFeedback = (tg as any)?.HapticFeedback;
      if (hapticFeedback?.impactOccurred) {
        hapticFeedback.impactOccurred(type);
      }
    } catch (e) {
      console.warn('Haptic feedback failed:', e);
    }
  }

  private notificationOccurred(type: NotificationType) {
    if (!this.enabled) return;

    try {
      const tg = getTelegramWebApp();
      const hapticFeedback = (tg as any)?.HapticFeedback;
      if (hapticFeedback?.notificationOccurred) {
        hapticFeedback.notificationOccurred(type);
      }
    } catch (e) {
      console.warn('Haptic notification failed:', e);
    }
  }

  // Common interactions
  buttonClick() {
    this.trigger('light');
  }

  selectionChanged() {
    this.trigger('selection_changed');
  }

  // Answer feedback
  answerClick() {
    // Легкая вибрация при клике на кнопку ответа
    this.trigger('light');
  }

  correctAnswer() {
    // Приятная вибрация при правильном ответе
    this.notificationOccurred('success');
  }

  wrongAnswer() {
    // Резкая вибрация при неправильном ответе
    this.notificationOccurred('error');
  }

  // Boost activation
  boostActivated() {
    this.trigger('medium');
  }

  // Timer feedback
  timerPulse() {
    // Пульсация при приближении к концу времени (как сердцебиение)
    this.trigger('medium');
  }

  timerCritical() {
    // Более интенсивная пульсация в критический момент
    this.trigger('heavy');
  }

  // Attack feedback
  attackReceived() {
    // Вибрация при получении атаки от соперника
    this.trigger('heavy');
    setTimeout(() => this.trigger('medium'), 100);
  }

  // Screen shake helper (для визуального эффекта)
  screenShake() {
    // Вибрация для screen shake эффекта
    this.trigger('heavy');
  }

  // Special events
  combo() {
    this.trigger('heavy');
  }

  victory() {
    // Серия вибраций при победе
    this.trigger('heavy');
    setTimeout(() => this.trigger('medium'), 100);
    setTimeout(() => this.trigger('light'), 200);
    setTimeout(() => this.notificationOccurred('success'), 300);
  }

  defeat() {
    this.trigger('heavy');
    setTimeout(() => this.notificationOccurred('error'), 100);
  }

  warning() {
    this.notificationOccurred('warning');
  }

  // Enable/disable
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

export const haptics = new HapticManager();
