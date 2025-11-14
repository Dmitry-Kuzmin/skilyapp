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
    <footer className="border-t border-border/50 bg-card/30 backdrop-blur-xl mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Sdadim
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('footer.companyDescription')}
            </p>
            <div className="text-sm text-muted-foreground">
              <p>{t('footer.address')}</p>
              <p className="mt-1">{t('footer.contact')}</p>
            </div>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t('footer.legal')}</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/terms" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/privacy" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/subscription-terms" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('footer.subscriptionTerms')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t('footer.resources')}</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('home')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/tests" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('tests')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/learning" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('learning')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/games" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('games')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t('footer.support')}</h4>
            <ul className="space-y-2">
              <li>
                <a 
                  href={`mailto:${t('footer.supportEmail')}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('footer.supportEmail')}
                </a>
              </li>
              <li className="text-sm text-muted-foreground">
                {t('footer.copyright')}
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            {t('footer.rightsReserved')}
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">
              {t('footer.terms')}
            </Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              {t('footer.privacy')}
            </Link>
            <span>•</span>
            <Link to="/subscription-terms" className="hover:text-foreground transition-colors">
              {t('footer.subscriptionTerms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}



