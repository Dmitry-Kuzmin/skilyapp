import { useEffect, useCallback, useRef } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceFingerprint } from './useDeviceFingerprint';
import { toast } from 'sonner';

/**
 * Хук для управления сессиями пользователя
 * Обеспечивает только 1 активная сессия одновременно
 */
export function useSessionManager() {
  const { profileId } = useUserContext();
  const { deviceInfo, isRegistered } = useDeviceFingerprint();
  const navigate = useNavigate();
  const sessionTokenRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);

  // Получаем ключ для localStorage
  const getStorageKey = useCallback(() => {
    if (!profileId || !deviceInfo) return null;
    return `session_token_${profileId}_${deviceInfo.fingerprint}`;
  }, [profileId, deviceInfo]);

  // Генерируем уникальный токен сессии
  const generateSessionToken = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }, []);

  // Загружаем сохраненный токен из localStorage
  const loadSavedToken = useCallback(() => {
    const storageKey = getStorageKey();
    if (!storageKey) return null;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Проверяем, что токен не старше 30 дней
        const tokenAge = Date.now() - parsed.timestamp;
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 дней
        if (tokenAge < maxAge) {
          return parsed.token;
        } else {
          // Удаляем устаревший токен
          localStorage.removeItem(storageKey);
        }
      }
    } catch (err) {
      console.error('[SessionManager] Ошибка загрузки токена:', err);
    }
    return null;
  }, [getStorageKey]);

  // Сохраняем токен в localStorage
  const saveToken = useCallback((token: string) => {
    const storageKey = getStorageKey();
    if (!storageKey) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        token,
        timestamp: Date.now(),
        fingerprint: deviceInfo?.fingerprint,
      }));
    } catch (err) {
      console.error('[SessionManager] Ошибка сохранения токена:', err);
    }
  }, [getStorageKey, deviceInfo]);

  // Проверяем валидность токена
  const validateToken = useCallback(async (token: string): Promise<boolean> => {
    if (!profileId) return false;

    try {
      const { data, error } = await supabase.functions.invoke('manage-session', {
        body: {
          action: 'check',
          user_id: profileId,
          session_token: token,
        },
      });

      if (error) {
        console.warn('[SessionManager] Ошибка проверки токена (продолжаем работу):', error);
        return true; // В случае ошибки продолжаем работу
      }
      return data?.is_valid === true;
    } catch (err) {
      console.warn('[SessionManager] Ошибка проверки токена (продолжаем работу):', err);
      return true; // В случае ошибки продолжаем работу
    }
  }, [profileId]);

  // Создаем или обновляем сессию
  const createSession = useCallback(async () => {
    if (!profileId || !deviceInfo || !isRegistered) return;
    
    // Предотвращаем повторную инициализацию
    if (hasInitializedRef.current && sessionTokenRef.current) {
      return;
    }

    // Пытаемся загрузить сохраненный токен
    let token = loadSavedToken();
    let isNewToken = false;

    // Если токен есть, проверяем его валидность
    if (token) {
      const isValid = await validateToken(token);
      if (!isValid) {
        // Токен невалиден, создаем новый
        token = generateSessionToken();
        isNewToken = true;
      }
    } else {
      // Токена нет, создаем новый
      token = generateSessionToken();
      isNewToken = true;
    }

    sessionTokenRef.current = token;
    if (isNewToken) {
      saveToken(token);
    }

    // КРИТИЧНО: Fire-and-Forget - не блокируем UI ожиданием ответа
    // Сессия создается в фоне, пользователь видит интерфейс мгновенно
    hasInitializedRef.current = true; // Помечаем как инициализированную сразу
    
    supabase.functions.invoke('manage-session', {
        body: {
          action: 'create',
          user_id: profileId,
          device_fingerprint: deviceInfo.fingerprint,
          session_token: token,
          user_agent: deviceInfo.userAgent,
          platform: deviceInfo.platform,
        },
    }).then(({ data, error }) => {
      if (error) {
        console.warn('[SessionManager] Ошибка создания сессии (продолжаем работу):', error);
        return;
      }

      // Показываем уведомление только если:
      // 1. Были закрыты предыдущие сессии
      // 2. И это действительно новый токен (не восстановленный)
      // 3. И закрытые сессии были с ДРУГОГО устройства (не с того же)
      if (
        data?.previous_sessions_closed > 0 && 
        isNewToken && 
        !data?.closed_same_device
      ) {
        // Закрыты сессии с другого устройства - показываем уведомление
        toast.info('Вход выполнен с нового устройства', {
          description: 'Предыдущая сессия была завершена',
          duration: 5000,
        });
      }
    }).catch((err) => {
      console.warn('[SessionManager] Ошибка создания сессии (продолжаем работу):', err);
    });
  }, [profileId, deviceInfo, isRegistered, generateSessionToken, loadSavedToken, saveToken, validateToken]);

  // Обновляем активность сессии (heartbeat)
  // КРИТИЧНО: Fire-and-Forget - не блокируем UI
  const updateSessionActivity = useCallback(() => {
    if (!profileId || !sessionTokenRef.current) return;

    // Отправляем в фоне, не ждем ответа
    supabase.functions.invoke('manage-session', {
        body: {
          action: 'update',
          user_id: profileId,
          session_token: sessionTokenRef.current,
        },
    }).catch((err) => {
      console.error('[SessionManager] Ошибка обновления сессии:', err);
    });
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

      if (error) {
        console.warn('[SessionManager] Ошибка проверки сессии (продолжаем работу):', error);
        return true; // В случае ошибки продолжаем работу
      }

      if (!data?.is_valid) {
        // Сессия невалидна - пользователь был выгнан
        toast.warning('Сессия завершена', {
          description: 'Вход выполнен с другого устройства',
          duration: 5000,
        });
        
        // КРИТИЧНО: Используем navigate вместо reload - это предотвращает спонтанные перезагрузки
        // Перенаправляем на страницу авторизации
        navigate('/');
        return false;
      }

      return true;
    } catch (err) {
      console.warn('[SessionManager] Ошибка проверки сессии (продолжаем работу):', err);
      return true; // В случае ошибки продолжаем работу
    }
  }, [profileId]);

  // Инициализация сессии (только один раз при монтировании)
  useEffect(() => {
    if (profileId && deviceInfo && isRegistered && !hasInitializedRef.current) {
      createSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, deviceInfo?.fingerprint, isRegistered]);

  // Heartbeat: обновляем активность каждые 10 минут (было 5)
  useEffect(() => {
    if (!profileId || !sessionTokenRef.current) return;

    const interval = setInterval(() => {
      updateSessionActivity();
    }, 10 * 60 * 1000); // 10 минут - снижаем частоту запросов

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


