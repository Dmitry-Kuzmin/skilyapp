/**
 * Генерация красивого сообщения для шаринга дуэли в Telegram
 * @param duelCode - Код дуэли (4 символа)
 * @param betAmount - Сумма ставки (опционально)
 * @returns URL для шаринга в Telegram
 */
export function generateTelegramShareUrl(duelCode: string, betAmount?: number): string {
  const appUrl = window.location.origin; // Base URL of your Telegram Mini App
  const startParam = `startapp=duel_${duelCode}`; // Deep link parameter for Telegram

  // Формируем красивое сообщение с эмодзи
  let message = `⚔️ Дуэль знаний!\n\n`;
  
  // Добавляем информацию о ставке, если есть
  if (betAmount && betAmount > 0) {
    message += `🪙 Ставка: ${betAmount} монет\n\n`;
  }
  
  message += `🚀 Код дуэли: ${duelCode}\n\n`;
  message += `⭐ Присоединяйся и покажи свои знания!\n\n`;
  message += `👉 [Начать дуэль](${appUrl}?${startParam})`; // Direct link to start the duel

  // Кодируем сообщение для URL
  const encodedMessage = encodeURIComponent(message);
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodedMessage}`;
  
  return shareUrl;
}

