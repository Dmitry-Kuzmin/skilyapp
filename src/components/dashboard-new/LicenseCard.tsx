import React, { useMemo } from 'react';
import {
    User,
    Flame,
    Activity,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Users,
    Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';

interface LicenseCardProps {
    userProfile?: {
        first_name?: string | null;
        last_name?: string | null;
        username?: string | null;
        photo_url?: string | null;
        rank?: string | null;
        id?: string;
        license_points?: number;
    };
    stats: {
        xp?: number;
        level?: number;
        currentStreak: number;
        accuracy?: number;
    };
    isDarkTheme: boolean;
    selectedCountry: 'es' | 'ru' | 'sk';
    language: 'ru' | 'es' | 'en';
    hasClaimedToday: boolean;
    onClaimReward: () => void;
    onStartQuiz: () => void;
    onRecoverPoints?: () => void;
    t: (key: string) => string;
    licenseHistory?: Array<{
        points: number;
        recorded_at: string;
    }>;
}

/**
 * 💳 Digital Driver ID: v4 "Data-Dense Minimal"
 * Features: Sparkline points history, ultra-clean fintech layout, zero noise.
 */
export const LicenseCard: React.FC<LicenseCardProps> = ({
    userProfile,
    stats,
    isDarkTheme,
    selectedCountry,
    hasClaimedToday,
    onRecoverPoints,
    t,
    licenseHistory
}) => {
    // 1. Data Processing
    const {
        points,
        rankStyle,
        fullName,
        photoUrl,
        progressWidth,
        isSuspended,
        rankLabel,
        isExpert,
        globalId
    } = useMemo(() => {
        // Log to verify memo is running
        if (import.meta.env.DEV) {
            console.log('[LicenseCard] 💎 recalculating memo', { profileId: userProfile?.id });
        }
        const points = userProfile?.license_points ?? 8;
        const maxPoints = 15;
        const progressWidth = Math.min((points / maxPoints) * 100, 100);

        const fullName = ([userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ') ||
            userProfile?.username ||
            t('common.student') ||
            'USER').toUpperCase();

        const isSuspended = points === 0;
        const isExpert = points >= 12;
        const rankLabel = isSuspended ? t('licenseCard.ranks.suspended') : isExpert ? t('licenseCard.ranks.expert') : t('licenseCard.ranks.novel');

        // Глобальный ID на основе profile_id или telegram_id
        const globalIdMatch = userProfile?.id?.split('-')[0] ?? '---';
        const globalId = globalIdMatch === '---' ? '---' : `ID-${globalIdMatch.toUpperCase()}`;

        // Custom status styles
        let rankStyle = {
            accent: '#10B981', // Emerald
            glow: 'shadow-[0_20px_40px_-20px_rgba(16,185,129,0.3)]',
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-500',
            pointsColor: 'text-emerald-400'
        };

        if (isSuspended) {
            rankStyle = {
                accent: '#EF4444',
                glow: 'shadow-[0_20px_50px_-10px_rgba(239,68,68,0.4)]',
                bg: 'bg-red-500/10',
                text: 'text-red-500',
                pointsColor: 'text-red-500'
            };
        } else if (isExpert) {
            rankStyle = {
                accent: '#EAB308', // Gold
                glow: 'shadow-[0_20px_40px_-20px_rgba(234,179,8,0.25)]',
                bg: 'bg-yellow-500/10',
                text: 'text-yellow-500',
                pointsColor: 'text-emerald-400'
            };
        } else {
            rankStyle = {
                ...rankStyle,
                pointsColor: 'text-yellow-400'
            };
        }

        return {
            points,
            rankStyle,
            fullName,
            photoUrl: userProfile?.photo_url,
            progressWidth,
            isSuspended,
            rankLabel,
            globalId,
            isExpert
        };
    }, [userProfile, selectedCountry, t]);

    const displayPoints = points < 10 ? `0${points} ` : points;

    // --- SPARKLINE (SVG) ---

    // --- REAL SPARKLINE DATA ---
    const sparklinePoints = useMemo(() => {
        if (licenseHistory && licenseHistory.length > 0) {
            // Take the last 10 points and sort by date ascending
            const history = [...licenseHistory]
                .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
                .slice(-10)
                .map(h => h.points);

            // If we have less than 10 points, pad with the first available point
            if (history.length < 10) {
                const firstPoint = history[0];
                const padding = Array(10 - history.length).fill(firstPoint);
                return [...padding, ...history];
            }
            return history;
        }

        // Fallback: For new users without history, show a steady flat line at current points
        // level instead of artificial fluctuations.
        const base = points || 8;
        return Array(10).fill(base);
    }, [licenseHistory, points]);

    const svgPath = useMemo(() => {
        const width = 600;
        const height = 120;
        const step = width / (sparklinePoints.length - 1);
        const max = 15;

        const coords = sparklinePoints.map((p, i) => ({
            x: i * step,
            y: height - (p / max) * height * 0.7 - 20
        }));

        // Grid lines Y-positions
        const gridLines = [max, max * 0.5, 0].map(val => height - (val / max) * height * 0.7 - 20);

        const d = coords.map((p, i) => (i === 0 ? `M ${p.x} ${p.y} ` : `L ${p.x} ${p.y} `)).join(' ');
        const area = `${d} L ${width} ${height} L 0 ${height} Z`;

        return { line: d, area, coords, gridLines };
    }, [sparklinePoints]);

    const RecoveryOverlay = isSuspended && (
        <div className="absolute inset-0 z-[60] bg-[#0F1014]/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
            <AlertTriangle size={40} className="text-red-500 mb-4" />
            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6">{t('licenseCard.suspended.title')}</h3>
            <button
                onClick={onRecoverPoints}
                className="bg-white text-black px-8 py-3 rounded-2xl font-black text-xs tracking-widest uppercase transition-all active:scale-95 shadow-xl shadow-red-900/40"
            >
                {t('licenseCard.suspended.recoverButton')}
            </button>
        </div>
    );

    const IdentityDisplay = (
        <div className="flex items-center gap-5">
            <div className={cn(
                "w-14 h-14 rounded-2xl overflow-hidden border shrink-0",
                isDarkTheme ? "border-white/10 bg-zinc-900" : "border-zinc-200 bg-zinc-50"
            )}>
                {photoUrl ? (
                    <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover grayscale-[0.1]" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
                        <User size={24} />
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <h3 className={cn(
                        "text-lg font-black tracking-widest uppercase truncate",
                        isDarkTheme ? "text-white" : "text-zinc-900"
                    )}>{fullName}</h3>
                    <div className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase shadow-sm",
                        rankStyle.bg, rankStyle.text
                    )}>
                        {rankLabel}
                    </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                    <div className="flex items-center gap-1.5">
                        <Flame size={12} className={cn(hasClaimedToday ? "text-orange-500" : "opacity-30")} />
                        <span>{stats.currentStreak}{t('licenseCard.stats.streak')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Activity size={12} className="text-blue-500" />
                        <span>{stats.accuracy || 18}{t('licenseCard.stats.readiness')}</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const PointsDisplay = (
        <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-1.5">
                <span className={cn(
                    "text-6xl font-extralight font-mono tracking-tighter leading-none transition-colors duration-1000",
                    rankStyle.pointsColor
                )}>
                    {displayPoints}
                </span>
                <span className={cn(
                    "text-xl font-extralight font-mono leading-none",
                    isDarkTheme ? "text-zinc-700" : "text-zinc-300"
                )}>/ 15</span>
            </div>
            <div className={cn(
                "w-24 h-[1px] mt-2 rounded-full overflow-hidden",
                isDarkTheme ? "bg-zinc-800" : "bg-zinc-100"
            )}>
                <div className={cn(
                    "h-full transition-all duration-1000",
                    isDarkTheme ? "bg-white/40" : "bg-indigo-600/40"
                )} style={{ width: `${progressWidth}% ` }} />
            </div>

            {/* SMART STATUS: DYNAMIC TREND indicator */}
            <div className="flex items-center gap-1.5 mt-2 transition-all duration-1000">
                {stats.currentStreak > 0 ? (
                    <>
                        <TrendingUp size={10} className="text-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">
                            {t('licenseCard.trend.active')}
                        </span>
                    </>
                ) : (
                    <>
                        <TrendingDown size={10} className="text-orange-500" />
                        <span className="text-[9px] font-black text-orange-400/80 uppercase tracking-widest">
                            {t('licenseCard.trend.decaying')}
                        </span>
                    </>
                )}
            </div>

            {/* Hint for point progression - Helping Dima */}
            {!isSuspended && points >= 8 && points < 10 && (
                <div className="mt-4 flex items-start gap-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 max-w-[180px] animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Sparkles size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                    <span className="text-[9px] leading-tight font-medium text-indigo-300/90 text-right">
                        {t('licenseCard.gating.unlockGoal')}
                    </span>
                </div>
            )}
        </div>
    );

    // --- MOBILE VERSION ---
    const MobileWidget = (
        <div className={cn(
            "relative w-full rounded-[32px] border flex flex-col overflow-hidden transition-all duration-700",
            isDarkTheme
                ? "bg-[#0F1014] border-white/5"
                : "bg-white border-zinc-200/80 shadow-[0_20px_45px_rgba(0,0,0,0.06)]",
            rankStyle.glow,
            isSuspended && "border-red-500/30"
        )}>
            {RecoveryOverlay}

            {/* SPARKLINE BACKGROUND: FILLED AREA VERSION */}
            <div className="absolute inset-0 z-0 opacity-[0.25] pointer-events-none mt-4 overflow-hidden">
                <svg width="100%" height="100%" viewBox="0 0 600 120" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chartGradientDense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={rankStyle.accent} stopOpacity="0.6" />
                            <stop offset="70%" stopColor={rankStyle.accent} stopOpacity="0.1" />
                            <stop offset="100%" stopColor={rankStyle.accent} stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Area Fill - Full visible background */}
                    <path d={svgPath.area} fill="url(#chartGradientDense)" />

                    {/* Main sharp line on top of fill */}
                    <path
                        d={svgPath.line}
                        fill="none"
                        stroke={rankStyle.accent}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.8"
                    />

                    {/* Today Point Pulse */}
                    <circle
                        cx={svgPath.coords[svgPath.coords.length - 1].x}
                        cy={svgPath.coords[svgPath.coords.length - 1].y}
                        r="3"
                        fill={rankStyle.accent}
                        className="animate-pulse"
                    />
                </svg>
            </div>

            <div className="relative z-10 p-6 flex flex-col gap-6">
                <div className="flex justify-between items-start">
                    {IdentityDisplay}
                    <div className="flex flex-col items-end">
                        <div className="flex items-baseline gap-1">
                            <span className={cn(
                                "text-4xl font-extralight font-mono leading-none tracking-tighter",
                                rankStyle.pointsColor
                            )}>
                                {displayPoints}
                            </span>
                            <span className={cn(
                                "text-lg font-extralight font-mono",
                                isDarkTheme ? "text-zinc-700" : "text-zinc-300"
                            )}>/15</span>
                        </div>

                        {/* Mobile TREND indicator */}
                        <div className="flex items-center gap-1 mt-1">
                            {stats.currentStreak > 0 ? (
                                <>
                                    <TrendingUp size={10} className="text-emerald-500" />
                                    <span className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest">
                                        {t('licenseCard.trend.activeShort')}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <TrendingDown size={10} className="text-orange-500" />
                                    <span className="text-[8px] font-black text-orange-500/70 uppercase tracking-widest">
                                        {t('licenseCard.trend.decayingShort')}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className={cn(
                    "w-full h-[1px] rounded-full overflow-hidden",
                    isDarkTheme ? "bg-zinc-800" : "bg-zinc-100"
                )}>
                    <div className={cn(
                        "h-full transition-all duration-1000",
                        isDarkTheme ? "bg-white/40" : "bg-indigo-600/40"
                    )} style={{ width: `${progressWidth}% ` }} />
                </div>

                {/* Mobile Hint for point progression */}
                {!isSuspended && points >= 8 && points < 10 && (
                    <div className="mt-0 flex items-center gap-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 animate-in fade-in slide-in-from-bottom-1 duration-500">
                        <Sparkles size={14} className="text-indigo-400 shrink-0" />
                        <span className="text-[10px] leading-tight font-medium text-indigo-300/90">
                            {t('licenseCard.gating.unlockGoal')}
                        </span>
                    </div>
                )}
            </div>

            {/* MOBILE FOOTER */}
            <div className={cn(
                "relative z-10 h-10 border-t px-6 flex items-center justify-between",
                isDarkTheme ? "border-white/[0.03] bg-white/[0.01]" : "border-zinc-100 bg-zinc-50/30"
            )}>
                <div className="flex items-center gap-4">
                    <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest">{t('licenseCard.footer.sync')}</span>
                    <span className="text-[10px] font-mono font-bold text-zinc-400">{t('licenseCard.footer.completed')}</span>
                </div>
                <div className="flex items-center gap-1.5 opacity-40">
                    <Users size={10} className="text-zinc-600" />
                    <span className="text-[8px] font-mono font-bold text-zinc-400">{t('licenseCard.footer.globalId')}: {globalId}</span>
                </div>
            </div>
        </div>
    );

    // --- DESKTOP VERSION ---
    const DesktopCard = (
        <div className={cn(
            "relative w-full h-full min-h-[240px] rounded-[40px] border flex flex-col justify-between overflow-hidden transition-all duration-700",
            isDarkTheme
                ? "bg-[#0F1014] border-white/5"
                : "bg-white border-zinc-200/80 shadow-[0_20px_45px_rgba(0,0,0,0.06)]",
            rankStyle.glow,
            isSuspended && "border-red-500/30"
        )}>
            {RecoveryOverlay}

            {/* SPARKLINE BACKGROUND: HIGH-TECH VERSION */}
            <div className="absolute inset-0 z-0 opacity-[0.3] pointer-events-none mt-8 overflow-hidden">
                <svg width="100%" height="100%" viewBox="0 0 600 120" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chartGradientDenseDesk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={rankStyle.accent} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={rankStyle.accent} stopOpacity="0" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Horizontal Grid Lines */}
                    {svgPath.gridLines.map((y, i) => (
                        <line
                            key={i}
                            x1="0" y1={y} x2="600" y2={y}
                            stroke="white"
                            strokeWidth="1"
                            strokeDasharray="4 12"
                            opacity="0.2"
                        />
                    ))}

                    {/* Area Fill */}
                    <path d={svgPath.area} fill="url(#chartGradientDenseDesk)" />

                    {/* Main stroke */}
                    <path
                        d={svgPath.line}
                        fill="none"
                        stroke={rankStyle.accent}
                        strokeWidth="1"
                        opacity="0.6"
                    />

                    {/* All Data Points */}
                    {svgPath.coords.map((p, i) => (
                        <circle
                            key={i}
                            cx={p.x} cy={p.y} r="2"
                            fill={rankStyle.accent}
                            opacity={i === svgPath.coords.length - 1 ? 1 : 0.4}
                        />
                    ))}

                    {/* Pulse Effect for current day */}
                    <circle
                        cx={svgPath.coords[svgPath.coords.length - 1].x}
                        cy={svgPath.coords[svgPath.coords.length - 1].y}
                        r="5"
                        fill={rankStyle.accent}
                        className="animate-pulse opacity-30"
                    />
                </svg>
            </div>

            <div className="relative z-10 px-8 pt-8 flex items-start justify-between gap-4">
                {IdentityDisplay}
                {PointsDisplay}
            </div>

            <div className={cn(
                "relative z-10 h-16 border-t px-8 flex items-center justify-between",
                isDarkTheme ? "border-white/[0.03] bg-white/[0.01]" : "border-zinc-100 bg-zinc-50/30"
            )}>
                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">{t('licenseCard.footer.classification')}</span>
                        <span className="text-[10px] font-mono font-bold text-zinc-400">{t('licenseCard.footer.classType')}</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-800" />
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">{t('licenseCard.footer.sync')}</span>
                        <span className="text-[10px] font-mono font-bold text-zinc-300">{t('licenseCard.footer.completed')}</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl border",
                        isDarkTheme ? "border-white/5 bg-zinc-900/50" : "border-zinc-200 bg-white shadow-sm"
                    )}>
                        <Users size={12} className="text-zinc-600" />
                        <span className={cn(
                            "text-[10px] font-mono font-bold italic",
                            isDarkTheme ? "text-zinc-400" : "text-zinc-500"
                        )}>{t('licenseCard.footer.globalId')}: {globalId}</span>
                    </div>
                    {isExpert && <Trophy size={16} className="text-yellow-500/40" />}
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full h-full">
            <div className="sm:hidden">{MobileWidget}</div>
            <div className="hidden sm:block h-full">{DesktopCard}</div>
        </div>
    );
};
