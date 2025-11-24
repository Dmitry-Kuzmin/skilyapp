import { ReactNode, useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, FileText, BookOpen, Gamepad2, User, Crown, LogIn, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "./ui/button";
import { SettingsDrawer } from "./SettingsDrawer";
import { ProfileModal } from "./ProfileModal";
import { AuthModal } from "./AuthModal";
import { TelegramNavigation } from "./TelegramNavigation";
import { isTelegramMiniApp } from "@/lib/telegram";
import { NotificationsPanel } from "./NotificationsPanel";
import { UserProfilePopover } from "./UserProfilePopover";
import { TelegramSafeAreaDebug } from "./TelegramSafeAreaDebug";
import { Footer } from "./Footer";
import { WalletWidget } from "./navigation/WalletWidget";
import { AchievementsWidget } from "./navigation/AchievementsWidget";
import { useActiveDuel } from "@/hooks/useActiveDuel";
import { ActiveDuelWidget } from "./navigation/ActiveDuelWidget";
import { useSessionManager } from "@/hooks/useSessionManager";
import { ReferralModal } from "./ReferralModal";
import { EdgeSwipeBack } from "./navigation/EdgeSwipeBack";
import { useNotifications } from "@/hooks/useNotifications";

interface LayoutProps {
  children: ReactNode;
  hideNavigation?: boolean;
}

// ОПТИМИЗАЦИЯ: Мемоизированный компонент для NavLink элемента
const NavItem = memo(({ item, currentPath }: { item: any; currentPath: string }) => {
  const isDuel = item.isActiveDuel;
  const isActive =
    currentPath === item.href ||
    currentPath.startsWith(`${item.href}/`) ||
    (isDuel && currentPath.startsWith("/games/duel"));
  const Icon = item.icon;
  
  return (
    <NavLink
      to={item.href}
      className={cn(
        "flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all duration-300 relative",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground",
        isDuel && "bg-gradient-to-b from-primary/10 to-blue-500/10"
      )}
      end={false}
    >
      <Icon className={cn("w-6 h-6", isActive && "animate-bounce-slow")} />
      <span className="text-xs font-medium">{item.name}</span>
      {isDuel && (
        <motion.div
          className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </NavLink>
  );
});

NavItem.displayName = 'NavItem';

const Layout = ({ children, hideNavigation = false }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, platform, isAuthenticated, logout } = useUserContext();
  const { t } = useLanguage();
  const { activeDuel } = useActiveDuel();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const isTelegramApp = isTelegramMiniApp();
  const mainContentRef = useRef<HTMLElement>(null);
  const notificationsApi = useNotifications();
  
  // Управление сессиями (только 1 активная сессия одновременно)
  useSessionManager();
  
  // Принудительно применяем отступы при изменении isTelegramApp или при монтировании
  useEffect(() => {
    // Проверяем наличие Telegram WebApp дополнительно
    const hasTelegramWebApp = !!window.Telegram?.WebApp;
    const shouldApplyPadding = isTelegramApp;
    
    console.log('[Layout] isTelegramApp:', isTelegramApp, 'hasTelegramWebApp:', hasTelegramWebApp, 'shouldApplyPadding:', shouldApplyPadding);
    
    if (mainContentRef.current && shouldApplyPadding) {
      const topInsetStr = getComputedStyle(document.documentElement)
        .getPropertyValue('--tg-content-safe-area-inset-top').trim() || '40px';
      const topInset = parseInt(topInsetStr, 10) || 40;
      const systemSafeArea = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0', 10) || 0;
      const fixedPadding = `${topInset + systemSafeArea}px`;
      const computedPadding = `calc(env(safe-area-inset-top, 0px) + ${topInset}px)`;
      
      // Применяем оба варианта для надежности
      mainContentRef.current.style.paddingTop = computedPadding;
      mainContentRef.current.style.setProperty('padding-top', fixedPadding, 'important');
      
      console.log('[Layout] Applied padding-top via useEffect:', {
        computed: computedPadding,
        fixed: fixedPadding,
        topInset: topInset,
        systemSafeArea: systemSafeArea,
        finalValue: getComputedStyle(mainContentRef.current).paddingTop
      });
    } else if (mainContentRef.current && !shouldApplyPadding) {
      mainContentRef.current.style.paddingTop = '0px';
      console.log('[Layout] Removed padding-top (not Telegram)');
    }
  }, [isTelegramApp, location.pathname]); // Также при изменении маршрута
  
  // Также применяем при изменении CSS переменных
  useEffect(() => {
    if (!isTelegramApp || !mainContentRef.current) return;
    
    const observer = new MutationObserver(() => {
      if (mainContentRef.current) {
        const topInset = getComputedStyle(document.documentElement)
          .getPropertyValue('--tg-content-safe-area-inset-top').trim() || '40px';
        const computedPadding = `calc(env(safe-area-inset-top, 0px) + ${topInset})`;
        mainContentRef.current.style.paddingTop = computedPadding;
      }
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });
    
    return () => observer.disconnect();
  }, [isTelegramApp]);

  // Заменяем раздел "Игры" на "Дуэль" если есть активная дуэль
  // ОПТИМИЗАЦИЯ: Мемоизируем navigation для предотвращения лишних ре-рендеров
  const navigation = useMemo(() => [
    { name: t("home"), href: "/dashboard", icon: Home },
    { name: t("tests"), href: "/tests", icon: FileText },
    { name: t("learning"), href: "/learning", icon: BookOpen },
    activeDuel 
      ? { 
          name: "Дуэль", 
          href: `/games/duel?duelId=${activeDuel.duelId}`, 
          icon: Swords,
          isActiveDuel: true 
        }
      : { name: t("games"), href: "/games", icon: Gamepad2 },
  ], [t, activeDuel]);

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
    <div className="telegram-app-container min-h-screen flex flex-col">
      {/* Telegram Navigation Handler */}
      <TelegramNavigation />
      {/* Edge Swipe Back Area (Telegram/Mobile) */}
      <EdgeSwipeBack />
      
      {/* УБРАНО: TelegramSafeAreaDebug - debug overlay убран для продакшена */}
      
      {/* Top Navigation for Desktop - Hide in Telegram or when hideNavigation */}
      {!hideNavigation && (
        <header className={cn(
          "border-b border-border/50 backdrop-blur-xl bg-card/30 sticky top-0 z-50 overflow-x-hidden w-full",
          isTelegramApp ? "hidden" : "hidden md:block"
        )}>
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="flex items-center justify-between h-16 min-w-0">
            <NavLink
              to="/dashboard"
              className="flex items-center gap-2 min-w-0 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl px-1 py-1 transition-colors hover:opacity-90"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-primary flex-shrink-0">
                <Crown className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent whitespace-nowrap">
                Skilyapp
              </span>
            </NavLink>

            <nav className="flex gap-1 min-w-0 flex-shrink">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap flex-shrink-0",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      (item as any).isActiveDuel && "bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20"
                    )
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              ))}
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
                    aria-pressed={referralModalOpen}
                    onClick={() => setReferralModalOpen(true)}
                    className={cn(
                      "relative hidden sm:flex flex-shrink-0 -mr-1 h-10 w-10 items-center justify-center rounded-lg transition-all",
                      referralModalOpen
                        ? "bg-primary/15 text-primary border-[0.5px] border-white/80 shadow-[0_0_20px_rgba(250,204,21,0.35)]"
                        : "text-muted-foreground hover:text-primary hover:border-[0.5px] hover:border-white/80 hover:bg-primary/10 hover:h-9 hover:w-9"
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
                <NotificationsPanel
                  notificationsApi={notificationsApi}
                  open={notificationsOpen}
                  onOpenChange={setNotificationsOpen}
                  renderTrigger={false}
                />
              </div>
              {isAuthenticated ? (
                <div className="flex-shrink-0">
                  <UserProfilePopover
                    notificationsApi={notificationsApi}
                    onOpenNotifications={() => setNotificationsOpen(true)}
                  />
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                  className="hidden sm:flex flex-shrink-0"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  {t('login')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      )}

      {/* Wallet Widget Bar - отдельная строка под header на средних экранах (планшеты) */}
      {!hideNavigation && isAuthenticated && !isTelegramApp && (
        <div className="hidden md:flex lg:hidden border-b border-border/50 backdrop-blur-xl bg-card/20 sticky top-16 z-40">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-end w-full gap-2">
              <WalletWidget />
              <AchievementsWidget />
            </div>
          </div>
        </div>
      )}

      {/* Main Content with Safe Area Top Padding for Telegram Fullscreen */}
      <main 
        ref={mainContentRef}
        className="telegram-main-content flex-1 bg-background"
        style={{}}
      >
        {children}
      </main>

      {/* Footer */}
      <Footer />

      {/* Bottom Navigation for Mobile and Telegram - Скрыт в fullscreen режимах (тесты, игры) или при hideNavigation */}
      {!hideNavigation && (
        <nav className={cn(
          "app-bottom-nav fixed bottom-0 left-0 right-0 border-t border-border/50 backdrop-blur-xl bg-card/95 z-50",
          "flex flex-col md:hidden",
          isFullscreenMode && "!hidden"
        )}>
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
            <NavItem key={item.name} item={item} currentPath={location.pathname} />
          ))}
          
          {/* Profile/Login Icon */}
          <div className="flex flex-col items-center gap-1 py-2 px-3">
            {isAuthenticated ? (
              <UserProfilePopover
                notificationsApi={notificationsApi}
                onOpenNotifications={handleOpenNotifications}
              />
            ) : (
              <button
                onClick={handleOpenAuth}
                className="flex flex-col items-center gap-1 rounded-lg transition-all duration-300 text-muted-foreground hover:text-foreground"
              >
                <LogIn className="w-6 h-6" />
                <span className="text-xs font-medium">{t('login')}</span>
              </button>
            )}
          </div>
        </div>
      </nav>
      )}

      {/* Settings Drawer */}
      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
      
      {/* Auth Modal for Web Platform */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      
      {/* Referral Modal */}
      <ReferralModal open={referralModalOpen} onOpenChange={setReferralModalOpen} />
    </div>
  );
};

export default Layout;
