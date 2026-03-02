import React, { useMemo, useCallback, useState } from 'react';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';
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

function FlightNavigation({ currentStatus, language }: { currentStatus: string, language: string }) {
    const levels = [
        { id: 'start', name: language === 'ru' ? 'СТАРТ' : 'INI', range: '0-30%', color: '#94a3b8' },
        { id: 'progress', name: language === 'ru' ? 'КУРС' : 'CRS', range: '31-70%', color: '#f59e0b' },
        { id: 'near', name: language === 'ru' ? 'ПОДЛЕТ' : 'APP', range: '71-85%', color: '#eab308' },
        { id: 'ready', name: language === 'ru' ? 'ГОТОВ' : 'RDY', range: '86-100%', color: '#10b981' }
    ];

    const currentIndex = levels.findIndex(l => l.id === (currentStatus === 'legend' ? 'ready' : currentStatus));

    return (
        <div className="relative pt-2 pb-6">
            <div className="absolute top-[17px] left-4 right-4 h-[1px] bg-white/5" />
            <div className="relative flex justify-between items-center px-4">
                {levels.map((lvl, idx) => {
                    const isActive = currentStatus === lvl.id || (currentStatus === 'legend' && lvl.id === 'ready');
                    const isPast = idx < currentIndex;

                    return (
                        <div key={lvl.id} className="flex flex-col items-center gap-2 group">
                            <div className={cn(
                                "relative w-2.5 h-2.5 rounded-full border-2 transition-all duration-700 z-10",
                                isActive ? "bg-white border-current scale-150 shadow-[0_0_15px_currentColor]" :
                                    isPast ? "bg-current border-current" : "bg-zinc-950 border-slate-800"
                            )} style={{ color: lvl.color }}>
                                {isActive && (
                                    <div className="absolute inset-[-4px] rounded-full border border-current opacity-30 animate-ping" />
                                )}
                            </div>
                            <div className="flex flex-col items-center">
                                <span className={cn(
                                    "text-[8px] font-black tracking-widest uppercase transition-colors duration-500",
                                    isActive ? "text-white" : "text-slate-600"
                                )}>
                                    {lvl.name}
                                </span>
                                <span className="text-[7px] font-bold text-slate-700 tabular-nums">{lvl.range}</span>
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

                <div className="relative">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-white/10 border-b border-white/10">
                        {/* Left Section: Main Instrument (Gauge) */}
                        <div className="lg:col-span-6 p-10 md:p-14 flex flex-col items-center justify-center relative bg-black/5">
                            <div className="relative w-56 h-56 md:w-64 md:h-64 flex-shrink-0 group">
                                <div className="absolute inset-0 rounded-full border border-white/5 bg-zinc-950/40 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]" />
                                <div className="absolute inset-[-30px] rounded-full bg-indigo-500/5 blur-3xl opacity-30 group-hover:opacity-60 transition-opacity duration-1000" />

                                <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_25px_rgba(0,0,0,0.6)]" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                                    <circle
                                        cx="50" cy="50" r="44" fill="none"
                                        stroke={status.fill}
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={276}
                                        strokeDashoffset={276 - (276 * score) / 100}
                                        style={{ transition: 'stroke-dashoffset 2.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                                        className="drop-shadow-[0_0_15px_currentColor]"
                                    />
                                    {[...Array(36)].map((_, i) => (
                                        <line key={i} x1="50" y1="6" x2="50" y2="9" transform={`rotate(${i * 10} 50 50)`} stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
                                    ))}
                                </svg>

                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-6xl md:text-7xl font-black tracking-tighter text-white">
                                        {score}%
                                    </motion.span>
                                    <div className="mt-2 flex items-center gap-2 opacity-40">
                                        <ActivityIcon className="w-3 h-3" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Pass Prob</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Section: Detailed Verdict */}
                        <div className="lg:col-span-6 p-8 md:p-12 flex flex-col justify-center bg-white/[0.01]">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-violet-400" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Системный вердикт</span>
                                    </div>
                                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-[0.9]">
                                        {readiness?.shortText || 'Анализ...'}
                                    </h2>
                                    <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
                                        <p className="text-sm md:text-base text-slate-400 font-medium leading-relaxed italic border-l-2 border-indigo-500/50 pl-4">
                                            "{readiness?.statusText}"
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Уверенность</span>
                                        <span className="text-2xl font-black text-white tabular-nums">
                                            {readiness?.confidenceFactor ? Math.round(readiness.confidenceFactor * 100) : 0}%
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Цель</span>
                                        <span className="text-2xl font-black text-emerald-400 tabular-nums">75%</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Rank</span>
                                        <span className="text-2xl font-black text-amber-500 tabular-nums">#420</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Full-width Navigation Path */}
                    <div className="px-10 py-6 bg-black/40">
                        <FlightNavigation currentStatus={readiness?.status || 'start'} language={language} />
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
