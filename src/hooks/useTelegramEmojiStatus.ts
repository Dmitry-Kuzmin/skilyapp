import { useCallback } from 'react';
import { setTelegramEmojiStatus, requestTelegramEmojiStatusAccess, isVersionAtLeast, getTelegramWebApp } from '@/lib/telegram';

/**
 * Управление эмодзи-статусом пользователя через Telegram (Bot API 8.0+).
 *
 * Использование:
 *   const { isSupported, setEmojiStatus, requestAccess } = useTelegramEmojiStatus();
 *   // Показать нативный диалог «установить статус»:
 *   setEmojiStatus('5368324170671202286', { duration: 3600 });
 */
export function useTelegramEmojiStatus() {
  const isSupported = isVersionAtLeast('8.0') &&
    typeof (getTelegramWebApp() as any)?.setEmojiStatus === 'function';

  /**
   * Открыть нативный диалог Telegram для установки эмодзи-статуса.
   * @param customEmojiId — ID кастомного эмодзи (получается из стикер-пака через Bot API)
   * @param duration — продолжительность в секундах (опционально, 0 = навсегда)
   * @param onSet — callback при успешной установке
   * @param onFailed — callback при ошибке/отмене
   */
  const setEmojiStatus = useCallback((
    customEmojiId: string,
    options?: { duration?: number; onSet?: () => void; onFailed?: () => void }
  ): boolean => {
    if (!isSupported) return false;

    const webApp = getTelegramWebApp() as any;

    if (options?.onSet || options?.onFailed) {
      const handleSet = () => options.onSet?.();
      const handleFailed = () => options.onFailed?.();

      webApp?.onEvent?.('emojiStatusSet', handleSet);
      webApp?.onEvent?.('emojiStatusFailed', handleFailed);

      // Cleanup after 15 seconds
      setTimeout(() => {
        webApp?.offEvent?.('emojiStatusSet', handleSet);
        webApp?.offEvent?.('emojiStatusFailed', handleFailed);
      }, 15_000);
    }

    return setTelegramEmojiStatus(customEmojiId, options?.duration);
  }, [isSupported]);

  /**
   * Запросить разрешение на автоматическое обновление статуса ботом.
   * @param callback — получит true если доступ выдан
   */
  const requestAccess = useCallback((callback?: (granted: boolean) => void): boolean => {
    if (!isSupported) { callback?.(false); return false; }

    const webApp = getTelegramWebApp() as any;

    if (callback) {
      const handleResult = (params: { status: string }) => {
        callback(params?.status === 'allowed');
        webApp?.offEvent?.('emojiStatusAccessRequested', handleResult);
      };
      webApp?.onEvent?.('emojiStatusAccessRequested', handleResult);
    }

    return requestTelegramEmojiStatusAccess();
  }, [isSupported]);

  return { isSupported, setEmojiStatus, requestAccess };
}
