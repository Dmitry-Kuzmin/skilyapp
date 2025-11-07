import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ProfileModal } from "@/components/ProfileModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  User, 
  Edit2, 
  Upload, 
  Trash2, 
  LogOut,
  Trophy,
  Swords,
  ShoppingBag,
  Sun,
  Moon,
  Monitor,
  Volume2,
  Bell,
  Mail,
  Check,
  Camera
} from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { BoostShopModal } from "@/components/shop/BoostShopModal";

const LANGUAGES = [
  { code: 'es' as const, label: 'Español', flag: '🇪🇸' },
  { code: 'en' as const, label: 'English', flag: '🇬🇧' },
  { code: 'ru' as const, label: 'Русский', flag: '🇷🇺' },
];

const generateAvatarColor = (userId: string) => {
  const colors = [
    'hsl(270, 70%, 65%)',
    'hsl(340, 75%, 65%)',
    'hsl(200, 90%, 60%)',
    'hsl(160, 70%, 55%)',
    'hsl(30, 90%, 60%)',
    'hsl(280, 60%, 50%)',
    'hsl(180, 70%, 70%)',
    'hsl(350, 80%, 70%)',
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

const isTelegramMiniApp = () => {
  return window.Telegram?.WebApp?.initData !== undefined;
};

export function UserProfilePopover() {
  const { user, supabaseUser, logout, profileId } = useUserContext();
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [theme, setTheme] = useState("light");
  const [sound, setSound] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isBoostShopOpen, setIsBoostShopOpen] = useState(false);

  const isMiniApp = isTelegramMiniApp();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (profileId) {
      loadProfile();
    }
  }, [profileId]);

  const loadProfile = async () => {
    if (!profileId) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (data) {
      setProfile(data);
      setDisplayName(data.first_name || '');
      
      const settings = data.settings as any;
      if (settings) {
        if (settings.theme) {
          setTheme(settings.theme);
          applyTheme(settings.theme);
        }
        if (settings.sound !== undefined) setSound(settings.sound);
        if (settings.notifications !== undefined) setNotifications(settings.notifications);
      }
    }
  };

  const applyTheme = (newTheme: string) => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    
    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
  };

  const handleSaveName = async () => {
    if (!profileId || !displayName.trim()) return;

    const { error } = await supabase
      .from('profiles')
      .update({ first_name: displayName })
      .eq('id', profileId);

    if (!error) {
      toast({ title: t('nameSaved') });
      setIsEditing(false);
      loadProfile();
    }
  };

  const handleLanguageChange = async (newLang: 'es' | 'en' | 'ru') => {
    await setLanguage(newLang);
    toast({ title: t('languageChanged') });
  };

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    applyTheme(newTheme);

    if (profileId) {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', profileId)
        .single();

      const currentSettings = (currentProfile?.settings as Record<string, any>) || {};

      await supabase
        .from('profiles')
        .update({
          settings: {
            ...currentSettings,
            theme: newTheme,
          },
        })
        .eq('id', profileId);
    }

    toast({ title: t('themeChanged') });
  };

  const handleNotificationsChange = async (enabled: boolean) => {
    setNotifications(enabled);

    if (profileId) {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', profileId)
        .single();

      const currentSettings = (currentProfile?.settings as Record<string, any>) || {};

      await supabase
        .from('profiles')
        .update({
          settings: {
            ...currentSettings,
            notifications: enabled,
          },
        })
        .eq('id', profileId);

      toast({ 
        title: enabled ? t('notificationsEnabled') : t('notificationsDisabled') 
      });
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profileId || !supabaseUser) return;

    if (file.size > 3 * 1024 * 1024) {
      toast({ title: t('fileTooLarge'), variant: "destructive" });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({ title: t('onlyImages'), variant: "destructive" });
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

      toast({ title: t('avatarUploaded') });
      loadProfile();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
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
      toast({ title: t('avatarDeleted') });
      setAvatarPreview(null);
      loadProfile();
    }
  };

  const handleEmailAuth = () => {
    navigate('/auth');
    setOpen(false);
  };

  const handleLogout = () => {
    logout();
    setOpen(false);
    toast({ title: t('loggedOut') });
  };

  const currentXP = profile?.xp || 0;
  const xpProgress = (currentXP % 1000) / 10;
  const avatarColor = generateAvatarColor(profileId || '');
  const initials = getInitials(profile?.first_name || user?.first_name);

  // Use ProfileModal on mobile, Sheet on desktop
  if (isMobile) {
    return (
      <>
        <button 
          className="relative group"
          onClick={() => setOpen(true)}
        >
          <Avatar className="h-10 w-10 ring-2 ring-border hover:ring-primary transition-all cursor-pointer">
            <AvatarImage 
              src={avatarPreview || profile?.photo_url || user?.photo_url} 
              alt={profile?.first_name || user?.first_name} 
            />
            <AvatarFallback 
              className="text-white font-bold text-sm"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
        </button>
        <ProfileModal open={open} onOpenChange={setOpen} />
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative group">
          <Avatar className="h-10 w-10 ring-2 ring-border hover:ring-primary transition-all cursor-pointer">
            <AvatarImage 
              src={avatarPreview || profile?.photo_url || user?.photo_url} 
              alt={profile?.first_name || user?.first_name} 
            />
            <AvatarFallback 
              className="text-white font-bold text-sm"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:w-[400px] p-0 overflow-y-auto">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-background shadow-xl">
                <AvatarImage 
                  src={avatarPreview || profile?.photo_url || user?.photo_url} 
                  alt={profile?.first_name || user?.first_name} 
                />
                <AvatarFallback 
                  className="text-2xl font-bold text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-background" />
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-9"
                    placeholder={t('changeName')}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveName} className="h-7 text-xs">
                      {t('save')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 text-xs">
                      {t('cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg truncate">
                      {profile?.first_name || user?.first_name || t('profile')}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    @{profile?.username || user?.username || 'user'}
                  </p>
                </>
              )}
              
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t('xpProgress')}</span>
                  <span className="font-semibold">{currentXP} XP</span>
                </div>
                <Progress value={xpProgress} className="h-1.5" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar Management */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('changeAvatar')}</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={uploading}
                onClick={() => document.getElementById('avatar-upload')?.click()}
              >
                <Camera className="h-4 w-4 mr-2" />
                {uploading ? "..." : t('uploadPhoto')}
              </Button>
              {(profile?.photo_url || avatarPreview) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAvatar}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">{t('settings')}</h4>
            
            {/* Language */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('language')}</Label>
              <RadioGroup value={language} onValueChange={handleLanguageChange}>
                <div className="space-y-2">
                  {LANGUAGES.map((lang) => (
                    <div key={lang.code} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                      <RadioGroupItem value={lang.code} id={lang.code} />
                      <Label htmlFor={lang.code} className="text-sm cursor-pointer flex items-center gap-2 flex-1">
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.label}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Theme */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('theme')}</Label>
              <RadioGroup value={theme} onValueChange={handleThemeChange}>
                <div className="space-y-2">
                  {[
                    { value: 'light', icon: Sun, label: t('light') },
                    { value: 'dark', icon: Moon, label: t('dark') },
                    { value: 'system', icon: Monitor, label: t('system') }
                  ].map((themeOption) => (
                    <div key={themeOption.value} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                      <RadioGroupItem value={themeOption.value} id={themeOption.value} />
                      <Label htmlFor={themeOption.value} className="text-sm cursor-pointer flex items-center gap-2 flex-1">
                        <themeOption.icon className="h-4 w-4" />
                        {themeOption.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <Label htmlFor="sound" className="text-sm flex items-center gap-2 cursor-pointer">
                  <Volume2 className="h-4 w-4" />
                  {t('sound')}
                </Label>
                <Switch id="sound" checked={sound} onCheckedChange={setSound} />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <Label htmlFor="notifications" className="text-sm flex items-center gap-2 cursor-pointer">
                  <Bell className="h-4 w-4" />
                  {t('notifications')}
                </Label>
                <Switch 
                  id="notifications" 
                  checked={notifications} 
                  onCheckedChange={handleNotificationsChange} 
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Email Auth for Mini App */}
          {isMiniApp && (
            <>
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">{t('accountsAndLogin')}</h4>
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{t('telegramLinked')}</span>
                  </div>
                  {supabaseUser?.email ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="truncate">{t('emailLinked')}: {supabaseUser.email}</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={handleEmailAuth}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {t('linkEmailAccount')}
                    </Button>
                  )}
                </div>
                {!supabaseUser?.email && (
                  <p className="text-xs text-muted-foreground">
                    {t('authPrompt')}
                  </p>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Quick Links */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              size="sm"
              onClick={() => {
                navigate('/achievements');
                setOpen(false);
              }}
            >
              <Trophy className="h-4 w-4 mr-2" />
              {t('achievements')}
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              size="sm"
              onClick={() => {
                navigate('/games');
                setOpen(false);
              }}
            >
              <Swords className="h-4 w-4 mr-2" />
              {t('duelHistory')}
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              size="sm"
              onClick={() => {
                setOpen(false);
                setIsBoostShopOpen(true);
              }}
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              {t('boostShop')}
            </Button>
          </div>

          {/* Logout (only for web) */}
          {!isMiniApp && (
            <>
              <Separator />
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('logout')}
              </Button>
            </>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-2">
            {t('version')}
          </div>
        </div>
      </SheetContent>

      {/* Boost Shop Modal */}
      <BoostShopModal 
        open={isBoostShopOpen} 
        onOpenChange={setIsBoostShopOpen}
      />
    </Sheet>
  );
}