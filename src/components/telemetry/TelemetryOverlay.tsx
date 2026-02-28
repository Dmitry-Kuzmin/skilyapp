import React, { useMemo, useCallback, useState } from 'react';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from 'recharts';
import {
    Gauge, Zap, Trophy, Target, AlertTriangle,
    Flame, Swords, BookOpen, TrendingUp, X, Loader2, Rocket, Award, Sparkles, Activity as ActivityIcon, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useExamReadiness } from '@/hooks/useExamReadiness';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAnalytics } from '@/hooks/useAnalytics';
import { AnalyticsPanel } from '@/components/dashboard-new/AnalyticsPanel';
import { usePDDContext } from '@/contexts/PDDContext';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { useNavigate } from 'react-router-dom';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

function getStatusColor(status: string) {
    switch (status) {
        case 'legend': return { fill: '#a855f7', label: 'Легенда' };
        case 'ready': return { fill: '#10b981', label: 'Готов' };
        case 'near': return { fill: '#eab308', label: 'Почти готов' };
        case 'progress': return { fill: '#f59e0b', label: 'В процессе' };
        default: return { fill: '#94a3b8', label: 'Старт' };
    }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent = false }: any) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 p-3 md:p-4 backdrop-blur-sm">
            <div className="flex items-start justify-between mb-1.5 md:mb-2">
                <span className="text-[9px] md:text-xs text-slate-500 uppercase tracking-widest font-semibold">{label}</span>
                <Icon className={cn('w-3.5 h-3.5', accent ? 'text-violet-400' : 'text-slate-500')} />
            </div>
            <div className={cn('text-2xl md:text-3xl font-black tracking-tight', accent ? 'text-violet-300' : 'text-white')}>
                {value}
            </div>
            {sub && <div className="mt-0.5 md:mt-1 text-[9px] md:text-xs text-slate-500 truncate">{sub}</div>}
        </div>
    );
}

// ─── Main Content Component ──────────────────────────────────────────────────

