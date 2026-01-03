/**
 * Test Session Modals
 * 
 * Централизованный экспорт всех модальных окон для TestSession
 */

// Re-export existing modals (already in components/)
export { TestExitDialog } from '../TestExitDialog';
export { TestQuestionMap } from '../TestQuestionMap';
export { ReportProblemModal } from '@/components/ReportProblemModal';
export { PenaltyAlert } from '@/components/exam/PenaltyAlert';
export { ExamFailureModal } from '@/components/exam/ExamFailureModal';
export { TestSettingsMenu } from '@/components/TestSettingsMenu';
export { ChallengeBankNotification } from '@/components/ChallengeBankNotification';

// TODO Phase 6: Create additional modal wrappers if needed
// Example: ReflectionOverlayModal, MasteryRoundModal, etc.
