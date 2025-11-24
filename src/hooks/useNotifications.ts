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

    console.log('[useNotifications] Setting up notifications for profileId:', profileId);
    loadNotifications();

    // Realtime подписка на новые уведомления
    // ВАЖНО: Не используем filter в клиенте, полагаемся на RLS политику на сервере
    // Это предотвращает ошибку "mismatch between server and client bindings"
    const channel = supabase
      .channel(`duel_notifications_${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'duel_notifications',
          // Убираем filter - RLS политика уже фильтрует по user_id
        },
        (payload) => {
          console.log('[Notifications] New notification received:', payload);
          const newNotification = payload.new as DuelNotification;
          console.log('[Notifications] Notification details:', {
            id: newNotification.id,
            type: newNotification.type,
            title: newNotification.title,
            user_id: newNotification.user_id,
            profileId
          });
          
          // Verify it's for this user (дополнительная проверка на клиенте)
          if (newNotification.user_id !== profileId) {
            console.warn('[Notifications] Notification user_id mismatch:', newNotification.user_id, 'vs', profileId);
            return;
          }
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification if enabled
          if (showToasts) {
            const isImportant = ['start', 'finish', 'boost'].includes(newNotification.type);
            const duration = isImportant ? 5000 : 3000;
            
            toast.info(newNotification.title, {
              description: newNotification.message,
              duration,
              icon: newNotification.icon || undefined,
              action: newNotification.duel_id ? {
                label: 'Перейти',
                onClick: () => {
                  window.location.href = `/games/duel?duelId=${newNotification.duel_id}`;
                }
              } : undefined,
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
          // Убираем filter - RLS политика уже фильтрует по user_id
        },
        (payload) => {
          console.log('[Notifications] Updated notification:', payload);
          const updatedNotification = payload.new as DuelNotification;
          
          // Verify it's for this user
          if (updatedNotification.user_id !== profileId) {
            return;
          }
          
          setNotifications(prev =>
            prev.map(n => (n.id === updatedNotification.id ? updatedNotification : n))
          );
          if (updatedNotification.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Notifications] Realtime subscription status:', status);
        if (err) {
          console.error('[Notifications] Realtime subscription error:', err);
          // При ошибке подписки используем fallback polling
          console.log('[Notifications] Falling back to polling mode');
        }
        if (status === 'SUBSCRIBED') {
          console.log('[Notifications] ✅ Successfully subscribed to notifications');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Notifications] ❌ Channel error - falling back to polling');
          // Fallback: используем polling вместо realtime
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
      .limit(50);

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
      setNotifications(data);
      const unread = data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
      console.log('[useNotifications] Unread count:', unread);
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
