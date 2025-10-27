import { ReactNode, useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, FileText, BookOpen, Gamepad2, User, Crown, Trophy, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { useUserContext } from "@/contexts/UserContext";
import { Button } from "./ui/button";
import { SettingsDrawer } from "./SettingsDrawer";
import { ProfileModal } from "./ProfileModal";
import { AuthModal } from "./AuthModal";
import { TelegramNavigation } from "./TelegramNavigation";
import { isTelegramMiniApp } from "@/lib/telegram";

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Главная", href: "/", icon: Home },
  { name: "Тесты", href: "/tests", icon: FileText },
  { name: "Обучение", href: "/learning", icon: BookOpen },
  { name: "Игры", href: "/games", icon: Gamepad2 },
];

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, platform, isAuthenticated, logout } = useUserContext();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const isTelegramApp = isTelegramMiniApp();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="telegram-app-container min-h-screen flex flex-col">
      {/* Telegram Navigation Handler */}
      <TelegramNavigation />
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

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <NavLink
                to="/achievements"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Trophy className="w-5 h-5" />
              </NavLink>
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {user?.first_name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => platform === 'web' ? setAuthModalOpen(true) : navigate('/auth')}
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Войти
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="telegram-main-content flex-1">{children}</main>

      {/* Bottom Navigation for Mobile and Telegram */}
      <nav className={cn(
        "app-bottom-nav fixed bottom-0 left-0 right-0 border-t border-border/50 backdrop-blur-xl bg-card/95 z-50",
        "md:hidden"
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
          {isAuthenticated && user ? (
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all duration-300 text-muted-foreground hover:text-foreground"
            >
              {user?.photo_url ? (
                <img 
                  src={user.photo_url} 
                  alt={user.first_name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <User className="w-6 h-6" />
              )}
              <span className="text-xs font-medium">Профиль</span>
            </button>
          ) : (
            <button
              onClick={() => platform === 'web' ? setAuthModalOpen(true) : navigate('/auth')}
              className="flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all duration-300 text-muted-foreground hover:text-foreground"
            >
              <LogIn className="w-6 h-6" />
              <span className="text-xs font-medium">Вход</span>
            </button>
          )}
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
