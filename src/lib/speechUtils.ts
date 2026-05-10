/**
 * Утилиты для подготовки текста к озвучке (TTS).
 *
 * Используется и AIChatWidget (плавающий чат), и AIWidget (в тестах/дуэлях) —
 * единая точка правды для очистки.
 */

/**
 * Уберём markdown/виджеты/эмодзи перед отправкой в TTS — иначе движок будет
 * проговаривать "звёздочка", "решётка", "флаг Испании" и т.п.
 *
 * Цифры сохраняем (нужны для номеров знаков, скоростей и т.д.).
 * Удаляем: pictographic emoji, regional indicators (флаги),
 *          variation selector (FE0F), zero-width joiner (200D).
 */
export const cleanForSpeech = (text: string): string =>
    text
        .replace(/\[\s*(?:WIDGET|W)\s*:[^\]]+\]/gi, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/^\s*\|.*\|\s*$/gm, '') // markdown table rows
        .replace(/^\s*[-*_]{3,}\s*$/gm, '')
        .replace(/[*_~#>]+/g, '')
        // Pictographic emojis (😀 🚗 ⚠️ ...)
        .replace(/\p{Extended_Pictographic}/gu, '')
        // Regional indicator pairs (флаги: 🇪🇸 🇷🇺 ...)
        .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')
        // Emoji modifiers/joiners that остались висеть после удаления базы
        .replace(/[\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
