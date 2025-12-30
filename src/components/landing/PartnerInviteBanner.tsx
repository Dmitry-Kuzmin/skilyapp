// @ts-nocheck
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sparkles, Gift } from "lucide-react";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface PartnerInfo {
  partnerCode: string;
  partnerName?: string;
  utm_campaign?: string;
}

export function PartnerInviteBanner() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Проверить localStorage на наличие partner_code
    const partnerCode = localStorage.getItem('partner_code');
    const utmCampaign = localStorage.getItem('partner_utm_campaign');
    
    if (partnerCode) {
      setPartnerInfo({
        partnerCode: partnerCode,
        utm_campaign: utmCampaign || undefined,
      });
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    // Сохраняем что пользователь закрыл баннер
    sessionStorage.setItem('partner_banner_dismissed', 'true');
  };

  // Не показывать если нет партнера или пользователь закрыл
  if (!partnerInfo || dismissed || sessionStorage.getItem('partner_banner_dismissed')) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary/95 via-indigo-600/95 to-purple-600/95 backdrop-blur-xl border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left Side - Message */}
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <Gift className="h-5 w-5 text-white" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Sparkles className="h-4 w-4 text-yellow-300 flex-shrink-0" />
                  <p className="text-sm font-bold text-white">
                    {t('auth.partner.specialOffer')}
                  </p>
                </div>
                <p className="text-sm text-white/90">
                  {t('auth.partner.getPremium')} <strong>{t('auth.partner.premium30Days')}</strong> {t('auth.partner.onRegistration')}
                  {partnerInfo.utm_campaign && (
                    <span className="text-white/70 ml-1">
                      • {t('auth.partner.campaign')}: {partnerInfo.utm_campaign}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Right Side - CTA + Close */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 rounded-lg bg-white text-primary font-semibold hover:bg-white/90 transition-colors text-sm"
              >
                {t('auth.partner.getPremium')}
              </button>
              
              <button
                onClick={handleDismiss}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                aria-label={t('auth.partner.close')}
              >
                <X className="h-4 w-4 text-white/70 hover:text-white" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Spacer чтобы контент не был под баннером */}
      <div className="h-[60px]" />
    </AnimatePresence>
  );
}

