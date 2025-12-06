import { useEffect, useRef, useContext } from 'react';
// ОПТИМИЗАЦИЯ: Динамический импорт Supabase - не попадает в initial bundle для лендинга
// Это критично для производительности - Supabase не должен грузиться на /
import { UserContext } from '@/contexts/UserContext';

/**
 * ОПТИМИЗАЦИЯ: Фоновые задачи, которые не блокируют рендеринг
 * 
 * Edge Functions выполняются в фоне:
 * - register-device (регистрация устройства)
 * - premium-status (проверка премиум статуса)
 * 
 * Эти запросы не критичны для первого рендера и не должны блокировать UI
 */
export function useBackgroundTasks() {
  // КРИТИЧНО: Безопасное получение UserContext - не выбрасывает ошибку если провайдер отсутствует
  // Это позволяет useBackgroundTasks работать даже если UserProvider еще не загрузился
  const userContext = useContext(UserContext);
  const profileId = userContext?.profileId ?? null;
  const supabaseUser = userContext?.supabaseUser ?? null;
  const hasRegisteredRef = useRef(false);
  const hasSyncedPremiumRef = useRef(false);

  useEffect(() => {
    // Если UserProvider еще не готов, просто выходим - задачи запустятся позже
    if (!userContext || !profileId || !supabaseUser) return;

    // ОПТИМИЗАЦИЯ: Запускаем фоновые задачи с задержкой
    // Даем приоритет критичным данным (dashboard, profile)
    const timer = setTimeout(async () => {
      // ОПТИМИЗАЦИЯ: Динамический импорт Supabase - не попадает в initial bundle
      const { supabase } = await import('@/integrations/supabase/client');
      runBackgroundTasks(profileId, supabaseUser.id, supabase);
    }, 2000); // 2 секунды задержки - UI уже отрисован

    return () => clearTimeout(timer);
  }, [profileId, supabaseUser]);

  const runBackgroundTasks = async (profileId: string, userId: string, supabase: any) => {
    // Задача 1: Регистрация устройства (только 1 раз за сессию)
    if (!hasRegisteredRef.current) {
      registerDeviceBackground(profileId, userId, supabase);
      hasRegisteredRef.current = true;
    }

    // Задача 2: Синхронизация премиум статуса (только 1 раз за сессию)
    if (!hasSyncedPremiumRef.current) {
      syncPremiumStatusBackground(profileId, supabase);
      hasSyncedPremiumRef.current = true;
    }
  };
}

// Фоновая регистрация устройства
async function registerDeviceBackground(profileId: string, userId: string, supabase: any) {
  try {
    console.log('[BackgroundTasks] 📱 Registering device in background...');
    
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
    };

    await supabase.functions.invoke('register-device', {
      body: {
        profile_id: profileId,
        user_id: userId,
        device_info: deviceInfo,
      },
    });

    console.log('[BackgroundTasks] ✅ Device registered');
  } catch (error) {
    // Не критично - не показываем ошибку пользователю
    console.warn('[BackgroundTasks] ⚠️ Device registration failed (non-critical):', error);
  }
}

// Фоновая синхронизация премиум статуса
async function syncPremiumStatusBackground(profileId: string, supabase: any) {
  try {
    console.log('[BackgroundTasks] 👑 Syncing premium status in background...');
    
    await supabase.functions.invoke('premium-status', {
      body: { profile_id: profileId },
    });

    console.log('[BackgroundTasks] ✅ Premium status synced');
  } catch (error) {
    // Не критично - статус уже есть в Super RPC
    console.warn('[BackgroundTasks] ⚠️ Premium sync failed (non-critical):', error);
  }
}

