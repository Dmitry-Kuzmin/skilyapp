import { useState, useEffect } from "react";
import { 
  User, Crown, Moon, Sun, Globe, Zap, Bell, Download, 
  Shield, HelpCircle, LogOut, ChevronRight, Smartphone, Volume2
} from "lucide-react";
import { sounds } from "@/lib/sounds";
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
import { useUserContext } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "./ThemeToggle";
import { PasskeyManager } from "@/components/auth/PasskeyManager";

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDrawer({ open, onOpenChange }: SettingsDrawerProps) {
  const { user, logout, platform, supabaseUser } = useUserContext();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("ru");
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [showPasskeys, setShowPasskeys] = useState(false);

  useEffect(() => {
    // Load sounds preference from localStorage
    const savedSounds = localStorage.getItem('soundsEnabled');
    if (savedSounds !== null) {
      const enabled = savedSounds === 'true';
      setSoundsEnabled(enabled);
      sounds.setEnabled(enabled);
    }
  }, []);

  const handleSoundsToggle = (enabled: boolean) => {
    setSoundsEnabled(enabled);
    sounds.setEnabled(enabled);
    localStorage.setItem('soundsEnabled', enabled.toString());
    if (enabled) {
      sounds.playClick(1000, 0.1);
    }
  };

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
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
              {user?.photo_url ? (
                <img 
                  src={user.photo_url} 
                  alt={user.first_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-primary-foreground" />
              )}
            </div>
            <div className="flex-1">
              <DrawerTitle className="text-2xl">
                {user?.first_name || "Гость"} {user?.last_name || ""}
              </DrawerTitle>
              <DrawerDescription>
                {user?.username ? `@${user.username}` : ""}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 py-4 space-y-6">
          {/* Подписка */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Подписка
            </h3>
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Бесплатный план</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Получите неограниченный доступ ко всем функциям
              </p>
              <Button className="w-full" size="sm">
                <Crown className="w-4 h-4 mr-2" />
                Оформить PRO
              </Button>
            </div>
          </section>

          <Separator />

          {/* Тема */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Внешний вид
            </h3>
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">Тема интерфейса</span>
              </div>
              <ThemeToggle />
            </div>
          </section>

          <Separator />

          {/* Язык */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Язык
            </h3>
            <button 
              onClick={() => {
                const newLang = language === "ru" ? "es" : "ru";
                setLanguage(newLang);
                toast({
                  title: "Язык изменён",
                  description: newLang === "ru" ? "Русский" : "Español",
                });
              }}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">
                  {language === "ru" ? "Русский" : "Español"}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </section>

          <Separator />

          {/* Бусты */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Бусты
            </h3>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold">Доступно: 0</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Временный +100% к XP и приоритетные ответы AI
              </p>
              <Button variant="outline" className="w-full" size="sm">
                <Zap className="w-4 h-4 mr-2" />
                Купить буст
              </Button>
            </div>
          </section>

          <Separator />

          {/* Настройки */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Настройки
            </h3>
            
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">Уведомления</span>
              </div>
              <Switch 
                checked={notifications} 
                onCheckedChange={setNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">Звуковые эффекты</span>
              </div>
              <Switch 
                checked={soundsEnabled} 
                onCheckedChange={handleSoundsToggle}
              />
            </div>

            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">Offline материалы</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button 
              onClick={() => setShowPasskeys(!showPasskeys)}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">Безопасность</span>
              </div>
              <ChevronRight className={cn(
                "w-5 h-5 text-muted-foreground transition-transform",
                showPasskeys && "rotate-90"
              )} />
            </button>

            {/* Passkeys Section (раскрывается) */}
            {showPasskeys && supabaseUser && platform === 'web' && (
              <div className="ml-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <PasskeyManager />
              </div>
            )}
          </section>

          <Separator />

          {/* Помощь */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Помощь
            </h3>
            
            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">Поддержка</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium">Информация</span>
                  <span className="text-xs text-muted-foreground">
                    {platform === "telegram" ? "Telegram Mini App" : "Web"} • v1.0.0
                  </span>
                </div>
              </div>
            </button>
          </section>

          <Separator />

          {/* Выход */}
          {user && (
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Выйти из аккаунта
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
