import React, { useMemo } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
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
    selectedCountry: 'es' | 'ru' | 'sk'; // Add other countries if needed
    language: 'ru' | 'es' | 'en'; // Add others if needed
    hasClaimedToday: boolean;
    onClaimReward: () => void;
    onStartQuiz: () => void;
    t: (key: string) => string;
}

export const LicenseCard: React.FC<LicenseCardProps> = ({
    userProfile,
    stats,
    isDarkTheme,
    selectedCountry,
    language,
    hasClaimedToday,
    onClaimReward,
    onStartQuiz,
    t
}) => {
    // Format user data
    const userData = useMemo(() => {
        const fullName = [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ') ||
            userProfile?.username ||
            (language === 'ru' ? 'КУРСАНТ' : 'PILOT');

        // Generate a cool License ID if none exists
        const licenseId = userProfile?.id?.substring(0, 8).toUpperCase() || '560C5DF8';

        const rank = userProfile?.rank || (language === 'ru' ? 'УЧЕНИК' : 'CADET');

        // Points logic
        const points = userProfile?.license_points ?? 8;
        const maxPoints = 15;

        return {
            fullName,
            lastName: userProfile?.last_name?.toUpperCase() || '',
            firstName: userProfile?.first_name?.toUpperCase() || '',
            licenseId,
            rank: rank.toUpperCase(),
            photoUrl: userProfile?.photo_url,
            points,
            maxPoints
        };
    }, [userProfile, language]);

    // Points Color Logic
    const getPointsColor = (points: number) => {
        if (points >= 12) return "text-emerald-500";
        if (points >= 8) return "text-yellow-500";
        if (points >= 4) return "text-orange-500";
        return "text-red-500";
    };

    const getPointsBarColor = (points: number) => {
        if (points >= 12) return "bg-emerald-500";
        if (points >= 8) return "bg-yellow-500";
        if (points >= 4) return "bg-orange-500";
        return "bg-red-500";
    };

    return (
        <div
            className={cn(
                "relative h-full min-h-[340px] rounded-[2rem] overflow-hidden transition-all hover:scale-[1.005] group select-none shadow-xl",
                isDarkTheme ? "shadow-black/40" : "shadow-slate-200/60"
            )}
            style={{
                background: isDarkTheme
                    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                    : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            }}
        >
            {/* 1. Security Pattern Layer (Guilloche-like) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `repeating-linear-gradient(45deg, ${isDarkTheme ? '#fff' : '#000'} 0, ${isDarkTheme ? '#fff' : '#000'} 1px, transparent 0, transparent 50%)`,
                    backgroundSize: '10px 10px'
                }}>
            </div>

            {/* 2. Holographic Noise */}
            <div className="absolute inset-0 opacity-[0.05] bg-[url('/noise.svg')] bg-repeat mix-blend-overlay pointer-events-none"></div>

            {/* 3. Glow Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none -translate-x-1/3 translate-y-1/3"></div>

            {/* CONTENT LAYER */}
            <div className="relative z-10 w-full h-full p-6 sm:p-8 flex flex-col">

                {/* HEADER: Flag & Title */}
                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                        {/* Country Flag Badge */}
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 shadow-lg shadow-blue-900/20 border border-blue-400/20 flex flex-col items-center justify-center text-white ring-2 ring-blue-900/10">
                            <span className="text-[10px] opacity-70 mb-[-2px]">★</span>
                            <span className="text-sm font-black tracking-widest">{selectedCountry === 'es' ? 'E' : selectedCountry === 'ru' ? 'RUS' : 'SK'}</span>
                        </div>

                        {/* License Titles */}
                        <div className="flex flex-col">
                            <h2 className={cn("text-xs sm:text-sm font-black tracking-[0.25em] uppercase mb-0.5", isDarkTheme ? "text-indigo-300" : "text-indigo-900")}>
                                {t('dashboard.licenseType') || (language === 'ru' ? 'ВОДИТЕЛЬСКОЕ УДОСТОВЕРЕНИЕ' : 'PERMISO DE CONDUCCIÓN')}
                            </h2>
                            <span className={cn("text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase opacity-60", isDarkTheme ? "text-slate-400" : "text-slate-500")}>
                                {selectedCountry === 'es' ? 'REINO DE ESPAÑA' : 'SKILY ACADEMY • OFFICIAL DOCUMENT'}
                            </span>
                        </div>
                    </div>

                    {/* Points Indicator (Top Right - replacing Chip or next to it) */}
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 mb-1">
                            <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkTheme ? "text-slate-400" : "text-slate-500")}>
                                {language === 'ru' ? 'БАЛЛЫ' : 'PUNTOS'}
                            </span>
                            <span className={cn("text-xl font-black tabular-nums", getPointsColor(userData.points))}>
                                {userData.points}
                            </span>
                            <span className={cn("text-xs font-bold opacity-40", isDarkTheme ? "text-slate-500" : "text-slate-400")}>
                                /{userData.maxPoints}
                            </span>
                        </div>
                        {/* Visual Points Bar */}
                        <div className="flex gap-0.5">
                            {[...Array(15)].map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "w-1.5 h-3 rounded-sm transition-all duration-500",
                                        i < userData.points
                                            ? getPointsBarColor(userData.points)
                                            : (isDarkTheme ? "bg-slate-800" : "bg-slate-300")
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* BODY: Photo & Data */}
                <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 h-full">

                    {/* PHOTO SECTION */}
                    <div className="flex-shrink-0 relative group/photo self-start sm:self-auto">
                        <div className={cn(
                            "w-28 h-36 sm:w-32 sm:h-40 rounded-xl overflow-hidden shadow-lg border-[3px] relative z-10 transition-transform group-hover/photo:scale-[1.02]",
                            isDarkTheme ? "bg-slate-800 border-slate-600" : "bg-slate-200 border-white"
                        )}>
                            {userData.photoUrl ? (
                                <img src={userData.photoUrl} alt="Pilot" className="w-full h-full object-cover grayscale-[0.2] group-hover/photo:grayscale-0 transition-all duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                    <span className="text-4xl filter grayscale">🙂</span>
                                </div>
                            )}

                            {/* Holographic Overlay on Photo */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 via-transparent to-blue-500/20 opacity-40 mix-blend-overlay"></div>
                            <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover/photo:animate-shimmer rotate-45 transform pointer-events-none"></div>

                            {/* Official Stamps */}
                            {hasClaimedToday && (
                                <div className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                                    <CheckCircle className="w-3 h-3 text-white" strokeWidth={3} />
                                </div>
                            )}
                        </div>

                        {/* Under Photo Label */}
                        <div className="mt-2 flex justify-center">
                            <span className={cn(
                                "text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border",
                                hasClaimedToday
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                                    : "bg-slate-500/10 border-slate-500/30 text-slate-500"
                            )}>
                                {hasClaimedToday ? 'VERIFIED' : 'UNVERIFIED'}
                            </span>
                        </div>
                    </div>

                    {/* DATA FIELDS & CONSOLE */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">

                        {/* User Data Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-4">

                            {/* 1. Name */}
                            <div className="col-span-full">
                                <div className={cn("text-[9px] font-bold uppercase tracking-widest mb-1 opacity-50", isDarkTheme ? "text-slate-400" : "text-slate-500")}>1. SURNAME / FIRST NAME</div>
                                <div className={cn("text-xl sm:text-2xl font-black uppercase tracking-tight truncate font-sans", isDarkTheme ? "text-white" : "text-slate-900")}>
                                    {userData.fullName}
                                </div>
                            </div>

                            {/* 2. Rank */}
                            <div>
                                <div className={cn("text-[9px] font-bold uppercase tracking-widest mb-1 opacity-50", isDarkTheme ? "text-slate-400" : "text-slate-500")}>2. RANGO</div>
                                <div className={cn("text-sm font-bold uppercase tracking-wider", isDarkTheme ? "text-indigo-400" : "text-indigo-700")}>
                                    {userData.rank}
                                </div>
                            </div>

                            {/* 3. License No */}
                            <div>
                                <div className={cn("text-[9px] font-bold uppercase tracking-widest mb-1 opacity-50", isDarkTheme ? "text-slate-400" : "text-slate-500")}>3. LICENSE NO.</div>
                                <div className={cn("text-sm font-mono font-bold tracking-wider", isDarkTheme ? "text-slate-300" : "text-slate-700")}>
                                    {userData.licenseId}
                                </div>
                            </div>
                        </div>

                        {/* Stats "Stamps" */}
                        <div className="flex flex-wrap items-end gap-3 pb-2 mt-auto">
                            {/* XP Stamp */}
                            <div className={cn(
                                "px-3 py-1.5 rounded-lg border flex flex-col items-start min-w-[70px]",
                                isDarkTheme ? "bg-slate-800/60 border-slate-700" : "bg-white/60 border-slate-300"
                            )}>
                                <span className="text-[8px] font-bold uppercase opacity-50 tracking-wider">XP</span>
                                <span className={cn("text-xs font-mono font-bold", isDarkTheme ? "text-yellow-400" : "text-yellow-600")}>{(stats.xp || 0).toLocaleString()}</span>
                            </div>

                            {/* Level Stamp */}
                            <div className={cn(
                                "px-3 py-1.5 rounded-lg border flex flex-col items-start min-w-[70px]",
                                isDarkTheme ? "bg-slate-800/60 border-slate-700" : "bg-white/60 border-slate-300"
                            )}>
                                <span className="text-[8px] font-bold uppercase opacity-50 tracking-wider">LEVEL</span>
                                <span className={cn("text-xs font-mono font-bold", isDarkTheme ? "text-indigo-400" : "text-indigo-600")}>{stats.level || 1}</span>
                            </div>

                            {/* Streak Stamp (Interactive) */}
                            <button
                                onClick={() => !hasClaimedToday && onClaimReward()}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg border flex flex-col items-start min-w-[90px] transition-all active:scale-95",
                                    hasClaimedToday
                                        ? (isDarkTheme ? "bg-emerald-950/30 border-emerald-800/50" : "bg-emerald-50 border-emerald-200")
                                        : (isDarkTheme ? "bg-orange-950/30 border-orange-800/50 animate-pulse hover:bg-orange-900/40" : "bg-orange-50 border-orange-200 animate-pulse hover:bg-orange-100")
                                )}
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[8px] font-bold uppercase opacity-70 tracking-wider text-inherit">STREAK</span>
                                    {!hasClaimedToday && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />}
                                </div>
                                <span className={cn(
                                    "text-xs font-mono font-bold flex items-center gap-1",
                                    hasClaimedToday ? "text-emerald-500" : "text-orange-500"
                                )}>
                                    {stats.currentStreak} DAYS
                                    {hasClaimedToday && <CheckCircle size={10} />}
                                </span>
                            </button>
                        </div>

                    </div>

                    {/* Console - Just deco or future controls */}
                    <div className="absolute bottom-6 right-6 sm:static sm:flex sm:flex-col sm:justify-end sm:ml-4 pl-0 sm:pl-6 sm:border-l sm:border-slate-500/10 opacity-40">
                        <div className="flex flex-col items-end gap-1">
                            <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", isDarkTheme ? "text-slate-400" : "text-slate-500")}>OFFICIAL</span>
                            <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", isDarkTheme ? "text-slate-500" : "text-slate-400")}>DOCUMENT</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
