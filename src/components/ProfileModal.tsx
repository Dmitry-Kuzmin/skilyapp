import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Settings, HelpCircle, LogOut, Zap, Crown, X, Pencil, Camera, Trash2, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const { user, logout, profileId, supabaseUser } = useUserContext();
  const { setTheme, theme: currentTheme } = useTheme();
  const isMobile = useIsMobile();
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    language: 'ru',
    notifications: true
  });
  const [boosts, setBoosts] = useState(0);
  const [subscription, setSubscription] = useState('free');
  const [loading, setLoading] = useState(false);
  const [xp, setXp] = useState(0);
  const [nextLevelXp, setNextLevelXp] = useState(5000);
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user settings from database
  useEffect(() => {
    if (user && open) {
      loadUserProfile();
    }
  }, [user, open, profileId]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      let query = supabase.from('profiles').select('*');
      
      if (profileId) {
        query = query.eq('id', profileId);
      } else {
        query = query.eq('telegram_id', user.id);
      }
      
      const { data, error } = await query.single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        // Safely parse settings
        const userSettings = data.settings as any;
        if (userSettings && typeof userSettings === 'object') {
          setSettings({
            theme: userSettings.theme || 'light',
            language: userSettings.language || 'ru',
            notifications: userSettings.notifications !== false
          });
          // Apply theme from DB
          if (userSettings.theme) {
            setTheme(userSettings.theme);
          }
        }
        setBoosts(data.boosts || 0);
        setSubscription(data.subscription_status || 'free');
        setXp(data.xp || 0);
        // Calculate next level XP (simplified - you can adjust this logic)
        setNextLevelXp(5000);
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
      // Validate settings before saving
      const validTheme = ['light', 'dark'].includes(updatedSettings.theme) ? updatedSettings.theme : 'light';
      const validLanguage = ['ru', 'en', 'es'].includes(updatedSettings.language) ? updatedSettings.language : 'ru';
      const validNotifications = typeof updatedSettings.notifications === 'boolean' ? updatedSettings.notifications : true;
      
      const validatedSettings = {
        theme: validTheme,
        language: validLanguage,
        notifications: validNotifications
      };

      const { error } = await supabase
        .from('profiles')
        .update({ 
          settings: validatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('telegram_id', user.id);

      if (error) throw error;

      setSettings(validatedSettings);
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
    
    // Check if already at max boosts
    if (boosts >= 100) {
      toast.error('Достигнут максимум бустов (100)');
      return;
    }

    setLoading(true);
    try {
      const newBoosts = Math.min(boosts + 1, 100); // Ensure max 100
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          boosts: newBoosts,
          updated_at: new Date().toISOString()
        })
        .eq('telegram_id', user.id);

      if (error) throw error;

      setBoosts(newBoosts);
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profileId || !supabaseUser) return;

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. 3MB)');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Только изображения');
      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      const fileExt = file.name.split('.').pop();
      const fileName = `${supabaseUser.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('id', profileId);

      if (updateError) throw updateError;

      toast.success('Аватар загружен');
      loadUserProfile();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Не удалось загрузить аватар');
      setAvatarPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!profileId) return;

    const { error } = await supabase
      .from('profiles')
      .update({ photo_url: null })
      .eq('id', profileId);

    if (!error) {
      toast.success('Аватар удален');
      setAvatarPreview(null);
      loadUserProfile();
    }
  };

  const calculateProgress = () => {
    if (nextLevelXp === 0) return 0;
    return Math.min((xp / nextLevelXp) * 100, 100);
  };

  if (!user) return null;

  const profileContent = (
    <div className="space-y-6 pb-4">
      {/* Profile Header */}
      <div className="flex items-start gap-4">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarPreview || profile?.photo_url || undefined} />
            <AvatarFallback>
              {user.first_name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold truncate">
              {profile?.first_name || user.first_name} {profile?.last_name || user.last_name}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          {user.username && (
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          )}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">ХР до следующего уровня</span>
              <span className="font-medium">{nextLevelXp - xp} XP</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>
        </div>
      </div>

      {/* Change Avatar Section */}
      <div className="space-y-3">
        <h3 className="font-semibold">Изменить аватар</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="h-4 w-4 mr-2" />
            Загрузить фото
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDeleteAvatar}
            disabled={!profile?.photo_url || uploading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />
      </div>

      <Separator />

      {/* Settings Section */}
      <div className="space-y-4">
        <h3 className="font-semibold">Настройки</h3>
        
        {/* Language */}
        <div className="space-y-2">
          <Label>Язык</Label>
          <RadioGroup
            value={settings.language}
            onValueChange={(value) => handleLanguageChange(value)}
            disabled={loading}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="es" id="lang-es" />
              <Label htmlFor="lang-es" className="flex items-center gap-2 cursor-pointer">
                <span>🇪🇸</span>
                <span>Español</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="en" id="lang-en" />
              <Label htmlFor="lang-en" className="flex items-center gap-2 cursor-pointer">
                <span>🇬🇧</span>
                <span>English</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ru" id="lang-ru" />
              <Label htmlFor="lang-ru" className="flex items-center gap-2 cursor-pointer">
                <span>🇷🇺</span>
                <span>Русский</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Theme */}
        <div className="space-y-2">
          <Label>Тема</Label>
          <RadioGroup
            value={currentTheme || 'light'}
            onValueChange={(value) => {
              setTheme(value);
              updateSettings({ theme: value });
            }}
            disabled={loading}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="theme-light" />
              <Label htmlFor="theme-light" className="flex items-center gap-2 cursor-pointer">
                <Sun className="h-4 w-4" />
                <span>Светлая</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="theme-dark" />
              <Label htmlFor="theme-dark" className="flex items-center gap-2 cursor-pointer">
                <Moon className="h-4 w-4" />
                <span>Тёмная</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <Separator />

      {/* Additional Info */}
      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <User className="h-4 w-4" />
          Информация
        </h3>
        <div className="space-y-2 text-sm">
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
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] h-[90vh] rounded-t-2xl overflow-y-auto flex flex-col"
        >
          <SheetHeader>
            <SheetTitle className="sr-only">Профиль</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {profileContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Профиль
          </DialogTitle>
        </DialogHeader>
        {profileContent}
      </DialogContent>
    </Dialog>
  );
}
