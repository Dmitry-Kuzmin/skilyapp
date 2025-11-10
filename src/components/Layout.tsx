import { ReactNode, useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, FileText, BookOpen, Gamepad2, User, Crown, LogIn } from "lucide-react";
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

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, platform, isAuthenticated, logout } = useUserContext();
  const { t } = useLanguage();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const isTelegramApp = isTelegramMiniApp();
  const mainContentRef = useRef<HTMLElement>(null);
  
  // Принудительно применяем отступы при изменении isTelegramApp или при монтировании
  useEffect(() => {
    // Проверяем наличие Telegram WebApp дополнительно
    const hasTelegramWebApp = !!window.Telegram?.WebApp;
    const shouldApplyPadding = isTelegramApp || hasTelegramWebApp;
    
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

  const navigation = [
    { name: t("home"), href: "/", icon: Home },
    { name: t("tests"), href: "/tests", icon: FileText },
    { name: t("learning"), href: "/learning", icon: BookOpen },
    { name: t("games"), href: "/games", icon: Gamepad2 },
  ];

  // Определяем fullscreen режимы (тесты и игры) - navbar должен быть скрыт
  const isFullscreenMode = 
    location.pathname.includes('/test-session') || 
    location.pathname.includes('/practice') ||
    location.pathname.includes('/exam') ||
    location.pathname.includes('/duel') ||
    location.pathname.includes('/race-game');

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="telegram-app-container min-h-screen flex flex-col">
      {/* Telegram Navigation Handler */}
      <TelegramNavigation />
      
      {/* Визуальная отладка Safe Area (только в Telegram) */}
      <TelegramSafeAreaDebug />
      
      {/* Top Navigation for Desktop - Hide in Telegram */}
      <header className={cn(
        "border-b border-border/50 backdrop-blur-xl bg-card/30 sticky top-0 z-50",
        isTelegramApp ? "hidden" : "hidden md:block"
      )}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-primary">
                <Crown className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Sdadim
              </span>
            </div>

            <nav className="flex gap-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <NotificationsPanel />
              {isAuthenticated ? (
                <UserProfilePopover />
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => platform === 'web' ? setAuthModalOpen(true) : navigate('/auth')}
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  {t('login')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Safe Area Top Padding for Telegram Fullscreen */}
      <main 
        ref={mainContentRef}
        className="telegram-main-content flex-1"
        style={{}}
      >
        {children}
      </main>

      {/* Bottom Navigation for Mobile and Telegram - Скрыт в fullscreen режимах (тесты, игры) */}
      <nav className={cn(
        "app-bottom-nav fixed bottom-0 left-0 right-0 border-t border-border/50 backdrop-blur-xl bg-card/95 z-50",
        "md:hidden",
        isFullscreenMode && "hidden"
      )}>
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all duration-300",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("w-6 h-6", isActive && "animate-bounce-slow")} />
                <span className="text-xs font-medium">{item.name}</span>
              </NavLink>
            );
          })}
          
          {/* Profile/Login Icon */}
          <div className="flex flex-col items-center gap-1 py-2 px-3">
            {isAuthenticated ? (
              <UserProfilePopover />
            ) : (
              <button
                onClick={() => platform === 'web' ? setAuthModalOpen(true) : navigate('/auth')}
                className="flex flex-col items-center gap-1 rounded-lg transition-all duration-300 text-muted-foreground hover:text-foreground"
              >
                <LogIn className="w-6 h-6" />
                <span className="text-xs font-medium">{t('login')}</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Settings Drawer */}
      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
      
      {/* Auth Modal for Web Platform */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default Layout;
