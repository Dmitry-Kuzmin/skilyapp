import React from 'react';

interface MarkdownTextProps {
    text: string;
    className?: string;
}

/**
 * Простой рендерер Markdown для объяснений
 * Поддерживает:
 * - **жирный текст**
 * - *курсив*
 * - Переносы строк
 */
export function MarkdownText({ text, className = '' }: MarkdownTextProps) {
    if (!text) return null;

    // Парсим текст и превращаем в React элементы
    const parseMarkdown = (input: string): React.ReactNode[] => {
        const parts: React.ReactNode[] = [];
        let currentIndex = 0;
        let key = 0;

        // Регулярка для **bold** и *italic*
        const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
        let match;

        while ((match = regex.exec(input)) !== null) {
            // Добавляем обычный текст ДО совпадения
            if (match.index > currentIndex) {
                parts.push(
                    <span key={`text-${key++}`}>
                        {input.substring(currentIndex, match.index)}
                    </span>
                );
            }

            const matched = match[0];

            // Определяем тип форматирования
            if (matched.startsWith('**') && matched.endsWith('**')) {
                // Жирный текст
                const text = matched.slice(2, -2);
                parts.push(
                    <strong key={`bold-${key++}`} className="font-bold text-white">
                        {text}
                    </strong>
                );
            } else if (matched.startsWith('*') && matched.endsWith('*')) {
                // Курсив
                const text = matched.slice(1, -1);
                parts.push(
                    <em key={`italic-${key++}`} className="italic text-gray-300">
                        {text}
                    </em>
                );
            }

            currentIndex = match.index + matched.length;
        }

        // Добавляем остаток текста
        if (currentIndex < input.length) {
            parts.push(
                <span key={`text-${key++}`}>{input.substring(currentIndex)}</span>
            );
        }

        return parts;
    };

    // Разбиваем по переносам строк и парсим каждую строку
    const lines = text.split('\n');

    return (
        <div className={className}>
            {lines.map((line, index) => (
                <p key={index} className="mb-2 last:mb-0">
                    {line.trim() ? parseMarkdown(line) : <br />}
                </p>
            ))}
        </div>
    );
}
