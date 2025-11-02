import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Settings, Trophy, Gamepad2, Crown, Upload, Camera, Mail, Globe, Moon, Sun, Volume2, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
];

const THEMES = [
  { value: 'light', label: 'Светлая', icon: Sun },
  { value: 'dark', label: 'Тёмная', icon: Moon },
  { value: 'system', label: 'Системная', icon: Settings },
];

// Генерация детерминированного цвета по user_id
const generateAvatarColor = (userId: string) => {
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  ];
  
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const UserProfilePopover = () => {
  const navigate = useNavigate();
  const { user, logout } = useUserContext();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.first_name || '');
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [selectedTheme, setSelectedTheme] = useState('system');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('telegram_id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setDisplayName(data.first_name || user.first_name || '');
      
      const settings = data.settings as any;
      setSelectedLanguage(settings?.language || 'es');
      setSelectedTheme(settings?.theme || 'system');
      setNotificationsEnabled(settings?.notifications ?? true);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!user?.id || !displayName.trim()) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ first_name: displayName.trim() })
        .eq('telegram_id', user.id);

      if (error) throw error;

      toast.success('Имя сохранено', {
        action: {
          label: 'Отменить',
          onClick: () => setDisplayName(user.first_name || ''),
        },
      });
      setIsEditing(false);
      loadProfile();
    } catch (error) {
      console.error('Error saving name:', error);
      toast.error('Ошибка при сохранении имени');
    }
  };

  const handleLanguageChange = async (lang: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          settings: { 
            ...profile?.settings,
            language: lang 
          } 
        })
        .eq('telegram_id', user.id);

      if (error) throw error;

      setSelectedLanguage(lang);
      toast.success('Язык изменён');
      loadProfile();
    } catch (error) {
      console.error('Error changing language:', error);
      toast.error('Ошибка при смене языка');
    }
  };

  const handleThemeChange = async (theme: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          settings: { 
            ...profile?.settings,
            theme 
          } 
        })
        .eq('telegram_id', user.id);

      if (error) throw error;

      setSelectedTheme(theme);
      
      // Apply theme
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // system
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      
      toast.success('Тема изменена');
      loadProfile();
    } catch (error) {
      console.error('Error changing theme:', error);
      toast.error('Ошибка при смене темы');
    }
  };

  const handleNotificationsChange = async (enabled: boolean) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          settings: { 
            ...profile?.settings,
            notifications: enabled 
          } 
        })
        .eq('telegram_id', user.id);

      if (error) throw error;

      setNotificationsEnabled(enabled);
      toast.success(enabled ? 'Уведомления включены' : 'Уведомления выключены');
    } catch (error) {
      console.error('Error changing notifications:', error);
      toast.error('Ошибка при смене уведомлений');
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. 3MB)');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Можно загружать только изображения');
      return;
    }

    setUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('telegram_id', user.id);

      if (updateError) throw updateError;

      toast.success('Аватар загружен');
      loadProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Ошибка при загрузке аватара');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ photo_url: null })
        .eq('telegram_id', user.id);

      if (error) throw error;

      toast.success('Аватар удалён');
      loadProfile();
    } catch (error) {
      console.error('Error deleting avatar:', error);
      toast.error('Ошибка при удалении аватара');
    }
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    toast.success('Вы вышли из аккаунта');
  };

  if (!user) return null;

  const avatarColor = generateAvatarColor(user.id.toString());
  const initials = getInitials(profile?.first_name || user.first_name);
  const xpProgress = profile?.xp ? (profile.xp % 1000) / 10 : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative group">
          <Avatar className="h-10 w-10 ring-2 ring-border hover:ring-primary transition-all cursor-pointer">
            <AvatarImage src={profile?.photo_url || user.photo_url} alt={user.first_name} />
            <AvatarFallback 
              className="text-white font-bold text-sm"
              style={{ background: avatarColor }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 p-0 animate-in fade-in-0 slide-in-from-top-2" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.photo_url || user.photo_url} alt={user.first_name} />
              <AvatarFallback 
                className="text-white font-bold text-lg"
                style={{ background: avatarColor }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-8"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveName}>
                      Сохранить
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        setIsEditing(false);
                        setDisplayName(user.first_name || '');
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg truncate">
                      {profile?.first_name || user.first_name}
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => setIsEditing(true)}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                  {user.username && (
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  )}
                </>
              )}
              
              <div className="flex items-center gap-2 mt-2">
                <Crown className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <Progress value={xpProgress} className="h-1.5" />
                </div>
                <span className="text-xs font-medium">{profile?.xp || 0} XP</span>
              </div>
            </div>
          </div>

          {/* Avatar Upload */}
          <div className="flex gap-2">
            <Label htmlFor="avatar-upload" className="flex-1">
              <div className="flex items-center justify-center gap-2 px-3 py-2 text-sm border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                <Upload className="h-4 w-4" />
                {uploading ? 'Загрузка...' : 'Загрузить фото'}
              </div>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </Label>
            {(profile?.photo_url || user.photo_url) && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeleteAvatar}
                className="px-3"
              >
                Удалить
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Settings */}
        <div className="p-4 space-y-4">
          {/* Language */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Язык
            </Label>
            <RadioGroup value={selectedLanguage} onValueChange={handleLanguageChange}>
              {LANGUAGES.map((lang) => (
                <div key={lang.code} className="flex items-center space-x-2">
                  <RadioGroupItem value={lang.code} id={lang.code} />
                  <Label htmlFor={lang.code} className="cursor-pointer">
                    {lang.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Theme */}
          <div className="space-y-2">
            <Label>Тема</Label>
            <RadioGroup value={selectedTheme} onValueChange={handleThemeChange}>
              {THEMES.map((theme) => (
                <div key={theme.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={theme.value} id={theme.value} />
                  <Label htmlFor={theme.value} className="flex items-center gap-2 cursor-pointer">
                    <theme.icon className="h-4 w-4" />
                    {theme.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Звук
              </Label>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Уведомления
              </Label>
              <Switch 
                checked={notificationsEnabled} 
                onCheckedChange={handleNotificationsChange} 
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Quick Links */}
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              setOpen(false);
              navigate('/achievements');
            }}
          >
            <Trophy className="mr-2 h-4 w-4" />
            Мои достижения
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              setOpen(false);
              navigate('/games');
            }}
          >
            <Gamepad2 className="mr-2 h-4 w-4" />
            История дуэлей
          </Button>
        </div>

        <Separator />

        {/* Logout */}
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </Button>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-muted/50 text-center text-xs text-muted-foreground">
          v1.0.0 © 2025 Sdadim
        </div>
      </PopoverContent>
    </Popover>
  );
};
