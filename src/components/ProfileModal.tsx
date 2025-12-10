import { useState, useEffect, useRef } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { useModalRoute } from "@/hooks/useModalRoute";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthModalNew as AuthModal } from "@/components/AuthModalNew";
import { useQueryClient } from "@tanstack/react-query";
import { ActivatePremiumKeyModal } from "@/components/ActivatePremiumKeyModal";
import { 
  User, Settings, HelpCircle, LogOut, Zap, Crown, X, Pencil, Camera, Trash2, Sun, Moon, 
  Gift, ChevronRight, Shield, Bell, Mail, Link as LinkIcon, Check, ExternalLink, Key
} from "lucide-react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { isTelegramMiniApp } from "@/lib/telegram";

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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // ОПТИМИЗАЦИЯ: Для инвалидации кэша
  // UnifiedModal сам синхронизирует с URL через modalRouteKey

  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    language: 'ru',
    notifications: true
  });
  const [coins, setCoins] = useState(0);
  const [boosts, setBoosts] = useState(0);
  const [subscription, setSubscription] = useState('free');
  const [hasPremiumForever, setHasPremiumForever] = useState(false);
  const [loading, setLoading] = useState(false);
  const [xp, setXp] = useState(0);
  const [nextLevelXp, setNextLevelXp] = useState(5000);
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'telegram' | 'email' | null>(null);
  const [telegramLinkToken, setTelegramLinkToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [activateKeyModalOpen, setActivateKeyModalOpen] = useState(false);
  const telegramBotUsername = 'sdadimtutbot';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isMiniApp = isTelegramMiniApp();

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
      let query = supabase.from('profiles').select('*, premium_forever_purchased_at, subscription_type, subscription_status');
      
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
        setEditedName(data.first_name || '');
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
        
        // Проверяем Premium Forever
        const isLifetime = 
          !!data.premium_forever_purchased_at &&
          data.subscription_type === 'lifetime' &&
          data.subscription_status === 'pro';
        setHasPremiumForever(isLifetime);
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
      toast.success(t('profileMenu.toasts.settingsSaved'));
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error(t('profileMenu.toasts.settingsFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    updateSettings({ language: lang });
  };

  const handleLogout = async () => {
    // КРИТИЧНО: Очищаем кэш React Query перед logout
    try {
      queryClient.clear();
      console.log('[ProfileModal] ✅ React Query cache cleared');
    } catch (error) {
      console.warn('[ProfileModal] ⚠️ Failed to clear Query cache:', error);
    }
    
    onOpenChange(false);
    logout(); // logout сам сделает редирект на лендинг
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profileId || !supabaseUser) return;
    
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

      // ОПТИМИЗАЦИЯ: Инвалидируем React Query кэш для обновления аватара
      if (profileId) {
        queryClient.invalidateQueries({ queryKey: ['avatar-data', profileId] });
        queryClient.invalidateQueries({ queryKey: ['profile-data', profileId] });
      }

      toast.success(t('avatarUploaded'));
      loadUserProfile();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || t('profileMenu.toasts.avatarUploadError'));
      setAvatarPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const getTelegramDeepLink = (token?: string | null) => {
    if (token) {
      return `https://t.me/${telegramBotUsername}?start=link_${token}`;
    }
    return `https://t.me/${telegramBotUsername}`;
  };

  const generateTelegramLinkToken = async () => {
    if (!supabaseUser) {
      toast.error('Необходима авторизация');
      return;
    }

    try {
      setGeneratingToken(true);
      const { data, error } = await supabase.rpc('create_telegram_link_token');

      if (error) throw error;

      if (data) {
        setTelegramLinkToken(data);
        toast.success('Открой Telegram — бот уже ждёт тебя');
        window.open(getTelegramDeepLink(data), '_blank');
      }
    } catch (error: any) {
      console.error('Failed to generate link token:', error);
      toast.error(error.message || 'Не удалось создать токен');
    } finally {
      setGeneratingToken(false);
    }
  };

  const openTelegramBot = () => {
    window.open(getTelegramDeepLink(telegramLinkToken), '_blank');
  };

  const copyTelegramLink = () => {
    if (!telegramLinkToken) return;
    
    const linkText = `/start link_${telegramLinkToken}`;
    
    navigator.clipboard.writeText(linkText).then(() => {
      toast.success('Команда скопирована! Отправь её боту @sdadimtutbot');
    }).catch(() => {
      toast.error('Не удалось скопировать');
    });
  };

  const handleSaveName = async () => {
    if (!profileId || !editedName.trim()) {
      setIsEditingName(false);
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ 
          first_name: editedName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (error) throw error;

      toast.success(t('nameSaved'));
      setIsEditingName(false);
      loadUserProfile();
    } catch (error: any) {
      console.error('Error updating name:', error);
      toast.error(error.message || t('profileMenu.toasts.nameChangeError'));
    } finally {
      setLoading(false);
    }
  };

  const handleLinkGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      toast.success(t('profileMenu.toasts.googleRedirect'));
    } catch (error: any) {
      console.error('Error linking Google:', error);
      toast.error(error.message || t('profileMenu.toasts.googleLinkError'));
    }
  };

  // Check account connections
  const hasTelegram = !!profile?.telegram_id || !!user; // Привязан через бота или Mini App
  const hasEmail = !!supabaseUser?.email;
  const hasGoogle = supabaseUser?.identities?.some((id: any) => id.provider === 'google') || false;

  const handleLinkTelegram = async () => {
    // Если уже привязан через Mini App, ничего не делаем
    if (hasTelegram) return;
    
    // Генерируем токен для привязки через бота
    await generateTelegramLinkToken();
  };

  const handleLinkEmail = () => {
    setAuthMode('email');
    setAuthModalOpen(true);
  };

  const calculateProgress = () => {
    if (nextLevelXp === 0) return 0;
    return Math.min((xp / nextLevelXp) * 100, 100);
  };

  // Calculate XP progress
  const xpProgress = Math.min((xp / nextLevelXp) * 100, 100);

  const profileContent = loading ? (
    <div className="flex items-center justify-center p-8">
      <p className="text-muted-foreground">{t('profileMenu.loading')}</p>
    </div>
  ) : !profile ? (
    <div className="flex items-center justify-center p-8">
      <p className="text-muted-foreground">{t('profileMenu.notFound')}</p>
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
          {isEditingName ? (
              <div className="flex items-center gap-2">
              <Input
                ref={nameInputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveName();
                  } else if (e.key === 'Escape') {
                    setIsEditingName(false);
                    setEditedName(profile?.first_name || '');
                  }
                }}
                className="flex-1 text-lg font-bold"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleSaveName}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => {
                  setIsEditingName(false);
                  setEditedName(profile?.first_name || '');
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold truncate">
                {profile?.first_name || ''} {profile?.last_name || ''}
              </h2>
              {subscription && subscription !== 'free' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 text-xs font-semibold px-2 py-0.5">
                  <Crown className="w-3 h-3" />
                  {t('profileMenu.proBadge')}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => {
                  setIsEditingName(true);
                  setTimeout(() => nameInputRef.current?.focus(), 0);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
          {profile?.username && (
            <p className="text-xs text-muted-foreground">@{profile.username}</p>
            )}
          <div className="mt-1">
            <Button 
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-3 w-3 mr-1" />
              {t('changeAvatar')}
            </Button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />
      </div>

      {/* XP Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{t('profileMenu.xpLabel')}</span>
          <span className="text-sm text-muted-foreground">{xp.toLocaleString()} / {nextLevelXp.toLocaleString()}</span>
        </div>
        <Progress value={xpProgress} className="h-1.5" />
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Zap className="h-3 w-3 text-primary" />
          {t('profileMenu.xpDescription')}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="h-10"
          onClick={() => {
            // Можно открыть настройки или другой модал
            toast.info(t('settings'));
          }}
        >
          <Settings className="h-4 w-4 mr-2" />
          {t('settings')}
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
          {t('profileMenu.invite')}
            </Button>
          </div>

          <Separator />

          {/* Settings Section */}
          <div className="space-y-3">
        <h3 className="text-sm font-semibold">{t('settings')}</h3>
        
        {/* Language */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t('language')}</Label>
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
          <Label className="text-xs text-muted-foreground">{t('theme')}</Label>
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
                <span>{t('light')}</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="theme-dark" />
              <Label htmlFor="theme-dark" className="flex items-center gap-2 cursor-pointer text-sm">
                <Moon className="h-4 w-4" />
                <span>{t('dark')}</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <Separator />

      {/* Activate Premium Key */}
      {!hasPremiumForever && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Premium Forever</h3>
          <div className="p-3 rounded-lg border bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/20">
            <p className="text-sm text-muted-foreground mb-3">
              Получил ключ от партнера? Активируй его здесь!
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setActivateKeyModalOpen(true)}
            >
              <Key className="h-4 w-4 mr-2" />
              Активировать ключ
            </Button>
          </div>
        </div>
      )}
      
      {/* Premium Forever Status */}
      {hasPremiumForever && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Premium Forever</h3>
          <div className="p-3 rounded-lg border bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-5 w-5 text-green-500" />
              <span className="font-semibold text-green-500">Активирован</span>
            </div>
            <p className="text-sm text-muted-foreground">
              У тебя есть пожизненный доступ ко всем функциям приложения! 🎉
            </p>
          </div>
        </div>
      )}

      <Separator />

      {/* Connected Accounts */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{t('profileMenu.connectedAccounts')}</h3>
        <div className="space-y-2">
          {/* Telegram */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.169 1.858-.896 6.728-.896 6.728-.517 2.506-2.028 2.95-3.931 1.806l-1.09-.5-1.09-.5c-1.903 1.144-3.414.7-3.931-1.806 0 0-.727-4.87-.896-6.728-.169-1.858.896-2.95 2.028-2.95h7.868c1.132 0 2.197 1.092 2.028 2.95z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium">Telegram</div>
                  {hasTelegram ? (
                    <div className="text-xs text-muted-foreground">
                      {t('profileMenu.connected')} — если открываешь нас через Mini App, привязка происходит автоматически.
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {t('profileMenu.notConnected')}. Одним кликом отправим ссылку боту.
                    </div>
                  )}
                </div>
              </div>
              {hasTelegram ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={handleLinkTelegram}
                  disabled={generatingToken}
                >
                  <LinkIcon className="h-4 w-4 mr-1" />
                  {generatingToken ? '...' : t('profileMenu.connect')}
                </Button>
              )}
            </div>
            
            {/* Показываем токен, если он сгенерирован */}
            {telegramLinkToken && !hasTelegram && (
              <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                <div className="text-xs text-muted-foreground">
                  Мы уже открыли Telegram в новой вкладке. Если не открылось — нажми «Открыть бота» или пришли команду вручную:
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-2 py-1.5 text-xs bg-background rounded border font-mono break-all">
                      /start link_{telegramLinkToken}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0"
                      onClick={copyTelegramLink}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 flex-1"
                      onClick={openTelegramBot}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Открыть бота
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => setTelegramLinkToken(null)}
                    >
                      Скрыть
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Токен действителен 10 минут. Если не успел — создавай новый.
                </div>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">Email</div>
                {hasEmail ? (
                  <div className="text-xs text-muted-foreground truncate max-w-[150px]">{supabaseUser?.email}</div>
                ) : (
                  <div className="text-xs text-muted-foreground">{t('profileMenu.notConnected')}</div>
                )}
              </div>
            </div>
            {hasEmail ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
                  <Button
                variant="outline"
                    size="sm"
                className="h-8"
                onClick={handleLinkEmail}
                  >
                <LinkIcon className="h-4 w-4 mr-1" />
                {t('profileMenu.connect')}
                  </Button>
            )}
          </div>

          {/* Google */}
          <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                </div>
              <div>
                <div className="text-sm font-medium">Google</div>
                {hasGoogle ? (
                  <div className="text-xs text-muted-foreground">{t('profileMenu.connected')}</div>
                ) : (
                  <div className="text-xs text-muted-foreground">{t('profileMenu.notConnected')}</div>
                )}
              </div>
            </div>
            {hasGoogle ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={handleLinkGoogle}
              >
                <LinkIcon className="h-4 w-4 mr-1" />
                {t('profileMenu.connect')}
              </Button>
            )}
              </div>
            </div>
          </div>

          <Separator />

      {/* Quick Actions */}
      <div className="space-y-1">
        <button
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span>{t('profileMenu.helpCenter')}</span>
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
            {t('profileMenu.adminPanel')}
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
        {t('logout')}
      </Button>
    </div>
  );

  // Ensure onOpenChange is always defined
  const handleModalOpenChange = (state: boolean) => {
    if (onOpenChange) {
      onOpenChange(state);
    }
  };

  // Always render modal, Radix UI handles visibility via open prop
  return (
    <>
      <UnifiedModal
        open={open}
        onOpenChange={handleModalOpenChange}
        title={t('profileMenu.title')}
        className="max-w-md"
        showTitleBar={false}
        loading={loading}
        skeletonVariant="profile"
        modalRouteKey="profile"
      >
              {profileContent}
      </UnifiedModal>
      
      {/* Auth Modal for linking accounts */}
      <AuthModal 
        open={authModalOpen} 
        onClose={() => {
          setAuthModalOpen(false);
          setAuthMode(null);
          // Reload profile after auth
          if (profileId) {
            setTimeout(() => loadUserProfile(), 1000);
          }
        }} 
      />

      {/* Activate Premium Key Modal */}
      <ActivatePremiumKeyModal
        open={activateKeyModalOpen}
        onOpenChange={(open) => {
          setActivateKeyModalOpen(open);
          if (!open) {
            // Reload profile after activation
            setTimeout(() => loadUserProfile(), 1000);
          }
        }}
      />
    </>
  );
}
