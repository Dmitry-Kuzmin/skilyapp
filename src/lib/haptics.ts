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
  correctAnswer() {
    this.notificationOccurred('success');
  }

  wrongAnswer() {
    this.notificationOccurred('error');
  }

  // Boost activation
  boostActivated() {
    this.trigger('medium');
  }

  // Special events
  combo() {
    this.trigger('heavy');
  }

  victory() {
    this.trigger('heavy');
    setTimeout(() => this.trigger('medium'), 100);
    setTimeout(() => this.trigger('light'), 200);
  }

  defeat() {
    this.trigger('heavy');
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
