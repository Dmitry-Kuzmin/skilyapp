# 🎯 TestSession Refactoring - Integration Plan

## ✅ Completed: Phase 1-5

### Created Hooks:

1. **`useKeyboardNavigation`** ✅
   - Location: `src/hooks/useKeyboardNavigation.ts`
   - Purpose: Keyboard navigation (1-9, Enter, Space)
   - Integrated: ✅ Yes (already in TestSession.tsx)
   
2. **`useTestProgress`** ✅
   - Location: `src/hooks/useTestProgress.ts`
   - Purpose: Save/load/clear test progress
   - Integrated: ⏳ Partial (needs full integration)
   
3. **`useTestTimer`** ✅
   - Location: `src/hooks/useTestTimer.ts`
   - Purpose: Global test timer (1sec tick)
   - Integrated: ⏳ No (ready to use)
   
4. **`useRedemptionMode`** ✅
   - Location: `src/hooks/useRedemptionMode.ts`
   - Purpose: Redemption mode logic (reflection + drill)
   - Integrated: ⏳ No (ready to use)
   
5. **`useMasteryMode`** ✅
   - Location: `src/hooks/useMasteryMode.ts`
   - Purpose: Mastery rounds logic
   - Integrated: ⏳ No (ready to use)
   
6. **`useRussiaExamMode`** ✅
   - Location: `src/hooks/useRussiaExamMode.ts`
   - Purpose: Russia exam UI state (penalties, failures)
   - Integrated: ⏳ No (ready to use)

### Created Components:

7. **Modals Index** ✅
   - Location: `src/components/test-session/modals/index.ts`
   - Purpose: Centralized modal exports
   - Integrated: ⏳ No (ready to use)

---

## 📋 TODO: Integration Steps

### Step 1: Integrate useTestProgress

**File:** `TestSession.tsx`

**Current code (lines 357-383):**
```typescript
useEffect(() => {
  if (testInfo?.id && questionsState.length > 0 && hasLoadedProgressRef.current !== testInfo.id) {
    // ... restore progress logic
  }
}, [testInfo?.id, questionsState.length, setAnswers, setCurrentIndex]);
```

**Replace with:**
```typescript
const { saveProgress, clearProgress } = useTestProgress({
  testId: testInfo?.id,
  mode,
  questionsLoaded: questionsState.length > 0,
  answers,
  currentIndex,
  startTime,
  answerQuestion: answerQuestionZ,
  jumpToQuestion: jumpToQuestionZ,
  resetExam
});
```

**Then in handleAnswer, replace:**
```typescript
saveTestProgress(testInfo.id, mode, answers, currentIndex, startTime)
```

**With:**
```typescript
await saveProgress()
```

**And in finishTest, replace:**
```typescript
clearTestProgress(testInfo.id)
```

**With:**
```typescript
await clearProgress()
```

---

### Step 2: Integrate useTestTimer

**File:** `TestSession.tsx`

