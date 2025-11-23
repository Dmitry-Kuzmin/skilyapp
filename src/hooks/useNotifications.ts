import { useState, useEffect, useCallback } from 'react';
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
const PROGRESS_NOTIFICATION_TYPES = ['start', 'boost', 'opponent_ahead', 'opponent_behind', 'reminder'];

export function useNotifications(options?: { showToasts?: boolean; playSounds?: boolean }) {
  const { profileId } = useUserContext();
  const [notifications, setNotifications] = useState<DuelNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [realtimeError, setRealtimeError] = useState(false);
  const showToasts = options?.showToasts ?? true;
  const playSounds = options?.playSounds ?? true;

  useEffect(() => {
    if (!profileId) {
      console.log('[useNotifications] No profileId, skipping subscription');
      return;
    }

    console.log('[useNotifications] ✅ Setting up notifications for profileId:', profileId);
    
    // Load existing notifications first
    loadNotifications();

    // Realtime подписка на новые уведомления
    // Используем более простой фильтр для лучшей совместимости с realtime
    console.log('[useNotifications] Creating Realtime channel for profileId:', profileId);
    console.log('[useNotifications] ProfileId type:', typeof profileId, 'value:', profileId);
    
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
          console.log('[Notifications] ✅ New notification received via Realtime:', payload);
          const newNotification = payload.new as DuelNotification;
          console.log('[Notifications] Notification details:', {
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
          if (PROGRESS_NOTIFICATION_TYPES.includes(newNotification.type)) {
            console.log('[Notifications] ⏭️ Skipping notification type:', newNotification.type);
            return;
          }
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification if enabled (only for results, not progress)
          if (showToasts) {
            const isImportant = ['finish'].includes(newNotification.type);
            const duration = isImportant ? 5000 : 3000;
            
            // Убираем иконку из title, если она уже есть в icon
            let titleText = newNotification.title;
            if (newNotification.icon && titleText.startsWith(newNotification.icon)) {
              titleText = titleText.replace(newNotification.icon, '').trim();
            }
            
            console.log('[Notifications] Showing toast:', titleText);
            toast.info(titleText, {
              description: newNotification.message,
              duration,
              // Кнопка "Перейти" убрана - не нужна
              // Иконки будут отображаться через компоненты в NotificationsPanel
            });
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
            console.log('[Notifications] User inactive, sending to Telegram');
            sendTelegramNotification({
              userId: profileId,
              templateType: newNotification.type,
              title: titleText,
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
          console.log('[Notifications] Updated notification:', payload);
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
          console.log('[Notifications] ✅ Successfully subscribed to notifications channel:', channelName);
          // Сбрасываем флаг ошибки при успешной подписке
          setRealtimeError(false);
        } else if (err) {
          // Ошибки могут приходить вместе с CHANNEL_ERROR
          // Проверяем, не является ли это CHANNEL_ERROR
          if (status === 'CHANNEL_ERROR' || err?.message?.includes('channel') || err?.message?.includes('RLS')) {
            console.warn('[Notifications] ⚠️ Channel error (non-critical):', err?.message || 'Unknown error');
            console.warn('[Notifications] ProfileId:', profileId, 'Type:', typeof profileId);
            console.warn('[Notifications] Channel name:', channelName);
            console.warn('[Notifications] Notifications will continue to work via polling');
            setRealtimeError(true);
          } else if (!err?.message?.includes('mismatch') && !err?.message?.includes('bindings')) {
            // Логируем только серьезные ошибки (не mismatch, не channel errors)
            console.error('[Notifications] ❌ Realtime subscription error:', err);
            console.error('[Notifications] Error message:', err?.message);
          } else {
            // Mismatch ошибки больше не должны возникать после исправления RLS
            console.warn('[Notifications] ⚠️ Binding mismatch (should be fixed by RLS policy update)');
          }
        } else if (status === 'CHANNEL_ERROR') {
          // CHANNEL_ERROR может возникать временно, но подписка может продолжать работать
          // Проверяем, что уведомления все еще загружаются через обычные запросы
          console.warn('[Notifications] ⚠️ Channel error detected - Realtime may be limited, but notifications will still load via polling');
          console.warn('[Notifications] ProfileId:', profileId, 'Type:', typeof profileId);
          console.warn('[Notifications] Channel name:', channelName);
          console.warn('[Notifications] This is usually non-critical - notifications will still work via regular queries');
          
          // Устанавливаем флаг ошибки для включения polling
          setRealtimeError(true);
        } else if (status === 'TIMED_OUT') {
          console.warn('[Notifications] ⚠️ Subscription timed out - will retry on next mount');
        } else if (status === 'CLOSED') {
          // CLOSED статус нормален при размонтировании компонента
          console.log('[Notifications] Subscription closed (normal on unmount)');
        } else {
          console.log('[Notifications] Subscription status:', status);
        }
      });

    return () => {
      console.log('[useNotifications] Cleaning up notification subscription');
      supabase.removeChannel(channel);
    };
  }, [profileId, showToasts, playSounds]);

  const loadNotifications = useCallback(async () => {
    if (!profileId) {
      console.log('[useNotifications] No profileId, skipping load');
      return;
    }

    console.log('[useNotifications] Loading notifications for profileId:', profileId);
    
    const { data, error } = await supabase
      .from('duel_notifications')
      .select('*')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(100); // Load more to filter on client side

    if (error) {
      console.error('[useNotifications] Error loading notifications:', error);
      console.error('[useNotifications] Error details:', JSON.stringify(error, null, 2));
      return;
    }

    console.log('[useNotifications] Loaded notifications:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('[useNotifications] Sample notification:', data[0]);
    }
    
    if (data) {
      // Filter out progress notifications on client side
      const filteredData = data.filter(n => !PROGRESS_NOTIFICATION_TYPES.includes(n.type));
      setNotifications(filteredData);
      const unread = filteredData.filter(n => !n.is_read).length;
      setUnreadCount(unread);
      console.log('[useNotifications] Filtered notifications:', filteredData.length, 'Unread count:', unread);
    }
  }, [profileId]);

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

  // Fallback: периодическая загрузка уведомлений при ошибке Realtime
  useEffect(() => {
    if (!profileId || !realtimeError) return;

    console.log('[useNotifications] Starting fallback polling due to Realtime error');
    const pollInterval = setInterval(() => {
      loadNotifications();
    }, 30000); // Каждые 30 секунд

    return () => {
      clearInterval(pollInterval);
    };
  }, [profileId, realtimeError, loadNotifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: loadNotifications,
  };
}
