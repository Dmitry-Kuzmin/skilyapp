import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileModal } from "@/components/ProfileModal";
import { ReferralModal } from "@/components/ReferralModal";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "next-themes";
import { usePremium } from "@/hooks/usePremium";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { isTelegramMiniApp } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { 
  Settings, 
  Gift, 
  HelpCircle, 
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  Crown,
  Languages,
  Zap,
  Pencil,
  Sparkles,
  Newspaper,
  ScrollText,
  Mail,
  Bell
} from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";

const supabaseClient = supabase as any;

// Глобальный кэш для данных профиля (не очищается при навигации)
const profileCache: Record<string, { 
  data: any; 
  timestamp: number;
}> = {};
const PROFILE_CACHE_DURATION = 300000; // 5 минут

// Функция для инвалидации кэша профиля (для использования в других компонентах)
export function invalidateProfileCache(profileId: string) {
  delete profileCache[profileId];
}

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

type NotificationsApi = ReturnType<typeof useNotifications>;

interface UserProfilePopoverProps {
  notificationsApi: NotificationsApi;
  onOpenNotifications?: () => void;
}

export function UserProfilePopover({ notificationsApi, onOpenNotifications }: UserProfilePopoverProps) {
  const { user, profileId, logout, supabaseUser, platform } = useUserContext();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const isMiniApp = isTelegramMiniApp();
  const hasInitializedRef = useRef(false);
  const { unreadCount } = notificationsApi;
  const hasUnreadNotifications = unreadCount > 0;
  const [shouldPrioritizeNotifications, setShouldPrioritizeNotifications] = useState(false);

  useEffect(() => {
    if (unreadCount > 0) {
      setShouldPrioritizeNotifications(true);
    } else {
      setShouldPrioritizeNotifications(false);
    }
  }, [unreadCount]);

  // Загружаем профиль сразу при монтировании для загрузки аватара в header
  useEffect(() => {
    if (profileId) {
      loadProfile();
    } else {
      setShowSkeleton(false);
    }
  }, [profileId]);

  const loadProfile = async (force = false) => {
    if (!profileId) return;

    // Проверяем кэш перед загрузкой
    const cached = profileCache[profileId];
    const now = Date.now();
    if (!force && cached && (now - cached.timestamp) < PROFILE_CACHE_DURATION) {
      setProfile(cached.data);
      setLoading(false);
      setShowSkeleton(false);
      hasInitializedRef.current = true;
      return;
    }

    try {
      setLoading(true);
      if (!hasInitializedRef.current) {
      setShowSkeleton(true);
      }
      
      // Задержка перед показом skeleton для предотвращения мигания
      const skeletonTimeout = setTimeout(() => {
        if (!hasInitializedRef.current) {
        setShowSkeleton(true);
        }
      }, 100);

      const { data, error } = await supabaseClient
        .from('profiles')
        .select('photo_url, first_name, last_name, username')
        .eq('id', profileId)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        // Сохраняем в кэш
        profileCache[profileId] = { data, timestamp: now };
      }
      
      clearTimeout(skeletonTimeout);
      hasInitializedRef.current = true;
    } catch (error) {
      console.error('[UserProfilePopover] Failed to load profile:', error);
    } finally {
      setLoading(false);
      // Скрываем skeleton после загрузки с небольшой задержкой
      setTimeout(() => setShowSkeleton(false), 50);
    }
  };

  const avatarColor = generateAvatarColor(profileId || '');
  const initials = getInitials(profile?.first_name || user?.first_name);
  
  // Calculate XP
  const xp = profile?.xp || 0;
  const nextLevelXp = 5000;
  const xpProgress = Math.min((xp % nextLevelXp) / nextLevelXp * 100, 100);
  const subscription = profile?.subscription_status || 'free';


  const handleLogout = () => {
    logout();
    setOpen(false);
    toast.success(t('loggedOut') || 'Вы вышли из аккаунта');
  };

  const handleLanguageChange = async (lang: 'ru' | 'en' | 'es') => {
    setLanguage(lang);
    
    if (profileId) {
      await supabaseClient
        .from('profiles')
        .update({
          settings: {
            ...(profile?.settings || {}),
            language: lang
          }
        })
        .eq('id', profileId);
      toast.success(t('languageChanged'));
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button 
            type="button"
            className="relative group z-10"
            style={{ pointerEvents: 'auto' }}
            onClick={(event) => {
              if (hasUnreadNotifications && shouldPrioritizeNotifications) {
                event.preventDefault();
                event.stopPropagation();
                onOpenNotifications?.();
                setOpen(false);
                setShouldPrioritizeNotifications(false);
              }
            }}
          >
             {showSkeleton && loading ? (
               <Skeleton className="h-10 w-10 rounded-full" />
             ) : (
               <div className="relative">
                 {/* Premium animated border - вращающийся градиент */}
                 {isPremium && (
                   <div 
                     className="absolute -inset-0.5 rounded-full animate-premium-rotate pointer-events-none"
                     style={{
                       background: 'linear-gradient(45deg, #fbbf24, #f59e0b, #f97316, #ea580c, #f97316, #f59e0b, #fbbf24)',
                       backgroundSize: '200% 200%',
                     }}
                   >
                     <div className="absolute inset-0.5 rounded-full bg-background" />
                   </div>
                 )}
                 <Avatar className={cn(
                   "h-10 w-10 transition-all cursor-pointer relative z-10",
                   isPremium 
                     ? "ring-0 animate-premium-glow" 
                     : "ring-2 ring-border hover:ring-primary"
                 )}>
                   {(() => {
                     const photoUrl = profile?.photo_url || user?.photo_url;
                     // Показываем изображение только если есть URL
                     if (photoUrl) {
                       return (
                         <AvatarImage 
                           src={photoUrl} 
                           alt={profile?.first_name || user?.first_name || 'User'}
                           className={cn(isPremium && "relative z-10")}
                           onError={(e) => {
                             // При ошибке загрузки скрываем изображение, показывается fallback
                             console.warn('[UserProfilePopover] Avatar image failed to load:', photoUrl);
                             e.currentTarget.style.display = 'none';
                           }}
                         />
                       );
                     }
                     return null;
                   })()}
                   <AvatarFallback 
                     className={cn(
                       "text-white font-bold text-sm relative z-10",
                       isPremium && "bg-gradient-to-br from-yellow-500/90 to-orange-500/90"
                     )}
                     style={!isPremium ? { backgroundColor: avatarColor } : undefined}
                   >
                     {initials}
                   </AvatarFallback>
                 </Avatar>
                 {/* Premium Crown Icon - только если не skeleton */}
                 {!showSkeleton && isPremium && (
                   <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-background animate-crown-bounce z-20">
                     <Crown className="w-2.5 h-2.5 text-white fill-white drop-shadow-md" />
                     {/* Анимированное свечение вокруг короны */}
                     <div className="absolute inset-0 rounded-full bg-yellow-400/40 animate-ping" style={{ animationDuration: '2s' }} />
                   </div>
                 )}
               </div>
             )}
            {!showSkeleton && (
              hasUnreadNotifications ? (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background z-30 shadow-lg animate-pulse">
                  <Mail className="w-3 h-3" />
                </div>
              ) : (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background z-30 shadow-lg" />
              )
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0" 
          align="end"
          sideOffset={8}
        >
          <div className="p-4 space-y-4">
            {/* Header - кликабельный для редактирования */}
            <button
              onClick={() => {
                setOpen(false);
                setProfileModalOpen(true);
              }}
              className="w-full flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0"
            >
              <div className="relative">
                {/* Premium animated border - вращающийся градиент */}
                {isPremium && (
                  <div 
                    className="absolute -inset-0.5 rounded-full animate-premium-rotate pointer-events-none"
                    style={{
                      background: 'linear-gradient(45deg, #fbbf24, #f59e0b, #f97316, #ea580c, #f97316, #f59e0b, #fbbf24)',
                      backgroundSize: '200% 200%',
                    }}
                  >
                    <div className="absolute inset-0.5 rounded-full bg-background" />
                  </div>
                )}
                <Avatar className={cn(
                  "h-10 w-10 relative z-10",
                  isPremium ? "ring-0 animate-premium-glow" : ""
                )}>
                  {(() => {
                    const photoUrl = profile?.photo_url || user?.photo_url;
                    if (photoUrl) {
                      return (
                        <AvatarImage 
                          src={photoUrl}
                          alt={profile?.first_name || user?.first_name || 'User'}
                          className={isPremium ? "relative z-10" : ""}
                          onError={(e) => {
                            console.warn('[UserProfilePopover] Avatar image failed to load:', photoUrl);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      );
                    }
                    return null;
                  })()}
                  <AvatarFallback 
                    className={cn(
                      "text-white font-bold text-sm relative z-10",
                      isPremium && "bg-gradient-to-br from-yellow-500/90 to-orange-500/90"
                    )}
                    style={!isPremium ? { backgroundColor: avatarColor } : undefined}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {/* Premium Crown Icon в попапе */}
                {isPremium && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-background animate-crown-bounce z-20">
                    <Crown className="w-2.5 h-2.5 text-white fill-white relative z-10 drop-shadow-md" />
                    {/* Анимированное свечение вокруг короны */}
                    <div className="absolute inset-0 rounded-full bg-yellow-400/40 animate-ping" style={{ animationDuration: '2s' }} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm truncate">
                    {profile?.first_name || user?.first_name || 'User'}
                  </h3>
                  {isPremium && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 text-[10px] font-semibold px-2 py-0.5">
                      <Crown className="w-3 h-3" />
                      {t('profileMenu.proBadge')}
                    </span>
                  )}
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </div>
                {supabaseUser?.email && (
                  <p className="text-xs text-muted-foreground truncate">
                    {supabaseUser.email}
                  </p>
                )}
              </div>
            </button>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-9 text-sm"
                onClick={() => {
                  setOpen(false);
                  setProfileModalOpen(true);
                }}
              >
                <Settings className="h-4 w-4 mr-1" />
                {t('settings')}
              </Button>
              <Button
                variant="outline"
                className="h-9 text-sm"
                onClick={() => {
                  setOpen(false);
                  navigate('/inventory');
                }}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {t('profileMenu.inventory')}
              </Button>
            </div>

            {/* Subscription Status */}
            {subscription === 'pro' && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{t('profileMenu.proBadge')}</span>
              </div>
            )}

            <Separator />

            {/* Edit Profile */}
            <button
              onClick={() => {
                setOpen(false);
                setProfileModalOpen(true);
              }}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
            >
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-muted-foreground" />
                <span>{t('editProfile')}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>


            {/* Quick Actions */}
            <div className="space-y-1">
              {[
                {
                  key: 'notifications',
                  icon: Bell,
                  label: t('profileMenu.notifications'),
                  trailing: unreadCount > 0 ? (
                    <span className="text-xs font-semibold text-primary">
                      +{unreadCount > 9 ? '9' : unreadCount}
                    </span>
                  ) : null,
                  action: () => onOpenNotifications?.(),
                },
                {
                  key: 'help',
                  icon: HelpCircle,
                  label: t('profileMenu.helpCenter'),
                  action: () => navigate('/help'),
                },
                {
                  key: 'blog',
                  icon: Newspaper,
                  label: t('profileMenu.blog'),
                  action: () => navigate('/blog'),
                },
                {
                  key: 'legal',
                  icon: ScrollText,
                  label: t('profileMenu.legal'),
                  action: () => navigate('/terms'),
                },
                {
                  key: 'invite',
                  icon: Gift,
                  label: t('profileMenu.invite'),
                  action: () => setReferralModalOpen(true),
                },
              ].map(({ key, icon: Icon, label, action, trailing }) => (
                <button
                  key={key}
                  type="button"
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
                  onClick={() => {
                    setOpen(false);
                    action();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{label}</span>
                  </div>
                  {trailing ?? <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
              ))}
              
              {/* Language Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm">
                    <div className="flex items-center gap-2">
                      <Languages className="h-4 w-4 text-muted-foreground" />
                      <span>{t('language')}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {
                      handleLanguageChange('ru');
                    }}
                    className={language === 'ru' ? 'bg-accent' : ''}
                  >
                    <span className="mr-2">🇷🇺</span>
                    Русский
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      handleLanguageChange('en');
                    }}
                    className={language === 'en' ? 'bg-accent' : ''}
                  >
                    <span className="mr-2">🇬🇧</span>
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      handleLanguageChange('es');
                    }}
                    className={language === 'es' ? 'bg-accent' : ''}
                  >
                    <span className="mr-2">🇪🇸</span>
                    Español
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Theme Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm">
                    <div className="flex items-center gap-2">
                      {theme === 'dark' ? (
                        <Moon className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Sun className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>{t('profileMenu.appearance')}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {
                      setTheme('light');
                      if (profileId) {
                        supabaseClient
                          .from('profiles')
                          .update({
                            settings: {
                              ...(profile?.settings || {}),
                              theme: 'light'
                            }
                          })
                          .eq('id', profileId);
                      }
                      toast.success(t('themeChanged'));
                    }}
                    className={theme === 'light' ? 'bg-accent' : ''}
                  >
                    <Sun className="h-4 w-4 mr-2" />
                    {t('light')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setTheme('dark');
                      if (profileId) {
                        supabaseClient
                          .from('profiles')
                          .update({
                            settings: {
                              ...(profile?.settings || {}),
                              theme: 'dark'
                            }
                          })
                          .eq('id', profileId);
                      }
                      toast.success(t('themeChanged'));
                    }}
                    className={theme === 'dark' ? 'bg-accent' : ''}
                  >
                    <Moon className="h-4 w-4 mr-2" />
                    {t('dark')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setTheme('system');
                      if (profileId) {
                        supabaseClient
                          .from('profiles')
                          .update({
                            settings: {
                              ...(profile?.settings || {}),
                              theme: 'system'
                            }
                          })
                          .eq('id', profileId);
                      }
                      toast.success(t('themeChanged'));
                    }}
                    className={theme === 'system' ? 'bg-accent' : ''}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {t('system')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Sign Out - только для веб */}
            {!isMiniApp && (
              <>
                <Separator />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-destructive/10 transition-colors text-sm text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t('logout') || 'Sign out'}</span>
                </button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Profile Modal для расширенных настроек */}
      <ProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
      
      {/* Referral Modal */}
      <ReferralModal open={referralModalOpen} onOpenChange={setReferralModalOpen} />
    </>
  );
}
