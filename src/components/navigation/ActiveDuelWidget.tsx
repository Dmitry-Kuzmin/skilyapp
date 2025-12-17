import { memo, useCallback, useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useActiveDuel } from '@/hooks/useActiveDuel';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export const ActiveDuelWidget = memo(function ActiveDuelWidget() {
  const navigate = useNavigate();
  const { activeDuel, clearActiveDuel } = useActiveDuel();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  // ОПТИМИЗАЦИЯ: Мемоизируем вычисления для предотвращения лишних ре-рендеров
  const progress = useMemo(() => {
    if (!activeDuel) return 0;
    return activeDuel.totalQuestions > 0 && activeDuel.currentIndex !== undefined
      ? ((activeDuel.currentIndex + 1) / activeDuel.totalQuestions) * 100 
      : 0;
  }, [activeDuel]);

  // КРИТИЧНО: Проверяем статус дуэли при монтировании и при изменении activeDuel
  useEffect(() => {
    if (!activeDuel) {
      setIsValidating(false);
      setIsValid(false);
      return;
    }

    setIsValidating(true);
    
    // Проверяем статус дуэли на сервере
    const validateDuel = async () => {
      try {
        const { data, error } = await supabase
          .from('duels')
          .select('status')
          .eq('id', activeDuel.duelId)
          .maybeSingle();

        if (error || !data) {
          console.log('[ActiveDuelWidget] ⚠️ Duel not found or error, clearing state');
          clearActiveDuel();
          setIsValid(false);
          setIsValidating(false);
          return;
        }

        // Дуэль валидна только если статус 'active' или 'waiting'
        const isValidStatus = data.status === 'active' || data.status === 'waiting';
        
        if (!isValidStatus) {
          console.log('[ActiveDuelWidget] ⚠️ Duel is finished/cancelled, clearing state');
          clearActiveDuel();
          setIsValid(false);
        } else {
          setIsValid(true);
        }
      } catch (error) {
        console.error('[ActiveDuelWidget] Error validating duel:', error);
        // При ошибке - очищаем для безопасности
        clearActiveDuel();
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateDuel();
  }, [activeDuel, clearActiveDuel]);

  // ОПТИМИЗАЦИЯ: Мемоизируем обработчик для предотвращения лишних ре-рендеров
  const handleReturnToDuel = useCallback(() => {
    if (!activeDuel) return;
    navigate(`/games/duel?duelId=${activeDuel.duelId}`);
  }, [activeDuel, navigate]);

  // Не показываем виджет если нет activeDuel, идет валидация или дуэль невалидна
  if (!activeDuel || isValidating || !isValid) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-primary/10 via-blue-500/10 to-pink-500/10 border border-primary/20 shadow-sm"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center flex-shrink-0 shadow-md">
          <Swords className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground truncate">Дуэль активна</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="font-semibold text-primary">{activeDuel.myScore}</span>
            <span className="text-muted-foreground/50">VS</span>
            <span className="font-semibold text-orange-600">{activeDuel.opponentScore}</span>
            {activeDuel.currentIndex !== undefined && activeDuel.totalQuestions > 0 && (
              <span className="ml-1 text-muted-foreground/70">
                • {activeDuel.currentIndex + 1}/{activeDuel.totalQuestions}
              </span>
            )}
            {activeDuel.mode === 'waiting' && (
              <span className="ml-1 text-blue-600 dark:text-blue-400 font-semibold">
                ⏳ Ожидание
              </span>
            )}
          </div>
        </div>
      </div>
      <Button
        size="sm"
        onClick={handleReturnToDuel}
        className="h-8 px-3 text-xs font-bold bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 shadow-md"
      >
        <ArrowRight className="w-3 h-3 mr-1" />
        Вернуться
      </Button>
    </motion.div>
  );
});

