import React, { useMemo, useState } from 'react';
import { User, AlertTriangle, ShieldCheck, Flame, Zap, Camera, Info } from 'lucide-react';
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
        averageScore?: number;
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

const T_MAP = {
    es: {
        bg: "from-pink-500/10 via-purple-500/10 to-indigo-500/10 bg-[length:200%_200%] animate-gradient-x",
        lightBg: "bg-gradient-to-br from-pink-200 via-purple-100 to-indigo-100",
        header: "ESPAÑA",
        docType: "PERMISO DE CONDUCCIÓN",
        fields: {
            name: "1. 2. APELLIDOS Y NOMBRE",
            dob: "3. FECHA Y LUGAR DE NAC.",
            dobVal: "10.05.1995 • MADRID",
            issue: "4a. FECHA DE EXP. • 4b. VÁL. HASTA",
            issueVal: "01.01.2024 • 01.01.2034",
            issuer: "4c. EXPEDIDO POR",
            issuerVal: "JEFATURA DE TRÁFICO",
            id: "4d. 5. NÚMERO / ID",
            cat: "9. CAT.",
            streak: "RACHA 🔥",
            pointsLabel: "12. PUNTOS",
        }
    },
    ru: {
        bg: "from-blue-500/10 via-red-500/10 to-white/5",
        lightBg: "bg-gradient-to-br from-blue-100 via-white to-red-100",
        header: "РОССИЯ",
        docType: "ВОДИТЕЛЬСКОЕ УДОСТОВЕРЕНИЕ",
        fields: {
            name: "1. 2. ФАМИЛИЯ ИМЯ",
            dob: "3. ДАТА И МЕСТО РОЖДЕНИЯ",
            dobVal: "10.05.1995 • МОСКВА",
            issue: "4a. ДАТА ВЫДАЧИ • 4b. ДЕЙСТВИТЕЛЬНО ДО",
            issueVal: "01.01.2024 • 01.01.2034",
            issuer: "4c. ВЫДАНО МАДИ/ГИБДД",
            issuerVal: "ГУ ОБДД МВД РОССИИ",
            id: "4d. 5. УДОСТОВЕРЕНИЕ №",
            cat: "9. КАТ.",
            streak: "СТРИК 🔥",
            pointsLabel: "12. ШТРАФНЫЕ БАЛЛЫ",
        }
    },
    sk: {
        bg: "from-blue-500/10 via-red-500/10 to-white/5",
        lightBg: "bg-gradient-to-br from-blue-100 via-white to-red-100",
        header: "SLOVENSKO",
        docType: "VODIČSKÝ PREUKAZ",
        fields: {
            name: "1. 2. PRIEZVISKO A MENO",
            dob: "3. DÁTUM A MIESTO NARODENIA",
            dobVal: "10.05.1995 • BRATISLAVA",
            issue: "4a. DÁTUM VYDANIA • 4b. PLATNÉ DO",
            issueVal: "01.01.2024 • 01.01.2034",
            issuer: "4c. VYDANÉ",
            issuerVal: "POLÍCIA SR",
            id: "4d. 5. ČÍSLO PREUKAZU",
            cat: "9. SKUP.",
            streak: "SÉRIA 🔥",
            pointsLabel: "12. BODY",
        }
    }
};

