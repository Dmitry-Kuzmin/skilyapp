import { useNotificationContext } from '@/contexts/NotificationContext';

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
  const context = useNotificationContext();

  // Note: showToasts and playSounds are now managed globally by NotificationProvider
  // to prevent duplicate notifications across multiple components.
  // We keep the options parameter for backward compatibility with existing calls.

  return context;
}
