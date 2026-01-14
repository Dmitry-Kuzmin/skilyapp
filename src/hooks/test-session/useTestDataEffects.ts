import { useEffect, useRef } from 'react';
import { toast } from "sonner";
import { preloadImage } from "@/utils/imageUtils";
import { saveTestProgress } from "@/utils/testStorage";

interface TestDataEffectsParams {
    currentIndex: number;
    questions: any[];
    loading: boolean;
    testLanguage: 'es' | 'en';
    appLanguage: string;
    isRussia: boolean;
    setSettings: (s: any) => void;
    smartDefaultAppliedRef: React.MutableRefObject<boolean>;
    isOnline: boolean;
    testInfo: any;
    answers: any[];
    startTime: number;
    mode: string;
    setPendingSync: (s: boolean) => void;
}

export const useTestDataEffects = ({
    currentIndex,
    questions,
    loading,
    testLanguage,
    appLanguage,
    isRussia,
    setSettings,
    smartDefaultAppliedRef,
    isOnline,
    testInfo,
    answers,
    startTime,
    mode,
    setPendingSync
}: TestDataEffectsParams) => {
    // 1. Preload Next Images
    useEffect(() => {
        if (questions.length === 0 || loading) return;

        const preloadNextImages = async () => {
            const imagesToPreload: (string | null | undefined)[] = [];
            if (currentIndex + 1 < questions.length && questions[currentIndex + 1]?.image_url) {
                imagesToPreload.push(questions[currentIndex + 1].image_url);
            }
            for (let i = 2; i <= 5 && currentIndex + i < questions.length; i++) {
                if (questions[currentIndex + i]?.image_url) {
                    imagesToPreload.push(questions[currentIndex + i].image_url);
                }
            }
            if (currentIndex > 0 && questions[currentIndex - 1]?.image_url) {
                imagesToPreload.push(questions[currentIndex - 1].image_url);
            }

            if (imagesToPreload.length > 0) {
                preloadImage(imagesToPreload[0]).catch(() => { });
                if (imagesToPreload.length > 1) {
                    setTimeout(() => {
                        imagesToPreload.slice(1).forEach((url) => {
                            preloadImage(url).catch(() => { });
                        });
                    }, 200);
                }
            }
        };

        const timeoutId = setTimeout(preloadNextImages, 300);
        return () => clearTimeout(timeoutId);
    }, [currentIndex, questions, loading]);

    // 2. Settings & Language Sync
    useEffect(() => {
        localStorage.setItem('test-language', testLanguage);
    }, [testLanguage]);

    useEffect(() => {
        if (!isRussia && (testLanguage === 'es' || testLanguage === 'en') && !smartDefaultAppliedRef.current) {
            const shouldBeEnabled = appLanguage !== testLanguage;
            setSettings({ smartVocabularyEnabled: shouldBeEnabled });
            smartDefaultAppliedRef.current = true;
        }
    }, [testLanguage, appLanguage, isRussia, setSettings, smartDefaultAppliedRef]);

    // 3. Online/Offline Sync
    const prevOnlineRef = useRef(isOnline);
    useEffect(() => {
        if (!prevOnlineRef.current && isOnline) {
            setPendingSync(true);
            if (testInfo?.id && answers.length > 0) {
                toast.success('Соединение восстановлено', {
                    description: 'Синхронизируем ваши ответы...',
                    duration: 3000,
                });

                saveTestProgress(
                    testInfo.id,
                    mode,
                    answers.map(a => ({
                        questionId: a.questionId,
                        selectedAnswerId: a.selectedAnswerId,
                        isCorrect: a.isCorrect,
                        timestamp: Date.now(),
                    })),
                    currentIndex,
                    startTime
                ).then(() => {
                    setPendingSync(false);
                    toast.success('Прогресс синхронизирован', { duration: 2000 });
                }).catch((error) => {
                    console.error('[TestSession] Error syncing progress:', error);
                    setPendingSync(false);
                });
            }
        }

        if (prevOnlineRef.current && !isOnline) {
            toast.warning('Потеряно соединение с интернетом', {
                description: 'Ваши ответы сохраняются локально',
                duration: 5000,
            });
        }
        prevOnlineRef.current = isOnline;
    }, [isOnline, testInfo, answers, currentIndex, startTime, mode, setPendingSync]);
};