export function TelemetryContent({ onClose }: { onClose: () => void }) {
    const navigate = useNavigate();
    const { profileId } = useUserContext();
    const { data: dashData, loading: dashLoading } = useDashboardData();
    const { readiness, loading: readinessLoading } = useExamReadiness(profileId);
    const isMobile = useIsMobile();
    const { selectedCountry } = usePDDContext();
    const { language } = useLanguage();

    const score = readiness?.percent ?? (dashData?.stats?.accuracy || 0);

    // Analytics data (for radar, trend, etc.)
    const { analytics, loading: analyticsLoading } = useAnalytics(
        profileId || null,
        score,
        85, // Target level
        selectedCountry === 'spain' ? 'es' : selectedCountry === 'russia' ? 'ru' : 'sk'
    );

    // Duel statistics
    const { data: duelStats } = useQuery({
        queryKey: ['user-duel-stats', profileId],
        queryFn: async () => {
            if (!profileId) return null;
            const { data: pDuels } = await supabase.from('duel_players').select('duel_id').eq('user_id', profileId);
            if (!pDuels || pDuels.length === 0) return { total: 0, wins: 0, winrate: 0 };
            const ids = (pDuels as any[]).map(p => p.duel_id);
            const { data } = await supabase.from('duels').select('id, winner_id').in('id', ids).eq('status', 'finished');
            const total = data?.length ?? 0;
            const wins = data?.filter((d: any) => d.winner_id === profileId).length ?? 0;
            return { total, wins, winrate: total > 0 ? Math.round((wins / total) * 100) : 0 };
        },
        enabled: !!profileId,
    });

    // Mistakes count
    const { data: mistakesCount } = useQuery({
        queryKey: ['mistakes-count', profileId],
        queryFn: async () => {
            if (!profileId) return 0;
            const { count } = await supabase.from('user_challenge_questions').select('*', { count: 'exact', head: true }).eq('user_id', profileId).eq('mastered', false);
            return count ?? 0;
        },
        enabled: !!profileId,
    });

    // Real dynamic radar data
    const radarData = useMemo(() => {
        if (!analytics?.topicStats || analytics.topicStats.length === 0) {
            return [
                { subject: 'Знаки', accuracy: 0 },
                { subject: 'Разметка', accuracy: 0 },
                { subject: 'Приоритет', accuracy: 0 },
                { subject: 'Обгон', accuracy: 0 },
                { subject: 'Медицина', accuracy: 0 },
                { subject: 'Техника', accuracy: 0 },
            ];
        }
        return analytics.topicStats.slice(0, 6).map(t => ({
            subject: t.topic_title ? t.topic_title.split(' ')[0] : 'Tema',
            accuracy: t.accuracy || 0
        }));
    }, [analytics]);

    if (dashLoading || readinessLoading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Telemetry Syncing...</p>
            </div>
        );
    }

    const status = getStatusColor(readiness?.status || 'start');

    return (
        <div className="flex flex-col space-y-8 pb-10 px-1 md:px-0">
            {/* ── Header Indicator ── */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500">
                        {language === 'ru' ? 'ТЕЛЕМЕТРИЯ АКТИВНА' : 'TELEMETRÍA ACTIVA'}
                    </span>
                </div>
                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-500 font-mono">
                    ID: {profileId?.slice(0, 8).toUpperCase() || 'OFFLINE'}
                </div>
            </div>

            {/* ── Readiness Hero ── */}
            <div className="relative rounded-[2.5rem] bg-slate-900 border border-white/5 overflow-hidden p-8 md:p-12 shadow-2xl">
                <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 120%, ${status.fill}40 0%, transparent 70%)` }} />

                <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
                    <div className="relative w-56 h-56 flex-shrink-0">
                        <div className="absolute inset-0 rounded-full border border-white/5" />
                        <div className="absolute inset-4 rounded-full border border-white/5" />
                        <div className="absolute inset-8 rounded-full border border-white/5" />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent via-transparent to-indigo-500/10 animate-spin-slow" />

                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
                            <circle
                                cx="50" cy="50" r="45" fill="none"
                                stroke={status.fill}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={283}
                                strokeDashoffset={283 - (283 * score) / 100}
                                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                                className="drop-shadow-[0_0_12px_currentColor]"
                            />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-6xl font-black tracking-tighter text-white drop-shadow-lg">{score}%</span>
                            <div className="px-3 py-1 mt-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Pass Prob
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                                <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded",
                                    readiness?.status === 'legend' ? 'bg-purple-500/20 text-purple-400' :
                                        readiness?.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' :
                                            readiness?.status === 'near' ? 'bg-yellow-500/20 text-yellow-400' :
                                                readiness?.status === 'progress' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-500/20 text-slate-400'
                                )}>
                                    Level: {readiness?.status?.toUpperCase() || 'START'}
                                </span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight uppercase tracking-tighter">
                                {readiness?.shortText || 'Анализ...'}
                            </h2>
                            <p className="text-base text-slate-400 font-medium max-w-md">
                                {readiness?.statusText}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto md:mx-0">
                            <div className="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
                                <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-0.5">
                                    {language === 'ru' ? 'Уверенность' : 'Confianza'}
                                </div>
                                <div className="text-sm font-bold text-white">{readiness?.confidenceFactor ? Math.round(readiness.confidenceFactor * 100) : 0}%</div>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
                                <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-0.5">
                                    {language === 'ru' ? 'Цель дня' : 'Meta diaria'}
                                </div>
                                <div className="text-sm font-bold text-emerald-400">75%</div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start pt-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Rank: #420</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                                <ActivityIcon className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {language === 'ru' ? 'Стабильность' : 'Estabilidad'}: {dashData?.profile?.streak_days || 0}d
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── KPI Grid ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard icon={BookOpen} label={language === 'ru' ? "Учебный пробег" : "Kilometraje"} value={dashData?.stats?.total_questions || 0} sub={language === 'ru' ? "всего ответов" : "total respuestas"} />
                <KpiCard icon={Target} label={language === 'ru' ? "Точность" : "Precisión"} value={`${dashData?.stats?.accuracy || 0}%`} sub={language === 'ru' ? `${dashData?.stats?.correct_answers || 0} правильных` : `${dashData?.stats?.correct_answers || 0} correctas`} accent />
                <KpiCard icon={Swords} label={language === 'ru' ? "Winrate дуэлей" : "Winrate duelos"} value={`${duelStats?.winrate || 0}%`} sub={language === 'ru' ? `${duelStats?.wins || 0} побед` : `${duelStats?.wins || 0} victorias`} />
                <KpiCard icon={Flame} label={language === 'ru' ? "Daily Streak" : "Daily Streak"} value={dashData?.profile?.streak_days || 0} sub={language === 'ru' ? "дней подряд" : "días seguidos"} />
            </div>

            {/* ── Advanced Analytics ── */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        {language === 'ru' ? 'Расширенная аналитика' : 'Telemetría extendida'}
                    </span>
                </div>

                <AnalyticsPanel
                    trend={analytics?.trend || null}
                    consistency={analytics?.consistency || null}
                    timeToPass={analytics?.timeToPass || null}
                    criticalPoint={analytics?.criticalPoint || null}
                    focusBattery={analytics?.focusBattery || null}
                    activityHeatmap={analytics?.activityHeatmap || null}
                    currentScore={score}
                    loading={analyticsLoading}
                    showHeader={false}
                />
            </div>

            {/* ── Diagnostic Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white/5 border border-white/5 p-5 md:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            {language === 'ru' ? 'Радар знаний' : 'Radar de temas'}
                        </span>
                    </div>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} />
                                <Radar name="Score" dataKey="accuracy" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} dot={{ r: 2, fill: '#8b5cf6' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                    {(mistakesCount ?? 0) > 0 ? (
                        <div className="h-full rounded-2xl border border-red-500/20 bg-red-500/5 p-6 flex flex-col justify-center transition-all hover:bg-red-500/10 cursor-pointer" onClick={() => { onClose(); navigate('/tests/challenge-bank'); }}>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Diagnostic Result</span>
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-500/20 text-red-500 border border-red-500/20">
                                            {mistakesCount} ERRORS FOUND
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white uppercase tracking-tight">Критические зоны риска</h3>
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed mb-4">
                                Мы обнаружили {mistakesCount} критических пробелов в твоих знаниях. Рекомендуем проработать их в Банке Сложных Вопросов перед сдачей.
                            </p>
                            <Button variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                                Исправить ошибки сейчас
                            </Button>
                        </div>
                    ) : (
                        <div className="h-full rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 flex flex-col items-center justify-center text-center">
                            <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
                            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Все системы в норме</h3>
                            <p className="text-sm text-slate-500">Ошибок в критических темах не обнаружено. Ты отлично справляешься!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function TelemetryOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="max-h-[85vh] px-4 overflow-y-auto bg-zinc-950 border-white/5">
                    <DrawerHeader className="border-b border-white/5 mb-4 sticky top-0 bg-zinc-950/98 z-10 py-4 -mx-4 px-8">
                        <DrawerTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                            <Gauge className="w-5 h-5 text-violet-500" />
                            Skily Telemetry
                        </DrawerTitle>
                    </DrawerHeader>
                    <div className="px-1">
                        <TelemetryContent onClose={() => onOpenChange(false)} />
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-white/10 p-0 scrollbar-none">
                <DialogHeader className="p-6 pb-2 border-b border-white/5 sticky top-0 bg-zinc-950/98 z-10 flex flex-row items-center justify-between">
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                            <Gauge className="w-6 h-6 text-violet-500" />
                        </div>
                        Skily Telemetry Dashboard
                    </DialogTitle>
                </DialogHeader>
                <div className="p-8 pb-12 pt-4">
                    <TelemetryContent onClose={() => onOpenChange(false)} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
