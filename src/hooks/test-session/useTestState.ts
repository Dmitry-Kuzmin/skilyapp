import {
    useExamStore,
    selectTimerValue,
    selectActiveState,
    selectSelectedOption,
    selectIsAnswerLocked,
    selectFeedbackStatus,
    selectStreak
} from "@/store/examStore";

export const useTestState = () => {
    // State
    const activeState = useExamStore(selectActiveState);
    const timeLeft = useExamStore(selectTimerValue);
    const selectedOption = useExamStore(selectSelectedOption);
    const isAnswerLocked = useExamStore(selectIsAnswerLocked);
    const feedbackStatus = useExamStore(selectFeedbackStatus);
    const streak = useExamStore(selectStreak);

    // Actions
    const initializeExam = useExamStore(state => state.initializeExam);
    const answerQuestion = useExamStore(state => state.answerQuestion);
    const nextQuestion = useExamStore(state => state.nextQuestion);
    const prevQuestion = useExamStore(state => state.prevQuestion);
    const jumpToQuestion = useExamStore(state => state.jumpToQuestion);
    const restoreSession = useExamStore(state => state.restoreSession);
    const selectOption = useExamStore(state => state.selectOption);
    const setRussiaSelectedOption = useExamStore(state => state.setRussiaSelectedOption);
    const setIsAnswerLocked = useExamStore(state => state.setIsAnswerLocked);
    const setFeedbackStatus = useExamStore(state => state.setFeedbackStatus);
    const resetExam = useExamStore(state => state.resetExam);
    const modifyTime = useExamStore(state => state.modifyTime);
    const tickTimer = useExamStore(state => state.tickTimer);

    return {
        // State
        activeState,
        timeLeft,
        selectedOption,
        isAnswerLocked,
        feedbackStatus,
        streak,

        // Actions
        initializeExam,
        answerQuestion,
        nextQuestion,
        prevQuestion,
        jumpToQuestion,
        restoreSession,
        selectOption,
        setRussiaSelectedOption,
        setIsAnswerLocked,
        setFeedbackStatus,
        resetExam,
        modifyTime,
        tickTimer
    };
};
