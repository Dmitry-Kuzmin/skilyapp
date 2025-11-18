import { useState, useMemo, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, CheckCheck, Swords, Clock, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useUserContext } from '@/contexts/UserContext';
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { NotificationIcon } from './NotificationIcon';
import { ReminderConnectModal } from '@/components/notifications/ReminderConnectModal';
import { isTelegramMiniApp } from '@/lib/telegram';

type NotificationFilter = 'all' | 'duels' | 'reminders' | 'system';

export function NotificationsPanel() {
  const { profileId } = useUserContext();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const navigate = useNavigate();

  const toggleNotificationExpansion = (notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

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

  // Debug logging
  useEffect(() => {
    console.log('[NotificationsPanel] Component mounted, profileId:', profileId);
    console.log('[NotificationsPanel] Notifications:', notifications.length, 'Unread:', unreadCount);
    if (notifications.length > 0) {
      console.log('[NotificationsPanel] First notification:', notifications[0]);
    }
  }, [notifications, unreadCount, profileId]);

  // Filter notifications by type
  // Hide progress notifications (start, progress, boost, opponent_ahead, opponent_behind, reminder)
  // Show only results (finish, timeout)
  const PROGRESS_NOTIFICATION_TYPES = ['start', 'progress', 'boost', 'opponent_ahead', 'opponent_behind', 'reminder'];
  
  const filteredNotifications = useMemo(() => {
    // First, filter out progress notifications (always hide them)
    const notificationsWithoutProgress = notifications.filter(n => !PROGRESS_NOTIFICATION_TYPES.includes(n.type));
    
    if (filter === 'all') return notificationsWithoutProgress;
    
    const typeMap: Record<string, NotificationFilter> = {
      'finish': 'duels',
      'timeout': 'duels',
    };

    return notificationsWithoutProgress.filter(n => {
      const category = typeMap[n.type] || 'system';
      return category === filter;
    });
  }, [notifications, filter]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, typeof notifications> = {};
    
    filteredNotifications.forEach(notification => {
      const date = new Date(notification.created_at);
      let groupKey: string;
      
      if (isToday(date)) {
        groupKey = 'Сегодня';
      } else if (isYesterday(date)) {
        groupKey = 'Вчера';
      } else if (isThisWeek(date)) {
        groupKey = 'На этой неделе';
      } else if (isThisMonth(date)) {
        groupKey = 'В этом месяце';
      } else {
        groupKey = format(date, 'MMMM yyyy', { locale: ru });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });
    
    return groups;
  }, [filteredNotifications]);

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Navigate to duel if duel_id exists
    if (notification.duel_id) {
      navigate(`/games/duel?duelId=${notification.duel_id}`);
    }
  };

  const getFilterIcon = (filterType: NotificationFilter) => {
    switch (filterType) {
      case 'duels':
        return <Swords className="h-4 w-4" />;
      case 'reminders':
        return <Clock className="h-4 w-4" />;
      case 'system':
        return <Zap className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 min-w-4 p-0 flex items-center justify-center text-[10px] font-semibold bg-red-500/85 border-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className={cn("border-b", isTelegramMiniApp() ? "pt-0 px-4 pb-4" : "p-6 pb-4")}>
          <div className="flex items-center justify-between mb-4">
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Уведомления
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-8"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Всё прочитано
              </Button>
            )}
          </div>
          
          {/* Filters */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as NotificationFilter)} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-9">
              <TabsTrigger value="all" className="text-xs px-2">
                Все
              </TabsTrigger>
              <TabsTrigger value="duels" className="text-xs px-2">
                <Swords className="h-3 w-3 mr-1" />
                Дуэли
              </TabsTrigger>
              <TabsTrigger value="reminders" className="text-xs px-2">
                <Clock className="h-3 w-3 mr-1" />
                Напоминания
              </TabsTrigger>
              <TabsTrigger value="system" className="text-xs px-2">
                <Zap className="h-3 w-3 mr-1" />
                Системные
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <AnimatePresence mode="wait">
            {filteredNotifications.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-12 text-center space-y-3"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  {getFilterIcon(filter)}
                </div>
                <p className="text-muted-foreground">
                  {filter === 'all' 
                    ? 'Пока нет уведомлений' 
                    : `Нет уведомлений в категории "${filter}"`}
                </p>
                {filter === 'reminders' && (
                  <Button
                    onClick={() => setReminderModalOpen(true)}
                    className="mt-4"
                    size="sm"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Настроить напоминания
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="notifications"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 space-y-6"
              >
                {Object.entries(groupedNotifications).map(([groupKey, groupNotifications]) => (
                  <div key={groupKey} className="space-y-3">
                    {/* Group Header */}
                    <div className="flex items-center gap-2 px-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {groupKey}
                      </h3>
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">
                        {groupNotifications.length}
                      </span>
                    </div>

                    {/* Notifications in group */}
                    <div className="space-y-2">
                      {groupNotifications.map((notification, index) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            "p-4 rounded-xl border-2 cursor-pointer transition-all w-full max-w-full overflow-hidden",
                            "hover:shadow-md",
                            notification.is_read
                              ? 'bg-background/50 border-border/50 opacity-60'
                              : 'bg-primary/5 border-primary/30 hover:bg-primary/10 hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {notification.icon && (
                              <div className={cn(
                                "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                                notification.is_read 
                                  ? 'bg-muted/50' 
                                  : 'bg-primary/20 shadow-sm'
                              )}>
                                <NotificationIcon 
                                  iconName={notification.icon} 
                                  className={cn(
                                    notification.is_read 
                                      ? 'text-muted-foreground' 
                                      : 'text-primary'
                                  )}
                                  size={24}
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className={cn(
                                  "font-bold text-sm line-clamp-1 break-words overflow-wrap-anywhere",
                                  !notification.is_read && "text-foreground"
                                )}>
                                  {notification.title}
                                </h4>
                                {!notification.is_read && (
                                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5 animate-pulse" />
                                )}
                              </div>
                              <div className="mb-2 max-w-full overflow-hidden">
                                {shouldTruncate(notification.message) && !expandedNotifications.has(notification.id) ? (
                                  <>
                                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed break-all">
                                      {notification.message}
                                    </p>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleNotificationExpansion(notification.id);
                                      }}
                                      className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                                    >
                                      <ChevronDown className="h-3 w-3" />
                                      Развернуть сообщение
                                    </button>
                                  </>
                                ) : shouldTruncate(notification.message) && expandedNotifications.has(notification.id) ? (
                                  <>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed break-all">
                                      {notification.message}
                                    </p>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleNotificationExpansion(notification.id);
                                      }}
                                      className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                                    >
                                      <ChevronUp className="h-3 w-3" />
                                      Свернуть сообщение
                                    </button>
                                  </>
                                ) : (
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed break-all">
                                    {notification.message}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(notification.created_at), {
                                    addSuffix: true,
                                    locale: ru,
                                  })}
                                </p>
                                {notification.duel_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/games/duel?duelId=${notification.duel_id}`);
                                    }}
                                  >
                                    Перейти
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </SheetContent>
      
      {/* Reminder Connect Modal */}
      <ReminderConnectModal open={reminderModalOpen} onOpenChange={setReminderModalOpen} />
    </Sheet>
  );
}
