import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { isTelegramMiniApp } from "@/lib/telegram";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { Scale, HelpCircle } from "lucide-react";
import { InstallAppButton } from "@/components/pwa";
import { currentYear } from "@/utils/dateUtils";

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
      className="border-t border-border/40 bg-background/80 backdrop-blur-xl pb-10 md:pb-8 mb-[140px] md:mb-0"
      style={{ position: 'static' }}
    >
      <div className="container mx-auto px-6 pt-10 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Logo & Copyright (Left/Center on mobile) */}
          <div className="flex flex-col items-center md:items-start gap-4 order-2 md:order-1">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-all hover:scale-105 active:scale-95"
            >
              <LandingLogo variant="bold" showText={true} className="scale-90" />
            </button>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/50">
              ©{currentYear} Skily · First Class AI EdTech
            </p>
          </div>

          {/* Center: Install Action (Always centered) */}
          <div className="flex justify-center order-1 md:order-2">
            <InstallAppButton
              className="bg-secondary/50 hover:bg-secondary border border-border/50 text-foreground h-9 px-5 rounded-full shadow-none group transition-all hover:border-primary/30"
              minimal={false}
            />
          </div>

          {/* Right: Nav Links */}
          <div className="flex items-center justify-center md:justify-end gap-6 order-3">
            {footerLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.to}
                  type="button"
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-all hover:translate-y-[-1px] group"
                  onClick={() => navigate(link.to)}
                >
                  <Icon className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
