import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { isTelegramMiniApp } from "@/lib/telegram";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { Scale, HelpCircle } from "lucide-react";
import { InstallAppButton } from "@/components/pwa";

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

  // Скрываем футер только в fullscreen режимах (тесты и игры)
  // В Telegram App футер показывается (если не fullscreen режим)
  if (isFullscreenMode) {
    return null;
  }

  // Минималистичные ссылки для мобильного приложения
  const footerLinks = [
    { to: "/legal", label: t("footer.legal"), icon: Scale },
    { to: "/help", label: t("footer.support"), icon: HelpCircle },
  ];

  return (
    <footer
      className="border-t border-border/50 bg-background/95 backdrop-blur-xl pb-4 md:pb-6 mb-[140px] md:mb-0"
      style={{ position: 'static' }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          {/* Logo/Brand */}
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-1 py-1 transition-opacity hover:opacity-90"
            style={{ overflow: 'visible', position: 'relative', zIndex: 1 }}
          >
            <LandingLogo variant="bold" showText={true} className="scale-75" />
          </button>

          {/* Minimalist Links */}
          <div className="flex items-center gap-4">
            {footerLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.to}
                  type="button"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => navigate(link.to)}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </button>
              );
            })}

            <div className="hidden sm:block h-4 w-px bg-border/50" />
            <InstallAppButton className="h-8 text-xs px-3" />
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground/70">
            ©2025 Skily
          </p>
        </div>
      </div>
    </footer>
  );
}
