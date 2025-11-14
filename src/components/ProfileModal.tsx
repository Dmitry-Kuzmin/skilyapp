import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  User, Settings, HelpCircle, LogOut, Zap, Crown, X, Pencil, Camera, Trash2, Sun, Moon, 
  Gift, ChevronRight, Shield, Bell, Mail
} from "lucide-react";
import { useTheme } from "next-themes";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  // Debug logging
  useEffect(() => {
    console.log('[ProfileModal] Render - open:', open, 'user:', user, 'isMobile:', isMobile);
  }, [open, user, isMobile]);
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    language: 'ru',
    notifications: true
  });
  const [coins, setCoins] = useState(0);
  const [boosts, setBoosts] = useState(0);
  const [subscription, setSubscription] = useState('free');
  const [loading, setLoading] = useState(false);
  const [xp, setXp] = useState(0);
  const [nextLevelXp, setNextLevelXp] = useState(5000);
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user settings from database
  useEffect(() => {
    if (open && (profileId || user || supabaseUser)) {
      loadUserProfile();
    }
  }, [user, open, profileId, supabaseUser]);

  // Check admin access separately
  useEffect(() => {
    if (open && supabaseUser) {
      checkAdminAccess();
    } else if (!open) {
      setIsAdmin(false);
    }
  }, [open, supabaseUser]);

  const checkAdminAccess = async () => {
    if (!supabaseUser) {
      setIsAdmin(false);
      return;
    }

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase.rpc('has_role', {
        _user_id: currentUser.id,
        _role: 'admin'
      });

      if (error) {
        console.error('Error checking admin access:', error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(!!data);
    } catch (error) {
      console.error('Failed to check admin access:', error);
      setIsAdmin(false);
    }
  };

  const loadUserProfile = async () => {
    // Load by profileId first (most reliable), then by telegram_id, then by user_id
    if (!profileId && !user && !supabaseUser) {
      console.log('[ProfileModal] No profileId, user, or supabaseUser available');
      return;
    }

    try {
      setLoading(true);
      let query = supabase.from('profiles').select('*');
      
      if (profileId) {
        // Use profileId if available (most reliable)
        query = query.eq('id', profileId);
        console.log('[ProfileModal] Loading profile by profileId:', profileId);
      } else if (user?.id) {
        // Fallback to telegram_id for Telegram users
        query = query.eq('telegram_id', user.id);
        console.log('[ProfileModal] Loading profile by telegram_id:', user.id);
      } else if (supabaseUser?.id) {
        // Fallback to user_id for web users
        query = query.eq('user_id', supabaseUser.id);
        console.log('[ProfileModal] Loading profile by user_id:', supabaseUser.id);
      } else {
        console.warn('[ProfileModal] Cannot load profile: no identifier available');
        setLoading(false);
        return;
      }
      
      const { data, error } = await query.single();

      if (error) {
        console.error('[ProfileModal] Error loading profile:', error);
        setLoading(false);
        throw error;
      }

      if (data) {
        console.log('[ProfileModal] Profile loaded successfully:', data);
        setProfile(data);
        const userSettings = data.settings as any;
        if (userSettings && typeof userSettings === 'object') {
          setSettings({
            theme: userSettings.theme || 'light',
            language: userSettings.language || 'ru',
            notifications: userSettings.notifications !== false
          });
          if (userSettings.theme) {
            setTheme(userSettings.theme);
          }
        }
        setBoosts(data.boosts || 0);
        setCoins(data.coins || 0);
        setSubscription(data.subscription_status || 'free');
        setXp(data.xp || 0);
        setNextLevelXp(5000);
      } else {
        console.warn('[ProfileModal] No profile data returned');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('[ProfileModal] Failed to load profile:', error);
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!profileId) {
      console.warn('[ProfileModal] Cannot update settings: no profileId');
      return;
    }

    setLoading(true);
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
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
        .eq('id', profileId);

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

  const handleLanguageChange = (lang: string) => {
    updateSettings({ language: lang });
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

      const { error: uploadError } = await supabase.storage
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

  const calculateProgress = () => {
    if (nextLevelXp === 0) return 0;
    return Math.min((xp / nextLevelXp) * 100, 100);
  };

  // Calculate daily credits (simplified - можно улучшить с реальными данными)
  const dailyCreditsTotal = subscription === 'pro' ? 200 : 100;
  const creditsUsed = Math.min(coins % dailyCreditsTotal, dailyCreditsTotal);
  const creditsLeft = Math.max(0, dailyCreditsTotal - creditsUsed);

  const profileContent = loading ? (
    <div className="flex items-center justify-center p-8">
      <p className="text-muted-foreground">Загрузка профиля...</p>
    </div>
  ) : !profile ? (
    <div className="flex items-center justify-center p-8">
      <p className="text-muted-foreground">Профиль не найден</p>
    </div>
  ) : (
    <div className="space-y-4 pb-4">
      {/* Compact Profile Header */}
      <div className="flex items-center gap-3 pb-4">
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={avatarPreview || profile?.photo_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {profile?.first_name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold truncate">
              {profile?.first_name || ''} {profile?.last_name || ''}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
          {profile?.username && (
            <p className="text-xs text-muted-foreground">@{profile.username}</p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />
      </div>

      {/* Credits Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Credits</span>
          <button
            onClick={() => {
              onOpenChange(false);
              navigate('/referrals');
            }}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <span>{creditsLeft} left</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Progress value={(creditsUsed / dailyCreditsTotal) * 100} className="h-1.5" />
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Daily credits used first
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="h-10"
          onClick={() => {
            // Можно открыть настройки или другой модал
            toast.info('Настройки');
          }}
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
        <Button
          variant="outline"
          className="h-10"
          onClick={() => {
            onOpenChange(false);
            navigate('/referrals');
          }}
        >
          <Gift className="h-4 w-4 mr-2" />
          Invite
        </Button>
      </div>

      <Separator />

      {/* Settings Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Настройки</h3>
        
        {/* Language */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Язык</Label>
          <RadioGroup
            value={settings.language}
            onValueChange={(value) => handleLanguageChange(value)}
            disabled={loading}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="es" id="lang-es" />
              <Label htmlFor="lang-es" className="flex items-center gap-2 cursor-pointer text-sm">
                <span>🇪🇸</span>
                <span>Español</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="en" id="lang-en" />
              <Label htmlFor="lang-en" className="flex items-center gap-2 cursor-pointer text-sm">
                <span>🇬🇧</span>
                <span>English</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ru" id="lang-ru" />
              <Label htmlFor="lang-ru" className="flex items-center gap-2 cursor-pointer text-sm">
                <span>🇷🇺</span>
                <span>Русский</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Theme */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Тема</Label>
          <RadioGroup
            value={currentTheme || 'light'}
            onValueChange={(value) => {
              setTheme(value);
              updateSettings({ theme: value });
            }}
            disabled={loading}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="theme-light" />
              <Label htmlFor="theme-light" className="flex items-center gap-2 cursor-pointer text-sm">
                <Sun className="h-4 w-4" />
                <span>Светлая</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="theme-dark" />
              <Label htmlFor="theme-dark" className="flex items-center gap-2 cursor-pointer text-sm">
                <Moon className="h-4 w-4" />
                <span>Тёмная</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <Separator />

      {/* Quick Actions */}
      <div className="space-y-1">
        <button
          onClick={() => {
            onOpenChange(false);
            navigate('/referrals');
          }}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
        >
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <span>Get free credits</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <button
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span>Help Center</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <button
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
        >
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-muted-foreground" />
            <span>Appearance</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Admin Panel */}
      {isAdmin && (
        <>
          <Separator />
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              navigate('/admin');
            }}
          >
            <Shield className="h-4 w-4 mr-2" />
            Админ-панель
          </Button>
        </>
      )}

      <Separator />

      {/* Logout */}
      <Button 
        variant="ghost" 
        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign out
      </Button>
    </div>
  );

  // Always render modal, Radix UI handles visibility via open prop
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
          <div className="flex-1 overflow-y-auto px-1">
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
