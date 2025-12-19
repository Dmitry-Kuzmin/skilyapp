/**
 * Генерация изображения результата дуэли для шаринга в Telegram Stories
 * Использует Canvas API для создания красивого шаблона
 */

interface DuelResultImageData {
  myScore: number;
  opponentScore: number;
  opponentName: string;
  isWinner: boolean;
  isDraw: boolean;
}

/**
 * Генерирует изображение результата дуэли для шаринга
 * @param data - данные результата дуэли
 * @returns Promise<string> - data URL изображения
 */
export async function generateDuelResultImage(data: DuelResultImageData): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Размеры для Stories (9:16 соотношение)
      const width = 1080;
      const height = 1920;
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Не удалось создать контекст Canvas'));
        return;
      }

      // Фон - градиент
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      if (data.isWinner) {
        gradient.addColorStop(0, '#1e1b4b'); // indigo-950
        gradient.addColorStop(0.5, '#312e81'); // indigo-900
        gradient.addColorStop(1, '#1e1b4b');
      } else if (data.isDraw) {
        gradient.addColorStop(0, '#1e293b'); // slate-800
        gradient.addColorStop(0.5, '#334155'); // slate-700
        gradient.addColorStop(1, '#1e293b');
      } else {
        gradient.addColorStop(0, '#1c1917'); // zinc-900
        gradient.addColorStop(0.5, '#27272a'); // zinc-800
        gradient.addColorStop(1, '#1c1917');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Ambient glow эффекты
      if (data.isWinner) {
        // Синий glow
        const glowGradient1 = ctx.createRadialGradient(width * 0.25, height * 0.25, 0, width * 0.25, height * 0.25, width * 0.5);
        glowGradient1.addColorStop(0, 'rgba(59, 130, 246, 0.4)'); // blue-500
        glowGradient1.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = glowGradient1;
        ctx.fillRect(0, 0, width, height);

        // Индиго glow
        const glowGradient2 = ctx.createRadialGradient(width * 0.75, height * 0.75, 0, width * 0.75, height * 0.75, width * 0.5);
        glowGradient2.addColorStop(0, 'rgba(129, 140, 248, 0.4)'); // indigo-500
        glowGradient2.addColorStop(1, 'rgba(129, 140, 248, 0)');
        ctx.fillStyle = glowGradient2;
        ctx.fillRect(0, 0, width, height);
      }

      // Заголовок
      ctx.fillStyle = data.isWinner ? '#fbbf24' : data.isDraw ? '#60a5fa' : '#a1a1aa'; // yellow-400 / blue-400 / zinc-400
      ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const titleText = data.isWinner ? 'ПОБЕДА!' : data.isDraw ? 'НИЧЬЯ!' : 'РЕЗУЛЬТАТ';
      ctx.fillText(titleText, width / 2, height * 0.15);

      // Трофей (эмодзи или символ)
      if (data.isWinner) {
        ctx.font = '120px Arial';
        ctx.fillText('🏆', width / 2, height * 0.3);
      } else if (data.isDraw) {
        ctx.font = '120px Arial';
        ctx.fillText('🤝', width / 2, height * 0.3);
      }

      // Счет - мои очки
      ctx.fillStyle = '#60a5fa'; // blue-400
      ctx.font = 'bold 120px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(data.myScore.toString(), width * 0.25, height * 0.5);

      // VS
      ctx.fillStyle = '#71717a'; // zinc-500
      ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('VS', width / 2, height * 0.5);

      // Счет - оппонент
      ctx.fillStyle = '#a1a1aa'; // zinc-400
      ctx.font = 'bold 120px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(data.opponentScore.toString(), width * 0.75, height * 0.5);

      // Подписи
      ctx.fillStyle = '#71717a'; // zinc-500
      ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Вы', width * 0.25, height * 0.58);

      // Имя оппонента (обрезаем если слишком длинное)
      const opponentNameDisplay = data.opponentName.length > 15 
        ? data.opponentName.substring(0, 15) + '...' 
        : data.opponentName;
      ctx.fillText(opponentNameDisplay, width * 0.75, height * 0.58);

      // Футер с призывом
      ctx.fillStyle = '#a1a1aa'; // zinc-400
      ctx.font = '36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Попробуй обыграть меня!', width / 2, height * 0.85);

      // Логотип/брендинг внизу
      ctx.fillStyle = '#52525b'; // zinc-600
      ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('DGT Prep', width / 2, height * 0.95);

      // Конвертируем в data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      resolve(dataUrl);
    } catch (error) {
      console.error('[generateDuelResultImage] Error:', error);
      reject(error);
    }
  });
}