export const LicenseCard: React.FC<LicenseCardProps> = ({
    userProfile,
    stats,
    isDarkTheme,
    selectedCountry,
    hasClaimedToday,
    onRecoverPoints,
    t
}) => {
    const {
        points,
        rankStyle,
        fullName,
        photoUrl,
        isSuspended,
        rankLabel,
        isExpert,
        globalId,
        countryCode,
        localeConfig
    } = useMemo(() => {
        const points = userProfile?.license_points ?? 8;

        const rawName = ([userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ') ||
            userProfile?.username ||
            t('common.student') ||
            'USER').toUpperCase();

        const fullName = rawName;
        const isSuspended = points === 0;
        const isExpert = points >= 12;
        const rankLabel = isSuspended ? t('licenseCard.ranks.suspended') : isExpert ? t('licenseCard.ranks.expert') : t('licenseCard.ranks.novel');

        const globalIdMatch = userProfile?.id?.split('-')[0] ?? '---';
        const globalId = globalIdMatch === '---' ? '---' : `ID-${globalIdMatch.toUpperCase()}`;

        let rankStyle = {
            accent: '#10B981', // Emerald
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-500 dark:text-emerald-400',
            badge: 'bg-emerald-500 text-white',
            border: 'border-emerald-500'
        };

        if (isSuspended) {
            rankStyle = {
                accent: '#EF4444',
                bg: 'bg-red-500/10',
                text: 'text-red-500',
                badge: 'bg-red-500 text-white',
                border: 'border-red-500'
            };
        } else if (isExpert) {
            rankStyle = {
                accent: '#EAB308', // Gold
                bg: 'bg-yellow-500/10',
                text: 'text-yellow-600 dark:text-yellow-500',
                badge: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
                border: 'border-yellow-500'
            };
        } else if (points < 8) {
            rankStyle = {
                ...rankStyle,
                text: 'text-orange-500',
                badge: 'bg-orange-500 text-white',
                border: 'border-orange-500'
            };
        }

        const normCountry = (selectedCountry || 'es').toLowerCase();
        const effectiveCountry = normCountry === 'spain' || normCountry === 'es' ? 'es' : normCountry === 'slovakia' || normCountry === 'sk' ? 'sk' : 'ru';
        const countryCode = effectiveCountry === 'es' ? 'E' : effectiveCountry === 'sk' ? 'SK' : 'RUS';
        const localeConfig = T_MAP[effectiveCountry as keyof typeof T_MAP] || T_MAP['es'];

        return {
            points,
            rankStyle,
            fullName,
            photoUrl: userProfile?.photo_url,
            isSuspended,
            rankLabel,
            globalId,
            isExpert,
            countryCode,
            localeConfig
        };
    }, [userProfile, selectedCountry, t]);

    const [imageError, setImageError] = useState(false);
    const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);

    const RecoveryOverlay = isSuspended && (
        <div className="absolute inset-0 z-[60] bg-[#0F1014]/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700 rounded-[28px] md:rounded-[36px]">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={40} className="text-red-500 animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 translate-y-2">{t('licenseCard.suspended.title')}</h3>
            <button
                onClick={onRecoverPoints}
                className="bg-white text-black px-8 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(239,68,68,0.3)] mt-2"
            >
                {t('licenseCard.suspended.recoverButton')}
            </button>
        </div>
    );

    const Field = ({ label, value, valueClassName, highlight }: { label: string, value: React.ReactNode, valueClassName?: string, highlight?: boolean }) => (
        <div className="flex flex-col min-w-0 group/field">
            <span className={cn(
                "text-[7px] sm:text-[8px] md:text-[9px] font-bold tracking-tight mb-0.5",
                isDarkTheme ? "text-indigo-200/50" : "text-black/40"
            )}>
                {label}
            </span>
            <span className={cn(
                "text-xs sm:text-[13px] md:text-sm font-black truncate leading-tight tracking-tight",
                isDarkTheme ? "text-zinc-50" : "text-slate-900",
                highlight && (isDarkTheme ? "text-indigo-400 group-hover/field:text-indigo-300 transition-colors" : "text-indigo-600"),
                valueClassName
            )} title={typeof value === 'string' ? value : undefined}>
                {value}
            </span>
        </div>
    );

    return (
        <div className="w-full h-full relative group perspective-[2000px]">
            {/* The 3D Glassmorphism License Card */}
            <div className={cn(
                "w-full h-full relative z-10 rounded-[28px] md:rounded-[36px] overflow-hidden border transition-all duration-700 flex flex-col shadow-2xl backdrop-blur-3xl",
                isDarkTheme
                    ? "bg-zinc-950/80 border-white/5"
                    : "bg-white/90 border-zinc-200 shadow-indigo-900/10"
            )}>

                {/* Spanish EU Pink Gradient Background / Dark Theme Accent */}
                <div className={cn(
                    "absolute inset-0 z-0 opacity-40 pointer-events-none mix-blend-overlay",
                    isDarkTheme ? "bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/5 to-cyan-500/10" : localeConfig.lightBg
                )} />

                {/* Guilloche / Security Pattern */}
                <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />

                {RecoveryOverlay}

                {/* Points Info Modal */}
                {isPointsModalOpen && (
                    <div className="absolute inset-0 z-[70] bg-[#0F1014]/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300 rounded-[28px] md:rounded-[36px]">
                        <div className={cn("w-16 h-16 md:w-20 md:h-20 rounded-full flex flex-col items-center justify-center mb-4 border-4 shadow-2xl space-y-1", rankStyle.border, rankStyle.bg)}>
                            <span className={cn("text-2xl md:text-3xl font-black leading-none", rankStyle.text)}>{points}</span>
                            <span className={cn("text-[8px] md:text-[10px] font-black opacity-60", rankStyle.text)}>/ 15</span>
                        </div>
                        <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tighter mb-2">{localeConfig.fields.pointsLabel}</h3>
                        <p className="text-xs md:text-sm text-zinc-300 font-medium leading-relaxed max-w-sm mb-6">
                            {countryCode === 'RUS'
                                ? 'Штрафные баллы отражают вашу готовность. Избегайте частых ошибок в билетах, иначе права могут быть приостановлены (при достижении 0).'
                                : 'Баллы квалификации показывают ваш уровень. Ошибки в тестах могут привести к лишению, поэтому будьте внимательны.'}
                        </p>
                        <button
                            onClick={() => setIsPointsModalOpen(false)}
                            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-2xl font-bold text-[10px] md:text-xs tracking-widest uppercase transition-all hover:scale-105 active:scale-95 border border-white/10"
                        >
                            {t('common.close') || 'Понятно'}
                        </button>
                    </div>
                )}

                {/* Official Header */}
                <div className={cn(
                    "relative z-10 flex flex-row items-center px-4 md:px-6 py-3 md:py-4 border-b",
                    isDarkTheme ? "border-white/10 bg-white/[0.01]" : "border-indigo-900/10 bg-indigo-50/50"
                )}>
                    {/* EU Flag Icon */}
                    <div className="relative flex items-center justify-center w-8 h-6 md:w-10 md:h-7 bg-[#003399] rounded-[4px] md:rounded-md overflow-hidden shrink-0 shadow-inner mr-3 md:mr-4 border-2 border-transparent">
                        <div className="absolute inset-0 flex items-center justify-center mix-blend-screen opacity-100">
                            <svg viewBox="0 0 100 100" className="w-[120%] h-[120%] text-yellow-400 fill-current opacity-50"><path d="M50 8l5 15h16l-13 10 5 15-13-10-13 10 5-15-13-10h16z" /><path d="M50 18l5 15h16l-13 10 5 15-13-10-13 10 5-15-13-10h16z" transform="rotate(30 50 50)" /><path d="M50 18l5 15h16l-13 10 5 15-13-10-13 10 5-15-13-10h16z" transform="rotate(60 50 50)" /><path d="M50 18l5 15h16l-13 10 5 15-13-10-13 10 5-15-13-10h16z" transform="rotate(90 50 50)" /><path d="M50 18l5 15h16l-13 10 5 15-13-10-13 10 5-15-13-10h16z" transform="rotate(120 50 50)" /></svg>
                        </div>
                        <span className="relative z-10 text-white font-black text-xs md:text-sm tracking-tighter drop-shadow-md">
                            {countryCode}
                        </span>
                    </div>

                    <div className="flex flex-col flex-1 truncate">
                        <span className={cn(
                            "text-[8px] md:text-[9px] font-black tracking-widest uppercase mb-[1px]",
                            isDarkTheme ? "text-indigo-300/80" : "text-indigo-600/80"
                        )}>
                            {localeConfig.header}
                        </span>
                        <h2 className={cn(
                            "text-xs md:text-sm font-black uppercase tracking-tight truncate",
                            isDarkTheme ? "text-zinc-100" : "text-indigo-950"
                        )}>
                            {localeConfig.docType}
                        </h2>
                    </div>

                    {/* Interactive Points Indicator (Top Right) */}
                    <button
                        onClick={() => setIsPointsModalOpen(true)}
                        className={cn(
                            "shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full flex flex-col items-center justify-center relative overflow-hidden group/points border-[3px] transition-all hover:scale-110 hover:rotate-3 active:scale-95 shadow-lg cursor-pointer ml-3",
                            rankStyle.border,
                            isDarkTheme ? "bg-zinc-950/80" : "bg-white"
                        )}>
                        <div className={cn("absolute inset-0 opacity-20 group-hover/points:opacity-40 transition-opacity", rankStyle.bg)} />

                        {/* Shimmering highlight for interactiveness */}
                        <div className="absolute inset-[-4px] rounded-full border border-transparent bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover/points:animate-[shimmer_1.5s_infinite] opacity-50" />

                        <span className={cn("text-lg md:text-xl font-black leading-none relative z-10", rankStyle.text)}>
                            {points}
                        </span>
                        <div className="flex items-center gap-0.5 mt-0.5 relative z-10">
                            <span className={cn("text-[6px] md:text-[7px] font-bold tracking-widest uppercase opacity-70", rankStyle.text)}>
                                PTS
                            </span>
                            <Info size={8} className={cn("opacity-70", rankStyle.text)} />
                        </div>
                    </button>
                </div>

                {/* Content Section */}
                <div className="flex-1 p-4 md:p-6 flex flex-row gap-4 md:gap-6 z-10 relative mt-1 md:mt-2">

                    {/* User Photo Area */}
                    <div className="flex flex-col gap-2 shrink-0">
                        <div className={cn(
                            "w-20 h-28 sm:w-24 sm:h-[136px] md:w-28 md:h-40 rounded-xl md:rounded-2xl overflow-hidden border-2 shadow-inner relative group/photo",
                            isDarkTheme ? "border-white/10 bg-black/40" : "border-slate-200/80 bg-slate-50"
                        )}>
                            {/* Face Recognition Guides */}
                            <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-indigo-500/50 rounded-tl-sm z-20" />
                            <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-indigo-500/50 rounded-tr-sm z-20" />
                            <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-indigo-500/50 rounded-bl-sm z-20" />
                            <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-indigo-500/50 rounded-br-sm z-20" />

                            {photoUrl && !imageError ? (
                                <img
                                    src={photoUrl}
                                    alt="Driver Photo Component"
                                    className="w-full h-full object-cover transition-all"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                                    <Camera size={28} className="opacity-50 mb-2" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Information Fields */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="grid grid-cols-1 gap-y-3 md:gap-y-4">
                            <Field label={localeConfig.fields.name} value={fullName} />

                            <div className="hidden sm:block">
                                <Field label={localeConfig.fields.dob} value={localeConfig.fields.dobVal} />
                            </div>

                            <Field
                                label={localeConfig.fields.issue}
                                value={localeConfig.fields.issueVal}
                            />

                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <Field label={localeConfig.fields.issuer} value={localeConfig.fields.issuerVal} />
                                <Field label={localeConfig.fields.id} value={<span className="font-mono">{globalId}</span>} highlight />
                            </div>
                        </div>

                        {/* Bottom Row inside details */}
                        <div className="mt-4 md:mt-auto pt-4 border-t border-white/10 dark:border-white/5 flex items-end justify-between gap-3">
                            <div className="flex items-center gap-4">
                                {/* Categories */}
                                <div className="flex flex-col">
                                    <span className={cn(
                                        "text-[7px] sm:text-[9px] font-bold tracking-tight mb-1",
                                        isDarkTheme ? "text-indigo-200/50" : "text-black/40"
                                    )}>{localeConfig.fields.cat}</span>
                                    <div className={cn(
                                        "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border-2 font-black text-sm sm:text-base shadow-lg",
                                        isDarkTheme ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-zinc-200 text-slate-800"
                                    )}>
                                        B
                                    </div>
                                </div>

                                {/* Streak */}
                                <div className="flex flex-col ml-1">
                                    <span className={cn(
                                        "text-[7px] sm:text-[9px] font-bold tracking-tight mb-1",
                                        isDarkTheme ? "text-indigo-200/50" : "text-black/40"
                                    )}>{localeConfig.fields.streak}</span>
                                    <div className="flex items-center gap-1.5 h-8 sm:h-10 px-3 border border-white/5 rounded-xl bg-white/5 backdrop-blur-md">
                                        <span className={cn("text-xs sm:text-sm font-black", isDarkTheme ? "text-zinc-100" : "text-slate-800")}>
                                            {stats.currentStreak}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Beautiful Neon Edge line bounding the bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
                    <div
                        className={cn("h-full transition-all duration-1000", rankStyle.badge)}
                        style={{ width: `${Math.min((points / 15) * 100, 100)}%` }}
                    />
                </div>
            </div>

            {/* Ambient Background Glow matching the rank */}
            <div className={cn(
                "absolute -inset-2 z-0 opacity-20 blur-2xl rounded-[40px] transition-all duration-1000",
                rankStyle.bg
            )} />
        </div>
    );
};
