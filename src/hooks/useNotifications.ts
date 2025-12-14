import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { sounds } from '@/lib/sounds';
import { isAppActive, sendTelegramNotification } from '@/lib/telegramNotifications';

export interface DuelNotification {
  id: string;
  user_id: string;
  duel_id: string | null;
  type: string;
  title: string;
  message: string;
  icon: string | null;
  metadata: any;
  is_read: boolean;
  created_at: string;
}

// Types of notifications to hide (progress notifications)
// Show only important notifications: finish, timeout, and progress during active duels
// Hide: start, boost, opponent_ahead, opponent_behind, reminder
const MUTED_NOTIFICATION_TYPES = new Set(['start', 'boost', 'opponent_ahead', 'opponent_behind', 'reminder']);
const IMPORTANT_NOTIFICATION_TYPES = new Set(['finish', 'timeout']);
const TOAST_RATE_LIMIT_MS = 4000;
const TELEGRAM_RATE_LIMIT_MS = 60000;

export function useNotifications(options?: { showToasts?: boolean; playSounds?: boolean }) {
  const { profileId } = useUserContext();
  const queryClient = useQueryClient();
  const showToasts = options?.showToasts ?? true;
  const playSounds = options?.playSounds ?? true;
  
  const shouldDebugLog = useMemo(() => {
    if (process.env.NODE_ENV !== 'production') return true;
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage?.getItem('debugNotifications') === '1';
    } catch {
      return false;
    }
  }, []);
  
  const debugLog = useCallback(
    (...args: unknown[]) => {
      if (shouldDebugLog) {
        console.log(...args);
      }
    },
    [shouldDebugLog]
  );
  
  // Отслеживание показанных уведомлений для предотвращения дублей
  const deliveredNotificationIdsRef = useRef<Set<string>>(new Set());
  const lastToastAtRef = useRef(0);
  const lastTelegramAtRef = useRef(0);
  const previousNotificationsRef = useRef<DuelNotification[]>([]);

  // КРИТИЧНО: Загружаем показанные уведомления из localStorage при инициализации
  // Это предотвращает повторный показ toast при смене страницы
  useEffect(() => {
    if (!profileId) return;
    
    try {
      const storageKey = `shown_notifications_${profileId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const shownIds = JSON.parse(stored) as string[];
        const shownSet = new Set(shownIds);
        deliveredNotificationIdsRef.current = shownSet;
        debugLog('[useNotifications] Loaded shown notifications from localStorage:', shownSet.size);
        
        // Очищаем старые записи (старше 24 часов)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const cleaned = Array.from(shownSet).filter(id => {
          // ID содержит timestamp или можем хранить отдельный объект с timestamp
          // Пока просто ограничим размер (макс 1000 ID)
          return true;
        });
        if (cleaned.length !== shownIds.length) {
          localStorage.setItem(storageKey, JSON.stringify(cleaned.slice(0, 1000)));
          deliveredNotificationIdsRef.current = new Set(cleaned);
        }
      }
    } catch (error) {
      console.warn('[useNotifications] Error loading shown notifications:', error);
    }
  }, [profileId, debugLog]);

  // ОПТИМИЗАЦИЯ: Используем React Query с polling вместо real-time WebSocket
  // Это снижает нагрузку на Supabase и упрощает код
  const {
    data: notificationsData = [],
    isLoading,
    refetch,
  } = useQuery<DuelNotification[]>({
    queryKey: ['notifications', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      
      debugLog('[useNotifications] 🔄 Polling notifications for profileId:', profileId);
      
      const { data, error } = await supabase
        .from('duel_notifications')
        .select('*')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('[useNotifications] Error loading notifications:', error);
        throw error;
      }

      debugLog('[useNotifications] ✅ Loaded notifications:', data?.length || 0);
      
      // Фильтруем muted типы на клиенте
      const filtered = (data || []).filter(n => !MUTED_NOTIFICATION_TYPES.has(n.type));
      return filtered;
    },
    enabled: !!profileId,
    // Стратегия "Умного Поллинга" - ОПТИМИЗИРОВАНО для производительности:
    refetchInterval: (query) => {
      // Адаптивный интервал: если данных нет или они старые - проверяем чаще
      // Если данные свежие - реже (экономия ресурсов)
      const data = query.state.data;
      if (!data || data.length === 0) {
        return 30000; // Если нет данных - проверяем каждые 30 сек
      }
      // Если есть данные - проверяем реже (60 сек) для снижения нагрузки
      return 60000; // Увеличено с 30 до 60 секунд для снижения Long Tasks
    },
    refetchOnWindowFocus: true, // Проверять, когда пользователь вернулся на вкладку
    staleTime: 30000, // Увеличено с 10 до 30 секунд - данные считаются свежими дольше
    gcTime: 5 * 60 * 1000, // Хранить в кэше 5 минут
    retry: 1,
    // ОПТИМИЗАЦИЯ: Не обновлять данные если они не изменились (structuralSharing)
    structuralSharing: true,
  });

  // Обработка новых уведомлений при обновлении данных
  useEffect(() => {
    if (!notificationsData.length || !profileId) return;
    
    const previousIds = new Set(previousNotificationsRef.current.map(n => n.id));
    const newNotifications = notificationsData.filter(n => !previousIds.has(n.id));
    
    if (newNotifications.length > 0) {
      debugLog('[useNotifications] 🔔 New notifications detected:', newNotifications.length);
      
      // Сохраняем показанные ID в localStorage для предотвращения повторного показа
      const storageKey = `shown_notifications_${profileId}`;
      
      // Обрабатываем каждое новое уведомление
      newNotifications.forEach((newNotification) => {
        const deliveredSet = deliveredNotificationIdsRef.current;
        
        // КРИТИЧНО: Проверяем, было ли уведомление уже показано (включая localStorage)
        if (deliveredSet.has(newNotification.id)) {
          return; // Уже обработано
        }
        
        // КРИТИЧНО: Не показываем toast для старых уведомлений (созданных более 5 минут назад)
        // Это предотвращает показ toast при первой загрузке или смене страницы
        const notificationAge = Date.now() - new Date(newNotification.created_at).getTime();
        const MAX_AGE_FOR_TOAST_MS = 5 * 60 * 1000; // 5 минут
        
        const isOldNotification = notificationAge > MAX_AGE_FOR_TOAST_MS;
        
        deliveredSet.add(newNotification.id);
        
        // Сохраняем в localStorage
        try {
          const current = Array.from(deliveredSet);
          localStorage.setItem(storageKey, JSON.stringify(current.slice(0, 1000)));
        } catch (error) {
          console.warn('[useNotifications] Error saving shown notifications:', error);
        }
        
        // Убираем иконку из title, если она дублирует icon
        const normalizedTitle = (() => {
          let title = newNotification.title;
          if (newNotification.icon && title.startsWith(newNotification.icon)) {
            title = title.replace(newNotification.icon, '').trim();
          }
          return title;
        })();
        
        // Show toast notification if enabled (только для новых уведомлений, не старше 5 минут)
        if (showToasts && !isOldNotification) {
          const now = Date.now();
          const isImportant = IMPORTANT_NOTIFICATION_TYPES.has(newNotification.type);
          const duration = isImportant ? 5000 : 3000;
          if (!isImportant && now - lastToastAtRef.current < TOAST_RATE_LIMIT_MS) {
            debugLog('[Notifications] 🔇 Toast skipped due to rate limit');
          } else {
            lastToastAtRef.current = now;
            debugLog('[Notifications] Showing toast:', normalizedTitle);
            toast.info(normalizedTitle, {
              description: newNotification.message,
              duration,
            });
          }
        } else if (isOldNotification) {
          debugLog('[Notifications] 🔇 Toast skipped - old notification (created', Math.round(notificationAge / 1000), 'seconds ago)');
        }
        
        // Play sound if enabled
        if (playSounds) {
          const isImportant = ['start', 'finish', 'boost'].includes(newNotification.type);
          if (isImportant) {
            sounds.notificationImportant();
          } else {
            sounds.notificationPop();
          }
        }
        
        // Отправляем в Telegram если пользователь неактивен
        if (!isAppActive() && profileId) {
          const now = Date.now();
          if (now - lastTelegramAtRef.current < TELEGRAM_RATE_LIMIT_MS) {
            debugLog('[Notifications] 📵 Telegram notification throttled');
          } else {
            lastTelegramAtRef.current = now;
            debugLog('[Notifications] User inactive, sending to Telegram');
            sendTelegramNotification({
              userId: profileId,
              templateType: newNotification.type,
              title: normalizedTitle,
              message: newNotification.message,
              icon: newNotification.icon || '📢',
              ctaText: 'Открыть',
              ctaDeeplink: newNotification.duel_id ? `duel_${newNotification.duel_id}` : undefined,
              variables: newNotification.metadata,
              force: false
            }).catch(error => {
              console.error('[Notifications] Telegram send error:', error);
            });
          }
        }
      });
    }
    
    // Обновляем предыдущий список
    previousNotificationsRef.current = notificationsData;
  }, [notificationsData, profileId, showToasts, playSounds, debugLog]);

  // Вычисляем непрочитанные уведомления
  const notifications = notificationsData;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useCallback(async (notificationId: string) => {
    await supabase
      .from('duel_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    // Инвалидируем кэш для обновления данных
    queryClient.invalidateQueries({ queryKey: ['notifications', profileId] });
  }, [profileId, queryClient]);

  const markAllAsRead = useCallback(async () => {
    if (!profileId) return;

    await supabase
      .from('duel_notifications')
      .update({ is_read: true })
      .eq('user_id', profileId)
      .eq('is_read', false);

    // Инвалидируем кэш для обновления данных
    queryClient.invalidateQueries({ queryKey: ['notifications', profileId] });
  }, [profileId, queryClient]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: refetch,
  };
}
