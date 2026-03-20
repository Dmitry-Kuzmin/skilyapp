/**
 * Генерация красивого сообщения для шаринга дуэли в Telegram
 * @param duelCode - Код дуэли (4 символа)
 * @param betAmount - Сумма ставки (опционально)
 * @param translations - Объект с переведенными строками (опционально)
 * @returns URL для шаринга в Telegram
 */
export function generateTelegramShareUrl(
  duelCode: string, 
  betAmount?: number,
  translations?: {
    title: string;
    bet: string;
    code: string;
    description: string;
    cta: string;
  }
): string {
  const appUrl = window.location.origin; // Base URL of your Telegram Mini App
  const startParam = `startapp=duel_${duelCode}`; // Deep link parameter for Telegram

  // Используем переводы или дефолтные русские строки
  const t = translations || {
    title: "⚔️ Дуэль знаний!\n\n",
    bet: "🪙 Ставка: {{amount}} монет\n\n",
    code: "🚀 Код дуэли: {{code}}\n\n",
    description: "⭐ Присоединяйся и покажи свои знания!\n\n",
    cta: "👉 Начать дуэль"
  };

  let message = t.title;
  
  if (betAmount && betAmount > 0) {
    message += t.bet.replace('{{amount}}', betAmount.toString());
  }
  
  message += t.code.replace('{{code}}', duelCode);
  message += t.description;
  message += `[${t.cta}](${appUrl}?${startParam})`; // Direct link to start the duel

  // Кодируем сообщение для URL
  const encodedMessage = encodeURIComponent(message);
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodedMessage}`;
  
  return shareUrl;
}
