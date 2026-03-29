import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { landingTranslations } from '@/translations/landing';

interface SpainPricingProps {
  onSelectPlan?: (planKey: string) => void;
  referrerInfo?: any;
}

/**
 * Spain Pricing Component
 * ВСЕГДА показывает EUR, независимо от выбранного языка (ES, EN)
 * 3 языка доступны, но только ES и EN (не RU)
 */
export const SpainPricing: React.FC<SpainPricingProps> = ({ onSelectPlan, referrerInfo }) => {
  const { language, setLanguage } = useLanguage();

  // Ограничиваем язык только ES и EN для Spain
  const effectiveLanguage = (language === 'ru' ? 'es' : language) as Language;

  // Если выбран Russian, переключаемся на Spanish
  React.useEffect(() => {
    if (language === 'ru') {
      setLanguage('es');
    }
  }, [language, setLanguage]);

  const copy = landingTranslations[effectiveLanguage];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold mb-4">{copy.pricing.title}</h2>
        <p className="text-slate-400">{copy.pricing.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-12">
          {Object.entries(copy.pricing.plans).map(([key, plan]) => {
            const isPremium = key !== 'cadet';
            const isHighlighted = key === 'yearly';

            return (
              <div
                key={key}
                className={cn(
                  "rounded-2xl p-6 relative transition-all duration-300",
                  isPremium ? "border border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 to-slate-900/50" :
                    "border border-slate-700 bg-slate-800/50 hover:border-slate-600"
                )}
              >
                {(plan as any).badge && (
                  <div className={cn(
                    "absolute -top-3 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    isHighlighted ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : "bg-slate-800 text-slate-400"
                  )}>
                    {(plan as any).badge}
                  </div>
                )}

                <h3 className={cn(
                  "font-black text-lg mb-2",
                  isPremium ? "text-indigo-300" : "text-slate-400"
                )}>
                  {plan.title}
                </h3>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-2xl font-black text-white">{plan.price}</span>
                  {(plan as any).note && <span className="text-slate-500 text-xs font-medium">{(plan as any).note}</span>}
                </div>

                <ul className="space-y-3 mb-8 text-xs flex-grow">
                  {plan.features.map((feature: string) => (
                    <li key={feature} className="flex gap-2 text-slate-300">
                      <CheckCircle2 size={14} className={cn("shrink-0", isPremium ? "text-indigo-400" : "text-slate-600")} />
                      <span className="leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onSelectPlan?.(key)}
                  className={cn(
                    "w-full py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 relative overflow-hidden group/btn",
                    !isPremium ? "border border-slate-700 text-slate-300 hover:bg-slate-800" :
                      isHighlighted ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20" :
                        "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20"
                  )}
                >
                  <span className="relative z-10">{plan.cta}</span>
                  {referrerInfo && (
                    <span className="ml-2 text-amber-300 inline-flex items-center gap-1 relative z-10">
                      +50 💰
                    </span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
