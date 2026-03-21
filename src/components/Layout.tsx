import { ReactNode, useState, useEffect, useRef, useMemo, useCallback, memo, lazy, Suspense } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { Home, FileText, BookOpen, Gamepad2, User, Crown, LogIn, Swords } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "./ui/button";
// ОПТИМИЗАЦИЯ: Тяжелые компоненты lazy-loaded - не попадают в initial bundle
// SettingsDrawer удалён — используется глобальный UnifiedSettingsDrawer из AppProviders
import { AuthModalNew as AuthModal } from "./AuthModalNew";
import { TelegramNavigation } from "./TelegramNavigation";
import { TelegramBottomButtons } from "./TelegramBottomButtons";
import { isTelegramMiniApp, isTelegramMobilePlatformName } from "@/lib/telegram";
const NotificationsPanel = lazy(() => import("./NotificationsPanel").then(m => ({ default: m.NotificationsPanel })));
const UserProfilePopover = lazy(() => import("./UserProfilePopover").then(m => ({ default: m.UserProfilePopover })));
import { TelegramSafeAreaDebug } from "./TelegramSafeAreaDebug";
import { Footer } from "./Footer";
import { LandingLogo } from "./landing/LandingLogo";
import { WalletWidget } from "./navigation/WalletWidget";
import { AchievementsWidget } from "./navigation/AchievementsWidget";
import { useActiveDuel } from "@/hooks/useActiveDuel";
import { ActiveDuelWidget } from "./navigation/ActiveDuelWidget";
import { supabase } from "@/integrations/supabase/client";
// ReferralModal  удален, так как он глобальный
import { EdgeSwipeBack } from "./navigation/EdgeSwipeBack";
import { useNotifications } from "@/hooks/useNotifications";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSmartHeader } from "@/hooks/useSmartHeader";
import { liftStartupCurtain } from "@/utils/startup";
import { GlobalDuelWatcher } from "./duel/GlobalDuelWatcher";
import { HeaderSkeleton } from "./HeaderSkeleton";
import { PWAInstallPrompt } from "./PWAInstallPrompt";

interface LayoutProps {
  children: ReactNode;
  hideNavigation?: boolean;
}

type NavigationItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  matchPaths?: string[];
  isActiveDuel?: boolean;
};

const isPathMatching = (pathname: string, basePath: string) => {
  if (!basePath) return false;
  if (pathname === basePath) return true;
  return pathname.startsWith(`${basePath}/`);
};

const isNavigationItemActive = (item: NavigationItem, pathname: string) => {
  const matchCandidates = item.matchPaths && item.matchPaths.length > 0
    ? item.matchPaths
    : [item.href];

  return matchCandidates.some((basePath) => isPathMatching(pathname, basePath));
};

