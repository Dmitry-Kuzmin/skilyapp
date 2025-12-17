import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ActiveDuelState } from '@/features/duel/shared';
import { ACTIVE_DUEL_STORAGE_KEY, MAX_STORAGE_AGE_MS, STALE_DUEL_AGE_MS } from '@/features/duel/shared';

// Re-export для обратной совместимости
export type { ActiveDuelState } from '@/features/duel/shared';

export function useActiveDuel() {
  // КРИТИЧНО: Синхронная проверка зависших дуэлей ДО инициализации состояния
  // Это предотвращает попытки рендерить компоненты с невалидными данными
  const initialActiveDuel = ((): ActiveDuelState | null => {
    try {
      const saved = localStorage.getItem(ACTIVE_DUEL_STORAGE_KEY);
      if (!saved) return null;

      const state: ActiveDuelState = JSON.parse(saved);
      
      // КРИТИЧНО: Синхронная проверка возраста - если дуэль старше 15 минут, сразу очищаем
      const age = Date.now() - (state.timestamp || 0);
      
      if (age > MAX_STORAGE_AGE_MS) {
        console.log('[useActiveDuel] Saved state too old (>30 min), clearing immediately');
        localStorage.removeItem(ACTIVE_DUEL_STORAGE_KEY);
        return null;
      }

      if (age > STALE_DUEL_AGE_MS) {
        console.log('[useActiveDuel] ⚠️ Duel is stale (>15 min), clearing immediately');
        localStorage.removeItem(ACTIVE_DUEL_STORAGE_KEY);
        return null;
      }

      // Если дуэль не старая - возвращаем состояние для дальнейшей валидации
      return state;
    } catch (error) {
      console.error('[useActiveDuel] Error parsing saved state:', error);
      localStorage.removeItem(ACTIVE_DUEL_STORAGE_KEY);
      return null;
    }
  })();

  const [activeDuel, setActiveDuel] = useState<ActiveDuelState | null>(initialActiveDuel);
  const [isChecking, setIsChecking] = useState(!!initialActiveDuel); // true только если есть состояние для проверки

  // КРИТИЧНО: Объявляем checkDuelStatus ПЕРЕД useEffect, который его использует
  // Это предотвращает TDZ (Temporal Dead Zone) ошибки
  const checkDuelStatus = async (duelId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('duels')
        .select('status')
        .eq('id', duelId)
        .single();
      
      if (error) {
        console.error('[useActiveDuel] Error checking duel status:', error);
        return false;
      }
      
      // Дуэль активна если статус 'active' или 'waiting'
      return data?.status === 'active' || data?.status === 'waiting';
    } catch (error) {
      console.error('[useActiveDuel] Exception checking duel status:', error);
      return false;
    }
  };

  // Валидация статуса дуэли на сервере (только если есть состояние для проверки)
  useEffect(() => {
    if (!initialActiveDuel) {
      // Нет состояния для проверки - уже очищено синхронно
      setIsChecking(false);
      return;
    }

    // КРИТИЧНО: Проверяем статус дуэли на сервере перед восстановлением
    // Если дуэль уже завершена или не существует - очищаем localStorage
    checkDuelStatus(initialActiveDuel.duelId)
      .then((isActive) => {
        if (!isActive) {
          console.log('[useActiveDuel] ⚠️ Duel is no longer active, clearing stale state');
          localStorage.removeItem(ACTIVE_DUEL_STORAGE_KEY);
          setActiveDuel(null);
          setIsChecking(false);
          return;
        }
        
        console.log('[useActiveDuel] ✅ Active duel validated, restoring state');
        setActiveDuel(initialActiveDuel);
        setIsChecking(false);
      })
      .catch((error) => {
        console.error('[useActiveDuel] Error checking duel status:', error);
        // При ошибке проверки - очищаем состояние для безопасности
        localStorage.removeItem(ACTIVE_DUEL_STORAGE_KEY);
        setActiveDuel(null);
        setIsChecking(false);
      });
  }, []); // Пустой массив зависимостей - проверяем только при монтировании

  const saveActiveDuel = useCallback((state: Omit<ActiveDuelState, 'timestamp'>) => {
    const stateWithTimestamp: ActiveDuelState = {
      ...state,
      timestamp: Date.now(),
    };
    
    try {
      localStorage.setItem(ACTIVE_DUEL_STORAGE_KEY, JSON.stringify(stateWithTimestamp));
      setActiveDuel(stateWithTimestamp);
      console.log('[useActiveDuel] ✅ Saved active duel state:', {
        duelId: state.duelId,
        mode: state.mode,
        currentIndex: state.currentIndex,
      });
    } catch (error) {
      console.error('[useActiveDuel] Error saving state:', error);
    }
  }, []);

  const clearActiveDuel = useCallback(() => {
    localStorage.removeItem(ACTIVE_DUEL_STORAGE_KEY);
    setActiveDuel(null);
    console.log('[useActiveDuel] ✅ Cleared active duel state');
  }, []);

  const updateActiveDuel = useCallback((updates: Partial<ActiveDuelState>) => {
    if (!activeDuel) return;
    
    const updated: ActiveDuelState = {
      ...activeDuel,
      ...updates,
      timestamp: Date.now(),
    };
    
    try {
      localStorage.setItem(ACTIVE_DUEL_STORAGE_KEY, JSON.stringify(updated));
      setActiveDuel(updated);
    } catch (error) {
      console.error('[useActiveDuel] Error updating state:', error);
    }
  }, [activeDuel]);

  return {
    activeDuel,
    isChecking,
    saveActiveDuel,
    clearActiveDuel,
    updateActiveDuel,
  };
}

