import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Settings, HelpCircle, LogOut, Zap, Crown } from "lucide-react";
import { useTheme } from "next-themes";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserSettings {
  theme: string;
  language: string;
  notifications: boolean;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { user, logout } = useUserContext();
  const { setTheme, theme } = useTheme();
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    language: 'en',
    notifications: true
  });
  const [boosts, setBoosts] = useState(0);
  const [subscription, setSubscription] = useState('free');
  const [loading, setLoading] = useState(false);

  // Load user settings from database
  useEffect(() => {
    if (user && open) {
      loadUserProfile();
    }
  }, [user, open]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('settings, boosts, subscription_status')
        .eq('telegram_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        // Safely parse settings
        const userSettings = data.settings as any;
        if (userSettings && typeof userSettings === 'object') {
          setSettings({
            theme: userSettings.theme || 'light',
            language: userSettings.language || 'en',
            notifications: userSettings.notifications !== false
          });
          // Apply theme from DB
          if (userSettings.theme) {
            setTheme(userSettings.theme);
          }
        }
        setBoosts(data.boosts || 0);
        setSubscription(data.subscription_status || 'free');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;

    setLoading(true);
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('telegram_id', user.id);

      if (error) throw error;

      toast.success('Настройки сохранены');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Не удалось сохранить настройки');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? 'dark' : 'light';
    setTheme(newTheme);
    updateSettings({ theme: newTheme });
  };

  const handleLanguageChange = (lang: string) => {
    updateSettings({ language: lang });
  };

  const handleNotificationsChange = (checked: boolean) => {
    updateSettings({ notifications: checked });
  };

  const handleBoost = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          boosts: boosts + 1,
          updated_at: new Date().toISOString()
        })
        .eq('telegram_id', user.id);

      if (error) throw error;

      setBoosts(boosts + 1);
      toast.success('Буст активирован! +1');
    } catch (error) {
      console.error('Failed to boost:', error);
      toast.error('Не удалось активировать буст');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    onOpenChange(false);
    toast.success('Вы вышли из аккаунта');
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Профиль
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Информация
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Имя:</span> {user.first_name} {user.last_name}</p>
              {user.username && (
                <p><span className="text-muted-foreground">Username:</span> @{user.username}</p>
              )}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Подписка:</span>
                <span className={`font-medium ${subscription === 'free' ? 'text-muted-foreground' : 'text-primary'}`}>
                  {subscription === 'free' ? 'Free' : 'Pro'}
                </span>
                {subscription === 'pro' && <Crown className="h-4 w-4 text-primary" />}
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-muted-foreground">Бусты:</span>
                <span className="font-medium">{boosts}</span>
              </div>
            </div>

            {subscription === 'free' && (
              <Button className="w-full" variant="default">
                <Crown className="h-4 w-4 mr-2" />
                Оформить Pro
              </Button>
            )}

            <Button 
              className="w-full" 
              variant="outline"
              onClick={handleBoost}
              disabled={loading}
            >
              <Zap className="h-4 w-4 mr-2" />
              Активировать Буст
            </Button>
          </div>

          <Separator />

          {/* Settings Section */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Настройки
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="theme" className="flex-1">
                  Темная тема
                </Label>
                <Switch
                  id="theme"
                  checked={theme === 'dark'}
                  onCheckedChange={handleThemeChange}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notifications" className="flex-1">
                  Уведомления
                </Label>
                <Switch
                  id="notifications"
                  checked={settings.notifications}
                  onCheckedChange={handleNotificationsChange}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Язык</Label>
                <div className="flex gap-2">
                  <Button
                    variant={settings.language === 'ru' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleLanguageChange('ru')}
                    disabled={loading}
                    className="flex-1"
                  >
                    Русский
                  </Button>
                  <Button
                    variant={settings.language === 'en' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleLanguageChange('en')}
                    disabled={loading}
                    className="flex-1"
                  >
                    English
                  </Button>
                  <Button
                    variant={settings.language === 'es' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleLanguageChange('es')}
                    disabled={loading}
                    className="flex-1"
                  >
                    Español
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Help Section */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Помощь
            </h3>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start">
                Связаться с нами
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                FAQ / Справка
              </Button>
            </div>
          </div>

          <Separator />

          {/* Logout */}
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
