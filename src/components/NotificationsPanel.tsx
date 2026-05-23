import { useState, useMemo, useEffect, useCallback, ReactNode, lazy, Suspense, memo, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, ChevronDown, ChevronUp, Trophy, Flag, Swords, Sparkles, Clock, Zap, MessageSquare, AlertTriangle, CheckCircle2, Gift, Award, XCircle, BellRing } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useUserContext } from '@/contexts/UserContext';
// ОПТИМИЗАЦИЯ: Импортируем только нужные функции из date-fns
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
// ОПТИМИЗАЦИЯ: Импортируем только нужные локали (tree-shaking работает)
import { ru } from 'date-fns/locale/ru';
import { es } from 'date-fns/locale/es';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from "@/components/optimized/Motion";
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getTelegramWebApp } from '@/lib/telegram';
import { NotificationIcon } from './NotificationIcon';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DuelNotification } from '@/hooks/useNotifications';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
// ОПТИМИЗАЦИЯ: ReminderConnectModal lazy-loaded (экономия 37.1 KB в initial bundle)
const ReminderConnectModal = lazy(() => import('@/components/notifications/ReminderConnectModal').then(m => ({ default: m.ReminderConnectModal })));

type NotificationsApi = ReturnType<typeof useNotifications>;

interface NotificationsPanelProps {
  notificationsApi?: NotificationsApi;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  renderTrigger?: boolean;
  trigger?: ReactNode;
}

type NotificationView = 'unread' | 'all';

// ─────────────────────────────────────────────────────────────────────
// Notification style system — цвет + иконка по типу
// ─────────────────────────────────────────────────────────────────────
type NotifVariant = {
  Icon: typeof Bell;
  iconClass: string;  // text + bg gradient class
  ringClass: string;  // unread accent ring
};

