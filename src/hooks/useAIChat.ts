/**
 * useAIChat — Хук для работы с AI чатом Skily
 * 
 * Предоставляет удобный API для открытия чата с контекстом вопроса.
 * Использовать в кнопках "Помоги", "Объясни" и т.д.
 * 
 * @example
 * ```tsx
 * const { openWithQuestion, toggle } = useAIChat();
 * 
 * // Открыть с контекстом вопроса
 * openWithQuestion({
 *   question: "Что означает знак STOP?",
 *   correctAnswer: "Обязательная остановка",
 *   isCorrect: false,
 * });
 * 
 * // Просто переключить
 * toggle();
 * ```
 */

import { useCallback } from 'react';
import { useAIChatStore, QuestionContext } from '@/stores/useAIChatStore';

export function useAIChat() {
    const openChat = useAIChatStore((s) => s.openChat);
    const closeChat = useAIChatStore((s) => s.closeChat);
    const toggleChat = useAIChatStore((s) => s.toggleChat);
    const isOpen = useAIChatStore((s) => s.isOpen);

    /**
     * Открывает чат с контекстом текущего вопроса
     * Идеально для кнопки "Помоги" в тестах
     */
    const openWithQuestion = useCallback((context: QuestionContext) => {
        openChat(context);
    }, [openChat]);

    /**
     * Открывает пустой чат без контекста
     */
    const open = useCallback(() => {
        openChat();
    }, [openChat]);

    /**
     * Закрывает чат
     */
    const close = useCallback(() => {
        closeChat();
    }, [closeChat]);

    /**
     * Переключает состояние чата
     */
    const toggle = useCallback(() => {
        toggleChat();
    }, [toggleChat]);

    return {
        isOpen,
        open,
        close,
        toggle,
        openWithQuestion,
    };
}

export default useAIChat;
