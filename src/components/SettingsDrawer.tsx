import { useState } from "react";
import { 
  User, Crown, Moon, Sun, Globe, Zap, Bell, Download, 
  Shield, HelpCircle, LogOut, ChevronRight, Smartphone,
  Check, CheckCheck, Settings, Mail, Camera, Volume2
} from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserContext } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { ThemeToggle } from "./ThemeToggle";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { isTelegramMiniApp } from "@/lib/telegram";
import { motion } from "framer-motion";

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDrawer({ open, onOpenChange }: SettingsDrawerProps) {
  const { user, logout, platform, supabaseUser } = useUserContext();
  const { toast } = useToast();
  const { notifications: notificationList, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("ru");
  const [activeTab, setActiveTab] = useState<"settings" | "notifications">("settings");
  const isTelegramApp = isTelegramMiniApp();

  const handleLogout = () => {
    logout();
    onOpenChange(false);
    toast({
      title: "Вы вышли из системы",
      description: "До скорой встречи!",
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-border/50 pb-3 px-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
              {user?.photo_url ? (
                <img 
                  src={user.photo_url} 
                  alt={user.first_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-lg font-bold truncate">
                {user?.first_name || "Гость"} {user?.last_name || ""}
              </DrawerTitle>
              <DrawerDescription className="text-xs truncate">
                {user?.username ? `@${user.username}` : ""}
              </DrawerDescription>
            </div>
            {/* Tab Switcher */}
            <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("settings")}
                className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "settings"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab("notifications")}
                className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "notifications"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500 border-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </button>
            </div>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-4">
            {activeTab === "settings" ? (
              <>
                {/* Аватар и профиль */}
                <section className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Camera className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Изменить аватар</span>
                  </div>
                </section>

                <Separator />

                {/* Подписка */}
                <section className="space-y-2">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">Бесплатный план</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Получите неограниченный доступ
                    </p>
                    <Button className="w-full" size="sm" variant="default">
                      <Crown className="w-3 h-3 mr-2" />
                      Оформить PRO
                    </Button>
                  </div>
                </section>

                <Separator />

                {/* Внешний вид и язык */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Moon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">Тема</span>
                    </div>
                    <ThemeToggle />
                  </div>

                  <button 
                    onClick={() => {
                      const langMap: Record<string, string> = { "ru": "es", "es": "en", "en": "ru" };
                      const newLang = langMap[language] || "ru";
                      setLanguage(newLang);
                      toast({
                        title: "Язык изменён",
                        description: newLang === "ru" ? "Русский" : newLang === "es" ? "Español" : "English",
                      });
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">
                        {language === "ru" ? "🇷🇺 Русский" : language === "es" ? "🇪🇸 Español" : "🇬🇧 English"}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </section>

                <Separator />

                {/* Бусты */}
                <section className="space-y-2">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-semibold">Доступно: 0</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      +100% к XP и приоритетные ответы AI
                    </p>
                    <Button variant="outline" className="w-full" size="sm">
                      <Zap className="w-3 h-3 mr-2" />
                      Купить буст
                    </Button>
                  </div>
                </section>

                <Separator />

                {/* Настройки */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Volume2 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">Звук</span>
                    </div>
                    <Switch 
                      checked={true} 
                      onCheckedChange={() => {}}
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bell className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">Уведомления</span>
                    </div>
                    <Switch 
                      checked={notifications} 
                      onCheckedChange={setNotifications}
                    />
                  </div>

                  <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Download className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">Offline материалы</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>

                  <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">Безопасность</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </section>

                {/* Аккаунты и доступ (только для Telegram) */}
                {isTelegramApp && (
                  <>
                    <Separator />
                    <section className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                        Аккаунты и доступ
                      </h4>
                      <div className="p-2 rounded-lg bg-muted/30 border">
                        <div className="flex items-center gap-2 text-xs mb-1">
                          <Check className="w-3 h-3 text-green-500" />
                          <span>Telegram vinculado</span>
                        </div>
                        {supabaseUser?.email ? (
                          <div className="flex items-center gap-2 text-xs">
                            <Check className="w-3 h-3 text-green-500" />
                            <span className="truncate">Email vinculado: {supabaseUser.email}</span>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="w-full mt-2 text-xs h-7">
                            <Mail className="w-3 h-3 mr-2" />
                            Vincular email
                          </Button>
                        )}
                      </div>
                    </section>
                  </>
                )}

                <Separator />

                {/* Помощь */}
                <section className="space-y-2">
                  <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <HelpCircle className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">Поддержка</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>

                  <div className="flex items-center justify-between p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Smartphone className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Информация</span>
                        <span className="text-xs text-muted-foreground">
                          {platform === "telegram" ? "Telegram Mini App" : "Web"} • v1.0.0
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Выход (только для Web, не для Telegram) */}
                {!isTelegramApp && user && (
                  <>
                    <Separator />
                    <Button 
                      variant="destructive" 
                      className="w-full" 
                      size="sm"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Выйти из аккаунта
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Уведомления */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Уведомления</h3>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs h-7"
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Всё прочитано
                    </Button>
                  )}
                </div>

                {notificationList.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
                      <Bell className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Пока нет уведомлений</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notificationList.map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          notification.is_read
                            ? 'bg-background/50 border-border/50 opacity-60'
                            : 'bg-primary/5 border-primary/30 hover:bg-primary/10'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {notification.icon && (
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm">
                              {notification.icon}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-semibold text-xs line-clamp-1">{notification.title}</h4>
                              {!notification.is_read && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: ru,
                              })}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