// ОПТИМИЗАЦИЯ: Мемоизированный компонент для NavLink элемента
const NavItem = memo(({ item, currentPath, navigate }: { item: NavigationItem; currentPath: string; navigate: (path: string) => void }) => {
  const isDuel = item.isActiveDuel;
  const isActive = isNavigationItemActive(item, currentPath);
  const Icon = item.icon;

  // УПРОЩЕНО: Позволяем NavLink работать нативно, без конфликтующих обработчиков
  // Предыдущая версия с onTouchEnd + onClick вызывала проблемы с необходимостью нескольких нажатий

  return (
    <NavLink
      to={item.href}
      className={cn(
        "flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors duration-150 relative",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground",
        isDuel && "bg-gradient-to-b from-primary/10 to-blue-500/10"
      )}
      end={false}
      style={{
        pointerEvents: 'auto',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
        position: 'relative',
        zIndex: 100
      }}
    >
      <Icon className={cn("w-6 h-6", isActive && "animate-bounce-slow")} />
      <span className="text-xs font-medium">{item.name}</span>
      {isDuel && (
        <motion.div
          className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full pointer-events-none"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </NavLink>
  );
});

NavItem.displayName = 'NavItem';

// ОПТИМИЗАЦИЯ: Мемоизируем Layout для предотвращения лишних ре-рендеров
const Layout = memo(({ children, hideNavigation = false }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, platform, isAuthenticated, logout } = useUserContext();
  const { t } = useLanguage();
  const { activeDuel } = useActiveDuel();
  // settingsOpen удалён — используется глобальный UnifiedSettingsDrawer
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const isTelegramApp = isTelegramMiniApp();
  const isMobile = useIsMobile();
  const [isTelegramMobilePlatform, setIsTelegramMobilePlatform] = useState<boolean | null>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const notificationsApi = useNotifications();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Smart Header - прячется при скролле вниз, появляется при скролле вверх
  // ОПТИМИЗАЦИЯ: Inline проверка fullscreen режима для хука
  const isInFullscreenMode = location.pathname.startsWith('/test/') ||
    location.pathname.includes('/duel') ||
    location.pathname.includes('/race-game') ||
    location.pathname.includes('/guess-the-sign') ||
    location.pathname.includes('/matching') ||
    location.pathname.includes('/four-variants') ||
    location.pathname.includes('/road-race');

  const { hidden: headerHidden, isScrolled: headerScrolled } = useSmartHeader({
    disabled: isInFullscreenMode || hideNavigation,
    hideThreshold: 100,
    glassThreshold: 10,
  });



  // Ensure the startup curtain is lifted when the layout mounts
  // This handles cases where pages load too fast for the Suspense fallback to trigger
  useEffect(() => {
    liftStartupCurtain();
  }, []);

  // Отслеживаем фактическую платформу Telegram (ios/android vs desktop)
  useEffect(() => {
    if (!isTelegramApp) {
      setIsTelegramMobilePlatform(null);
      return;
    }

    const detectPlatform = () => {
      const platform = window.Telegram?.WebApp?.platform;
      if (platform) {
        const isMobilePlatform = isTelegramMobilePlatformName(platform);
        setIsTelegramMobilePlatform(isMobilePlatform);
      } else {
        setIsTelegramMobilePlatform(null);
      }
    };

    detectPlatform();
  }, [isTelegramApp]);

  // ============================================================================
  // УДАЛЕНО: Устаревший JS-код управления padding
  // ============================================================================
  // Теперь padding для Telegram Mobile управляется через CSS в index.css:
  // - .telegram-mobile-app .telegram-main-content { padding-top: max(...) }
  // - .dashboard-active — меньший отступ (без BackButton)
  // - .duel-active — без отступа (компонент сам управляет)
  // - .fullscreen-mode — без отступа (игры/тесты сами управляют)
  //
  // CSS-классы устанавливает TelegramNavigation.tsx при смене маршрута.
  // CSS-переменные (--tg-content-safe-area-inset-top) обновляет TelegramNavigation.tsx
  // при событиях от Telegram WebApp.
  //
  // @see index.css — секция "ГЛОБАЛЬНЫЙ ОТСТУП ДЛЯ TELEGRAM MOBILE (v4.0)"
  // @see TelegramNavigation.tsx — управление классами и CSS-переменными
  // ============================================================================


  // Заменяем раздел "Игры" на "Дуэль" если есть активная дуэль
  // 🆕 CRITICAL FIX: Проверяем статус дуэли перед показом кнопки "Дуэль"
  const [duelStatus, setDuelStatus] = useState<'active' | 'waiting' | 'finished' | 'unknown'>('unknown');

  useEffect(() => {
    if (!activeDuel) {
      setDuelStatus('unknown');
      return;
    }

    // Проверяем статус дуэли
    const checkDuelStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('duels')
          .select('status')
          .eq('id', activeDuel.duelId)
          .maybeSingle() as { data: any | null, error: any };

        if (error || !data) {
          console.warn('[Layout] Error checking duel status for menu button:', error);
          setDuelStatus('unknown');
          return;
        }

        setDuelStatus(data.status as 'active' | 'waiting' | 'finished');
      } catch (err) {
        console.error('[Layout] Exception checking duel status:', err);
        setDuelStatus('unknown');
      }
    };

    checkDuelStatus();
  }, [activeDuel]);

  // ОПТИМИЗАЦИЯ: Мемоизируем navigation для предотвращения лишних ре-рендеров
  // 🆕 CRITICAL FIX: Показываем "Дуэль" только если дуэль активна или в ожидании, НЕ если finished
  const navigation = useMemo<NavigationItem[]>(() => [
    { name: t("home"), href: isAuthenticated ? "/dashboard" : "/", icon: Home, matchPaths: ["/dashboard"] },
    { name: t("tests"), href: isAuthenticated ? "/tests" : "/", icon: FileText, matchPaths: ["/tests", "/test"] },
    { name: t("learning"), href: isAuthenticated ? "/learning" : "/", icon: BookOpen, matchPaths: ["/learning", "/learning-map", "/topic", "/subtopic"] },
    (isAuthenticated && activeDuel && activeDuel.mode !== 'result' && (duelStatus === 'active' || duelStatus === 'waiting' || duelStatus === 'unknown'))
      ? {
        name: "Дуэль",
        href: `/games/duel?duelId=${activeDuel.duelId}`,
        icon: Swords,
        isActiveDuel: true,
        matchPaths: ["/games/duel"]
      }
      : { name: t("games"), href: isAuthenticated ? "/games" : "/", icon: Gamepad2, matchPaths: ["/games"] },
  ], [t, activeDuel, duelStatus, isAuthenticated]);

  // ОПТИМИЗАЦИЯ: Prefetching для критических маршрутов при hover
  useEffect(() => {
    const prefetchRoutes = ['/tests', '/learning', '/games', '/dashboard'];

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target;
      // Проверяем, что target является элементом с методом closest
      if (!target || typeof (target as any).closest !== 'function') return;
      const link = (target as HTMLElement).closest('a[href]') as HTMLAnchorElement;
      if (link && prefetchRoutes.some(route => link.href.includes(route))) {
        // Prefetch route data через React Router
        const route = link.getAttribute('href');
        if (route) {
          // React Router автоматически prefetch при hover через Link компонент
          // Здесь можно добавить дополнительный prefetch данных если нужно
        }
      }
    };

    document.addEventListener('mouseenter', handleMouseEnter, true);
    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, true);
    };
  }, []);

  // ОПТИМИЗАЦИЯ: Убрано логирование для уменьшения нагрузки (можно включить для отладки)
  // useEffect(() => {
  //   if (activeDuel) {
  //     console.log('[Layout] ✅ Active duel detected, showing "Дуэль" button:', {
  //       duelId: activeDuel.duelId,
  //       mode: activeDuel.mode,
  //       currentIndex: activeDuel.currentIndex
  //     });
  //   } else {
  //     console.log('[Layout] No active duel, showing "Игры" button');
  //   }
  // }, [activeDuel]);

  // Определяем fullscreen режимы (тесты и игры) - navbar должен быть скрыт
  // ОПТИМИЗАЦИЯ: Мемоизируем isFullscreenMode для предотвращения лишних вычислений
  const isFullscreenMode = useMemo(() =>
    location.pathname.startsWith('/test/') ||
    location.pathname.includes('/duel') ||
    location.pathname.includes('/race-game') ||
    location.pathname.includes('/guess-the-sign') ||
    location.pathname.includes('/matching') ||
    location.pathname.includes('/four-variants') ||
    location.pathname.includes('/road-race'),
    [location.pathname]
  );

  // ОПТИМИЗАЦИЯ: Мемоизируем обработчики для предотвращения лишних ре-рендеров
  const handleOpenNotifications = useCallback(() => {
    setNotificationsOpen(true);
  }, []);

  const handleOpenAuth = useCallback(() => {
    setAuthModalOpen(true);
  }, []);

  // Scroll to top on route change
  // ОПТИМИЗАЦИЯ: Используем requestAnimationFrame для плавного скролла без блокировки UI
  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  }, [location.pathname]);

  return (
    <div className="telegram-app-container">
      {/* Global Smart Background - Grid & Noise */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Noise Texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'url("/noise.svg")' }}
        />
        {/* Grid Pattern */}

        {/* Subtle Radial Gradient for Depth */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-purple-500/5 opacity-50" />
      </div>

      {/* Telegram Navigation Handler */}
      <TelegramNavigation />
      {/* Telegram Bottom Buttons for premium UX (Bot API 9.5+) */}
      <TelegramBottomButtons />
      {/* Edge Swipe Back Area (Telegram/Mobile) */}
      <EdgeSwipeBack />

      {/* Глобальное обнаружение активных дуэлей */}
      <GlobalDuelWatcher />

      {/* УБРАНО: TelegramSafeAreaDebug - debug overlay убран для продакшена */}

      {/* Top Navigation for Desktop - Hide only when hideNavigation */}
      {!hideNavigation && (
        !isMounted ? (
          <HeaderSkeleton />
        ) : (
          <header className={cn(
            "border-b border-border/50 backdrop-blur-xl bg-background/95 sticky top-0 z-50 overflow-x-hidden overflow-y-visible w-full",
            "hidden md:block" // Показываем на десктопе всегда (и в Telegram тоже, если десктоп)
          )} style={{ overflow: 'visible' }}>
            <div className="container mx-auto px-4 max-w-[1370px]" style={{ overflow: 'visible', position: 'relative' }}>
              <div className="flex items-center justify-between h-16 min-w-0" style={{ overflow: 'visible', position: 'relative' }}>
                <NavLink
                  to={isAuthenticated ? "/dashboard" : "/"}
                  className="min-w-0 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl px-1 py-1 transition-colors hover:opacity-90"
                  style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}
                >
                  <LandingLogo variant="bold" showText={true} />
                </NavLink>

                <nav className="flex gap-1 min-w-0 flex-shrink">
                  {navigation.map((item) => {
                    const desktopActive = isNavigationItemActive(item, location.pathname);
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0",
                          desktopActive
                            ? "bg-primary/10 text-primary font-semibold shadow-sm"
                            : "text-muted-foreground opacity-70 hover:opacity-100 hover:bg-muted/30",
                          item.isActiveDuel && "bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20"
                        )}
                        style={{
                          pointerEvents: 'auto',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">{item.name}</span>
                      </NavLink>
                    );
                  })}
                </nav>

                <div className="flex items-center gap-0.5 min-w-0 flex-shrink-0">
                  {isAuthenticated && (
                    <>
                      {/* Wallet + Achievements widgets в header на больших экранах */}
                      <div className="hidden lg:flex items-center gap-2 min-w-0 flex-shrink-0 mr-1">
                        <WalletWidget />
                        <AchievementsWidget />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-pressed={false}
                        onClick={() => {
                          import('@/store/modalStore').then(m => m.useModalStore.getState().openModal('REFERRAL'));
                        }}
                        className={cn(
                          "relative hidden sm:flex flex-shrink-0 -mr-1 h-10 w-10 items-center justify-center rounded-lg transition-all",
                          "text-muted-foreground hover:text-primary hover:border-[0.5px] hover:border-white/80 hover:bg-primary/10 hover:h-9 hover:w-9"
                        )}
                        title="Реферальная программа"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5 shrink-0"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path fill="currentColor" d="M19.25 14.75h-6.5v4.5H18c.69 0 1.25-.56 1.25-1.25zM9.118 3.958C7.931 3.257 6.71 3.35 6.03 4.03c-.257.258-.377.548-.382.818-.004.262.1.589.445.934.664.665 2.193 1.345 5.103 1.452-.216-1.574-1.083-2.688-2.078-3.276m8.852.072c-.68-.68-1.901-.773-3.088-.072-.995.588-1.863 1.702-2.08 3.276 2.912-.107 4.44-.787 5.105-1.452.346-.345.449-.672.445-.934-.005-.27-.125-.56-.382-.818M4.75 18c0 .69.56 1.25 1.25 1.25h5.25v-4.5h-6.5zm14.5-8c0-.69-.56-1.25-1.25-1.25h-5.25v4.5h6.5zm-14.5 3.25h6.5v-4.5H6c-.69 0-1.25.56-1.25 1.25zm16 4.75A2.75 2.75 0 0 1 18 20.75H6A2.75 2.75 0 0 1 3.25 18v-8a2.75 2.75 0 0 1 2.313-2.713 4 4 0 0 1-.53-.444c-.593-.592-.896-1.296-.885-2.019.012-.714.33-1.362.822-1.854 1.32-1.32 3.349-1.226 4.912-.303A5.7 5.7 0 0 1 12 4.901a5.7 5.7 0 0 1 2.118-2.234c1.563-.923 3.592-1.017 4.912.303.492.492.81 1.14.822 1.854.01.723-.292 1.427-.884 2.019a4 4 0 0 1-.532.444A2.75 2.75 0 0 1 20.75 10z" />
                        </svg>
                      </Button>
                    </>
                  )}
                  <div className="flex-shrink-0">
                    <Suspense fallback={null}>
                      <NotificationsPanel
                        notificationsApi={notificationsApi}
                        open={notificationsOpen}
                        onOpenChange={setNotificationsOpen}
                        renderTrigger={false}
                      />
                    </Suspense>
                  </div>
                  {isAuthenticated ? (
                    <div className="flex-shrink-0">
                      <Suspense fallback={null}>
                        <UserProfilePopover
                          notificationsApi={notificationsApi}
                          onOpenNotifications={() => setNotificationsOpen(true)}
                        />
                      </Suspense>
                    </div>
                  ) : (
                    <button
                      onClick={handleOpenAuth}
                      className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg shadow-white/10 hidden sm:flex items-center"
                    >
                      {t('login')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </header>
        )
      )}

      {/* Wallet Widget Bar - отдельная строка под header на средних экранах (планшеты) */}
      {!hideNavigation && isAuthenticated && !isTelegramApp && (
        <div className="hidden md:flex lg:hidden border-b border-border/50 backdrop-blur-xl bg-background/95 sticky top-16 z-40">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-end w-full gap-2">
              <WalletWidget />
              <AchievementsWidget />
            </div>
          </div>
        </div>
      )}

      {/* Main Content with Safe Area Top Padding for Telegram Fullscreen */}
      {/* Padding управляется через CSS в index.css на основе классов .telegram-mobile-app и .dashboard-active */}
      <main
        ref={mainContentRef}
        className={cn(
          "telegram-main-content bg-transparent relative z-1",
          "flex-1 flex flex-col min-h-0", // Позволяем контенту растягиваться и не схлопываться
          !hideNavigation && !isFullscreenMode && "has-bottom-nav",
          isAuthenticated && !hideNavigation && !isFullscreenMode && "has-bottom-widgets",
          // CSS в index.css применяет padding-top через:
          // .telegram-mobile-app .telegram-main-content { padding-top: max(...) }
        )}
      >
        {children}
      </main>

      {/* Footer - Скрываем в полноэкранных режимах (тесты, игры) ИЛИ если пользователь авторизован (пункты перенесены в ProfileMenu) */}
      {!hideNavigation && !isFullscreenMode && !isAuthenticated && <Footer />}

      {/* Bottom Navigation for Mobile and Telegram - Скрыт в fullscreen режимах (тесты, игры) или при hideNavigation */}
      {
        !hideNavigation && (
          <nav
            className={cn(
              "app-bottom-nav fixed bottom-0 left-0 right-0 border-t border-border/50 backdrop-blur-xl bg-background/95 z-50",
              "flex flex-col md:hidden",
              isFullscreenMode && "!hidden"
            )}
            style={{
              // ОПТИМИЗАЦИЯ: Явно указываем pointer-events для лучшей отзывчивости
              pointerEvents: 'auto',
              touchAction: 'manipulation'
            }}
          >
            {/* Mobile Wallet Widget - компактная версия для мобильных */}
            {isAuthenticated && (
              <div className="px-3 py-2 border-b border-border/50 bg-card/50 flex-shrink-0 flex flex-wrap items-center gap-2">
                <WalletWidget />
                <AchievementsWidget variant="mobile" />
                {/* Active Duel Widget для мобильных */}
                <ActiveDuelWidget />
              </div>
            )}

            <div className="grid grid-cols-5 gap-1 px-2 py-2 flex-shrink-0">
              {navigation.map((item) => (
                <NavItem key={item.name} item={item} currentPath={location.pathname} navigate={navigate} />
              ))}

              {/* Profile/Login Icon */}
              <div className="flex flex-col items-center gap-1 py-2 px-3">
                {isAuthenticated ? (
                  <Suspense fallback={null}>
                    <UserProfilePopover
                      notificationsApi={notificationsApi}
                      onOpenNotifications={handleOpenNotifications}
                    />
                  </Suspense>
                ) : (
                  <button
                    onClick={handleOpenAuth}
                    className="flex flex-col items-center gap-1 rounded-lg transition-colors duration-150 text-muted-foreground hover:text-foreground"
                    style={{
                      // ОПТИМИЗАЦИЯ: Явно указываем pointer-events и touch-action для мгновенной отзывчивости
                      pointerEvents: 'auto',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    <LogIn className="w-6 h-6" />
                    <span className="text-xs font-medium">{t('login')}</span>
                  </button>
                )}
              </div>
            </div>
          </nav>
        )
      }

      {/* Settings Drawer — удалён, используется глобальный UnifiedSettingsDrawer из AppProviders */}

      {/* Auth Modal for Web Platform */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* PWA Install Prompt — только iOS Safari мобайл */}
      <PWAInstallPrompt />

    </div >
  );
});

Layout.displayName = 'Layout';

export default Layout;
