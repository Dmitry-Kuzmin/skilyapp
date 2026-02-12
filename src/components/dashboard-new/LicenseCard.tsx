import React, { useMemo } from 'react';
import { Flame, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    t: (key: string) => string;
}

export const LicenseCard: React.FC<LicenseCardProps> = ({
    userProfile,
    stats,
    selectedCountry,
    hasClaimedToday,
    onClaimReward,
}) => {
    // 1. Process Data
    const { points, percentage, rankStyle, isDanger, isSuccess, fullName, photoUrl } = useMemo(() => {
        const points = userProfile?.license_points ?? 8;
        // User implied 12 points is "Full/Success", so let's use 12 as visual max for the ring fill
        // If points > 12, it just stays full
        const maxVisualPoints = 12;
        const percentage = Math.min((points / maxVisualPoints) * 100, 100);

        const fullName = [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ') ||
            userProfile?.username ||
            'Driver';

        const isDanger = points <= 4;
        const isSuccess = points >= 12;

        let rankStyle = {
            name: 'NOVATO',
            label: 'L',
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/20',
            border: 'border-emerald-500/50',
            glow: 'shadow-emerald-500/20',
            gradient: 'from-emerald-500 to-teal-500',
            ringColor: '#10b981' // emerald
        };

        if (points >= 12) {
            rankStyle = {
                name: 'LEGEND',
                label: 'S',
                color: 'text-amber-400',
                bg: 'bg-amber-500/20',
                border: 'border-amber-500/50',
                glow: 'shadow-amber-500/30',
                gradient: 'from-amber-300 via-yellow-400 to-amber-500',
                ringColor: '#fbbf24' // amber
            };
        } else if (points >= 8) {
            rankStyle = {
                name: 'CONDUCTOR',
                label: 'C',
                color: 'text-blue-400',
                bg: 'bg-blue-500/20',
                border: 'border-blue-500/50',
                glow: 'shadow-blue-500/30',
                gradient: 'from-blue-500 to-indigo-500',
                ringColor: '#3b82f6' // blue
            };
        }

        if (isDanger) {
            rankStyle = {
                name: 'PELIGRO',
                label: '!',
                color: 'text-red-500',
                bg: 'bg-red-500/20',
                border: 'border-red-500/50',
                glow: 'shadow-red-500/30',
                gradient: 'from-red-500 to-orange-500',
                ringColor: '#ef4444' // red
            };
        }

        return {
            points,
            percentage,
            rankStyle,
            isDanger,
            isSuccess,
            fullName,
            photoUrl: userProfile?.photo_url
        };
    }, [userProfile]);

    // Helpers for rings
    // Mobile Ring
    const paramR = 26;
    const paramC = 2 * Math.PI * paramR;
    const paramOffset = paramC - (percentage / 100) * paramC;

    // Desktop Ring
    const deskR = 38;
    const deskC = 2 * Math.PI * deskR;
    const deskOffset = deskC - (percentage / 100) * deskC;

    // --- MOBILE COMPACT WIDGET ---
    const MobileWidget = (
        <div className="relative w-full h-[84px] bg-[#09090b] rounded-2xl border border-white/10 overflow-hidden flex items-center p-3 shadow-2xl">
            {/* Background Glows */}
            <div className={cn("absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-20 blur-[50px] -translate-y-1/2 translate-x-1/4 pointer-events-none", rankStyle.gradient)}></div>

            {/* Left: Avatar with Rank Badge */}
            <div className="relative flex-shrink-0 mr-4">
                <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-b from-white/20 to-transparent relative z-10">
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-800">
                        {photoUrl ? (
                            <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-xl grayscale">👤</div>
                        )}
                    </div>
                </div>
                {/* Visual Rank Badge "L" */}
                <div className={cn(
                    "absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border-2 border-[#09090b] z-20 shadow-lg",
                    rankStyle.bg, rankStyle.color, "bg-slate-900"
                )}>
                    {rankStyle.label}
                </div>
            </div>

            {/* Center: Info */}
            <div className="flex-1 flex flex-col justify-center gap-0.5">
                <div className={cn("text-2xl font-black italic tracking-tighter leading-none flex items-center gap-2", rankStyle.color)}>
                    {points} <span className="text-[10px] not-italic font-bold opacity-60 tracking-normal text-white">PUNTOS</span>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                    {points < 12 ? (
                        <span>{12 - points} to <span className="text-white font-bold">PRO</span></span>
                    ) : (
                        <span className="text-amber-400 font-bold">MAX LEVEL</span>
                    )}

                    {/* Tiny Streak */}
                    <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-800/50 border border-white/5", hasClaimedToday && "text-orange-400")}>
                        <Flame size={8} className={hasClaimedToday ? "fill-orange-400" : "opacity-50"} />
                        <span className="font-mono">{stats.currentStreak}</span>
                    </div>
                </div>
            </div>

            {/* Right: Progress Ring Visual */}
            <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                    {/* Track */}
                    <circle cx="28" cy="28" r={paramR} fill="none" stroke="#334155" strokeWidth="3" strokeOpacity="0.3" />
                    {/* Indicator */}
                    <circle
                        cx="28" cy="28" r={paramR}
                        fill="none"
                        stroke={rankStyle.ringColor}
                        strokeWidth="3"
                        strokeDasharray={paramC}
                        strokeDashoffset={paramOffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold opacity-30">
                    {Math.round(percentage)}%
                </div>
            </div>
        </div>
    );

    // --- DESKTOP FULL CARD ---
    const DesktopCard = (
        <div className={cn(
            "relative w-full h-full min-h-[300px] rounded-[32px] overflow-hidden p-8 flex flex-col justify-between transition-all duration-500 select-none",
            "bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl group/card",
            isDanger && "border-red-500/30 shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)] animate-pulse-slow",
            isSuccess && "border-amber-400/30 shadow-[0_0_40px_-10px_rgba(251,191,36,0.2)]"
        )}>
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Cyberpunk Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
                {/* Glow Blob */}
                <div className={cn("absolute -top-20 -right-20 w-80 h-80 rounded-full blur-[100px] opacity-20 transition-colors duration-700", rankStyle.bg)}></div>
                <div className={cn("absolute -bottom-20 -left-20 w-60 h-60 rounded-full blur-[80px] opacity-10 transition-colors duration-700", rankStyle.bg)}></div>
            </div>

            {/* Header */}
            <div className="relative z-10 flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "h-8 px-3 rounded-full flex items-center gap-2 border bg-black/20 backdrop-blur-md",
                        rankStyle.border, rankStyle.color
                    )}>
                        <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                        <span className="text-xs font-bold tracking-widest">{rankStyle.name}</span>
                    </div>
                </div>

                {/* Streak Module */}
                <button
                    onClick={onClaimReward}
                    className={cn(
                        "flex flex-col items-end group/streak transition-all cursor-pointer active:scale-95",
                        hasClaimedToday ? "opacity-100" : "opacity-80 hover:opacity-100"
                    )}>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover/streak:text-white transition-colors">Streak</span>
                        <div className={cn("p-1.5 rounded-lg border bg-slate-900/50 backdrop-blur-sm transition-colors", hasClaimedToday ? "border-orange-500/50" : "border-slate-700 group-hover/streak:border-orange-500/30")}>
                            <Flame size={16} className={cn("transition-all", hasClaimedToday ? "fill-orange-500 text-orange-500" : "text-slate-400 group-hover/streak:text-orange-400")} />
                        </div>
                    </div>
                    <span className="text-sm font-mono font-bold mt-1 text-slate-300">
                        {stats.currentStreak} <span className="text-[10px] text-slate-500">DAYS</span>
                    </span>
                </button>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex items-end justify-between mt-8">
                {/* Left: Avatar & Name */}
                <div className="flex items-center gap-6">
                    <div className="relative group/avatar">
                        {/* Avatar */}
                        <div className={cn("w-24 h-24 rounded-[24px] overflow-hidden border-2 shadow-2xl relative z-10 bg-slate-950 transition-transform duration-500 group-hover/avatar:scale-105", rankStyle.border)}>
                            {photoUrl ? (
                                <img src={photoUrl} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-3xl grayscale">🙂</div>
                            )}
                        </div>
                        {/* Decorative Ring behind */}
                        <div className={cn("absolute inset-0 rounded-[24px] blur-md opacity-50 -z-10 bg-gradient-to-br transition-all duration-500 group-hover/avatar:opacity-80 group-hover/avatar:blur-lg", rankStyle.gradient)}></div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <h3 className="text-2xl font-black text-white tracking-tight uppercase max-w-[150px] leading-tight drop-shadow-lg">
                            {fullName}
                        </h3>
                        {/* Status Line */}
                        <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={cn(
                                        "w-1 h-3 rounded-full bg-slate-700/50",
                                        // Logic: 0-4=1 bar, 5-8=2 bars, 9-12=3 bars roughly?
                                        // Or simpler: Novato=1, Conductor=2, Legend=3
                                        (points >= 12 && i <= 3) || (points >= 8 && i <= 2) || (i <= 1)
                                            ? rankStyle.color.replace('text-', 'bg-')
                                            : ""
                                    )}></div>
                                ))}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 tracking-wider opacity-60">
                                {selectedCountry.toUpperCase()} LIK: {userProfile?.id?.substring(0, 4).toUpperCase() || '####'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Big Points Number */}
                <div className="flex flex-col items-end relative group/points">
                    {/* Circular Progress Background */}
                    <div className="relative w-[140px] h-[140px] flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                            <circle cx="70" cy="70" r={45} fill="none" stroke="#1e293b" strokeWidth="6" strokeOpacity="0.5" />
                            <circle
                                cx="70" cy="70" r={45}
                                fill="none"
                                stroke={rankStyle.ringColor}
                                strokeWidth="6"
                                strokeDasharray={2 * Math.PI * 45} // r=45
                                strokeDashoffset={(2 * Math.PI * 45) - (percentage / 100) * (2 * Math.PI * 45)}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>

                        <div className="flex flex-col items-center z-10 mt-[-5px]">
                            <div className={cn("text-6xl font-black italic tracking-tighter drop-shadow-2xl transition-all group-hover/points:scale-110 duration-300", rankStyle.color)} style={{ textShadow: `0 0 30px ${rankStyle.ringColor}40` }}>
                                {points}
                            </div>
                            <span className="text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase opacity-60">PUNTOS</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Decor */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border border-white/5 bg-black/40 backdrop-blur-md flex items-center gap-4 shadow-lg">
                <div className="flex items-center gap-1.5 opacity-60">
                    <ShieldCheck size={12} className={rankStyle.color} />
                    <span className="text-[9px] font-mono tracking-wider text-slate-300">VERIFIED DRIVER</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full h-full">
            <div className="block sm:hidden">
                {MobileWidget}
            </div>
            <div className="hidden sm:block h-full">
                {DesktopCard}
            </div>
        </div>
    );
};
