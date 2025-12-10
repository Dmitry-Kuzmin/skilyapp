import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserContext } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";
import { isTelegramMiniApp } from "@/lib/telegram";
import { useDashboardData } from "@/hooks/useDashboardData";
import { LandingLogo } from "@/components/landing/LandingLogo";

export function Footer() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const isTelegramApp = isTelegramMiniApp();
  const { isAuthenticated } = useUserContext();
  
  // SUPER ОПТИМИЗАЦИЯ: Берем partner из Super RPC Dashboard (нет отдельного запроса!)
  const { data: dashboardData } = useDashboardData();
  const partnerStatus = dashboardData?.partner?.partner_status;
  const isPartner =
    dashboardData?.partner?.is_partner ||
    partnerStatus === "approved" ||
    partnerStatus === "active";

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

  const footerColumns = [
    [
      { to: "/blog", label: t("footer.blog") },
      { to: "/help", label: t("footer.help") },
      { to: "/about", label: t("footer.about") },
    ],
    [
      { to: "/terms", label: t("footer.terms") },
      { to: "/privacy", label: t("footer.privacy") },
      { to: "/subscription-terms", label: t("footer.subscriptionTerms") },
    ],
    [
      { to: "/pricing", label: t("footer.pricing") },
      { to: "/refund-policy", label: t("footer.refundPolicy") },
      { 
        to: isPartner ? "/partner/dashboard" : "/partners", 
        label: isPartner
          ? t("footer.partnerDashboard")
          : partnerStatus === "pending"
            ? t("footer.partnerPending")
            : t("footer.becomePartner"), 
      },
    ],
  ];

  return (
    <footer className="border-t border-border/50 bg-background/95 backdrop-blur-xl mt-auto pb-4 md:pb-6">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6 text-center md:text-left">
          {/* Logo/Brand */}
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mx-auto md:mx-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-1 py-1 transition-opacity hover:opacity-90"
          >
            <LandingLogo theme="dark" variant="minimal" showText={true} className="scale-75" />
          </button>

          {/* Organized Link Columns */}
          <div className="w-full md:flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm text-muted-foreground text-left">
            {footerColumns.map((column, colIndex) => (
              <div key={colIndex} className="space-y-2">
                {column.map((link) => (
                  <button
                    key={link.to}
                    type="button"
                    className="block text-left hover:text-foreground transition-colors w-full"
                    onClick={() => navigate(link.to)}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground mx-auto md:mx-0">
            ©2025 Skily
          </p>
        </div>
      </div>
    </footer>
  );
}



