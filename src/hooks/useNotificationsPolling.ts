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
const PROGRESS_NOTIFICATION_TYPES = ['start', 'progress', 'boost', 'opponent_ahead', 'opponent_behind', 'reminder'];

export function useNotificationsPolling(options?: { showToasts?: boolean; playSounds?: boolean }) {
  const { profileId } = useUserContext();
  const [notifications, setNotifications] = useState<DuelNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date>(new Date());
  const showToasts = options?.showToasts ?? true;
  const playSounds = options?.playSounds ?? true;

  const loadNotifications = useCallback(async () => {
    if (!profileId) {
      console.log('[useNotificationsPolling] No profileId, skipping load');
      return;
    }

    console.log('[useNotificationsPolling] Loading notifications for profileId:', profileId);
    
    const { data, error } = await supabase
      .from('duel_notifications')
      .select('*')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[useNotificationsPolling] Error loading notifications:', error);
      return;
    }

    console.log('[useNotificationsPolling] Loaded notifications:', data?.length || 0);
    
    if (data) {
      // Filter out progress notifications on client side
      const filteredData = data.filter(n => !PROGRESS_NOTIFICATION_TYPES.includes(n.type));
      
      // Check for new notifications
      const newNotifications = data.filter(n => 
        new Date(n.created_at) > lastCheckedAt && 
        !PROGRESS_NOTIFICATION_TYPES.includes(n.type)
      );
      
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
      
      setLastCheckedAt(new Date());
      console.log('[useNotificationsPolling] Filtered notifications:', filteredData.length, 'Unread count:', unread);
    }
  }, [profileId, showToasts, playSounds, lastCheckedAt]);

  useEffect(() => {
    if (!profileId) {
      console.log('[useNotificationsPolling] No profileId, skipping polling');
      return;
    }

    console.log('[useNotificationsPolling] ✅ Setting up polling for profileId:', profileId);
    
    // Load immediately
    loadNotifications();

    // Poll every 2 seconds
    const interval = setInterval(() => {
      loadNotifications();
    }, 2000);

    return () => {
      console.log('[useNotificationsPolling] Cleaning up polling');
      clearInterval(interval);
    };
  }, [profileId, loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('duel_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    // Reload notifications
    loadNotifications();
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

