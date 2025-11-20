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
  MailOpen,
  Bell,
  Trophy,
  Flame,
  Calendar,
  Star
} from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import { useCosmeticsPreview } from "@/contexts/CosmeticsPreviewContext";

const supabaseClient = supabase as any;

// Глобальный кэш для данных профиля (не очищается при навигации)
type CachedProfile = {
  data: {
    photo_url?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    xp?: number;
    subscription_status?: string | null;
    settings?: Record<string, unknown> | null;
  };
  timestamp: number;
};

const profileCache: Record<string, CachedProfile> = {};
const PROFILE_CACHE_DURATION = 300000; // 5 минут
const PROFILE_CACHE_STORAGE_KEY = "profile_avatar_cache";

const isBrowser = typeof window !== "undefined";

const loadProfileFromStorage = (profileId: string): CachedProfile | null => {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, CachedProfile>;
    const cached = parsed?.[profileId];
    if (!cached) return null;
    if (Date.now() - cached.timestamp > PROFILE_CACHE_DURATION) {
      return null;
    }
    return cached;
  } catch (error) {
    console.warn("[UserProfilePopover] Failed to read avatar cache:", error);
    return null;
  }
};

const saveProfileToStorage = (profileId: string, cachedProfile: CachedProfile) => {
  if (!isBrowser) return;
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, CachedProfile>) : {};
    parsed[profileId] = cachedProfile;
    window.localStorage.setItem(PROFILE_CACHE_STORAGE_KEY, JSON.stringify(parsed));
  } catch (error) {
    console.warn("[UserProfilePopover] Failed to persist avatar cache:", error);
  }
};

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
  const { previewSkin, previewBadges, previewSticker } = useCosmeticsPreview();
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

    // Пытаемся взять из persistent storage
    if (!force) {
      const stored = loadProfileFromStorage(profileId);
      if (stored) {
        profileCache[profileId] = stored;
        setProfile(stored.data);
        setLoading(false);
        setShowSkeleton(false);
        hasInitializedRef.current = true;
        return;
      }
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
        const cachedProfile: CachedProfile = { data, timestamp: now };
        setProfile(data);
        // Сохраняем в кэш
        profileCache[profileId] = cachedProfile;
        saveProfileToStorage(profileId, cachedProfile);
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
                     : "ring-2 ring-border hover:ring-primary",
                   previewSkin && previewSkin.rarity === "legendary" && "ring-2 ring-yellow-400/50 shadow-yellow-500/30",
                   previewSkin && previewSkin.rarity === "epic" && "ring-2 ring-blue-400/50 shadow-blue-500/30",
                   previewSkin && previewSkin.rarity === "rare" && "ring-2 ring-blue-400/30"
                 )}>
                   {(() => {
                     const photoUrl = profile?.photo_url || user?.photo_url;
                     // Всегда показываем фото, если оно есть
                     if (photoUrl) {
                       return (
                         <AvatarImage 
                           src={photoUrl}
                           alt={profile?.first_name || user?.first_name || 'User'}
                           className={cn(
                             isPremium && "relative z-10",
                             previewSkin && previewSkin.metadata.animated && "animate-pulse"
                           )}
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
                       "text-white font-bold text-sm relative z-10 overflow-hidden",
                       isPremium && !previewSkin && "bg-gradient-to-br from-yellow-500/90 to-orange-500/90",
                       previewSkin?.metadata.animated && "animate-pulse"
                     )}
                     style={
                       previewSkin
                         ? {
                             background: previewSkin.metadata.color
                               ? `radial-gradient(circle at 30% 30%, ${previewSkin.metadata.color}ff, ${previewSkin.metadata.color}cc 40%, ${previewSkin.metadata.color}88 100%)`
                               : "radial-gradient(circle at 30% 30%, #6366f1ff, #8b5cf6cc 40%, #6366f188 100%)",
                           }
                         : !isPremium
                         ? { backgroundColor: avatarColor }
                         : undefined
                     }
                   >
                     {/* Эффекты скина */}
                     {previewSkin?.metadata.effect === "sparkle" && (
                       <Sparkles className="absolute top-0.5 right-0.5 w-3 h-3 animate-spin text-white/90" />
                     )}
                     {previewSkin?.metadata.effect === "fire" && (
                       <Flame className="absolute top-0.5 right-0.5 w-3 h-3 text-orange-400 animate-bounce" />
                     )}
                     {previewSkin?.metadata.effect === "shine" && (
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer rounded-full" />
                     )}
                     {previewSkin?.rarity === "legendary" && (
                       <>
                         <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
                         <div className="absolute bottom-1/4 right-1/4 w-0.5 h-0.5 bg-orange-300 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
                       </>
                     )}
                     <span className="relative z-10">{initials}</span>
                   </AvatarFallback>
                   {/* Overlay эффекты скина поверх фото */}
                   {previewSkin && (profile?.photo_url || user?.photo_url) && (
                     <div className="absolute inset-0 rounded-full pointer-events-none z-20">
                       {/* Эффекты скина поверх фото */}
                       {previewSkin.metadata.effect === "sparkle" && (
                         <>
                           <Sparkles className="absolute top-0.5 right-0.5 w-3 h-3 animate-spin text-white/90 drop-shadow-lg" />
                           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.1)_100%)] animate-pulse rounded-full" />
                         </>
                       )}
                       {previewSkin.metadata.effect === "fire" && (
                         <>
                           <Flame className="absolute top-0.5 right-0.5 w-3 h-3 text-orange-400 animate-bounce drop-shadow-lg" />
                           <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-orange-500/30 to-transparent rounded-full" />
                         </>
                       )}
                       {previewSkin.metadata.effect === "shine" && (
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer rounded-full" />
                       )}
                       {/* Частицы для легендарных поверх фото */}
                       {previewSkin.rarity === "legendary" && (
                         <>
                           <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
                           <div className="absolute bottom-1/4 right-1/4 w-0.5 h-0.5 bg-orange-300 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
                         </>
                       )}
                       {/* Градиентная рамка скина поверх фото */}
                       <div
                         className={cn(
                           "absolute inset-0 rounded-full border-2 opacity-60",
                           previewSkin.rarity === "legendary" && "border-yellow-400/60",
                           previewSkin.rarity === "epic" && "border-blue-400/60",
                           previewSkin.rarity === "rare" && "border-blue-400/40",
                           previewSkin.rarity === "common" && "border-gray-400/40"
                         )}
                       />
                     </div>
                   )}
                 </Avatar>
                 {/* Бейджи рядом с аватаром (максимум 3) */}
                 {previewBadges.length > 0 && (
                   <div className="absolute -bottom-1 -right-1 flex items-center gap-0.5 z-20">
                     {previewBadges.slice(0, 3).map((badge, index) => (
                       <div
                         key={badge.id}
                         className={cn(
                           "w-4 h-4 rounded-full flex items-center justify-center text-[8px] shadow-lg",
                           badge.rarity === "legendary" && "bg-gradient-to-br from-yellow-500/80 via-orange-500/80 to-yellow-500/80 ring-1 ring-yellow-400/50",
                           badge.rarity === "epic" && "bg-gradient-to-br from-blue-500/80 via-pink-500/80 to-blue-500/80 ring-1 ring-blue-400/50",
                           badge.rarity === "rare" && "bg-gradient-to-br from-blue-500/80 via-cyan-500/80 to-blue-500/80 ring-1 ring-blue-400/30",
                           badge.rarity === "common" && "bg-gradient-to-br from-gray-500/80 via-gray-400/80 to-gray-500/80",
                           badge.metadata.animated && "animate-bounce"
                         )}
                         style={{
                           color: badge.metadata.color || "#6366f1",
                         }}
                         title={badge.name_ru}
                       >
                         {badge.metadata.icon === "trophy" && <Trophy className="w-2.5 h-2.5" />}
                         {badge.metadata.icon === "flame" && "🔥"}
                         {badge.metadata.icon === "star" && "⭐"}
                         {badge.metadata.icon === "crown" && "👑"}
                         {badge.metadata.icon === "calendar" && "📅"}
                       </div>
                     ))}
                   </div>
                 )}
                 {/* Стикер рядом с аватаром */}
                 {previewSticker && (
                   <div className="absolute -top-1 -left-1 w-6 h-6 rounded-lg flex items-center justify-center text-lg shadow-lg z-20 bg-background/80 backdrop-blur-sm">
                     {previewSticker.metadata.emoji || "😊"}
                   </div>
                 )}
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
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-primary/60 bg-background/95 text-primary flex items-center justify-center shadow-[0_0_12px_rgba(79,70,229,0.35)] z-30 animate-[pulse_2.4s_ease-in-out_infinite]">
                  <MailOpen className="w-2.5 h-2.5" />
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
              <Button
                variant="outline"
                className="h-9 text-sm flex items-center justify-center gap-1.5"
                onClick={() => {
                  setOpen(false);
                  onOpenNotifications?.();
                }}
              >
                <Bell className="h-4 w-4" />
                <span>{t('profileMenu.notifications')}</span>
                {unreadCount > 0 && (
                  <span className="text-xs font-semibold text-primary">
                    +{unreadCount > 9 ? '9' : unreadCount}
                  </span>
                )}
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
