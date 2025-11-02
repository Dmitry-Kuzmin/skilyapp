import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

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

export function useNotifications() {
  const { profileId } = useUserContext();
  const [notifications, setNotifications] = useState<DuelNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profileId) return;

    loadNotifications();

    // Realtime подписка на новые уведомления
    const channel = supabase
      .channel('duel_notifications_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'duel_notifications',
          filter: `user_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('[Notifications] New notification:', payload);
          setNotifications(prev => [payload.new as DuelNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'duel_notifications',
          filter: `user_id=eq.${profileId}`,
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  const loadNotifications = async () => {
    if (!profileId) return;

    const { data } = await supabase
      .from('duel_notifications')
      .select('*')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

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
