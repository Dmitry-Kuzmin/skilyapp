import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const [notifications, setNotifications] = useState<DuelNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
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
  const deliveredNotificationIdsRef = useRef<Set<string>>(new Set());
  const lastToastAtRef = useRef(0);
  const lastTelegramAtRef = useRef(0);

  // Глобальный реестр активных подписок для предотвращения дубликатов
  const activeSubscriptionsRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!profileId) {
      debugLog('[useNotifications] No profileId, skipping subscription');
      return;
    }

    debugLog('[useNotifications] ✅ Setting up notifications for profileId:', profileId);
    
    // Проверяем, не создана ли уже подписка для этого profileId
    const channelName = `duel_notifications_${profileId}`;
    if (activeSubscriptionsRef.current.has(channelName)) {
      debugLog('[useNotifications] ⚠️ Subscription already exists, skipping duplicate');
      // Загружаем уведомления, если подписка уже есть
      loadNotifications();
      return;
    }
    
    // Load existing notifications first
    loadNotifications();

    // Realtime подписка на новые уведомления
    // Используем более простой фильтр для лучшей совместимости с realtime
    debugLog('[useNotifications] Creating Realtime channel for profileId:', profileId);
    debugLog('[useNotifications] ProfileId type:', typeof profileId, 'value:', profileId);
    
    // Создаем канал с уникальным именем
    const channelName = `duel_notifications_${profileId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'duel_notifications',
          // Убираем фильтр - RLS политика будет фильтровать на сервере
          // Это предотвращает ошибку "mismatch between server and client bindings"
          // RLS политика все равно проверяет, что user_id совпадает с profile_id текущего пользователя
        },
        (payload) => {
          debugLog('[Notifications] ✅ New notification received via Realtime:', payload);
          const newNotification = payload.new as DuelNotification;
          debugLog('[Notifications] Notification details:', {
            id: newNotification.id,
            type: newNotification.type,
            title: newNotification.title,
            message: newNotification.message,
            user_id: newNotification.user_id,
            profileId,
            duel_id: newNotification.duel_id
          });
          
          // Проверяем, что уведомление для текущего пользователя
          // Но не логируем предупреждение - это может быть нормально для некоторых сценариев
          if (newNotification.user_id !== profileId) {
            return; // Просто игнорируем уведомления не для нас
          }
          
          // Filter out less important notifications
          // Show: progress (opponent's answers), finish, timeout
          // Hide: start, boost, opponent_ahead, opponent_behind, reminder
          if (MUTED_NOTIFICATION_TYPES.has(newNotification.type)) {
            debugLog('[Notifications] ⏭️ Skipping notification type:', newNotification.type);
            return;
          }
          
          const deliveredSet = deliveredNotificationIdsRef.current;
          if (deliveredSet.has(newNotification.id)) {
            debugLog('[Notifications] 🔁 Duplicate notification received, skipping:', newNotification.id);
            return;
          }
          deliveredSet.add(newNotification.id);
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Убираем иконку из title, если она дублирует icon
          const normalizedTitle = (() => {
            let title = newNotification.title;
            if (newNotification.icon && title.startsWith(newNotification.icon)) {
              title = title.replace(newNotification.icon, '').trim();
            }
            return title;
          })();
          
          // Show toast notification if enabled (only for results, not progress)
          if (showToasts) {
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
                // Кнопка "Перейти" убрана - не нужна
                // Иконки будут отображаться через компоненты в NotificationsPanel
              });
            }
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
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'duel_notifications',
          // Убираем фильтр - RLS политика будет фильтровать на сервере
        },
        (payload) => {
          debugLog('[Notifications] Updated notification:', payload);
          setNotifications(prev =>
            prev.map(n => (n.id === payload.new.id ? payload.new as DuelNotification : n))
          );
          if ((payload.new as any).is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          debugLog('[Notifications] ✅ Successfully subscribed to notifications channel:', channelName);
          // Регистрируем подписку в глобальном реестре
          activeSubscriptionsRef.current.set(channelName, channel);
        } else if (err) {
          // Логируем только серьезные ошибки (не mismatch, так как RLS политика исправлена)
          if (!err?.message?.includes('mismatch') && !err?.message?.includes('bindings')) {
            console.error('[Notifications] ❌ Realtime subscription error:', err);
            console.error('[Notifications] Error message:', err?.message);
          } else {
            // Mismatch ошибки больше не должны возникать после исправления RLS
            console.warn('[Notifications] ⚠️ Binding mismatch (should be fixed by RLS policy update)');
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Notifications] ❌ Channel error - check RLS policies and realtime publication');
          console.error('[Notifications] ProfileId:', profileId, 'Type:', typeof profileId);
          console.error('[Notifications] Channel name:', channelName);
        } else if (status === 'TIMED_OUT') {
          console.warn('[Notifications] ⚠️ Subscription timed out - will retry on next mount');
        } else if (status === 'CLOSED') {
          // CLOSED статус нормален при размонтировании компонента
          debugLog('[Notifications] Subscription closed (normal on unmount)');
          // Удаляем из реестра при закрытии
          activeSubscriptionsRef.current.delete(channelName);
        } else {
          debugLog('[Notifications] Subscription status:', status);
        }
      });

    return () => {
      debugLog('[useNotifications] Cleaning up notification subscription');
      activeSubscriptionsRef.current.delete(channelName);
      supabase.removeChannel(channel);
    };
  }, [profileId, showToasts, playSounds, debugLog]);

  const loadNotifications = useCallback(async () => {
    if (!profileId) {
      debugLog('[useNotifications] No profileId, skipping load');
      return;
    }

    debugLog('[useNotifications] Loading notifications for profileId:', profileId);
    
    // ОПТИМИЗАЦИЯ: Загружаем только последние 30 уведомлений вместо 100
    // Пагинация будет добавлена позже при необходимости
    const { data, error } = await supabase
      .from('duel_notifications')
      .select('*')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(30); // Оптимизировано: было 100, стало 30

    if (error) {
      console.error('[useNotifications] Error loading notifications:', error);
      console.error('[useNotifications] Error details:', JSON.stringify(error, null, 2));
      return;
    }

    debugLog('[useNotifications] Loaded notifications:', data?.length || 0);
    if (data && data.length > 0) {
      debugLog('[useNotifications] Sample notification:', data[0]);
    }
    
    if (data) {
      // Filter out progress notifications on client side
      const filteredData = data.filter(n => !MUTED_NOTIFICATION_TYPES.has(n.type));
      deliveredNotificationIdsRef.current = new Set(filteredData.map((n) => n.id));
      setNotifications(filteredData);
      const unread = filteredData.filter(n => !n.is_read).length;
      setUnreadCount(unread);
      debugLog('[useNotifications] Filtered notifications:', filteredData.length, 'Unread count:', unread);
    }
  }, [profileId, debugLog]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('duel_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  };

  const markAllAsRead = async () => {
    if (!profileId) return;

    await supabase
      .from('duel_notifications')
      .update({ is_read: true })
      .eq('user_id', profileId)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: loadNotifications,
  };
}
