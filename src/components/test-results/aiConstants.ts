/**
 * Conflict Points: Russia vs Spain Traffic Rules
 * Опасные привычки из РФ, которые убивают на экзамене DGT
 */

export interface ConflictPoint {
    topic: string;
    ruHabit: string;
    esRule: string;
    trap: string;
    emoji?: string;
}

export const RUS_ESP_CONFLICTS: ConflictPoint[] = [
    {
        topic: "Алкоголь",
        ruHabit: '"Пить нельзя" (0.0)',
        esRule: "0.5 г/л разрешено (0.0 для L)",
        trap: 'На вопрос "Можно ли после бокала?" ответ ДА!',
        emoji: "🍷"
    },
    {
        topic: "Круговое движение",
        ruHabit: "Съезд с любой полосы",
        esRule: "Съезд ТОЛЬКО с внешней полосы",
        trap: "За съезд с внутренней — мгновенный провал",
        emoji: "🔄"
    },
    {
        topic: "Обгон справа",
        ruHabit: "Опережение иногда ок",
        esRule: "Категорически запрещен",
        trap: "Даже в пробке — нельзя (кроме carriles VAO)",
        emoji: "➡️"
    },
    {
        topic: "Жёлтый свет",
        ruHabit: '"Проскочить можно"',
        esRule: "Остановка обязательна если безопасно",
        trap: "На экзамене проезд на жёлтый = фол",
        emoji: "🟡"
    },
    {
        topic: "Обочина (Arcén)",
        ruHabit: "Только для остановки",
        esRule: "Можно ехать для облегчения обгона",
        trap: '"Запрещено" — неверный ответ!',
        emoji: "🛣️"
    }
];

/**
 * Генерирует таблицу конфликтных точек для промпта
 */
export function generateConflictTable(): string {
    const header = `| Тема | 🇷🇺 Привычка из РФ | 🇪🇸 Правило Испании | Ловушка |`;
    const separator = `|------|-------------------|---------------------|---------|`;

    const rows = RUS_ESP_CONFLICTS.map(c =>
        `| ${c.emoji ? c.emoji + ' ' : ''}${c.topic} | ${c.ruHabit} | ${c.esRule} | ${c.trap} |`
    );

    return [header, separator, ...rows].join('\n');
}
