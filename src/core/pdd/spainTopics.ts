/**
 * Маппинг номеров тем на их названия для Испании (DGT)
 * Данные взяты из официальной программы обучения DGT
 */

export const SPAIN_TOPICS_MAP: Record<string, string> = {
    '01': 'Определения и использование дорог',
    '02': 'Манёвры',
    '03': 'Сигналы',
    '04': 'Остановка',
    '05': 'Использование ТС',
    '06': 'Документация',
    '07': 'Действия при ДТП',
    '08': 'Механика и обслуживание',
    '09': 'Техническая составляющая при вождении',
    '10': 'Прочие вопросы',
};

/**
 * Получить название темы по номеру для Испании
 */
export function getSpainTopicName(topicNumber: string): string {
    return SPAIN_TOPICS_MAP[topicNumber] || `Тема ${topicNumber}`;
}

/**
 * Получить номер темы по названию для Испании (обратный маппинг)
 */
export function getSpainTopicNumber(topicName: string): string | null {
    // Проверяем точное совпадение с названием
    for (const [number, name] of Object.entries(SPAIN_TOPICS_MAP)) {
        if (name === topicName) {
            return number;
        }
    }

    // Пробуем извлечь из формата "Тема 01"
    const match = topicName.match(/Тема (\d+)/);
    return match ? match[1] : null;
}

/**
 * Извлечь номер темы из test_id (например, "topic-01_test-001" -> "01")
 */
export function extractTopicNumberFromTestId(testId: string): string | null {
    const match = testId.match(/^topic-(\d+)_/);
    return match ? match[1] : null;
}