**Current code (lines 853-858):**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    tickTimer();
  }, 1000);
  return () => clearInterval(interval);
}, [tickTimer]);
```

**Replace with:**
```typescript
useTestTimer({ tickTimer });
```

**Save:** ~5 lines

---

### Step 3: Integrate useRedemptionMode

**File:** `TestSession.tsx`

**Current useState (lines 295-304):**
```typescript
const [redemptionStep, setRedemptionStep] = useState<'reflection' | 'drill' | 'completed'>(...);
const [showReflectionOverlay, setShowReflectionOverlay] = useState(false);
const [redemptionOriginalCount, setRedemptionOriginalCount] = useState(redemptionFailedQuestions.length);
const [lastRedemptionAnswerTimestamp, setLastRedemptionAnswerTimestamp] = useState(0);
```

**Replace with:**
```typescript
const {
  redemptionStep,
  setRedemptionStep,
  showReflectionOverlay,
  setShowReflectionOverlay,
  redemptionOriginalCount,
  lastRedemptionAnswerTimestamp,
  setLastRedemptionAnswerTimestamp,
  handleReflectionAnswer
} = useRedemptionMode({
  isEnabled: isRedemptionMode,
  failedQuestions: redemptionFailedQuestions
});
```

**Then in handleAnswer (redemption logic ~50-100 lines):**
Replace complex if/else with:
```typescript
const action = handleReflectionAnswer(isCorrect, currentIndex);
if (action?.action === 'show-overlay') {
  setShowReflectionOverlay(true);
} else if (action?.action === 'transition-to-drill') {
  // transition logic
} // ... etc
```

**Save:** ~10 lines (cleaner logic)

---

### Step 4: Integrate useMasteryMode

**File:** `TestSession.tsx`

**Current useState (lines 481-482):**
```typescript
const [masteryWrongQuestions, setMasteryWrongQuestions] = useState<string[]>([]);
const [masteryRound, setMasteryRound] = useState(1);
```

**Replace with:**
```typescript
const {
  masteryWrongQuestions,
  masteryRound,
  addWrongQuestion,
  startNextRound,
  resetMastery,
  isRoundComplete,
  shouldContinue
} = useMasteryMode({
  isEnabled: mode === 'mastery',
  totalQuestions: questions.length
});
```

**Save:** ~5 lines

---

### Step 5: Integrate useRussiaExamMode

**File:** `TestSession.tsx`

**Current useState (lines 385-388):**
```typescript
const [showPenaltyAlert, setShowPenaltyAlert] = useState(false);
const [penaltyBlock, setPenaltyBlock] = useState<number | null>(null);
const [showFailureModal, setShowFailureModal] = useState(false);
const [failureReason, setFailureReason] = useState<string>('');
```

**Replace with:**
```typescript
const {
  showPenaltyAlert,
  penaltyBlock,
  showFailureModal,
  failureReason,
  triggerPenaltyAlert,
  closePenaltyAlert,
  triggerFailure,
  closeFailureModal
} = useRussiaExamMode({
  isEnabled: mode === 'exam-russia'
});
```

**Save:** ~4 lines

---

### Step 6: Simplify Modal Imports

**File:** `TestSession.tsx`

**Current imports (lines 11-50, scattered):**
```typescript
import { PenaltyAlert } from "@/components/exam/PenaltyAlert";
import { ExamFailureModal } from "@/components/exam/ExamFailureModal";
import { ReportProblemModal } from "@/components/ReportProblemModal";
import { TestExitDialog } from "@/components/test-session/TestExitDialog";
import { TestQuestionMap } from "@/components/test-session/TestQuestionMap";
import { TestSettingsMenu } from "@/components/TestSettingsMenu";
import { ChallengeBankNotification } from "@/components/ChallengeBankNotification";
```

**Replace with:**
```typescript
import {
  PenaltyAlert,
  ExamFailureModal,
  ReportProblemModal,
  TestExitDialog,
  TestQuestionMap,
  TestSettingsMenu,
  ChallengeBankNotification
} from "@/components/test-session/modals";
```

**Save:** ~6 lines

---

## 📊 Expected Results After Full Integration:

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| TestSession.tsx lines | 2979 | ~2850 | **-129 (-4%)** |
| useState count | 28 | ~18 | **-10 (-36%)** |
| useEffect count | ~15 | ~10 | **-5 (-33%)** |
| Custom hooks used | 1 | 7 | **+6** |
| Code readability | Medium | **High** | ✅ |
| Maintainability | Medium | **High** | ✅ |

---

## 🚀 Next Steps (Optional - Phase 6 Full):

### Create Additional Components:

1. **TestHeader Component**
   - Timer display
   - Progress bar
   - Menu button
   - ~100 lines from TestSession

2. **TestControls Component**
   - Navigation buttons (prev/next)
   - Submit button
   - Skip button
   - ~80 lines from TestSession

3. **QuestionDisplay Component**
   - Image rendering
   - Text rendering
   - Answer options
   - ~150 lines from TestSession

---

## 💡 Tips for Integration:

1. **Do one hook at a time** - test after each integration
2. **Search for useState** - find all related state
3. **Update dependencies** - ensure hooks receive correct props
4. **Remove old code** - delete useState lines after verification
5. **Test all modes** - practice, exam-russia, mastery, redemption, etc.

---

## 🎯 Final Goal:

```
TestSession.tsx
├── Smart hooks (90% logic)
├── Dumb UI components (10% layout)
└── Thin glue layer (props passing)

= Clean, maintainable, testable code ✅
```
