import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { CarFront } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    axeptioSDK?: {
      requestConsent: () => void;
      openConsentModal: () => void;
    };
    axeptio?: {
      requestConsent: () => void;
      openConsentModal: () => void;
    };
    _axcb?: any[];
  }
}

export function Footer() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

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
  if (isFullscreenMode) {
    return null;
  }

  const handleCookieSettings = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // НЕ вызываем e.stopPropagation() — это убивает нативный обработчик Axeptio на классе axeptio_authorized_vendors

    const win = window as any;
    // Прямой вызов SDK — самый надёжный способ
    const sdk = win.axeptioSDK || win.axeptio || win.Axeptio;
    if (sdk?.requestConsent) {
      sdk.requestConsent();
    } else if (sdk?.openConsentModal) {
      sdk.openConsentModal();
    }
    // Если SDK ещё не загружен — нативный обработчик Axeptio на классе сам откроет баннер
  };

  return (
    <footer className="border-t border-white/5 bg-transparent mt-auto relative z-10 mb-[140px] md:mb-0">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-6">

          {/* ЛЕВАЯ ЧАСТЬ (БРЕНД) */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2">
              <CarFront className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
              <span className="text-slate-400 font-bold tracking-tight text-sm">Skily</span>
            </div>
            <p className="text-slate-600 text-xs">
              © 2026 Skily Inc.
            </p>
          </div>

          {/* ПРАВАЯ ЧАСТЬ (ССЫЛКИ) */}
          <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-3">
            <button
              onClick={() => navigate("/legal/privacy")}
              className="text-slate-500 hover:text-white transition-colors text-xs font-medium"
            >
              {t("footer.privacy")}
            </button>
            <button
              onClick={() => navigate("/legal/terms")}
              className="text-slate-500 hover:text-white transition-colors text-xs font-medium"
            >
              {t("footer.terms")}
            </button>
            <a
              href="#"
              onClick={handleCookieSettings}
              className="axeptio_authorized_vendors text-slate-500 hover:text-white transition-colors text-xs font-medium"
            >
              {t("footer.cookies")}
            </a>
            <a
              href="https://t.me/skilyapp_bot"
              target="_blank"
              rel="noreferrer"
              className="text-slate-500 hover:text-white transition-colors text-xs font-medium"
            >
              {t("footer.support")}
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}