const getNotificationVariant = (n: DuelNotification): NotifVariant => {
  const type = n.type;
  const meta = n.metadata as any;

  // finish: победа vs поражение
  if (type === 'finish') {
    const isWinner = meta?.is_winner ?? meta?.win;
    if (isWinner === true) {
      return { Icon: Trophy, iconClass: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-500', ringClass: 'ring-emerald-500/30' };
    }
    if (isWinner === false) {
      return { Icon: Flag, iconClass: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-500', ringClass: 'ring-amber-500/30' };
    }
    return { Icon: Trophy, iconClass: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-500', ringClass: 'ring-emerald-500/30' };
  }

  // question_report_reply: статус определяет цвет
  if (type === 'question_report_reply') {
    const status = meta?.status;
    if (status === 'resolved')   return { Icon: CheckCircle2,  iconClass: 'bg-gradient-to-br from-emerald-500/20 to-green-500/20 text-emerald-500', ringClass: 'ring-emerald-500/30' };
    if (status === 'dismissed')  return { Icon: AlertTriangle, iconClass: 'bg-gradient-to-br from-zinc-500/20 to-zinc-600/20 text-zinc-400',      ringClass: 'ring-zinc-500/30' };
    return                       { Icon: MessageSquare, iconClass: 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-500',    ringClass: 'ring-blue-500/30' };
  }

  switch (type) {
    case 'start':           return { Icon: Swords,        iconClass: 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500', ringClass: 'ring-indigo-500/30' };
    case 'reminder':        return { Icon: Clock,         iconClass: 'bg-gradient-to-br from-sky-500/20 to-blue-500/20 text-sky-500',          ringClass: 'ring-sky-500/30' };
    case 'timeout':         return { Icon: Clock,         iconClass: 'bg-gradient-to-br from-zinc-500/20 to-zinc-600/20 text-zinc-400',       ringClass: 'ring-zinc-500/30' };
    case 'boost':           return { Icon: Zap,           iconClass: 'bg-gradient-to-br from-orange-500/20 to-amber-500/20 text-orange-500',   ringClass: 'ring-orange-500/30' };
    case 'help_requested':  return { Icon: Sparkles,      iconClass: 'bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 text-fuchsia-500',  ringClass: 'ring-fuchsia-500/30' };
    case 'help_received':   return { Icon: Sparkles,      iconClass: 'bg-gradient-to-br from-teal-500/20 to-cyan-500/20 text-teal-500',        ringClass: 'ring-teal-500/30' };
    case 'referral_joined': return { Icon: Gift,          iconClass: 'bg-gradient-to-br from-pink-500/20 to-rose-500/20 text-pink-500',        ringClass: 'ring-pink-500/30' };
    case 'referral_earned': return { Icon: Gift,          iconClass: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-500',   ringClass: 'ring-green-500/30' };
    case 'daily_reward':    return { Icon: Gift,          iconClass: 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20 text-yellow-500',   ringClass: 'ring-yellow-500/30' };
    case 'achievement':     return { Icon: Award,         iconClass: 'bg-gradient-to-br from-purple-500/20 to-violet-500/20 text-purple-500',  ringClass: 'ring-purple-500/30' };
    case 'streak_lost':     return { Icon: XCircle,       iconClass: 'bg-gradient-to-br from-rose-500/20 to-red-500/20 text-rose-500',         ringClass: 'ring-rose-500/30' };
    case 'test_result':     return { Icon: CheckCircle2,  iconClass: 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-500',        ringClass: 'ring-cyan-500/30' };
    default:                return { Icon: BellRing,      iconClass: 'bg-gradient-to-br from-zinc-500/20 to-zinc-600/20 text-zinc-400',       ringClass: 'ring-zinc-500/30' };
  }
};

// ОПТИМИЗАЦИЯ: Мемоизированный компонент элемента уведомления
// Предотвращает лишние ре-рендеры при обновлении списка
const NotificationItem = memo(({
  notification,
  isExpanded,
  onToggleExpand,
  onClick,
  getCachedTime,
  shouldTruncate,
  navigateTo,
  route,
  t,
}: {
  notification: DuelNotification;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onClick: (notification: DuelNotification) => void;
  getCachedTime: (createdAt: string) => string;
  shouldTruncate: (message: string) => boolean;
  navigateTo: (path: string) => void;
  route: string | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}) => {
  const variant = getNotificationVariant(notification);
  const { Icon } = variant;
  const isUnread = !notification.is_read;
  const imageUrl = notification.type === 'question_report_reply'
    ? (notification.metadata as any)?.question_image_url
    : null;

  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className={cn(
        "group relative w-full text-left rounded-2xl transition-all duration-200 overflow-hidden",
        "active:scale-[0.985]",
        isUnread
          ? "bg-card/80 hover:bg-card backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
          : "bg-transparent hover:bg-card/40 opacity-70 hover:opacity-100"
      )}
    >
      {/* Unread dot — left edge accent */}
      {isUnread && (
        <span className={cn(
          "absolute left-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full",
          variant.iconClass.match(/text-(\w+-\d+)/)?.[0] ?? 'text-primary'
        )} style={{ backgroundColor: 'currentColor' }} />
      )}

      <div className="flex items-start gap-3 p-3 pl-4">
        {/* Icon */}
        <div className={cn(
          "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
          variant.iconClass
        )}>
          <Icon className="w-[18px] h-[18px]" strokeWidth={2.2} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title + time row */}
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <h4 className={cn(
              "text-sm leading-tight truncate",
              isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/85"
            )}>
              {notification.title}
            </h4>
            <span className="shrink-0 text-[11px] text-muted-foreground/70 font-medium tabular-nums">
              {getCachedTime(notification.created_at)}
            </span>
          </div>

          {/* Message */}
          {notification.message && (
            <div className="text-[13px] text-muted-foreground leading-relaxed">
              {shouldTruncate(notification.message) && !isExpanded ? (
                <>
                  <p className="line-clamp-2 break-words">{notification.message}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleExpand(notification.id); }}
                    className="mt-1 inline-flex items-center gap-0.5 text-[11px] text-muted-foreground/80 hover:text-foreground transition-colors"
                  >
                    <ChevronDown className="w-3 h-3" />
                    {t('notifications.expand')}
                  </button>
                </>
              ) : shouldTruncate(notification.message) && isExpanded ? (
                <>
                  <p className="whitespace-pre-wrap break-words">{notification.message}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleExpand(notification.id); }}
                    className="mt-1 inline-flex items-center gap-0.5 text-[11px] text-muted-foreground/80 hover:text-foreground transition-colors"
                  >
                    <ChevronUp className="w-3 h-3" />
                    {t('notifications.collapse')}
                  </button>
                </>
              ) : (
                <p className="whitespace-pre-wrap break-words">{notification.message}</p>
              )}
            </div>
          )}

          {/* Image preview (для report_reply) */}
          {imageUrl && (
            <div className="mt-2 rounded-lg overflow-hidden border border-border/30 max-w-[200px]">
              <img
                src={imageUrl}
                alt=""
                className="w-full h-20 object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* CTA */}
          {route && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary group-hover:gap-1 transition-all">
                {t('notifications.goTo')}
                <ChevronDown className="w-3 h-3 -rotate-90" />
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
});
NotificationItem.displayName = 'NotificationItem';

export const NotificationsPanel = ({ notificationsApi, open, onOpenChange, renderTrigger = true, trigger }: NotificationsPanelProps) => {
  const { t, language } = useLanguage();
  const dateLocale = language === 'es' ? es : ru;
  const { profileId } = useUserContext();
  // Хук должен вызываться безусловно (правила React)
  const ownApi = useNotifications();
  const api = notificationsApi ?? ownApi;
  const { notifications, unreadCount, markAsRead, markAllAsRead } = api;
  const [view, setView] = useState<NotificationView>('unread');
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const navigate = useNavigate();
  const parentRef = useRef<HTMLDivElement | null>(null);

  // Telegram BackButton support — close sheet when back is pressed
  const isOpen = typeof open === 'boolean' ? open : false;
  useEffect(() => {
    if (!isOpen) return;
    const webApp = getTelegramWebApp();
    if (!webApp?.BackButton) return;
    const handleBack = () => {
      onOpenChange?.(false);
    };
    webApp.BackButton.onClick(handleBack);
    return () => {
      webApp.BackButton.offClick(handleBack);
    };
  }, [isOpen, onOpenChange]);

  // ОПТИМИЗАЦИЯ: Мемоизируем обработчик для предотвращения лишних ре-рендеров
  const toggleNotificationExpansion = useCallback((notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  }, []);

  // Calculate if message should be truncated (more than 3 lines)
  const shouldTruncate = (message: string): boolean => {
    // Approximate: ~50 characters per line, so 3 lines = ~150 characters
    // But we need to account for word wrapping, so we'll use a more accurate method
    const lines = message.split('\n');
    if (lines.length > 3) return true;
    // Check if any line is too long (more than ~60 chars will likely wrap)
    const hasLongLine = lines.some(line => line.length > 60);
    if (hasLongLine && message.length > 150) return true;
    return message.length > 180; // Safe threshold for 3 lines
  };

  // Debug logging (только в dev режиме)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && window.localStorage?.getItem('debugNotifications') === '1') {
      console.log('[NotificationsPanel] Component mounted, profileId:', profileId);
      console.log('[NotificationsPanel] Notifications:', notifications.length, 'Unread:', unreadCount);
      if (notifications.length > 0) {
        console.log('[NotificationsPanel] First notification:', notifications[0]);
      }
    }
  }, [notifications, unreadCount, profileId]);

  // Filter notifications by type
  // Hide progress notifications and answers (start, progress, boost, opponent_ahead, opponent_behind, answer)
  // Show only results (finish, timeout) and reminders
  const PROGRESS_NOTIFICATION_TYPES = ['start', 'progress', 'boost', 'opponent_ahead', 'opponent_behind', 'answer'];

  const filteredNotifications = useMemo(() => {
    // First, filter out progress notifications (always hide them)
    const notificationsWithoutProgress = notifications.filter(n => !PROGRESS_NOTIFICATION_TYPES.includes(n.type));
    if (view === 'unread') return notificationsWithoutProgress.filter(n => !n.is_read);
    return notificationsWithoutProgress;
  }, [notifications, view]);

  // Debug: логируем только в dev режиме при необходимости
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && window.localStorage?.getItem('debugNotifications') === '1') {
      console.log('[NotificationsPanel] 🔍 filteredNotifications changed:', {
        count: filteredNotifications.length,
        view,
        totalNotifications: notifications.length,
      });
    }
  }, [filteredNotifications, view, notifications.length]);

  // ОПТИМИЗАЦИЯ: Кеш для formatDistanceToNow (избегаем повторных вычислений)
  const timeCache = useRef<Map<string, string>>(new Map());
  const getCachedTime = useCallback((createdAt: string) => {
    const cacheKey = `${createdAt}-${Date.now() - (Date.now() % 60000)}`; // Кеш на 1 минуту
    if (timeCache.current.has(cacheKey)) {
      return timeCache.current.get(cacheKey)!;
    }
    const formatted = formatDistanceToNow(new Date(createdAt), {
      addSuffix: true,
      locale: dateLocale,
    });
    timeCache.current.set(cacheKey, formatted);
    // Очищаем старый кеш (храним только последние 100)
    if (timeCache.current.size > 100) {
      const firstKey = timeCache.current.keys().next().value;
      if (firstKey) timeCache.current.delete(firstKey);
    }
    return formatted;
  }, [dateLocale]);

  // ОПТИМИЗАЦИЯ: Плоский список для виртуализации (вместо группировки)
  // Создаем массив элементов: заголовки групп + уведомления
  type FlatItem = { type: 'header'; label: string; count: number } | { type: 'notification'; data: DuelNotification };
  const flatList = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = [];
    const groups: Record<string, DuelNotification[]> = {};

    // Группируем уведомления
    filteredNotifications.forEach(notification => {
      const date = new Date(notification.created_at);
      let groupKey: string;

      if (isToday(date)) {
        groupKey = t('notifications.today');
      } else if (isYesterday(date)) {
        groupKey = t('notifications.yesterday');
      } else if (isThisWeek(date)) {
        groupKey = t('notifications.thisWeek');
      } else if (isThisMonth(date)) {
        groupKey = t('notifications.thisMonth');
      } else {
        groupKey = format(date, 'MMMM yyyy', { locale: dateLocale });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    // Создаем плоский список: заголовок группы + уведомления
    Object.entries(groups).forEach(([groupKey, groupNotifications]) => {
      items.push({ type: 'header', label: groupKey, count: groupNotifications.length });
      groupNotifications.forEach(notification => {
        items.push({ type: 'notification', data: notification });
      });
    });

    return items;
  }, [filteredNotifications, t, dateLocale]);

  // Group notifications by date (для малых списков)
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, DuelNotification[]> = {};

    filteredNotifications.forEach(notification => {
      const date = new Date(notification.created_at);
      let groupKey: string;

      if (isToday(date)) {
        groupKey = t('notifications.today');
      } else if (isYesterday(date)) {
        groupKey = t('notifications.yesterday');
      } else if (isThisWeek(date)) {
        groupKey = t('notifications.thisWeek');
      } else if (isThisMonth(date)) {
        groupKey = t('notifications.thisMonth');
      } else {
        groupKey = format(date, 'MMMM yyyy', { locale: dateLocale });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    return groups;
  }, [filteredNotifications, t, dateLocale]);

  // КРИТИЧНО: Отслеживаем реальную высоту контейнера (Zero-Dimension Trap fix)
  // Это решает проблему, когда виртуализатор инициализируется до того, как контейнер получит размеры
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // КРИТИЧНО: Используем ref callback для отслеживания размеров контейнера
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      parentRef.current = node;

      // Используем ResizeObserver для отслеживания реальных размеров
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { height, width } = entry.contentRect;
          // Обновляем размеры только если они изменились (избегаем лишних ре-рендеров)
          if (height > 0 && height !== containerHeight) {
            setContainerHeight(height);
          }
          if (width > 0 && width !== containerWidth) {
            setContainerWidth(width);
          }
        }
      });

      resizeObserver.observe(node);

      // Проверяем размеры сразу (на случай, если они уже известны)
      const rect = node.getBoundingClientRect();
      if (rect.height > 0) {
        setContainerHeight(rect.height);
      }
      if (rect.width > 0) {
        setContainerWidth(rect.width);
      }

      // Сохраняем observer для очистки
      (node as any).__resizeObserver = resizeObserver;

      // КРИТИЧНО: Возвращаем функцию cleanup для правильного удаления observer
      return () => {
        resizeObserver.disconnect();
        (node as any).__resizeObserver = null;
      };
    } else if (parentRef.current) {
      // Очищаем observer при размонтировании
      const observer = (parentRef.current as any).__resizeObserver;
      if (observer) {
        observer.disconnect();
        (parentRef.current as any).__resizeObserver = null;
      }
    }
  }, [containerHeight, containerWidth]);

  // ОПТИМИЗАЦИЯ: Виртуализатор для больших списков
  const rowVirtualizer = useVirtualizer({
    count: flatList.length,
    getScrollElement: () => {
      // Защита от undefined (может быть вызвано до рендера)
      if (!parentRef || !parentRef.current) return null;
      return parentRef.current;
    },
    estimateSize: (index) => {
      const item = flatList[index];
      return item.type === 'header' ? 40 : 120; // Заголовок ~40px, уведомление ~120px
    },
    overscan: 5, // Рендерим 5 элементов сверху и снизу для плавности скролла
    // КРИТИЧНО: Включаем измерение элементов для динамических размеров
    measureElement: (element) => {
      if (!element) return 0;
      return element.getBoundingClientRect().height;
    },
  });

  // КРИТИЧНО: Пересчет виртуализатора при изменении данных или размеров контейнера
  useEffect(() => {
    if (flatList.length > 0 && rowVirtualizer && containerHeight > 0) {
      // Пересчитываем размеры всех элементов при изменении данных
      rowVirtualizer.measure();
    }
  }, [flatList.length, view, rowVirtualizer, containerHeight]);

  const handleNotificationClick = useCallback((notification: DuelNotification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.duel_id) {
      navigate(`/games/duel?duelId=${notification.duel_id}`);
      return;
    }

    const deeplink = (notification.metadata as any)?.cta_deeplink || (notification.metadata as any)?.deeplink || (notification.metadata as any)?.route;
    if (typeof deeplink === 'string' && deeplink.trim()) {
      const normalized = deeplink.startsWith('/') ? deeplink : `/${deeplink.replace(/^\//, '')}`;
      navigate(normalized);
    }
  }, [navigate, markAsRead]);

  const sheetProps = typeof open === "boolean" && onOpenChange
    ? { open, onOpenChange }
    : {};

  const defaultTrigger = (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 min-w-4 p-0 flex items-center justify-center text-[10px] font-semibold bg-red-500/85 border-none text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Button>
  );

  return (
    <Sheet {...sheetProps}>
      {renderTrigger && (
        <SheetTrigger asChild>
          {trigger ?? defaultTrigger}
        </SheetTrigger>
      )}
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l border-border/50" style={{ paddingTop: 'max(var(--app-content-top, 0px), env(safe-area-inset-top, 0px))' }}>
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/30">
          <div className="flex items-center justify-between mb-3">
            <SheetTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
              {t('notifications.title')}
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold tabular-nums">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t('notifications.markAllAsRead')}
              </button>
            )}
          </div>

          {/* Tabs */}
          <SegmentedControl
            value={view}
            onChange={(v) => setView(v as NotificationView)}
            options={[
              { id: 'unread', label: t('notifications.unread') },
              { id: 'all', label: t('notifications.all') },
            ]}
            className="w-full"
          />
        </SheetHeader>

        {/* ОПТИМИЗАЦИЯ: Убрали ScrollArea, используем обычный div с overflow-y-auto для виртуализации */}
        <div className="flex-1 flex flex-col min-h-0" key={`notifications-${view}-${filteredNotifications.length}`}>
          {filteredNotifications.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="relative w-20 h-20 mb-4">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 blur-xl" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center border border-border/30">
                  <BellRing className="h-7 w-7 text-muted-foreground/50" />
                </div>
              </div>
              <p className="text-sm font-medium text-foreground/80 mb-1">
                {view === 'unread' ? t('notifications.emptyUnread') : t('notifications.emptyAll')}
              </p>
              <p className="text-xs text-muted-foreground/70 max-w-[240px]">
                {view === 'unread'
                  ? (language === 'es' ? 'Aquí aparecerán tus nuevas notificaciones' : 'Здесь будут появляться новые уведомления')
                  : (language === 'es' ? 'Cuando ocurra algo importante, lo verás aquí' : 'Когда что-то произойдёт — увидишь здесь')
                }
              </p>
            </motion.div>
          ) : flatList.length > 10 ? (
            // ОПТИМИЗАЦИЯ: Виртуализация для больших списков (> 10 элементов)
            // КРИТИЧНО: Контейнер должен иметь фиксированную высоту для работы виртуализации
            <div
              ref={setContainerRef}
              className="flex-1 overflow-y-auto contain-strict"
              style={{
                scrollbarWidth: 'thin',
              }}
            >
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {/* КРИТИЧНО: Рендерим ТОЛЬКО если контейнер имеет реальную высоту (Zero-Dimension Trap fix) */}
                {containerHeight > 0 && rowVirtualizer.getVirtualItems().length > 0 ? (
                  rowVirtualizer.getVirtualItems().map((virtualItem) => {
                    const item = flatList[virtualItem.index];

                    if (item.type === 'header') {
                      return (
                        <div
                          key={virtualItem.key}
                          data-index={virtualItem.index}
                          ref={rowVirtualizer.measureElement}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualItem.start}px)`, // GPU ускорение
                          }}
                          className="px-5 pt-4 pb-1.5"
                        >
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.12em]">
                              {item.label}
                            </h3>
                            <span className="text-[10px] font-medium text-muted-foreground/40 tabular-nums">
                              · {item.count}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={virtualItem.key}
                        data-index={virtualItem.index}
                        ref={rowVirtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualItem.start}px)`, // GPU ускорение
                        }}
                        className="px-3 pb-1.5"
                      >
                        {(() => {
                          const n = item.data;
                          const deeplink = (n.metadata as any)?.cta_deeplink || (n.metadata as any)?.deeplink || (n.metadata as any)?.route;
                          const route = n.duel_id
                            ? `/games/duel?duelId=${n.duel_id}`
                            : typeof deeplink === 'string' && deeplink.trim()
                              ? (deeplink.startsWith('/') ? deeplink : `/${deeplink.replace(/^\//, '')}`)
                              : null;
                          return (
                        <NotificationItem
                          notification={item.data}
                          isExpanded={expandedNotifications.has(item.data.id)}
                          onToggleExpand={toggleNotificationExpansion}
                          onClick={handleNotificationClick}
                          getCachedTime={getCachedTime}
                          shouldTruncate={shouldTruncate}
                          navigateTo={navigate}
                          route={route}
                          t={t}
                        />
                          );
                        })()}
                      </div>
                    );
                  })
                ) : (
                  // Показываем placeholder, пока контейнер не получил реальные размеры
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
                    {flatList.length > 0 ? t('notifications.loading') : t('notifications.empty')}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Для малых списков (< 10) рендерим без виртуализации (простая группировка)
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
              {Object.entries(groupedNotifications).map(([groupKey, groupNotifications]) => (
                <div key={groupKey} className="space-y-1">
                  <div className="flex items-baseline gap-2 px-2 pb-1">
                    <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.12em]">
                      {groupKey}
                    </h3>
                    <span className="text-[10px] font-medium text-muted-foreground/40 tabular-nums">
                      · {groupNotifications.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {groupNotifications.map((notification) => (
                      (() => {
                        const deeplink = (notification.metadata as any)?.cta_deeplink || (notification.metadata as any)?.deeplink || (notification.metadata as any)?.route;
                        const route = notification.duel_id
                          ? `/games/duel?duelId=${notification.duel_id}`
                          : typeof deeplink === 'string' && deeplink.trim()
                            ? (deeplink.startsWith('/') ? deeplink : `/${deeplink.replace(/^\//, '')}`)
                            : null;
                        return (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            isExpanded={expandedNotifications.has(notification.id)}
                            onToggleExpand={toggleNotificationExpansion}
                            onClick={handleNotificationClick}
                            getCachedTime={getCachedTime}
                            shouldTruncate={shouldTruncate}
                            navigateTo={navigate}
                            route={route}
                            t={t}
                          />
                        );
                      })()
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>

      {/* Reminder Connect Modal - lazy loaded */}
      <Suspense fallback={null}>
        <ReminderConnectModal open={reminderModalOpen} onOpenChange={setReminderModalOpen} />
      </Suspense>
    </Sheet>
  );
}
