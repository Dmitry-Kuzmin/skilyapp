import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Trophy, Gamepad2, Crown, Upload, Globe, Moon, Sun, Volume2, Bell, Edit2 } from "lucide-react";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: 'es' as const, label: 'Español', flag: '🇪🇸' },
  { code: 'en' as const, label: 'English', flag: '🇬🇧' },
  { code: 'ru' as const, label: 'Русский', flag: '🇷🇺' },
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
  const { user, profileId, logout } = useUserContext();
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.first_name || '');
  const [selectedTheme, setSelectedTheme] = useState('system');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileId) {
      loadProfile();
    }
  }, [profileId]);

  const loadProfile = async () => {
    if (!profileId) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) throw error;

      setProfile(data);
      setDisplayName(data.first_name || user?.first_name || '');
      
      const settings = data.settings as any;
      setSelectedTheme(settings?.theme || 'system');
      setNotificationsEnabled(settings?.notifications ?? true);
      
      // Apply theme immediately
      applyTheme(settings?.theme || 'system');
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (theme: string) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    }
  };

  const handleSaveName = async () => {
    if (!profileId || !displayName.trim()) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ first_name: displayName.trim() })
        .eq('id', profileId);

      if (error) throw error;

      toast.success(t('nameSaved'));
      setIsEditing(false);
      loadProfile();
    } catch (error) {
      console.error('Error saving name:', error);
      toast.error('Error saving name');
    }
  };

  const handleLanguageChange = async (lang: 'es' | 'en' | 'ru') => {
    setLanguage(lang);
    toast.success(t('languageChanged'));
  };

  const handleThemeChange = async (theme: string) => {
    if (!profileId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          settings: { 
            ...profile?.settings,
            theme 
          } 
        })
        .eq('id', profileId);

      if (error) throw error;

      setSelectedTheme(theme);
      applyTheme(theme);
      
      toast.success(t('themeChanged'));
    } catch (error) {
      console.error('Error changing theme:', error);
    }
  };

  const handleNotificationsChange = async (enabled: boolean) => {
    if (!profileId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          settings: { 
            ...profile?.settings,
            notifications: enabled 
          } 
        })
        .eq('id', profileId);

      if (error) throw error;

      setNotificationsEnabled(enabled);
      toast.success(enabled ? t('notificationsEnabled') : t('notificationsDisabled'));
    } catch (error) {
      console.error('Error changing notifications:', error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profileId) return;

    // Validate file
    if (file.size > 3 * 1024 * 1024) {
      toast.error(t('fileTooLarge'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error(t('onlyImages'));
      return;
    }

    setUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${profileId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('id', profileId);

      if (updateError) throw updateError;

      toast.success(t('avatarUploaded'));
      loadProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Error uploading avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!profileId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ photo_url: null })
        .eq('id', profileId);

      if (error) throw error;

      toast.success(t('avatarDeleted'));
      loadProfile();
    } catch (error) {
      console.error('Error deleting avatar:', error);
    }
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    toast.success(t('loggedOut'));
  };

  if (!user && !profileId) return null;

  const avatarColor = generateAvatarColor(profileId || user?.id?.toString() || '');
  const initials = getInitials(profile?.first_name || user?.first_name);
  const xpProgress = profile?.xp ? (profile.xp % 1000) / 10 : 0;

  const THEMES = [
    { value: 'light', label: t('light'), icon: Sun },
    { value: 'dark', label: t('dark'), icon: Moon },
    { value: 'system', label: t('system'), icon: Globe },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative group">
          <Avatar className="h-10 w-10 ring-2 ring-border hover:ring-primary transition-all duration-300 cursor-pointer">
            <AvatarImage src={profile?.photo_url || user?.photo_url} alt={profile?.first_name || user?.first_name} />
            <AvatarFallback 
              className="text-white font-bold text-sm"
              style={{ background: avatarColor }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success rounded-full border-2 border-background" />
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 p-0 shadow-xl border bg-popover/95 backdrop-blur-xl" 
        align="end"
        sideOffset={12}
      >
        {/* Header */}
        <div className="p-6 space-y-4 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                <AvatarImage src={profile?.photo_url || user?.photo_url} alt={profile?.first_name || user?.first_name} />
                <AvatarFallback 
                  className="text-white font-bold text-lg"
                  style={{ background: avatarColor }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success rounded-full border-2 border-background" />
            </div>
            
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-9 text-sm"
                    placeholder={t('changeName')}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveName} className="h-8 text-xs">
                      {t('save')}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        setDisplayName(profile?.first_name || user?.first_name || '');
                      }}
                      className="h-8 text-xs"
                    >
                      {t('cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base truncate">
                      {profile?.first_name || user?.first_name}
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:bg-primary/10"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {user?.username && (
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  )}
                </>
              )}
              
              <div className="flex items-center gap-2 mt-3">
                <Crown className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <Progress value={xpProgress} className="h-2" />
                </div>
                <span className="text-xs font-semibold tabular-nums">{profile?.xp || 0} XP</span>
              </div>
            </div>
          </div>

          {/* Avatar Upload */}
          <div className="flex gap-2">
            <Label htmlFor="avatar-upload" className="flex-1">
              <div className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm border rounded-lg cursor-pointer hover:bg-primary/5 hover:border-primary/50 transition-all">
                <Upload className="h-4 w-4" />
                <span className="font-medium">{uploading ? 'Uploading...' : t('uploadPhoto')}</span>
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
            {(profile?.photo_url || user?.photo_url) && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeleteAvatar}
                className="px-3 hover:bg-destructive/10 hover:text-destructive"
              >
                {t('deleteAvatar')}
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Settings */}
        <div className="p-4 space-y-4">
          {/* Language */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <Globe className="h-4 w-4" />
              {t('language')}
            </Label>
            <RadioGroup value={language} onValueChange={handleLanguageChange} className="gap-2">
              {LANGUAGES.map((lang) => (
                <div key={lang.code} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={lang.code} id={lang.code} />
                  <Label htmlFor={lang.code} className="cursor-pointer flex items-center gap-2 flex-1">
                    <span className="text-xl">{lang.flag}</span>
                    <span className="font-medium">{lang.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Theme */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('theme')}</Label>
            <RadioGroup value={selectedTheme} onValueChange={handleThemeChange} className="gap-2">
              {THEMES.map((theme) => (
                <div key={theme.value} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={theme.value} id={theme.value} />
                  <Label htmlFor={theme.value} className="flex items-center gap-2 cursor-pointer flex-1 font-medium">
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
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <Label className="flex items-center gap-2 cursor-pointer">
                <Volume2 className="h-4 w-4" />
                <span className="font-medium">{t('sound')}</span>
              </Label>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>
            
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <Label className="flex items-center gap-2 cursor-pointer">
                <Bell className="h-4 w-4" />
                <span className="font-medium">{t('notifications')}</span>
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
        <div className="p-3 space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start hover:bg-primary/5"
            onClick={() => {
              setOpen(false);
              navigate('/achievements');
            }}
          >
            <Trophy className="mr-3 h-4 w-4" />
            {t('achievements')}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start hover:bg-primary/5"
            onClick={() => {
              setOpen(false);
              navigate('/games');
            }}
          >
            <Gamepad2 className="mr-3 h-4 w-4" />
            {t('duelHistory')}
          </Button>
        </div>

        <Separator />

        {/* Logout */}
        <div className="p-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 font-medium"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-4 w-4" />
            {t('logout')}
          </Button>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-muted/30 text-center text-xs text-muted-foreground border-t">
          {t('version')}
        </div>
      </PopoverContent>
    </Popover>
  );
};
