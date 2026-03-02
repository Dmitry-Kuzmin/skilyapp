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

function FlightLevels({ currentStatus, language }: { currentStatus: string, language: string }) {
    const levels = [
        {
            id: 'start',
            name: language === 'ru' ? 'СТАРТ' : 'INICIO',
            range: '0-30%',
            desc: language === 'ru' ? 'Двигатель запускается. Путь только начинается.' : 'El motor arranca. El camino acaba de empezar.',
            color: '#94a3b8'
        },
        {
            id: 'progress',
            name: language === 'ru' ? 'В ПРОЦЕССЕ' : 'EN PROCESO',
            range: '31-70%',
            desc: language === 'ru' ? 'Набираем скорость. Усилия уже заметны.' : 'Ganando velocidad. Los esfuerzos ya son visibles.',
            color: '#f59e0b'
        },
        {
            id: 'near',
            name: language === 'ru' ? 'ПОЧТИ ГОТОВ' : 'CASI LISTO',
            range: '71-85%',
            desc: language === 'ru' ? 'Видим финишную прямую. Нужна концентрация.' : 'Vemos la meta. Se necesita concentración.',
            color: '#eab308'
        },
        {
            id: 'ready',
            name: language === 'ru' ? 'ГОТОВ' : 'LISTO',
            range: '86-100%',
            desc: language === 'ru' ? 'Максимальная готовность. Пора сдавать!' : 'Máxima preparación. ¡Es hora del examen!',
            color: '#10b981'
        }
    ];

    return (
        <div className="space-y-4 md:space-y-6">
            <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 md:mb-6 px-1">
                {language === 'ru' ? 'УРОВНИ ПОЛЕТА' : 'NIVELES DE VUELO'}
            </h3>
            <div className="relative space-y-6 md:space-y-8 pl-8">
                {/* Vertical line */}
                <div className="absolute left-[11.5px] top-2 bottom-2 w-[1px] bg-white/10" />

                {levels.map((lvl) => {
                    const isActive = currentStatus === lvl.id || (currentStatus === 'legend' && lvl.id === 'ready');

                    return (
                        <div key={lvl.id} className={cn("relative transition-all duration-500", !isActive && "opacity-20")}>
                            {/* Circle Indicator */}
                            <div className={cn(
                                "absolute -left-8 top-1 w-6 h-6 rounded-full border bg-zinc-950 flex items-center justify-center transition-all duration-500 z-10",
                                isActive ? "border-current scale-110 shadow-[0_0_15px_-3px_currentColor]" : "border-slate-800"
                            )} style={{ color: isActive ? lvl.color : 'transparent' }}>
                                <div className={cn(
                                    "w-2 h-2 rounded-full transition-all duration-500",
                                    isActive ? "bg-white animate-pulse" : "bg-slate-800"
                                )} />
                                {isActive && (
                                    <div className="absolute inset-[-4px] rounded-full border border-current opacity-30 animate-pulse" />
                                )}
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] md:text-[11px] font-black tracking-widest text-white uppercase">{lvl.name}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] md:text-[10px] font-black text-slate-500">{lvl.range}</span>
                                </div>
                                <p className="text-[9px] md:text-[10px] text-slate-400 font-medium leading-relaxed max-w-[200px]">
                                    {lvl.desc}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
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
            {/* ── Main Dashboard Hero (Single Unified Block) ── */}
            <div className="relative rounded-[2rem] bg-slate-900 border border-white/5 overflow-hidden shadow-2xl">
                {/* Shared Background Background Effects */}
                <div className="absolute inset-0 opacity-[0.15]"
                    style={{ background: `radial-gradient(circle at 70% 50%, ${status.fill}40 0%, transparent 60%)` }}
                />

                <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
                    {/* Left: Flight Levels (40%) */}
                    <div className="lg:col-span-5 p-6 md:p-8">
                        <FlightLevels currentStatus={readiness?.status || 'start'} language={language} />
                    </div>

                    {/* Right: Readiness Gauge & Summary (60%) */}
                    <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-center">
                        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 w-full">
                            <div className="relative w-44 md:w-52 h-44 md:h-52 flex-shrink-0">
                                <div className="absolute inset-0 rounded-full border border-white/5" />
                                <div className="absolute inset-4 rounded-full border border-white/5" />
                                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent via-transparent to-indigo-500/5 animate-spin-slow" />

                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" strokeLinecap="round" />
                                    <circle
                                        cx="50" cy="50" r="45" fill="none"
                                        stroke={status.fill}
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={283}
                                        strokeDashoffset={283 - (283 * score) / 100}
                                        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                        className="drop-shadow-[0_0_15px_currentColor]"
                                    />
                                </svg>

                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl md:text-6xl font-black tracking-tighter text-white">{score}%</span>
                                    <div className="px-2 py-0.5 mt-1 rounded bg-white/5 text-[8px] font-black uppercase tracking-widest text-slate-500">
                                        Pass Prob
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-6">
                                {/* Header Group */}
                                <div className="space-y-1 md:border-l md:border-white/10 md:pl-8">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse",
                                            readiness?.status === 'ready' || readiness?.status === 'legend' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-500'
                                        )} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                            {language === 'ru' ? 'ТЕКУЩИЙ СТАТУС' : 'ESTADO ACTUAL'}
                                        </span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-3">
                                        {readiness?.shortText || 'Анализ...'}
                                    </h2>
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 inline-block">
                                        <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-sm italic">
                                            "{readiness?.statusText}"
                                        </p>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-3 md:pl-8">
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-between group hover:bg-white/[0.08] transition-all">
                                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-3 group-hover:text-slate-400 transition-colors">
                                            {language === 'ru' ? 'УВЕРЕННОСТЬ' : 'CONFIANZA'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                                <Target className="w-4 h-4 text-indigo-400" />
                                            </div>
                                            <span className="text-xl md:text-2xl font-black text-white tabular-nums">
                                                {readiness?.confidenceFactor ? Math.round(readiness.confidenceFactor * 100) : 0}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-between group hover:bg-white/[0.08] transition-all">
                                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-3 group-hover:text-slate-400 transition-colors">
                                            {language === 'ru' ? 'ЦЕЛЬ' : 'META'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                                <Rocket className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <span className="text-xl md:text-2xl font-black text-emerald-400 tabular-nums">75%</span>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-between group hover:bg-white/[0.08] transition-all">
                                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-3 group-hover:text-slate-400 transition-colors">
                                            RANK
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                                <Award className="w-4 h-4 text-amber-400" />
                                            </div>
                                            <span className="text-xl md:text-2xl font-black text-amber-400 tabular-nums">#420</span>
                                        </div>
                                    </div>
                                </div>
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
                <DrawerContent className="max-h-[85vh] flex flex-col bg-zinc-950/95 backdrop-blur-2xl border-t border-white/10 shadow-[0_-15px_50px_-10px_rgba(0,0,0,0.9),0_0_100px_-20px_rgba(139,92,246,0.3)] overflow-hidden">
                    <DrawerHeader className="border-b border-white/5 shrink-0 bg-transparent z-10 py-4 px-6 relative">
                        <DrawerTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                            <Gauge className="w-5 h-5 text-violet-500" />
                            Skily Telemetry
                        </DrawerTitle>
                    </DrawerHeader>
                    <div className="flex-1 overflow-y-auto px-4 pb-6 mt-2 scrollbar-none">
                        <TelemetryContent onClose={() => onOpenChange(false)} />
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-zinc-950/95 backdrop-blur-2xl border border-white/10 p-0 shadow-[0_45px_100px_-20px_rgba(0,0,0,1),0_0_80px_-10px_rgba(139,92,246,0.2),inset_0_0_0_1px_rgba(255,255,255,0.05)] sm:rounded-2xl overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b border-white/5 shrink-0 bg-transparent z-10 flex flex-row items-center justify-between relative">
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                            <Gauge className="w-6 h-6 text-violet-500" />
                        </div>
                        Skily Telemetry Dashboard
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 p-8 pb-12 pt-4 overflow-y-auto scrollbar-none">
                    <TelemetryContent onClose={() => onOpenChange(false)} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
