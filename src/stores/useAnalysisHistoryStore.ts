import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 🧠 AI Analysis Data Structure
 */
export interface AIDiagnosis {
    greeting?: string;
    summary?: string;
    diagnosis?: string;
    diagnosisTitle?: string;
    diagnosisBody?: string;
    severity: 'low' | 'medium' | 'high';
    tags: string[];
    logicSteps: Array<{
        questionId?: string;
        step: string;
        source: string;
        mnemonic?: string;
    }>;
    mnemonic?: string;
}

/**
 * 📊 Analysis Record
 */
export interface AnalysisRecord {
    id: string; // Уникальный ID анализа (хеш от questionIds)
    timestamp: number;
    country: string;
    responseLanguage?: string;
    questionIds: string[]; // ID вопросов для проверки кэша
    diagnosis: AIDiagnosis;
    studentName?: string;
    errorCount: number;
}

/**
 * 🗄️ Store State
 */
interface AnalysisHistoryState {
    // История всех анализов (по ID)
    analyses: Record<string, AnalysisRecord>;

    // Actions
    saveAnalysis: (analysis: Omit<AnalysisRecord, 'id' | 'timestamp'>) => string;
    getAnalysis: (id: string) => AnalysisRecord | undefined;
    findAnalysisByQuestions: (questionIds: string[], country?: string, responseLanguage?: string) => AnalysisRecord | undefined;
    clearHistory: () => void;
    removeAnalysis: (id: string) => void;

    // Helpers
    getRecentAnalyses: (limit?: number) => AnalysisRecord[];
    getTotalAnalyses: () => number;
}

/**
 * Generate unique ID from question IDs
 */
const generateAnalysisId = (
    questionIds: string[],
    country: string = 'default',
    responseLanguage: string = 'default'
): string => {
    return `${country}:${responseLanguage}:${questionIds.sort().join('-')}`.substring(0, 120);
};

/**
 * 🎯 Zustand Store with Persistence
 */
export const useAnalysisHistoryStore = create<AnalysisHistoryState>()(
    persist(
        (set, get) => ({
            analyses: {},

            /**
             * 💾 Save new analysis to history
             */
            saveAnalysis: (analysis) => {
                const id = generateAnalysisId(
                    analysis.questionIds,
                    analysis.country,
                    analysis.responseLanguage
                );
                const record: AnalysisRecord = {
                    ...analysis,
                    id,
                    timestamp: Date.now(),
                };

                console.log('[AnalysisStore] 💾 Saving analysis:', id);

                set((state) => ({
                    analyses: {
                        ...state.analyses,
                        [id]: record,
                    },
                }));

                return id;
            },

            /**
             * 🔍 Get analysis by ID
             */
            getAnalysis: (id) => {
                const analysis = get().analyses[id];
                if (analysis) {
                    console.log('[AnalysisStore] ✅ Found cached analysis:', id);
                }
                return analysis;
            },

            /**
             * 🔎 Find analysis by question IDs
             */
            findAnalysisByQuestions: (questionIds, country = 'default', responseLanguage = 'default') => {
                const id = generateAnalysisId(questionIds, country, responseLanguage);
                return get().getAnalysis(id);
            },

            /**
             * 🗑️ Clear all history
             */
            clearHistory: () => {
                console.log('[AnalysisStore] 🗑️ Clearing all analyses');
                set({ analyses: {} });
            },

            /**
             * ❌ Remove specific analysis
             */
            removeAnalysis: (id) => {
                console.log('[AnalysisStore] ❌ Removing analysis:', id);
                set((state) => {
                    const { [id]: removed, ...rest } = state.analyses;
                    return { analyses: rest };
                });
            },

            /**
             * 📅 Get recent analyses (sorted by timestamp)
             */
            getRecentAnalyses: (limit = 10) => {
                const allAnalyses = Object.values(get().analyses);
                return allAnalyses
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, limit);
            },

            /**
             * 🔢 Get total number of analyses
             */
            getTotalAnalyses: () => {
                return Object.keys(get().analyses).length;
            },
        }),
        {
            name: 'skily-analysis-history', // LocalStorage key
            version: 2,
        }
    )
);
