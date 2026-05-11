import React, { useState, useContext } from 'react';
import {
  Sparkles, ChevronRight, Crown, Clock, AlertCircle,
  Zap, BarChart3, Trophy, ExternalLink, MessageCircle,
  Star, Shield, XCircle, CalendarDays, Infinity as InfinityIcon,
  ArrowLeft, RefreshCw,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/store/settingsStore';
import { usePremium } from '@/hooks/usePremium';
import { triggerHaptic } from '@/lib/haptics';
import { format, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { UserContext } from '@/contexts/UserContext';

type CancelStep = 'idle' | 'confirm' | 'how-to-cancel';

const LOSE_BULLETS = [
  { icon: Zap,       color: 'text-amber-400',  text: '9 500+ вопросов, Challenge Bank и AI-разборы' },
  { icon: Sparkles,  color: 'text-violet-400', text: 'Профессор Skily без ограничений' },
  { icon: BarChart3, color: 'text-emerald-400',text: 'Глубокая статистика и прогноз сдачи' },
  { icon: Trophy,    color: 'text-rose-400',   text: 'Duel Pass Premium: скины, монеты и бонусы' },
];

const PLAN_TITLES: Record<string, string> = {
  monthly:  'Premium · 1 месяц',
  quarterly:'Premium · 3 месяца',
  biannual: 'Premium · 6 месяцев',
  yearly:   'Premium · 1 год',
  lifetime: 'Premium Forever',
};

const FEATURE_PILLS = [
  { icon: Zap,       color: 'text-amber-400',  label: '9 500+ вопросов' },
  { icon: Sparkles,  color: 'text-violet-400', label: 'AI без лимитов' },
  { icon: BarChart3, color: 'text-emerald-400',label: 'Глубокая статистика' },
  { icon: Trophy,    color: 'text-rose-400',   label: 'Duel Pass Premium' },
  { icon: Shield,    color: 'text-sky-400',    label: 'Без рекламы' },
  { icon: Star,      color: 'text-yellow-400', label: 'Приоритет поддержки' },
];

function StatusBadge({ isTrial, isPremium, isLifetime, daysRemaining }: {
  isTrial: boolean; isPremium: boolean; isLifetime: boolean; daysRemaining: number;
}) {
  if (isLifetime) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Навсегда</Badge>;
  if (isTrial) {
    const cls = daysRemaining <= 3 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                daysRemaining <= 7 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                     'bg-blue-500/20 text-blue-400 border-blue-500/30';
    return <Badge className={cn('text-xs', cls)}>Триал · {daysRemaining}д.</Badge>;
  }
  if (isPremium) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Активна</Badge>;
  return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">Базовый</Badge>;
}

export const SubscriptionTab: React.FC = () => {
  const { closeSettings } = useSettingsStore();
  const { isPremium, isLifetime, isTrial, activeUntil, subscriptionType, daysRemaining, loading } = usePremium();
  const userContext = useContext(UserContext);
  const profileId = userContext?.profileId ?? null;

  const [cancelStep, setCancelStep] = useState<CancelStep>('idle');
  const [paddleSubId, setPaddleSubId] = useState<string | null>(null);
  const [providerLoading, setProviderLoading] = useState(false);

  const computedDaysRemaining = activeUntil
    ? Math.max(0, differenceInDays(new Date(activeUntil), new Date()))
    : daysRemaining;

  const startCancel = async () => {
    triggerHaptic('warning');
    if (profileId && !paddleSubId) {
      setProviderLoading(true);
      const { data } = await supabase
        .from('purchases')
        .select('paddle_subscription_id')
        .eq('user_id', profileId)
        .not('paddle_subscription_id', 'is', null)
        .limit(1)
        .maybeSingle();
      setPaddleSubId(data?.paddle_subscription_id ?? null);
      setProviderLoading(false);
    }
    setCancelStep('confirm');
  };

  const handleUpgrade = () => {
    triggerHaptic('light');
    closeSettings();
    window.location.href = '/premium';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
      </div>
    );
  }

  const planInfo = (() => {
    if (isLifetime) return {
      title: 'Premium Forever',
      icon: <InfinityIcon className="w-6 h-6" />,
      gradient: 'from-amber-500 to-orange-500',
      bg: 'from-amber-500/10 to-orange-500/10',
      border: 'border-amber-500/20',
    };
    if (isTrial) return {
      title: 'Пробный период',
      icon: <Clock className="w-6 h-6" />,
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'from-blue-500/10 to-cyan-500/10',
      border: 'border-blue-500/20',
    };
    if (isPremium) return {
      title: PLAN_TITLES[subscriptionType ?? ''] ?? 'Premium',
      icon: <Crown className="w-6 h-6" />,
      gradient: 'from-indigo-500 to-purple-500',
      bg: 'from-indigo-500/10 to-purple-500/10',
      border: 'border-indigo-500/20',
    };
    return {
      title: 'Базовый',
      icon: <AlertCircle className="w-5 h-5" />,
      gradient: 'from-slate-600 to-slate-700',
      bg: 'from-slate-800/60 to-slate-800/40',
      border: 'border-slate-700',
    };
  })();

  const formattedDate = activeUntil
    ? format(new Date(activeUntil), 'd MMMM yyyy', { locale: ru })
    : null;

  const trialUrgency = isTrial && computedDaysRemaining <= 3;
  const hasPaddle = !!paddleSubId;

  return (
    <div className="space-y-5">

      {/* ── Текущий план ── */}
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Текущий план</p>
        <div className={cn('p-4 rounded-2xl bg-gradient-to-br border', planInfo.bg, planInfo.border)}>
          <div className="flex items-center gap-3">
            <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg', planInfo.gradient)}>
              {React.cloneElement(planInfo.icon, { className: 'w-6 h-6 text-white' })}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-slate-100 text-base">{planInfo.title}</span>
                <StatusBadge isTrial={isTrial} isPremium={isPremium} isLifetime={isLifetime} daysRemaining={computedDaysRemaining} />
              </div>
              {isLifetime ? (
                <p className="text-sm text-slate-400">Вечный доступ ко всем функциям</p>
              ) : formattedDate ? (
                <p className={cn('text-sm', trialUrgency ? 'text-red-400' : 'text-slate-400')}>
                  {isTrial ? 'Триал до' : 'Активен до'} {formattedDate}
                </p>
              ) : (
                <p className="text-sm text-slate-400">Ограниченный доступ</p>
              )}
            </div>
          </div>

          {isTrial && computedDaysRemaining <= 7 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className={cn('font-medium', computedDaysRemaining <= 3 ? 'text-red-400' : 'text-amber-400')}>
                  Осталось дней
                </span>
                <span className={cn('font-bold', computedDaysRemaining <= 3 ? 'text-red-400' : 'text-amber-400')}>
                  {computedDaysRemaining}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', computedDaysRemaining <= 3 ? 'bg-red-500' : 'bg-amber-500')}
                  style={{ width: `${Math.min(100, (computedDaysRemaining / 7) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Что входит ── */}
      {(isPremium || isTrial) && cancelStep === 'idle' && (
        <>
          <Separator className="bg-slate-700/50" />
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Включено в план</p>
            <div className="grid grid-cols-2 gap-2">
              {FEATURE_PILLS.map(({ icon: Icon, color, label }) => (
                <div key={label} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <Icon className={cn('w-4 h-4 flex-shrink-0', color)} />
                  <span className="text-xs text-slate-300 leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator className="bg-slate-700/50" />

      {/* ── Управление / Inline cancel ── */}
      <div>
        {cancelStep === 'idle' && (
          <>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Управление</p>
            <div className="space-y-2">
              {(!isPremium || isTrial) && !isLifetime && (
                <button
                  onClick={handleUpgrade}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-white" />
                    <span className="text-sm font-semibold text-white">
                      {isTrial ? 'Перейти на Premium' : 'Активировать Premium'}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/70" />
                </button>
              )}

              {isPremium && !isTrial && !isLifetime && (
                <button
                  onClick={handleUpgrade}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-5 h-5 text-slate-300" />
                    <span className="text-sm font-medium text-slate-200">Изменить план</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              )}

              {(isPremium || isTrial) && !isLifetime && (
                <button
                  onClick={startCancel}
                  disabled={providerLoading}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-red-950/30 border border-slate-700 hover:border-red-900/50 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="text-sm font-medium text-red-400">
                      {isTrial ? 'Отменить пробный период' : 'Отменить подписку'}
                    </span>
                  </div>
                  {providerLoading
                    ? <RefreshCw className="w-4 h-4 text-slate-500 animate-spin" />
                    : <ChevronRight className="w-4 h-4 text-red-400/50" />
                  }
                </button>
              )}

              {isLifetime && (
                <div className="px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-400/80">У вас максимальный тариф — Premium навсегда</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Шаг 1: подтверждение ── */}
        {cancelStep === 'confirm' && (
          <div className="rounded-2xl bg-red-950/20 border border-red-900/30 overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <button
                onClick={() => setCancelStep('idle')}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-3"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Назад
              </button>
              <p className="text-sm font-semibold text-white mb-1">
                {isTrial ? 'Отменить пробный период?' : 'Отменить подписку?'}
              </p>
              <p className="text-xs text-slate-400 mb-4">Ты потеряешь доступ к:</p>
              <div className="space-y-2.5 mb-4">
                {LOSE_BULLETS.map(({ icon: Icon, color, text }) => (
                  <div key={text} className="flex items-start gap-2.5">
                    <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', color)} />
                    <span className="text-xs text-slate-300 leading-snug">{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 px-4 pb-4">
              <button
                onClick={() => { triggerHaptic('light'); setCancelStep('idle'); }}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold transition-all active:scale-[0.98]"
              >
                Оставить
              </button>
              <button
                onClick={() => { triggerHaptic('warning'); setCancelStep('how-to-cancel'); }}
                className="flex-1 h-10 rounded-xl bg-transparent hover:bg-red-500/10 text-red-400 hover:text-red-300 border border-red-500/30 text-sm font-medium transition-all active:scale-[0.98]"
              >
                Всё равно отменить
              </button>
            </div>
          </div>
        )}

        {/* ── Шаг 2: как отменить ── */}
        {cancelStep === 'how-to-cancel' && (
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700 overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <button
                onClick={() => setCancelStep('confirm')}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-3"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Назад
              </button>
              <p className="text-sm font-semibold text-white mb-3">Как отменить</p>
              {hasPaddle ? (
                <div className="space-y-2 text-xs text-slate-400">
                  <p>Подписка оформлена через <span className="text-white font-medium">Paddle</span>. Отмени на их портале:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
                    <li>Нажми кнопку ниже</li>
                    <li>Войди под email покупки</li>
                    <li>Выбери подписку → Cancel</li>
                  </ol>
                  <p className="text-slate-500">Доступ сохранится до конца оплаченного периода</p>
                </div>
              ) : (
                <div className="space-y-2 text-xs text-slate-400">
                  <p>Напиши в поддержку — мы отменим вручную в течение нескольких часов.</p>
                  <p className="text-slate-500">Возвраты рассматриваются индивидуально.</p>
                </div>
              )}
            </div>
            <div className="px-4 pb-4">
              {hasPaddle ? (
                <button
                  onClick={() => window.open('https://customer.paddle.com/', '_blank')}
                  className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <ExternalLink className="w-4 h-4" />
                  Открыть Paddle Portal
                </button>
              ) : (
                <button
                  onClick={() => window.open('https://t.me/skilyapp_bot', '_blank')}
                  className="w-full h-10 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <MessageCircle className="w-4 h-4" />
                  Написать в поддержку
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <Separator className="bg-slate-700/50" />

      {/* ── Поддержка ── */}
      <button
        onClick={() => window.open('https://t.me/skilyapp_bot', '_blank')}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800/60 transition-colors"
      >
        <MessageCircle className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-400">Поддержка</span>
        <ExternalLink className="w-3.5 h-3.5 text-slate-600 ml-auto" />
      </button>
    </div>
  );
};

export default SubscriptionTab;
