import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface QueuedNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  icon?: string;
  duration?: number;
  entityId?: string; // For deduplication
}

const NOTIFICATION_DURATION = 4000; // 4 seconds auto-dismiss
const MAX_CONCURRENT = 3; // Maximum 3 notifications at once

export function useNotificationQueue() {
  const [queue, setQueue] = useState<QueuedNotification[]>([]);
  const [active, setActive] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState<Set<string>>(new Set()); // For deduplication

  const addNotification = useCallback((notification: Omit<QueuedNotification, 'id'>) => {
    // Deduplicate by type + entityId
    const dedupeKey = `${notification.type}_${notification.entityId || ''}`;
    
    setShown(prev => {
      if (prev.has(dedupeKey)) {
        console.log('[NotificationQueue] Dedupe: skipping duplicate notification', dedupeKey);
        return prev;
      }
      
      const newShown = new Set(prev);
      newShown.add(dedupeKey);
      
      // Clear dedupe after 10 seconds to allow same notification later
      setTimeout(() => {
        setShown(current => {
          const updated = new Set(current);
          updated.delete(dedupeKey);
          return updated;
        });
      }, 10000);
      
      return newShown;
    });

    const id = `notif_${Date.now()}_${Math.random()}`;
    const queuedNotif: QueuedNotification = {
      id,
      ...notification,
      duration: notification.duration || NOTIFICATION_DURATION,
    };

    setQueue(prev => [...prev, queuedNotif]);
  }, []);

  // Process queue
  useEffect(() => {
    if (queue.length === 0 || active.size >= MAX_CONCURRENT) return;

    const nextNotif = queue[0];
    if (!nextNotif) return;

    // Show notification
    setActive(prev => new Set(prev).add(nextNotif.id));
    setQueue(prev => prev.slice(1));

    // Map type to toast function
    const toastFn = {
      'success': toast.success,
      'error': toast.error,
      'warning': toast.warning,
      'info': toast.info,
    }[nextNotif.type] || toast;

    toastFn(nextNotif.title, {
      description: nextNotif.message,
      duration: nextNotif.duration,
      icon: nextNotif.icon,
    });

    // Remove from active after duration
    setTimeout(() => {
      setActive(prev => {
        const updated = new Set(prev);
        updated.delete(nextNotif.id);
        return updated;
      });
    }, nextNotif.duration);
  }, [queue, active]);

  const clearAll = useCallback(() => {
    setQueue([]);
    setActive(new Set());
  }, []);

  return {
    addNotification,
    clearAll,
    queueSize: queue.length,
    activeCount: active.size,
  };
}
