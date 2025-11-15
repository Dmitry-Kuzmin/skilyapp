import { useEffect, useCallback, useRef } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceFingerprint } from './useDeviceFingerprint';
import { toast } from 'sonner';

/**
 * Хук для управления сессиями пользователя
 * Обеспечивает только 1 активную сессию одновременно
 */
export function useSessionManager() {
  const { profileId } = useUserContext();
  const { deviceInfo, isRegistered } = useDeviceFingerprint();
  const sessionTokenRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);

  // Генерируем уникальный токен сессии
  const generateSessionToken = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }, []);

  // Создаем или обновляем сессию
  const createSession = useCallback(async () => {
    if (!profileId || !deviceInfo || !isRegistered) return;

    const token = generateSessionToken();
    sessionTokenRef.current = token;

    try {
      const { data, error } = await supabase.functions.invoke('manage-session', {
        body: {
          action: 'create',
          user_id: profileId,
          device_fingerprint: deviceInfo.fingerprint,
          session_token: token,
          user_agent: deviceInfo.userAgent,
          platform: deviceInfo.platform,
        },
      });

      if (error) throw error;

      if (data?.previous_sessions_closed > 0) {
        // Предыдущие сессии были закрыты
        toast.info('Вход выполнен с нового устройства', {
          description: 'Предыдущая сессия была завершена',
          duration: 5000,
        });
      }
    } catch (err) {
      console.error('[SessionManager] Ошибка создания сессии:', err);
    }
  }, [profileId, deviceInfo, isRegistered, generateSessionToken]);

  // Обновляем активность сессии (heartbeat)
  const updateSessionActivity = useCallback(async () => {
    if (!profileId || !sessionTokenRef.current) return;

    try {
      await supabase.functions.invoke('manage-session', {
        body: {
          action: 'update',
          user_id: profileId,
          session_token: sessionTokenRef.current,
        },
      });
    } catch (err) {
      console.error('[SessionManager] Ошибка обновления сессии:', err);
    }
  }, [profileId]);

  // Проверяем валидность текущей сессии
  const checkSession = useCallback(async () => {
    if (!profileId || !sessionTokenRef.current) return true;

    try {
      const { data, error } = await supabase.functions.invoke('manage-session', {
        body: {
          action: 'check',
          user_id: profileId,
          session_token: sessionTokenRef.current,
        },
      });

      if (error) throw error;

      if (!data?.is_valid) {
        // Сессия невалидна - пользователь был выгнан
        toast.warning('Сессия завершена', {
          description: 'Вход выполнен с другого устройства',
          duration: 5000,
        });
        
        // Перезагружаем страницу для повторной авторизации
        window.location.reload();
        return false;
      }

      return true;
    } catch (err) {
      console.error('[SessionManager] Ошибка проверки сессии:', err);
      return true; // В случае ошибки продолжаем работу
    }
  }, [profileId]);

  // Инициализация сессии
  useEffect(() => {
    if (profileId && deviceInfo && isRegistered) {
      createSession();
    }
  }, [profileId, deviceInfo, isRegistered, createSession]);

  // Heartbeat: обновляем активность каждые 5 минут
  useEffect(() => {
    if (!profileId || !sessionTokenRef.current) return;

    const interval = setInterval(() => {
      updateSessionActivity();
    }, 5 * 60 * 1000); // 5 минут

    heartbeatIntervalRef.current = interval as unknown as number;

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [profileId, updateSessionActivity]);

  // Проверяем сессию при фокусе окна
  useEffect(() => {
    const handleFocus = () => {
      checkSession();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkSession]);

  // Закрываем сессию при размонтировании
  useEffect(() => {
    return () => {
      if (profileId && sessionTokenRef.current) {
        // Не закрываем сессию при размонтировании компонента
        // Сессия будет закрыта автоматически при истечении или при входе с другого устройства
      }
    };
  }, [profileId]);

  return {
    sessionToken: sessionTokenRef.current,
    checkSession,
    updateSessionActivity,
  };
}

