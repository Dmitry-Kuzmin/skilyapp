import { useState, useEffect, useCallback, useRef } from 'react';
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
  const previousNotificationsRef = useRef<Set<string>>(new Set());
  
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
    
    if (data) {
      // Filter out progress notifications on client side
      const filteredData = data.filter(n => !PROGRESS_NOTIFICATION_TYPES.includes(n.type));
      
      // Check for new notifications (not in previous set)
      const currentIds = new Set(filteredData.map(n => n.id));
      const newNotifications = filteredData.filter(n => !previousNotificationsRef.current.has(n.id));
      
      // Update previous set
      previousNotificationsRef.current = currentIds;
      
      setNotifications(filteredData);
      const unread = filteredData.filter(n => !n.is_read).length;
      setUnreadCount(unread);
      
      // Show toasts for new notifications
      if (showToasts && newNotifications.length > 0) {
        newNotifications.forEach(notification => {
          const isImportant = ['finish'].includes(notification.type);
          const duration = isImportant ? 5000 : 3000;
          
          let titleText = notification.title;
          if (notification.icon && titleText.startsWith(notification.icon)) {
            titleText = titleText.replace(notification.icon, '').trim();
          }
          
          console.log('[Notifications] Showing toast for new notification:', titleText);
          toast.info(titleText, {
            description: notification.message,
            duration,
          });
        });
      }
      
      // Play sounds for new notifications
      if (playSounds && newNotifications.length > 0) {
        newNotifications.forEach(notification => {
          const isImportant = ['start', 'finish', 'boost'].includes(notification.type);
          if (isImportant) {
            sounds.notificationImportant();
          } else {
            sounds.notificationPop();
          }
        });
      }
      
      console.log('[useNotifications] Filtered notifications:', filteredData.length, 'Unread count:', unread, 'New:', newNotifications.length);
    }
  }, [profileId, showToasts, playSounds]);

  useEffect(() => {
    if (!profileId) {
      console.log('[useNotifications] No profileId, skipping subscription');
      return;
    }

    console.log('[useNotifications] ✅ Setting up notifications for profileId:', profileId);
    console.log('[useNotifications] ⚠️ Using POLLING instead of Realtime due to RLS issues');
    
    // Load existing notifications first
    loadNotifications();

    // ВРЕМЕННО: Используем polling вместо Realtime из-за проблем с RLS
    // Realtime не может работать с RLS политиками для этой таблицы
    // Polling каждые 2 секунды для проверки новых уведомлений
    const pollingInterval = setInterval(() => {
      loadNotifications();
    }, 2000);

    return () => {
      console.log('[useNotifications] Cleaning up notification polling');
      clearInterval(pollingInterval);
    };
  }, [profileId, loadNotifications]);

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
