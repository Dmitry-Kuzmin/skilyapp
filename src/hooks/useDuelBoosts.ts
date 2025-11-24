import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sounds } from '@/lib/sounds';
import { toast } from 'sonner';

interface UseDuelBoostsProps {
  duelId: string;
  profileId: string | null;
  questions: any[];
  currentIndex: number;
  usedBoosts: string[];
  setUsedBoosts: React.Dispatch<React.SetStateAction<string[]>>;
  isAnswered: boolean;
  boosts: any[];
  setEliminatedOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  setTranslationLanguage: React.Dispatch<React.SetStateAction<'ru' | 'en' | null>>;
  setIsAnswered: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setSelectedAnswer: React.Dispatch<React.SetStateAction<string | null>>;
  setUsedBoostsReset: () => void;
  syncBoostInventory: () => Promise<void>;
  finishDuel: () => Promise<void>;
}

export function useDuelBoosts({
  duelId,
  profileId,
  questions,
  currentIndex,
  usedBoosts,
  setUsedBoosts,
  isAnswered,
  boosts,
  setEliminatedOptions,
  setTimeLeft,
  setTranslationLanguage,
  setIsAnswered,
  setCurrentIndex,
  setSelectedAnswer,
  setUsedBoostsReset,
  syncBoostInventory,
  finishDuel,
}: UseDuelBoostsProps) {
  const handleBoostUse = useCallback(async (boostType: string, language?: 'ru' | 'en') => {
    // КРИТИЧЕСКИ ВАЖНО: разблокируем AudioContext при первом использовании буста
    if (!sounds.isUnlocked()) {
      sounds.forceUnlock();
    }

    if (usedBoosts.includes(boostType) || isAnswered) return;

    const boost = boosts.find(b => b.boost_type === boostType);
    if (!boost || boost.quantity <= 0) return;

    setUsedBoosts(prev => [...prev, boostType]);

    try {
      if (boostType === 'fifty_fifty') {
        sounds.boostFiftyFifty();
        const question = questions[currentIndex];
        const incorrectOptions = (question.question_snapshot.answer_options || [])
          .filter((opt: any) => !question.correct_option_ids.includes(opt.id))
          .map((opt: any) => opt.id);

        const toEliminate = incorrectOptions.slice(0, 2);
        setEliminatedOptions(toEliminate);
      } else if (boostType === 'time_extend') {
        sounds.boostTimeExtend();
        setTimeLeft(prev => Math.min(prev + 30000, 60000));
      } else if (boostType === 'hint') {
        sounds.boostHint();
        toast.info('💡 Подсказка: обратите внимание на детали!');
      } else if (boostType === 'skip') {
        sounds.boostSkip();
        setIsAnswered(true);
        setTimeout(() => {
          if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsAnswered(false);
            setSelectedAnswer(null);
            setTimeLeft(60000);
            setUsedBoostsReset();
            setEliminatedOptions([]);
            setTranslationLanguage(null);
          } else {
            finishDuel();
          }
        }, 500);
      } else if (boostType === 'translate' && language) {
        sounds.boostHint();
        setTranslationLanguage(language);
        const langName = language === 'ru' ? 'русский' : 'английский';
        toast.success(`🌐 Перевод на ${langName} применён!`, { duration: 2000 });
      }

      if (!questions || questions.length === 0 || !questions[currentIndex]) {
        toast.error('Вопросы не загружены');
        return;
      }

      await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'use_boost',
          duel_id: duelId,
          profile_id: profileId,
          duel_question_id: questions[currentIndex].id,
          boost_type: boostType,
          language: language,
        },
      });

      await syncBoostInventory();
    } catch (error) {
      console.error('Error using boost:', error);
      setUsedBoosts(prev => prev.filter(b => b !== boostType));
      toast.error('Не удалось использовать буст');
    }
  }, [
    usedBoosts,
    isAnswered,
    boosts,
    questions,
    currentIndex,
    duelId,
    profileId,
    setUsedBoosts,
    setEliminatedOptions,
    setTimeLeft,
    setTranslationLanguage,
    setIsAnswered,
    setCurrentIndex,
    setSelectedAnswer,
    setUsedBoostsReset,
    syncBoostInventory,
    finishDuel,
  ]);

  return { handleBoostUse };
}

