import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/UserAvatar";
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
// ReferralModal удален отсюда
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "next-themes";
import { usePremium } from "@/hooks/usePremium";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useProfileData } from "@/hooks/useProfileData";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { isTelegramMiniApp } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSettingsStore } from "@/store/settingsStore";
import {
  Settings,
  BarChart3,
  Gift,
  Coins,
  HelpCircle,
  LogOut,
  ChevronRight,
  Crown,
  Languages,
  Zap,
  Sparkles,
  Newspaper,
  ScrollText,
  MailOpen,
  Bell,
  Trophy,
  Flame,
  Star,
  Shield,
  Globe,
  Smartphone,
  Palette,
  Info,
  Moon,
  Sun
} from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import { useCosmeticsPreview } from "@/contexts/CosmeticsPreviewContext";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TelemetryOverlay } from './telemetry/TelemetryOverlay';
import { motion } from "@/components/optimized/Motion";

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
  compact?: boolean;
}



export const UserProfilePopover = memo(function UserProfilePopover({ notificationsApi, onOpenNotifications, compact = false }: UserProfilePopoverProps) {
  const { user, profileId, logout, supabaseUser, platform } = useUserContext();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { isPremium } = usePremium();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { previewSkin, previewBadges, previewSticker } = useCosmeticsPreview();
  const { openSettings } = useSettingsStore();

  const [open, setOpen] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const isMiniApp = isTelegramMiniApp();
  const { unreadCount } = notificationsApi;

  // ОПТИМИЗАЦИЯ: Мемоизируем вычисления для предотвращения лишних ре-рендеров
  const hasUnreadNotifications = useMemo(() => unreadCount > 0, [unreadCount]);

  const { profileData: profile, loading } = useProfileData();
  const showSkeleton = loading && !profile;

  // КРИТИЧНО: Расширенная проверка премиума для надежности
  const isProfilePremium = useMemo(() => {
    if (isPremium) return true;
    if (!profile) return false;

    // Проверка по статусу (lifetime или pro)
    if (profile.subscription_status === 'pro' || profile.subscription_status === 'lifetime') return true;

    // Проверка на покупку "Навсегда"
    if (profile.premium_forever_purchased_at) return true;

    // Проверка через настройки (иногда там дублируется)
    if (profile.settings?.subscription_type === 'lifetime' || profile.settings?.is_premium === true) return true;

    return false;
  }, [isPremium, profile]);


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
      key: 'settings',
      icon: Settings,
      label: t('settings'),
      action: () => {
        useSettingsStore.getState().openSettings('general');
      },
    },
    {
      key: 'invite',
      icon: Gift,
      label: t('profileMenu.invite'),
      action: () => {
        import('@/store/modalStore').then(m => m.useModalStore.getState().openModal('REFERRAL'));
      },
      badge: (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black ml-0.5">
          +100
          <Coins className="w-2.5 h-2.5 text-yellow-500" />
        </div>
      )
    },
    ...(isAdmin ? [{
      key: 'admin',
      icon: Shield,
      label: "Админ-панель",
      action: () => {
        navigate('/admin');
      },
      badge: (
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-1" />
      )
    }] : []),
  ];

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="relative group z-[51]"
            style={{ pointerEvents: 'auto' }}
            onClick={() => setOpen(true)}
          >
            {showSkeleton && loading ? (
              <Skeleton className={compact ? "h-7 w-7 rounded-full" : "h-10 w-10 rounded-full"} />
            ) : (
              <UserAvatar
                profileId={profileId}
                size={compact ? "sm" : "md"}
                previewSkin={previewSkin}
                forcePremium={isPremium}
                unreadCount={unreadCount}
              />
            )}

          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0 z-[52]"
          align="end"
          sideOffset={8}
          overlayClassName="bg-black/10 backdrop-blur-3xl"
        >
          <div className="p-4 space-y-4">
            {/* Header - кликабельный для редактирования */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => {
                  setOpen(false);
                  useSettingsStore.getState().openSettings('account');
                }}
                className="flex-1 flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0 text-left min-w-0 overflow-hidden"
              >
                <div className="relative">
                  <UserAvatar
                    profileId={profileId}
                    size="md"
                    previewSkin={previewSkin}
                    showPremiumGlow={true}
                    forcePremium={isPremium}
                    unreadCount={unreadCount}
                    showNotificationBadge={false}
                  />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 flex-nowrap min-w-0">
                    <h3
                      className="font-semibold text-sm truncate"
                      title={profile?.first_name || user?.first_name || 'User'}
                    >
                      {profile?.first_name || user?.first_name || 'User'}
                    </h3>
                    {isPremium && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 text-[10px] font-semibold px-2 py-0.5 shrink-0">
                        <Crown className="w-3 h-3" />
                        {t('profileMenu.proBadge')}
                      </span>
                    )}
                  </div>
                  {/* Скрываем технический email для Telegram-пользователей */}
                  {supabaseUser?.email && !supabaseUser.email.startsWith('tg_') && !supabaseUser.email.includes('@telegram.skily.app') ? (
                    <p
                      className="text-xs text-muted-foreground truncate"
                      title={supabaseUser.email}
                    >
                      {supabaseUser.email}
                    </p>
                  ) : (
                    // Для Telegram показываем @username или ничего
                    (profile?.username || user?.username) && (
                      <p className="text-xs text-muted-foreground truncate">
                        @{profile?.username || user?.username}
                      </p>
                    )
                  )}
                </div>
              </button>
            </div>

            {/* XP Progress - Compact version */}
            <div className="p-2.5 rounded-xl bg-secondary/10 border border-border/5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{t('profileMenu.xpLabel')}</span>
                <span className="text-[10px] font-black tabular-nums">{xp.toLocaleString()} <span className="text-muted-foreground/40 font-medium">/ {nextLevelXp.toLocaleString()}</span></span>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/5">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Action Buttons - Compact Row */}
            <div className="flex gap-2">
              <button
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 hover:bg-secondary/40 transition-all duration-200"
                onClick={() => {
                  setOpen(false);
                  setTelemetryOpen(true);
                }}
              >
                <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-[11px] font-bold text-foreground/80">{t('test.statistics')}</span>
              </button>
              <button
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 hover:bg-secondary/40 transition-all duration-200"
                onClick={() => {
                  setOpen(false);
                  navigate('/inventory');
                }}
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-[11px] font-bold text-foreground/80">{t('profileMenu.inventory')}</span>
              </button>
            </div>

            <Separator />

            {/* Notifications & Quick Actions Group */}
            <div className="space-y-1">
              {/* Notifications */}
              <button
                onClick={() => {
                  setOpen(false);
                  onOpenNotifications?.();
                }}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
              >
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span>{t('profileMenu.notifications')}</span>
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

              {quickActions.map(({ key, icon: Icon, label, action, badge }: any) => (
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
                    {badge}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>

            {/* Unified Control Bar (Language & Theme) */}
            <div className="bg-secondary/30 p-1.5 rounded-[20px] flex items-center justify-between mt-2">
              <div className="flex items-center">
                {[
                  { code: 'ru', label: 'RU' },
                  { code: 'en', label: 'EN' },
                  { code: 'es', label: 'ES' }
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code as any)}
                    className={cn(
                      "h-9 px-3.5 rounded-2xl text-[11px] font-bold transition-all duration-200",
                      language === lang.code
                        ? "bg-background shadow-sm text-foreground font-black" // Активный язык без синего
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="w-px h-5 bg-border/40 mx-2" />

              {/* Theme Switcher */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    "w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-200",
                    theme === 'light'
                      ? "text-amber-500 bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sun className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-200",
                    theme === 'dark'
                      ? "text-indigo-400 bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Moon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Logout Button - Full width style matching other items */}
            <div className="mt-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-red-500/5 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <LogOut className="h-4 w-4 text-red-500/70 group-hover:text-red-500 transition-colors" />
                  <span className="text-[13px] font-medium text-red-500/80 group-hover:text-red-500">{t('profileMenu.logout')}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-red-500/20 group-hover:text-red-500/40 transition-colors" />
              </button>
            </div>

            {/* Юридическая информация (Компактный блок) */}
            <div className="pt-2 mt-2 border-t border-border/10">
              <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[10px] font-medium text-muted-foreground/50">
                <button
                  onClick={() => { setOpen(false); navigate("/legal/privacy"); }}
                  className="hover:text-foreground transition-colors"
                >
                  {t('nav.privacy')}
                </button>
                <span className="opacity-30">•</span>
                <button
                  onClick={() => { setOpen(false); navigate("/legal/terms"); }}
                  className="hover:text-foreground transition-colors"
                >
                  {t('nav.terms')}
                </button>
                <span className="opacity-30">•</span>
                <button
                  onClick={(e) => {
                    setOpen(false);
                    navigate("/legal/cookies");
                  }}
                  className="hover:text-foreground transition-colors"
                >
                  {t('nav.cookies')}
                </button>
                <span className="opacity-30">•</span>
                <button
                  onClick={() => {
                    window.$crisp?.push(["do", "chat:show"]);
                    window.$crisp?.push(["do", "chat:open"]);
                  }}
                  className="hover:text-foreground transition-colors"
                >
                  {t('nav.help')}
                </button>
              </div>
              <div className="mt-2 text-center text-[9px] text-muted-foreground/30 font-mono tracking-widest uppercase">
                © 2026 SKILY
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <TelemetryOverlay open={telemetryOpen} onOpenChange={setTelemetryOpen} />
    </>
  );
});
