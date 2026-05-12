import React, { useState, useContext } from 'react';
import {
  Crown, Clock, AlertCircle, Ban,
  ExternalLink, MessageCircle,
  ArrowLeft, RefreshCw, CheckCircle2, Infinity as InfinityIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { useSettingsStore } from '@/store/settingsStore';
import { usePremium } from '@/hooks/usePremium';
import { useDashboardData } from '@/hooks/useDashboardData';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { UserContext } from '@/contexts/UserContext';
import { useModalStore } from '@/store/modalStore';
import { TrialCTA } from '@/components/monetization/TrialCTA';

type CancelStep = 'idle' | 'confirm' | 'cancelling' | 'cancelled' | 'manual';

const PLAN_TITLES: Record<string, string> = {
  monthly:   'Premium · 1 месяц',
  quarterly: 'Premium · 3 месяца',
  biannual:  'Premium · 6 месяцев',
  yearly:    'Premium · 1 год',
  lifetime:  'Premium навсегда',
};



export const SubscriptionTab: React.FC = () => {
  const { closeSettings } = useSettingsStore();
  const { isPremium, isLifetime, isTrial, isCancelled, activeUntil, subscriptionType, daysRemaining, loading } = usePremium();
  const { refresh: dashboardRefresh } = useDashboardData();
  const userContext = useContext(UserContext);
  const profileId = userContext?.profileId ?? null;
  const queryClient = useQueryClient();

  const openModal = useModalStore(s => s.openModal);

  const [cancelStep, setCancelStep] = useState<CancelStep>('idle');
  const [cancelling, setCancelling] = useState(false);
  const [cancelMethod, setCancelMethod] = useState<string | null>(null);
  const [cancelNotifications, setCancelNotifications] = useState<{ telegram: boolean; email: boolean } | null>(null);

  const computedDaysRemaining = activeUntil
    ? Math.max(0, differenceInDays(new Date(activeUntil), new Date()))
    : daysRemaining;

  const formattedDate = activeUntil
    ? format(new Date(activeUntil), 'd MMMM yyyy', { locale: ru })
    : null;

  const executeCancel = async () => {
    triggerHaptic('warning');
    setCancelling(true);
    setCancelStep('cancelling');
    try {
      const res = await supabase.functions.invoke('cancel-subscription');
      const result = res.data as {
        success?: boolean;
        method?: string;
        error?: string;
        scheduledEnd?: string;
        notifications?: { telegram: boolean; email: boolean };
      } | null;

      if (res.error || !result?.success) {
        const errCode = result?.error;
        if (errCode === 'no_paddle_subscription') {
          setCancelStep('manual');
        } else if (errCode === 'lifetime_not_cancellable') {
          toast.error('Вечную подписку нельзя отменить');
          setCancelStep('idle');
        } else if (errCode === 'no_active_subscription') {
          // Триал уже истёк — обновляем кэш и показываем экран "отменено"
          dashboardRefresh(true);
          queryClient.removeQueries({ queryKey: ['premium-status', profileId] });
          setCancelMethod('trial');
          setCancelStep('cancelled');
        } else if (errCode === 'subscription_locked') {
          toast.error('Подписка обновляется. Попробуй через минуту.');
          setCancelStep('confirm');
        } else if (errCode === 'paddle_error') {
          toast.error('Paddle временно недоступен. Попробуй позже.');
          setCancelStep('confirm');
        } else {
          toast.error('Не удалось отменить. Попробуй позже или напиши в поддержку.');
          setCancelStep('confirm');
        }
      } else {
        setCancelMethod(result.method ?? null);
        setCancelNotifications(result.notifications ?? null);
        setCancelStep('cancelled');
        // Принудительный рефетч — invalidate + немедленный запрос к RPC
        dashboardRefresh(true);
        queryClient.removeQueries({ queryKey: ['premium-status', profileId] });
      }
    } catch {
      toast.error('Ошибка соединения. Попробуй ещё раз.');
      setCancelStep('confirm');
    } finally {
      setCancelling(false);
    }
  };

  const handleUpgrade = () => {
    triggerHaptic('light');
    closeSettings();
    openModal('PAYWALL');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-4 h-4 text-slate-600 animate-spin" />
      </div>
    );
  }

  // ── Plan metadata ──────────────────────────────────────────────────────────
  const planTitle = isLifetime
    ? 'Premium навсегда'
    : isTrial
    ? 'Пробный период'
    : isCancelled
    ? (PLAN_TITLES[subscriptionType ?? ''] ?? 'Premium')
    : (PLAN_TITLES[subscriptionType ?? ''] ?? 'Premium');

  const PlanIcon = isLifetime ? InfinityIcon : isTrial ? Clock : isCancelled ? Ban : isPremium ? Crown : AlertCircle;

  const accent = isLifetime
    ? { icon: 'text-amber-400', ring: 'ring-amber-500/20', bg: 'bg-amber-500/5',  badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20' }
    : isTrial
    ? { icon: 'text-amber-400', ring: 'ring-amber-500/20', bg: 'bg-amber-500/5',  badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20' }
    : isCancelled
    ? { icon: 'text-slate-400', ring: 'ring-slate-700/40', bg: 'bg-slate-800/30', badge: 'bg-slate-700/40 text-slate-400 border-slate-600/30' }
    : isPremium
    ? { icon: 'text-amber-400', ring: 'ring-amber-500/20', bg: 'bg-amber-500/5',  badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20' }
    : { icon: 'text-zinc-500',  ring: 'ring-zinc-800',    bg: 'bg-zinc-900/40',  badge: 'bg-zinc-800/40  text-zinc-400  border-zinc-700/30'  };

  const notificationHint = cancelNotifications
    ? cancelNotifications.telegram && cancelNotifications.email
      ? 'Подтверждение отправлено в Telegram и на email'
      : cancelNotifications.telegram
      ? 'Подтверждение отправлено в Telegram'
      : cancelNotifications.email
      ? 'Подтверждение отправлено на email'
      : null
    : null;

  return (
    <div className="space-y-4">

      {/* ── Current plan card ─────────────────────────────────────────────────── */}
      <div className={cn('p-4 rounded-2xl ring-1', accent.bg, accent.ring)}>
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-800/60')}>
            <PlanIcon className={cn('w-4.5 h-4.5', accent.icon)} style={{ width: 18, height: 18 }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100 text-sm leading-tight">{planTitle}</span>
              <Badge className={cn('text-[11px] px-2 py-0 h-5 font-medium border', accent.badge)}>
                {isLifetime ? 'Навсегда' : isTrial ? `${computedDaysRemaining} дн.` : isCancelled ? 'Отменена' : isPremium ? 'Активна' : 'Базовый'}
              </Badge>
            </div>
            <p className="text-[12px] text-slate-500 mt-0.5 leading-tight">
              {isLifetime
                ? 'Вечный доступ ко всем функциям'
                : isCancelled && formattedDate
                ? `Доступ сохраняется до ${formattedDate}`
                : formattedDate
                ? `${isTrial ? 'Триал до' : 'Активна до'} ${formattedDate}`
                : 'Ограниченный доступ'}
            </p>
          </div>
        </div>

        {/* Trial progress */}
        {isTrial && computedDaysRemaining <= 7 && cancelStep === 'idle' && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex justify-between text-[10px] mb-1.5">
              <span className="text-slate-600">Осталось дней</span>
              <span className={computedDaysRemaining <= 3 ? 'text-red-400' : 'text-amber-400'}>
                {computedDaysRemaining}
              </span>
            </div>
            <div className="h-[3px] rounded-full bg-slate-700/60 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', computedDaysRemaining <= 3 ? 'bg-red-500' : 'bg-amber-500')}
                style={{ width: `${Math.min(100, (computedDaysRemaining / 7) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Trial banner ─────────────────────────────────────────────────────── */}
      {!isPremium && !isTrial && !isLifetime && cancelStep === 'idle' && (
        <TrialCTA variant="banner" onTrialStarted={closeSettings} />
      )}

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      {cancelStep === 'idle' && (
        <div className="space-y-1.5">
          <div className="border-t border-slate-700/40" />

          {/* Free / trial → call to action */}
          {(!isPremium || isTrial) && !isLifetime && !isCancelled && (
            <button
              onClick={handleUpgrade}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white hover:bg-zinc-100 transition-all active:scale-[0.98] shadow-sm border-none group"
            >
              <div className="flex items-center gap-3">
                <Crown className="w-4 h-4 text-black" />
                <span className="text-[15px] font-bold text-black tracking-tight">
                  {isTrial ? 'Купить Premium' : 'Активировать Premium'}
                </span>
              </div>
              <span className="text-sm text-black/30 group-hover:text-black/50 transition-colors">→</span>
            </button>
          )}

          {/* Cancelled → reactivate */}
          {isCancelled && (
            <>
              <button
                onClick={handleUpgrade}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white hover:bg-zinc-100 transition-all active:scale-[0.98] shadow-sm border-none group"
              >
                <div className="flex items-center gap-3">
                  <Crown className="w-4 h-4 text-black" />
                  <span className="text-[15px] font-bold text-black tracking-tight">Возобновить Premium</span>
                </div>
                <span className="text-sm text-black/30 group-hover:text-black/50 transition-colors">→</span>
              </button>
              <p className="px-4 text-[11px] text-slate-600 leading-relaxed">
                Подписка отменена. Автоматическое продление отключено.
              </p>
            </>
          )}

          {/* Active paid → change plan */}
          {isPremium && !isTrial && !isLifetime && !isCancelled && (
            <button
              onClick={handleUpgrade}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-slate-800/50 transition-colors"
            >
              <span className="text-sm text-slate-400">Изменить план</span>
              <span className="text-xs text-slate-600">→</span>
            </button>
          )}

          {isLifetime && (
            <p className="px-4 py-2.5 text-xs text-amber-500/60">
              У вас максимальный тариф — Premium навсегда
            </p>
          )}

          {/* Cancel button — only for active non-cancelled subscriptions */}
          {(isPremium || isTrial) && !isLifetime && !isCancelled && (
            <button
              onClick={() => { triggerHaptic('warning'); setCancelStep('confirm'); }}
              className="w-full text-left px-4 py-2 rounded-xl hover:bg-red-950/20 transition-colors group"
            >
              <span className="text-xs text-slate-600 group-hover:text-red-400/70 transition-colors">
                {isTrial ? 'Отменить пробный период' : 'Отменить подписку'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* ── Confirm ──────────────────────────────────────────────────────────── */}
      {cancelStep === 'confirm' && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <button
              onClick={() => setCancelStep('idle')}
              className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors mb-4"
            >
              <ArrowLeft className="w-3 h-3" />
              Назад
            </button>

            <p className="text-sm font-semibold text-white mb-0.5">
              {isTrial ? 'Отменить пробный период?' : 'Отменить подписку?'}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mb-1">
              Ты потеряешь доступ к полной базе тестов, Skily инструктору и умным алгоритмам обучения.
            </p>
          </div>

          <div className="px-4 pb-4 pt-3 border-t border-slate-700/40 space-y-2">

            <div className="space-y-2">
            <button
              onClick={() => { triggerHaptic('light'); setCancelStep('idle'); }}
              className="w-full h-12 rounded-xl bg-white hover:bg-zinc-200 text-black text-sm font-semibold transition-all"
            >
              Оставить Premium
            </button>
            <button
              onClick={executeCancel}
              disabled={cancelling}
              className="w-full h-12 rounded-xl border border-zinc-800 text-red-400 text-sm font-medium hover:bg-red-950/20 transition-all"
            >
              Всё равно отменить
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ── Cancelling ───────────────────────────────────────────────────────── */}
      {cancelStep === 'cancelling' && (
        <div className="py-10 flex flex-col items-center gap-3">
          <RefreshCw className="w-5 h-5 text-slate-600 animate-spin" />
          <p className="text-xs text-slate-600">Отменяем подписку…</p>
        </div>
      )}

      {/* ── Cancelled ────────────────────────────────────────────────────────── */}
      {cancelStep === 'cancelled' && (
        <div className="py-7 flex flex-col items-center gap-2.5 text-center">
          <div className="w-11 h-11 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center mb-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-slate-100">
            {cancelMethod === 'trial' ? 'Пробный период отменён' : 'Подписка отменена'}
          </p>
          <p className="text-xs text-slate-500 max-w-[220px] leading-relaxed">
            {cancelMethod === 'trial'
              ? 'Доступ к Premium прекращён. Ты всегда можешь вернуться.'
              : 'Доступ сохраняется до конца оплаченного периода.'}
          </p>
          {notificationHint && (
            <p className="text-[11px] text-slate-600 mt-0.5">{notificationHint}</p>
          )}
        </div>
      )}

      {/* ── Manual (Stars/Crypto) ─────────────────────────────────────────────── */}
      {cancelStep === 'manual' && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <button
              onClick={() => setCancelStep('confirm')}
              className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors mb-3"
            >
              <ArrowLeft className="w-3 h-3" />
              Назад
            </button>
            <p className="text-sm font-semibold text-white mb-2">Нужна ручная отмена</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Твоя подписка оплачена через Telegram Stars или крипту — мы не можем отменить её автоматически. Напиши нам.
            </p>
          </div>
          <div className="px-4 pb-4">
            <button
              onClick={() => window.open('https://t.me/skilyapp_bot', '_blank')}
              className="w-full h-9 rounded-xl bg-sky-600/80 hover:bg-sky-600 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Написать в поддержку
            </button>
          </div>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-700/30 pt-1">
        <button
          onClick={() => window.open('https://t.me/skilyapp_bot', '_blank')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-xs text-slate-600">Поддержка</span>
          </div>
          <ExternalLink className="w-3 h-3 text-slate-700" />
        </button>
      </div>

    </div>
  );
};

export default SubscriptionTab;
