import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
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
import { useProfileData } from "@/hooks/useProfileData";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { isTelegramMiniApp } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Star,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import { useCosmeticsPreview } from "@/contexts/CosmeticsPreviewContext";

const supabaseClient = supabase as any;

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

// ОПТИМИЗАЦИЯ: React Query hook для аватара с глобальным кэшем
const useAvatarData = (profileId: string | null) => {
  return useQuery({
    queryKey: ['avatar-data', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('photo_url, first_name, last_name, username')
        .eq('id', profileId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000, // 5 минут - аватар редко меняется
    gcTime: 30 * 60 * 1000, // 30 минут в памяти
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

export const UserProfilePopover = memo(function UserProfilePopover({ notificationsApi, onOpenNotifications }: UserProfilePopoverProps) {
  const { user, profileId, logout, supabaseUser, platform } = useUserContext();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { previewSkin, previewBadges, previewSticker } = useCosmeticsPreview();
  const [open, setOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const isMiniApp = isTelegramMiniApp();
  const { unreadCount } = notificationsApi;
  
  // ОПТИМИЗАЦИЯ: Мемоизируем вычисления для предотвращения лишних ре-рендеров
  const hasUnreadNotifications = useMemo(() => unreadCount > 0, [unreadCount]);
  
  // ОПТИМИЗАЦИЯ: Используем React Query для аватара - дедупликация автоматическая!
  const { data: profile, isLoading: loading } = useAvatarData(profileId);
  const showSkeleton = loading && !profile;

  const avatarColor = useMemo(() => generateAvatarColor(profileId || ''), [profileId]);
  const initials = useMemo(() => getInitials(profile?.first_name || user?.first_name), [profile?.first_name, user?.first_name]);
  
  // ОПТИМИЗАЦИЯ: Используем useProfileData для XP (не делаем дополнительный запрос)
  const { xp: profileXp } = useProfileData();
  const xp = profileXp || 0;
  const nextLevelXp = 5000;
  const xpProgress = useMemo(() => Math.min((xp % nextLevelXp) / nextLevelXp * 100, 100), [xp, nextLevelXp]);
  const subscription = 'free'; // Убрали subscription_status из запроса

  // ОПТИМИЗАЦИЯ: Мемоизируем обработчики для предотвращения лишних ре-рендеров
  const handleLogout = useCallback(async () => {
    setOpen(false);
    
    // КРИТИЧНО: Очищаем кэш React Query перед logout
    try {
      queryClient.clear();
      console.log('[UserProfilePopover] ✅ React Query cache cleared');
    } catch (error) {
      console.warn('[UserProfilePopover] ⚠️ Failed to clear Query cache:', error);
    }
    
    // Вызываем logout (он сам очистит IndexedDB и сделает редирект)
    logout();
  }, [logout, queryClient]);

  const handleLanguageChange = useCallback(async (lang: 'ru' | 'en' | 'es') => {
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
  }, [setLanguage, profileId, profile?.settings, t]);

  const quickActions = [
    {
      key: 'security',
      icon: Shield,
      label: 'Безопасность',
      action: () => navigate('/settings'),
    },
    {
      key: 'invite',
      icon: Gift,
      label: t('profileMenu.invite'),
      action: () => setReferralModalOpen(true),
    },
  ];

  const supportLinks = [
    {
      key: 'legal',
      icon: ScrollText,
      label: t('profileMenu.legal'),
      action: () => navigate('/terms'),
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
  ];

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button 
            type="button"
            className="relative group z-10"
            style={{ pointerEvents: 'auto' }}
          >
             {showSkeleton && loading ? (
               <Skeleton className="h-10 w-10 rounded-full" />
             ) : (
               <div className="relative">
                 {/* Premium animated border - вращающийся градиент - скрываем если есть previewSkin */}
                 {isPremium && !previewSkin && (
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
                   isPremium && !previewSkin
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
                 {/* Стикер рядом с аватаром - только смайлик без фона */}
                 {previewSticker && (
                   <div className="absolute -top-1 -left-1 flex items-center justify-center text-2xl z-20 drop-shadow-lg">
                     {previewSticker.metadata.emoji || "😊"}
                   </div>
                 )}
                 {/* Premium Crown Icon - только если не skeleton и нет previewSkin */}
                 {!showSkeleton && isPremium && !previewSkin && (
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
                // Индикатор онлайн - скрываем если есть previewBadges или previewSticker
                (!previewBadges || previewBadges.length === 0) && !previewSticker && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background z-30 shadow-lg" />
                )
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
            <div className="flex items-start gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setProfileModalOpen(true);
                }}
                className="flex-1 flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0 text-left"
              >
                <div className="relative">
                  {/* Premium animated border - вращающийся градиент - скрываем если есть previewSkin */}
                  {isPremium && !previewSkin && (
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
                    isPremium && !previewSkin ? "ring-0 animate-premium-glow" : ""
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
                        isPremium && !previewSkin && "bg-gradient-to-br from-yellow-500/90 to-orange-500/90"
                      )}
                      style={!isPremium || previewSkin ? { backgroundColor: previewSkin ? undefined : avatarColor } : undefined}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {/* Premium Crown Icon в попапе - скрываем если есть previewSkin */}
                  {isPremium && !previewSkin && (
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
              {!isMiniApp && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-0"
                  aria-label={t('logout') || 'Sign out'}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
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

            {/* Notifications */}
            <button
              onClick={() => {
                setOpen(false);
                onOpenNotifications?.();
              }}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm relative"
            >
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span>{t('notifications') || 'Уведомления'}</span>
              </div>
              <div className="flex items-center gap-2">
                {hasUnreadNotifications && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-red-500 text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>


            {/* Quick Actions */}
            <div className="space-y-1">
              {quickActions.map(({ key, icon: Icon, label, action, trailing }) => (
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

            <Separator />

            <div className="space-y-1">
              {supportLinks.map(({ key, icon: Icon, label, action, trailing }) => (
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
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Profile Modal для расширенных настроек */}
      <ProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
      
      {/* Referral Modal */}
      <ReferralModal open={referralModalOpen} onOpenChange={setReferralModalOpen} />
    </>
  );
});
