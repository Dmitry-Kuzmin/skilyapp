import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
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

interface NotificationContextType {
    notifications: DuelNotification[];
    unreadCount: number;
    isLoading: boolean;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refresh: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const MUTED_NOTIFICATION_TYPES = new Set(['start', 'progress', 'boost', 'opponent_ahead', 'opponent_behind', 'reminder', 'answer']);
const IMPORTANT_NOTIFICATION_TYPES = new Set(['finish', 'timeout']);
const TOAST_RATE_LIMIT_MS = 4000;
const TELEGRAM_RATE_LIMIT_MS = 60000;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { profileId } = useUserContext();
    const queryClient = useQueryClient();

    // Отслеживание показанных уведомлений для предотвращения дублей
    const deliveredNotificationIdsRef = React.useRef<Set<string>>(new Set());
    const lastToastAtRef = React.useRef(0);
    const lastTelegramAtRef = React.useRef(0);
    const previousNotificationsRef = React.useRef<DuelNotification[]>([]);

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

    // КРИТИЧНО: Загружаем показанные уведомления из localStorage при инициализации
    useEffect(() => {
        if (!profileId) return;

        try {
            const storageKey = `shown_notifications_${profileId}`;
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const shownIds = JSON.parse(stored) as string[];
                deliveredNotificationIdsRef.current = new Set(shownIds);
                debugLog('[NotificationProvider] Loaded shown notifications from localStorage:', shownIds.length);
            }
        } catch (error) {
            console.warn('[NotificationProvider] Error loading shown notifications:', error);
        }
    }, [profileId, debugLog]);

    // ОПТИМИЗАЦИЯ: Используем React Query с polling
    const {
        data: notificationsData = [],
        isLoading,
        refetch,
    } = useQuery<DuelNotification[]>({
        queryKey: ['notifications', profileId],
        queryFn: async () => {
            if (!profileId) return [];

            const { data, error } = await supabase
                .from('duel_notifications')
                .select('*')
                .eq('user_id', profileId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('[NotificationProvider] Error fetching notifications:', error);
                throw error;
            }

            return data as DuelNotification[];
        },
        enabled: !!profileId,
        refetchInterval: 60000,  // 1 минута вместо 10 сек — достаточно для уведомлений
        staleTime: 30000,        // 30 секунд
    });

    // Обработка новых уведомлений
    useEffect(() => {
        if (!notificationsData.length || !profileId) return;

        const previousIds = new Set(previousNotificationsRef.current.map(n => n.id));
        const newNotifications = notificationsData.filter(n => !previousIds.has(n.id));

        if (newNotifications.length > 0) {
            debugLog('[NotificationProvider] 🔔 New notifications detected:', newNotifications.length);

            const storageKey = `shown_notifications_${profileId}`;
            const deliveredSet = deliveredNotificationIdsRef.current;

            newNotifications.forEach((newNotification) => {
                if (deliveredSet.has(newNotification.id)) return;

                // Фильтруем ненужные типы
                if (MUTED_NOTIFICATION_TYPES.has(newNotification.type)) {
                    deliveredSet.add(newNotification.id);
                    return;
                }

                const notificationAge = Date.now() - new Date(newNotification.created_at).getTime();
                const MAX_AGE_FOR_TOAST_MS = 5 * 60 * 1000;
                const isOldNotification = notificationAge > MAX_AGE_FOR_TOAST_MS;

                deliveredSet.add(newNotification.id);

                // Сохраняем в localStorage
                try {
                    const current = Array.from(deliveredSet);
                    localStorage.setItem(storageKey, JSON.stringify(current.slice(0, 1000)));
                } catch (error) {
                    console.warn('[NotificationProvider] Error saving shown notifications:', error);
                }

                const normalizedTitle = (() => {
                    let title = newNotification.title;
                    if (newNotification.icon && title.startsWith(newNotification.icon)) {
                        title = title.replace(newNotification.icon, '').trim();
                    }
                    return title;
                })();

                // Show toast
                if (!isOldNotification) {
                    const now = Date.now();
                    const isImportant = IMPORTANT_NOTIFICATION_TYPES.has(newNotification.type);
                    const duration = isImportant ? 5000 : 3000;

                    if (isImportant || now - lastToastAtRef.current >= TOAST_RATE_LIMIT_MS) {
                        lastToastAtRef.current = now;
                        debugLog('[NotificationProvider] Showing toast:', normalizedTitle);
                        toast.info(normalizedTitle, {
                            description: newNotification.message,
                            duration,
                        });

                        // Play sound
                        if (isImportant) {
                            sounds.notificationImportant();
                        } else {
                            sounds.notificationPop();
                        }
                    }
                }

                // Telegram — только свежие уведомления (не старше 5 минут)
                if (!isAppActive() && profileId && !isOldNotification) {
                    const now = Date.now();
                    if (now - lastTelegramAtRef.current >= TELEGRAM_RATE_LIMIT_MS) {
                        lastTelegramAtRef.current = now;
                        debugLog('[NotificationProvider] Sending to Telegram');
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
                            console.error('[NotificationProvider] Telegram send error:', error);
                        });
                    }
                }
            });
        }

        previousNotificationsRef.current = notificationsData;
    }, [notificationsData, profileId, debugLog]);

    const HIDDEN_FROM_UI_TYPES = new Set(['start', 'progress', 'boost', 'opponent_ahead', 'opponent_behind', 'answer']);
    const unreadCount = useMemo(() => {
        return notificationsData.filter(n => !n.is_read && !HIDDEN_FROM_UI_TYPES.has(n.type)).length;
    }, [notificationsData]);

    const markAsRead = useCallback(async (notificationId: string) => {
        await (supabase
            .from('duel_notifications') as any)
            .update({ is_read: true })
            .eq('id', notificationId);

        queryClient.invalidateQueries({ queryKey: ['notifications', profileId] });
    }, [profileId, queryClient]);

    const markAllAsRead = useCallback(async () => {
        if (!profileId) return;

        await (supabase
            .from('duel_notifications') as any)
            .update({ is_read: true })
            .eq('user_id', profileId)
            .eq('is_read', false);

        queryClient.invalidateQueries({ queryKey: ['notifications', profileId] });
    }, [profileId, queryClient]);

    const value = useMemo(() => ({
        notifications: notificationsData,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        refresh: refetch,
    }), [notificationsData, unreadCount, isLoading, markAsRead, markAllAsRead, refetch]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotificationContext() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotificationContext must be used within a NotificationProvider');
    }
    return context;
}
