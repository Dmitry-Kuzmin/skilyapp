import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveDuelState {
  duelId: string;
  duelCode: string | null;
  mode: 'battle' | 'waiting';
  currentIndex?: number;
  myScore: number;
  opponentScore: number;
  totalQuestions: number;
  myName: string;
  opponentName: string;
  timestamp: number; // Для проверки актуальности
}

const ACTIVE_DUEL_STORAGE_KEY = 'active_duel_state';
const MAX_STORAGE_AGE_MS = 30 * 60 * 1000; // 30 минут

export function useActiveDuel() {
  const [activeDuel, setActiveDuel] = useState<ActiveDuelState | null>(null);
  const [isChecking, setIsChecking] = useState(true);

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

  // Загружаем сохраненное состояние при монтировании (БЕЗ запросов к БД)
  useEffect(() => {
    const saved = localStorage.getItem(ACTIVE_DUEL_STORAGE_KEY);
    if (!saved) {
      setIsChecking(false);
      return;
    }

    try {
      const state: ActiveDuelState = JSON.parse(saved);
      
      // Проверяем возраст сохранения (не старше 30 минут)
      const age = Date.now() - (state.timestamp || 0);
      if (age > MAX_STORAGE_AGE_MS) {
        console.log('[useActiveDuel] Saved state too old, clearing');
        localStorage.removeItem(ACTIVE_DUEL_STORAGE_KEY);
        setIsChecking(false);
        return;
      }

      // КРИТИЧНО: Проверяем возраст - если дуэль старше 15 минут, считаем её зависшей
      const STALE_DUEL_AGE_MS = 15 * 60 * 1000; // 15 минут
      if (age > STALE_DUEL_AGE_MS) {
        console.log('[useActiveDuel] ⚠️ Duel is stale (>15 min), clearing state');
        localStorage.removeItem(ACTIVE_DUEL_STORAGE_KEY);
        setActiveDuel(null);
        setIsChecking(false);
        return;
      }

      // КРИТИЧНО: Проверяем статус дуэли на сервере перед восстановлением
      // Если дуэль уже завершена или не существует - очищаем localStorage
      checkDuelStatus(state.duelId).then((isActive) => {
        if (!isActive) {
          console.log('[useActiveDuel] ⚠️ Duel is no longer active, clearing stale state');
          localStorage.removeItem(ACTIVE_DUEL_STORAGE_KEY);
          setActiveDuel(null);
          setIsChecking(false);
          return;
        }
        
        console.log('[useActiveDuel] ✅ Active duel found in localStorage, restoring state');
        setActiveDuel(state);
        setIsChecking(false);
      }).catch((error) => {
        console.error('[useActiveDuel] Error checking duel status:', error);
        // При ошибке проверки - очищаем состояние для безопасности
        localStorage.removeItem(ACTIVE_DUEL_STORAGE_KEY);
        setActiveDuel(null);
        setIsChecking(false);
      });
      
      return; // Не устанавливаем isChecking здесь, ждем результата проверки
    } catch (error) {
      console.error('[useActiveDuel] Error loading saved state:', error);
      localStorage.removeItem(ACTIVE_DUEL_STORAGE_KEY);
    } finally {
      setIsChecking(false);
    }
  }, []);

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

