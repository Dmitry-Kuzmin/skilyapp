import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { isTelegramMiniApp } from "@/lib/telegram";

export function Footer() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
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

  const footerLinks = [
    { to: "/blog", label: t("footer.blog") },
    { to: "/help", label: t("footer.help") },
    { to: "/terms", label: t("footer.terms") },
    { to: "/privacy", label: t("footer.privacy") },
    { to: "/subscription-terms", label: t("footer.subscriptionTerms") },
  ];

  return (
    <footer className="border-t border-border/50 bg-card/30 backdrop-blur-xl mt-auto pb-28 md:pb-6">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6 text-center md:text-left">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2 mx-auto md:mx-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-primary">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
            <span className="text-sm font-semibold text-foreground">Skilyapp</span>
          </div>

          {/* Legal Links */}
          <div className="w-full md:flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm text-muted-foreground justify-items-center md:justify-items-start">
              {footerLinks.map((link) => (
                <button
                  key={link.to}
                  type="button"
                  className="hover:text-foreground transition-colors"
                  onClick={() => navigate(link.to)}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground mx-auto md:mx-0">
            ©2025 Skilyapp
          </p>
        </div>
      </div>
    </footer>
  );
}



