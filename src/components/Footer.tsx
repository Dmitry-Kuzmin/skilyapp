import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowUpRight, CarFront } from "lucide-react";
import { toast } from "sonner";

export function Footer() {
  const { t, language } = useLanguage();
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
    // Переход на страницу настроек cookies, так как внешнего CMP Axeptio больше нет
    navigate("/legal/cookies");
  };

  const nrtvLabel =
    language === "ru"
      ? "Сайт запущен студией NRTV"
      : language === "es"
        ? "Sitio lanzado por el estudio NRTV"
        : "Site launched by NRTV Studio";

  const nrtvCta =
    language === "ru"
      ? "Перейти на nrtv.studio"
      : language === "es"
        ? "Abrir nrtv.studio"
        : "Visit nrtv.studio";

  return (
    <footer className="border-t border-white/5 bg-transparent mt-auto relative z-10 mb-[140px] md:mb-0">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-6">
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
          <div className="flex justify-center md:justify-start">
            <a
              href="https://www.nrtv.studio"
              target="_blank"
              rel="noreferrer"
              aria-label={nrtvCta}
              className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-300 shadow-[0_8px_24px_rgba(15,23,42,0.18)] backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              <img
                src="/nrtv-logo.png"
                alt="NRTV"
                className="h-6 w-6 rounded-md object-cover"
              />
              <span>{nrtvLabel}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[11px] font-medium text-slate-200">
                nrtv.studio
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
