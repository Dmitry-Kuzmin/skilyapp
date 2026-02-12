import React, { useMemo } from 'react';
import { Flame, ShieldCheck, Zap, MoreHorizontal } from 'lucide-react';
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
    // 1. Process Data & Styles
    const { points, percentage, rankStyle, isDanger, fullName, photoUrl, licenseId } = useMemo(() => {
        const points = userProfile?.license_points ?? 8;
        const maxVisualPoints = 12;
        const percentage = Math.min((points / maxVisualPoints) * 100, 100);

        const fullName = [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ') ||
            userProfile?.username ||
            'DRIVER ID';

        const isDanger = points <= 4;
        const currentYear = new Date().getFullYear();
        const licenseId = `${selectedCountry.toUpperCase()}-${currentYear}-${userProfile?.id?.substring(0, 4).toUpperCase() || '####'}`;

        let rankStyle = {
            name: 'NOVEL',
            label: 'L',
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/20',
            border: 'border-emerald-500/50',
            glow: 'shadow-emerald-500/40',
            gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
            accent: '#10b981'
        };

        if (points >= 12) {
            rankStyle = {
                name: 'LEGEND',
                label: 'S',
                color: 'text-amber-400',
                bg: 'bg-amber-500/20',
                border: 'border-amber-500/50',
                glow: 'shadow-amber-500/50',
                gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
                accent: '#fbbf24'
            };
        } else if (points >= 8) {
            rankStyle = {
                name: 'PRO',
                label: 'C',
                color: 'text-yellow-400',
                bg: 'bg-yellow-500/20',
                border: 'border-yellow-500/50',
                glow: 'shadow-yellow-500/40',
                gradient: 'from-yellow-500/20 via-yellow-500/5 to-transparent',
                accent: '#facc15'
            };
        } else if (isDanger) {
            rankStyle = {
                name: 'PELIGRO',
                label: '!',
                color: 'text-red-500',
                bg: 'bg-red-500/20',
                border: 'border-red-500/50',
                glow: 'shadow-red-500/50',
                gradient: 'from-red-500/20 via-red-500/5 to-transparent',
                accent: '#ef4444'
            };
        }

        return {
            points,
            percentage,
            rankStyle,
            isDanger,
            fullName,
            photoUrl: userProfile?.photo_url,
            licenseId
        };
    }, [userProfile, selectedCountry]);


    // --- MOBILE COMPACT V2 ---
    const MobileWidget = (
        <div className="relative w-full h-[90px] bg-[#09090b] rounded-[24px] border border-white/5 overflow-hidden flex items-center p-3 shadow-2xl">
            {/* Minimal Background Decor */}
            <div className={cn("absolute inset-0 bg-gradient-to-r opacity-10 pointer-events-none", rankStyle.gradient)}></div>

            {/* Left: Avatar with badge */}
            <div className="relative flex-shrink-0 mr-4">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/10 shadow-lg relative z-10">
                    {photoUrl ? (
                        <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-xl grayscale">👤</div>
                    )}
                </div>
                <div className={cn(
                    "absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black border-2 border-[#09090b] z-20 shadow-xl",
                    rankStyle.bg, rankStyle.color, "bg-slate-900"
                )}>
                    {rankStyle.label}
                </div>
            </div>

            {/* Center: Name + Info */}
            <div className="flex-1 min-w-0">
                <h4 className="text-white font-black text-lg truncate tracking-tight">{fullName}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest leading-none">
                        {points < 12 ? `До PRO: ${12 - points} баллов` : 'MAX LEVEL reached'}
                    </span>
                    <div className={cn("flex items-center gap-1 opacity-80", hasClaimedToday ? "text-orange-500" : "text-slate-600")}>
                        <Flame size={10} className={hasClaimedToday ? "fill-current" : ""} />
                        <span className="text-[10px] font-mono font-bold">{stats.currentStreak}</span>
                    </div>
                </div>
            </div>

            {/* Right: Large Points */}
            <div className="flex flex-col items-center justify-center px-2 flex-shrink-0">
                <div className={cn("text-4xl font-black italic leading-none drop-shadow-xl", rankStyle.color)}>
                    {points}
                </div>
                <span className="text-[8px] font-black opacity-40 uppercase tracking-[0.2em] mt-1">PUNTOS</span>
            </div>
        </div>
    );

    // --- DESKTOP CYBER-CARD (3 Zones) ---
    const DesktopCard = (
        <div className={cn(
            "relative w-full h-full min-h-[320px] rounded-[40px] overflow-hidden flex transition-all duration-700 select-none",
            "bg-slate-950 border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] group/card"
        )}>
            {/* 1. LAYERED BACKGROUND AESTHETICS */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Topo Lines / Grid Mix */}
                <div className="absolute inset-0 opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] invert mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

                {/* Hologram - Subtle recurring logo or pattern */}
                <div className="absolute top-8 right-8 w-24 h-24 border-2 border-white/5 rounded-full flex items-center justify-center opacity-20 transform rotate-12 transition-transform group-hover/card:rotate-45 duration-1000">
                    <Zap size={40} className="text-white fill-white/10" />
                </div>

                {/* Corner Glows */}
                <div className={cn("absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[100px] opacity-10 transition-colors duration-1000", rankStyle.bg)}></div>
                <div className={cn("absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-[120px] opacity-10 transition-colors duration-1000", rankStyle.bg)}></div>
            </div>

            {/* 2. ZONE 1: PHOTO ID (LEFT) */}
            <section className="relative z-10 w-[240px] border-r border-white/5 p-8 flex flex-col items-center justify-center gap-6 bg-white/[0.02] backdrop-blur-sm">
                <div className="relative group/photo">
                    {/* Frame */}
                    <div className={cn(
                        "w-40 h-52 rounded-[28px] overflow-hidden border-2 shadow-2xl relative z-10 transition-all duration-500",
                        rankStyle.border, "bg-slate-900"
                    )}>
                        {photoUrl ? (
                            <img src={photoUrl} alt="User" className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-500" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-6xl opacity-30">🙂</div>
                        )}
                        {/* Scanline Effect */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/5 pointer-events-none opacity-20"></div>
                    </div>
                    {/* Dynamic shadow glow */}
                    <div className={cn("absolute inset-0 rounded-[28px] blur-2xl opacity-40 transition-all duration-500 group-hover/photo:opacity-60", rankStyle.bg)}></div>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-slate-500 uppercase">Document ID</span>
                    <span className="text-xs font-mono font-black text-slate-300 tracking-wider bg-white/5 px-3 py-1 rounded-md border border-white/5">
                        {licenseId}
                    </span>
                </div>
            </section>

            {/* 3. ZONE 2: INFO (CENTER) */}
            <section className="relative z-10 flex-1 p-10 flex flex-col justify-center gap-8">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Pilot Classification</span>
                        <h3 className="text-4xl font-black text-white tracking-tighter uppercase leading-none break-words max-w-sm drop-shadow-md">
                            {fullName}
                        </h3>
                    </div>

                    {/* Rank Plate */}
                    <div className={cn(
                        "inline-flex items-center gap-3 px-4 py-2 rounded-xl border-2 backdrop-blur-md shadow-lg transition-all",
                        rankStyle.border, rankStyle.bg, rankStyle.glow
                    )}>
                        <div className={cn("w-2 h-2 rounded-full bg-current animate-ping", rankStyle.color)}></div>
                        <span className={cn("text-sm font-black tracking-[0.3em] uppercase", rankStyle.color)}>
                            RANK: {rankStyle.name}
                        </span>
                    </div>
                </div>

                {/* Streak & Additional stats */}
                <div className="flex items-center gap-8">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Training Streak</span>
                        <button
                            onClick={onClaimReward}
                            className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-xl border bg-slate-900/50 backdrop-blur-sm transition-all hover:scale-105 active:scale-95 group/streak",
                                hasClaimedToday ? "border-orange-500/50" : "border-slate-800 hover:border-orange-500/30"
                            )}>
                            <Flame size={18} className={cn("transition-all", hasClaimedToday ? "fill-orange-500 text-orange-500" : "text-slate-500 group-hover/streak:text-orange-400")} />
                            <span className={cn("text-lg font-mono font-black", hasClaimedToday ? "text-orange-500" : "text-slate-300")}>
                                {stats.currentStreak} <span className="text-xs opacity-50 uppercase tracking-normal">days</span>
                            </span>
                        </button>
                    </div>

                    {/* Progress Micro-indicator */}
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Compliance</span>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-800">
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className={cn("w-1.5 h-3 rounded-full transition-all", i <= Math.ceil(points / 3) ? rankStyle.color.replace('text-', 'bg-') : "bg-slate-800")}></div>
                                ))}
                            </div>
                            <ShieldCheck size={14} className="text-slate-500" />
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. ZONE 3: PUNTOS (RIGHT) */}
            <section className="relative z-10 w-[220px] bg-white/[0.01] border-l border-white/5 p-10 flex flex-col items-center justify-center">
                {/* Decorative Points Container */}
                <div className="relative flex flex-col items-center group/points">
                    {/* HUGE NUMBER */}
                    <div className={cn(
                        "text-[140px] font-black italic tracking-tighter leading-none transition-all duration-700 select-none drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]",
                        rankStyle.color
                    )} style={{ textShadow: `0 0 60px ${rankStyle.accent}40` }}>
                        {points}
                    </div>
                    <span className="text-lg font-black tracking-[0.5em] text-slate-400 uppercase mt-[-10px] ml-[0.5em]">PUNTOS</span>

                    {/* Vertical scale "Battery style" */}
                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-40">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className={cn(
                                "w-2 h-6 rounded-full",
                                (5 - i) <= (points / 2.5) ? rankStyle.color.replace('text-', 'bg-') : "bg-slate-800"
                            )}></div>
                        ))}
                    </div>
                </div>

                {/* Official Stamp Decor */}
                <div className="absolute bottom-10 flex items-center gap-2 opacity-30">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] whitespace-nowrap">Official Digital ID</span>
                    <MoreHorizontal size={10} />
                </div>
            </section>
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
