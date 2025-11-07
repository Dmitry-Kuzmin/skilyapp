import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { sounds } from '@/lib/sounds';

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

// Types of notifications to hide in notification center
// Show only results (finish, timeout) in notification center
// Progress notifications (opponent answers) should only show as toast during game, not in notification center
const PROGRESS_NOTIFICATION_TYPES = ['start', 'progress', 'boost', 'opponent_ahead', 'opponent_behind', 'reminder'];

export function useNotifications(options?: { showToasts?: boolean; playSounds?: boolean }) {
  const { profileId } = useUserContext();
  const [notifications, setNotifications] = useState<DuelNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const showToasts = options?.showToasts ?? true;
  const playSounds = options?.playSounds ?? true;

  useEffect(() => {
    if (!profileId) {
      console.log('[useNotifications] No profileId, skipping subscription');
      return;
    }

    console.log('[useNotifications] ✅ Setting up notifications for profileId:', profileId);
    console.log('[useNotifications] Profile ID type:', typeof profileId, 'value:', profileId);
    
    // Load existing notifications first
    loadNotifications();

    // Realtime подписка на новые уведомления
    // Используем более простой фильтр для лучшей совместимости с realtime
    console.log('[useNotifications] Creating Realtime channel for profileId:', profileId);
    console.log('[useNotifications] ProfileId type:', typeof profileId, 'value:', profileId);
    
    // Создаем канал с уникальным именем
    const channelName = `duel_notifications_${profileId}`;
    console.log('[useNotifications] Channel name:', channelName);
    
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
          
          // Verify it's for this user (double-check)
          if (newNotification.user_id !== profileId) {
            console.warn('[Notifications] ⚠️ Notification user_id mismatch:', newNotification.user_id, 'vs', profileId);
            return;
          }
          
          // Filter out progress notifications - show only results (finish, timeout) in notification center
          // Progress notifications (opponent answers) are shown as toast during game via useDuelRealtime
          // ВАЖНО: Уведомления о бустах добавляем в список, но не показываем toast автоматически
          // Они будут показаны через компоненты игры (DuelBattleFullscreen, DuelBattle)
          const shouldSkipToast = PROGRESS_NOTIFICATION_TYPES.includes(newNotification.type);
          
          if (shouldSkipToast) {
            console.log('[Notifications] ⏭️ Progress notification received (will be shown as toast in game):', newNotification.type);
          }
          
          // Добавляем в список уведомлений (даже если это progress/boost - они нужны для показа в игре)
          setNotifications(prev => [newNotification, ...prev]);
          
          // Увеличиваем счетчик только для важных уведомлений (не для progress/boost)
          if (!shouldSkipToast) {
            setUnreadCount(prev => prev + 1);
          }
          
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
        console.log('[Notifications] Realtime subscription status:', status, 'for profileId:', profileId);
        if (err) {
          console.error('[Notifications] ❌ Realtime subscription error:', err);
          console.error('[Notifications] Error details:', JSON.stringify(err, null, 2));
          console.error('[Notifications] Error message:', err?.message);
          
          // Если ошибка "mismatch between server and client bindings"
          if (err?.message?.includes('mismatch') || err?.message?.includes('bindings')) {
            console.error('[Notifications] 🔴 Binding mismatch error detected!');
            console.error('[Notifications] This usually means RLS policy doesn\'t match the filter');
            console.error('[Notifications] Filter used: user_id=eq.' + profileId);
            console.error('[Notifications] Try using a simpler RLS policy or removing the filter');
          }
        }
        if (status === 'SUBSCRIBED') {
          console.log('[Notifications] ✅ Successfully subscribed to notifications channel:', channelName);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Notifications] ❌ Channel error - check RLS policies and realtime publication');
          console.error('[Notifications] ProfileId:', profileId, 'Type:', typeof profileId);
          console.error('[Notifications] Channel name:', channelName);
        } else if (status === 'TIMED_OUT') {
          console.error('[Notifications] ❌ Subscription timed out');
        } else if (status === 'CLOSED') {
          console.warn('[Notifications] ⚠️ Subscription closed');
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

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: loadNotifications,
  };
}
