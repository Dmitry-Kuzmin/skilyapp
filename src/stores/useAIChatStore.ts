import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * AI Chat Store — глобальное состояние AI помощника Skily
 * 
 * Преимущества Zustand:
 * 1. Нет prop drilling — вызываем из любого места
 * 2. Сохранение истории при навигации
 * 3. Нет Context Hell — работает без провайдеров
 */

export type AIChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    rating?: 1 | -1; // Feedback для AI
};

export type QuestionContext = {
    question: string;
    correctAnswer: string;
    userAnswer?: string;
    isCorrect: boolean;
    explanation?: string | null;
    explanationRu?: string | null;
    explanationEs?: string | null;
    explanationEn?: string | null;
    topic?: string;
    imageUrl?: string | null;
    testLanguage?: 'es' | 'en';
};

interface AIChatState {
    // UI State
    isOpen: boolean;
    showTranslation: boolean;

    // Chat State
    messages: AIChatMessage[];
    isLoading: boolean;
    smartSuggestions: string[];
    isGeneratingSuggestions: boolean;

    // Context (текущий вопрос)
    questionContext: QuestionContext | null;
    conversationId: string | null;

    // AI Limit Modal
    limitModalOpen: boolean;
    limitData: { currentCount: number; limit: number; message: string };

    // Actions — открытие/закрытие
    openChat: (context?: QuestionContext) => void;
    closeChat: () => void;
    toggleChat: () => void;
    toggleTranslation: () => void;

    // Actions — сообщения
    addMessage: (message: Omit<AIChatMessage, 'id' | 'timestamp'>) => void;
    updateLastMessage: (content: string) => void;
    setMessageRating: (messageId: string, rating: 1 | -1) => void;
    clearMessages: () => void;

    // Actions — состояние
    setLoading: (loading: boolean) => void;
    setSmartSuggestions: (suggestions: string[]) => void;
    setGeneratingSuggestions: (generating: boolean) => void;

    // Actions — лимит
    setLimitModal: (open: boolean, data?: { currentCount: number; limit: number; message: string }) => void;

    // Actions — контекст
    setQuestionContext: (context: QuestionContext | null) => void;
    startNewConversation: () => void;
}

const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateConversationId = () => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useAIChatStore = create<AIChatState>()(
    persist(
        (set, get) => ({
            // Initial State
            isOpen: false,
            showTranslation: false,
            messages: [],
            isLoading: false,
            smartSuggestions: [],
            isGeneratingSuggestions: false,
            questionContext: null,
            conversationId: null,
            limitModalOpen: false,
            limitData: { currentCount: 0, limit: 10, message: '' },

            // Open chat with optional context (for "Help" button)
            openChat: (context) => {
                const state = get();

                // Если новый контекст — начинаем новую беседу
                if (context && JSON.stringify(context) !== JSON.stringify(state.questionContext)) {
                    // Если есть объяснение (пользователь уже ответил), показываем его сразу
                    const initialMessages: AIChatMessage[] = [];
                    if (context.explanation && context.explanation.trim()) {
                        initialMessages.push({
                            id: generateId(),
                            role: 'assistant',
                            content: context.explanation,
                            timestamp: Date.now(),
                        });
                    }

                    set({
                        isOpen: true,
                        questionContext: context,
                        messages: initialMessages,
                        smartSuggestions: [],
                        conversationId: generateConversationId(),
                    });
                } else {
                    set({ isOpen: true });
                }
            },

            closeChat: () => set({
                isOpen: false,
                // НЕ очищаем messages — сохраняем историю
            }),

            toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),

            toggleTranslation: () => set((state) => {
                const newShowTranslation = !state.showTranslation;

                // Если есть контекст и первое сообщение — обновляем его язык
                if (state.questionContext && state.messages.length > 0 && state.messages[0].role === 'assistant') {
                    const explanation = newShowTranslation
                        ? state.questionContext.explanationRu
                        : state.questionContext.explanation;

                    if (explanation?.trim()) {
                        const updatedMessages = [...state.messages];
                        updatedMessages[0] = { ...updatedMessages[0], content: explanation };
                        return { showTranslation: newShowTranslation, messages: updatedMessages };
                    }
                }

                return { showTranslation: newShowTranslation };
            }),

            addMessage: (message) => set((state) => ({
                messages: [
                    ...state.messages,
                    {
                        ...message,
                        id: generateId(),
                        timestamp: Date.now(),
                    },
                ],
            })),

            updateLastMessage: (content) => set((state) => {
                if (state.messages.length === 0) return state;
                const updatedMessages = [...state.messages];
                const lastIndex = updatedMessages.length - 1;
                updatedMessages[lastIndex] = {
                    ...updatedMessages[lastIndex],
                    content: updatedMessages[lastIndex].content + content,
                };
                return { messages: updatedMessages };
            }),

            setMessageRating: (messageId, rating) => set((state) => ({
                messages: state.messages.map(msg =>
                    msg.id === messageId ? { ...msg, rating } : msg
                ),
            })),

            clearMessages: () => set({
                messages: [],
                smartSuggestions: [],
                conversationId: generateConversationId(),
            }),

            setLoading: (loading) => set({ isLoading: loading }),

            setSmartSuggestions: (suggestions) => set({ smartSuggestions: suggestions }),

            setGeneratingSuggestions: (generating) => set({ isGeneratingSuggestions: generating }),

            setLimitModal: (open, data) => set({
                limitModalOpen: open,
                ...(data && { limitData: data }),
            }),

            setQuestionContext: (context) => set({ questionContext: context }),

            startNewConversation: () => set({
                messages: [],
                smartSuggestions: [],
                conversationId: generateConversationId(),
            }),
        }),
        {
            name: 'skily-ai-chat',
            partialize: (state) => ({
                // ✅ Сохраняем историю и контекст для бесшовного UX
                showTranslation: state.showTranslation,
                messages: state.messages,
                questionContext: state.questionContext,
                conversationId: state.conversationId,
                // ❌ НЕ сохраняем: isOpen, isLoading, smartSuggestions (UI state)
            }),
        }
    )
);

// Селекторы для оптимизации ре-рендеров
export const selectIsOpen = (state: AIChatState) => state.isOpen;
export const selectMessages = (state: AIChatState) => state.messages;
export const selectIsLoading = (state: AIChatState) => state.isLoading;
export const selectSmartSuggestions = (state: AIChatState) => state.smartSuggestions;
export const selectQuestionContext = (state: AIChatState) => state.questionContext;
export const selectLimitModalOpen = (state: AIChatState) => state.limitModalOpen;
