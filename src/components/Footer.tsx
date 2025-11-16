import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { isTelegramMiniApp } from "@/lib/telegram";

export function Footer() {
  const { t } = useLanguage();
  const location = useLocation();
  const isTelegramApp = isTelegramMiniApp();

  // Определяем fullscreen режимы (тесты и игры) - footer должен быть скрыт
  const isFullscreenMode = 
    location.pathname.startsWith('/test/') || 
    location.pathname.includes('/duel') ||
    location.pathname.includes('/race-game') ||
    location.pathname.includes('/guess-the-sign') ||
    location.pathname.includes('/matching') ||
    location.pathname.includes('/four-variants') ||
    location.pathname.includes('/road-race');

  // Скрываем футер в Telegram приложении и в fullscreen режимах (тесты и игры)
  if (isTelegramApp || isFullscreenMode) {
    return null;
  }

  return (
    <footer className="border-t border-border/50 bg-card/30 backdrop-blur-xl mt-auto pb-20 md:pb-6">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-primary">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
            <span className="text-sm font-semibold text-foreground">Sdadim</span>
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link 
              to="/help" 
              className="hover:text-foreground transition-colors"
            >
              Помощь
            </Link>
            <Link 
              to="/terms" 
              className="hover:text-foreground transition-colors"
            >
              {t('footer.terms')}
            </Link>
            <Link 
              to="/privacy" 
              className="hover:text-foreground transition-colors"
            >
              {t('footer.privacy')}
            </Link>
            <Link 
              to="/subscription-terms" 
              className="hover:text-foreground transition-colors"
            >
              {t('footer.subscriptionTerms')}
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            ©2025 Sdadim
          </p>
        </div>
      </div>
    </footer>
  );
}



