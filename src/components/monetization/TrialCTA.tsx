import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/contexts/UserContext';
import { usePremium } from '@/hooks/usePremium';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { useModalStore } from '@/store/modalStore';

interface TrialCTAProps {
  onTrialStarted?: () => void;
  variant?: 'banner' | 'inline';
}

const TEXT: Record<string, { headline: string; sub: string; cta: string; genericError: string }> = {
  ru: {
    headline: '3 дня Premium бесплатно',
    sub: 'Безлимит тестов, AI без ограничений, дуэли. Карта привязывается, но списания нет 3 дня.',
    cta: 'Попробовать бесплатно →',
    genericError: 'Не удалось открыть checkout. Попробуй позже.',
  },
  en: {
    headline: '3-day Premium trial',
    sub: 'Unlimited tests, AI without limits, duels. Card required but no charge for 3 days.',
    cta: 'Try free for 3 days →',
    genericError: 'Could not open checkout. Please try again later.',
  },
  es: {
    headline: 'Premium gratis 3 días',
    sub: 'Tests ilimitados, IA sin límites, duelos. Se vincula tarjeta pero sin cobro 3 días.',
    cta: 'Probar gratis 3 días →',
    genericError: 'No se pudo abrir el checkout. Inténtalo más tarde.',
  },
};

export function TrialCTA({ onTrialStarted, variant = 'banner' }: TrialCTAProps) {
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const { language } = useLanguage();
  const t = TEXT[language] || TEXT.en;
  const openModal = useModalStore(s => s.openModal);
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (!profileId || isPremium || hidden) return null;

  const handleStartTrial = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('paddle-payment', {
        body: { user_id: profileId, catalog_key: 'premium_trial' },
      });
      if (error) throw error;

      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (!parsed?.transaction_id) throw new Error('No transaction_id from paddle-payment');

      // Close parent modal first, then open checkout via GlobalModalManager (outside Settings stack)
      onTrialStarted?.();
      openModal('PADDLE_CHECKOUT', { transactionId: parsed.transaction_id }, false);
    } catch (err) {
      console.error('[TrialCTA] Paddle trial checkout failed:', err);
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/30 p-5 mb-6 backdrop-blur-md transition-all hover:border-amber-500/20"
    >
      {/* Subtle Glow Background Effect */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/5 blur-[60px] rounded-full pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row items-center gap-5 sm:items-start relative z-10">
        <div className="shrink-0 w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-transform group-hover:scale-110">
          <Sparkles className="w-5 h-5 text-amber-500" />
        </div>
        
        <div className="flex-1 text-center sm:text-left min-w-0">
          <h3 className="text-[15px] font-bold text-white tracking-tight leading-none mb-2">
            {t.headline}
          </h3>
          <p className="text-[13px] text-zinc-400 leading-relaxed max-w-[400px]">
            {t.sub}
          </p>
          
          <Button
            onClick={handleStartTrial}
            disabled={loading}
            className="mt-5 w-full sm:w-auto h-11 px-8 rounded-xl bg-white hover:bg-zinc-100 text-black font-bold text-sm transition-all active:scale-[0.98] shadow-[0_10px_20px_rgba(255,255,255,0.1)]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t.cta
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
