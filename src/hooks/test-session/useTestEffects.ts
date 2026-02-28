import { useTestUIEffects } from './useTestUIEffects';
import { useTestLifecycle } from './useTestLifecycle';
import { useTestDataEffects } from './useTestDataEffects';
import { useTestAIBehavior } from './useTestAIBehavior';
import { useTestRedemptionEffects } from './useTestRedemptionEffects';
import { useTestBookmarks } from './useTestBookmarks';

export const useTestEffects = (params: any) => {
    const testSessionStartedRef = useRef(false);

    // 1. UI Effects
    useTestUIEffects({
        showQuestionMap: params.showQuestionMap,
        setShowQuestionMap: params.setShowQuestionMap,
        currentIndex: params.currentIndex,
        questionsCount: params.questions.length,
        handleCloseModal: params.handleCloseModal,
        isClosing: params.isClosing,
        isClosingRef: params.isClosingRef
    });

    // 2. Lifecycle & Session
    useTestLifecycle({
        questions: params.questions,
        questionsState: params.questionsState,
        setQuestionsState: params.setQuestionsState,
        initializeExam: params.initializeExam,
        mode: params.mode,
        allQuestionsByBlock: params.allQuestionsByBlock,
        initialTimeBudget: params.initialTimeBudget,
        isRedemptionMode: params.isRedemptionMode,
        redemptionFailedQuestions: params.redemptionFailedQuestions,
        profileId: params.profileId,
        testId: params.testId,
        testSessionStartedRef: testSessionStartedRef,
        getOrCreateSessionId: params.getOrCreateSessionId,
        activeState: params.activeState,
        showFailureModal: params.showFailureModal,
        setShowFailureModal: params.setShowFailureModal,
        setFailureReason: params.setFailureReason,
        navigate: params.navigate,
        answers: params.answers,
        testInfo: params.testInfo,
        russiaExamStatus: params.russiaExamStatus,
        russiaExamStats: params.russiaExamStats
    });

    // 3. Data & Sync
    useTestDataEffects({
        currentIndex: params.currentIndex,
        questions: params.questions,
        loading: params.loading,
        testLanguage: params.testLanguage,
        appLanguage: params.appLanguage,
        isRussia: params.isRussia,
        setSettings: params.setSettings,
        smartDefaultAppliedRef: params.smartDefaultAppliedRef,
        isOnline: params.isOnline,
        testInfo: params.testInfo,
        answers: params.answers,
        startTime: params.startTime,
        mode: params.mode,
        setPendingSync: params.setPendingSync
    });

    // 4. AI Behavior
    useTestAIBehavior({
        mode: params.mode,
        showAIExplanation: params.showAIExplanation,
        currentQuestionId: params.questions[params.currentIndex]?.id,
        handleOpenAIChat: params.handleOpenAIChat
    });

    // 5. Redemption
    useTestRedemptionEffects({
        isRedemptionMode: params.isRedemptionMode,
        redemptionStep: params.redemptionStep,
        redemptionFailedQuestions: params.redemptionFailedQuestions,
        pddCountry: params.pddCountry,
        setFlashcardsLoading: params.setFlashcardsLoading,
        setRedemptionFlashcards: params.setRedemptionFlashcards,
        questionsState: params.questionsState,
        currentIndex: params.currentIndex,
        answers: params.answers,
        setShowReflectionOverlay: params.setShowReflectionOverlay
    });

    // 6. Bookmarks
    const bookmarks = useTestBookmarks({
        profileId: params.profileId,
        currentQuestionId: params.questions[params.currentIndex]?.id,
        isQuestionsLoaded: params.questions.length > 0
    });

    return {
        ...bookmarks,
        testSessionStarted: testSessionStartedRef.current
    };
};
