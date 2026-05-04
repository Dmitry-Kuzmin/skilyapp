import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/contexts/UserContext';
import { usePremium } from '@/hooks/usePremium';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface TrialCTAProps {
  onTrialStarted?: () => void;
  variant?: 'banner' | 'inline';
}

const TEXT: Record<string, { headline: string; sub: string; cta: string; success: string; alreadyUsed: string; alreadyPremium: string; genericError: string }> = {
  ru: {
    headline: '3 дня Premium бесплатно',
    sub: 'Безлимит тестов, AI помнит твои ошибки, без рекламы. База остаётся 300 вопросов.',
    cta: 'Попробовать 3 дня free',
    success: 'Trial активирован — 3 дня Premium включены!',
    alreadyUsed: 'Ты уже использовал бесплатный пробный период',
    alreadyPremium: 'У тебя уже активна Premium-подписка',
    genericError: 'Не удалось активировать trial. Попробуй позже.',
  },
  en: {
    headline: '3-day Premium trial',
    sub: 'Unlimited tests, AI remembers your weak topics, no ads. Question pool stays at 300.',
    cta: 'Try 3 days free',
    success: 'Trial activated — 3 days of Premium are on!',
    alreadyUsed: 'Free trial already used',
    alreadyPremium: 'Premium is already active',
    genericError: 'Could not start trial. Please try again later.',
  },
  es: {
    headline: 'Premium gratis 3 días',
    sub: 'Tests ilimitados, IA recuerda tus puntos débiles, sin anuncios. Banco de 300 preguntas.',
    cta: 'Probar 3 días gratis',
    success: '¡Trial activado — Premium gratis 3 días!',
    alreadyUsed: 'Ya usaste tu periodo de prueba gratuito',
    alreadyPremium: 'Tu Premium ya está activo',
    genericError: 'No se pudo iniciar el trial. Inténtalo más tarde.',
  },
};

export function TrialCTA({ onTrialStarted, variant = 'banner' }: TrialCTAProps) {
  const { profileId } = useUserContext();
  const { isPremium, refresh } = usePremium();
  const { language } = useLanguage();
  const t = TEXT[language] || TEXT.en;
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (!profileId || isPremium || hidden) return null;

  const handleStartTrial = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('start_premium_trial', { p_user_id: profileId });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;

      if (!row?.success) {
        const reason = row?.reason || 'unknown';
        if (reason === 'trial_already_used') {
          toast.info(t.alreadyUsed);
          setHidden(true);
        } else if (reason === 'already_premium' || reason === 'already_lifetime') {
          toast.info(t.alreadyPremium);
          setHidden(true);
        } else {
          toast.error(t.genericError);
        }
        return;
      }

      toast.success(t.success);
      await refresh();
      onTrialStarted?.();
    } catch (err) {
      console.error('[TrialCTA] start_premium_trial failed:', err);
      toast.error(t.genericError);
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'inline') {
    return (
      <Button
        onClick={handleStartTrial}
        disabled={loading}
        variant="outline"
        className="w-full h-11 rounded-xl border-amber-400/40 bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/30 dark:hover:bg-amber-500/20 font-bold"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-2" /> {t.cta}</>}
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 dark:border-amber-500/20 p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-amber-900 dark:text-amber-100">{t.headline}</p>
          <p className="text-xs text-amber-800/80 dark:text-amber-200/70 mt-0.5">{t.sub}</p>
          <Button
            onClick={handleStartTrial}
            disabled={loading}
            size="sm"
            className="mt-3 h-9 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t.cta}
          </Button>
        </div>
      </div>
    </div>
  );
}
