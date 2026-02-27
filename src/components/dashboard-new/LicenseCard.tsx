import React, { useMemo, useState } from 'react';
import { User, AlertTriangle, ShieldCheck, Flame, Zap, Camera, Info, HelpCircle, CheckCircle2, Activity, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import PuntosIndicator from './PuntosIndicator3D';

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
    animatePoints?: boolean;
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
    animatePoints = false,
    t,
    licenseHistory = []
}) => {
    const isMobile = useIsMobile();
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
        } else if (points < 10 && points >= 5) {
            rankStyle = {
                ...rankStyle,
                accent: '#EAB308',
                bg: 'bg-yellow-500/10',
                text: 'text-yellow-600 dark:text-yellow-500',
                badge: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
                border: 'border-yellow-500'
            };
        } else if (points < 5) {
            rankStyle = {
                ...rankStyle,
                accent: '#F43F5E',
                bg: 'bg-rose-500/10',
                text: 'text-rose-500',
                badge: 'bg-rose-500 text-white',
                border: 'border-rose-500'
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
                isDarkTheme ? "text-indigo-200/50" : "text-black/60"
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
        <div className={cn(
            "w-full relative group perspective-[2000px] p-2 sm:p-4",
            isPointsModalOpen && isMobile ? "h-auto" : "h-full"
        )}>
            {/* The 3D Glassmorphism License Card */}
            <div className={cn(
                "w-full relative z-10 rounded-[28px] md:rounded-[36px] overflow-hidden border transition-all duration-700 flex flex-col shadow-2xl backdrop-blur-3xl",
                isPointsModalOpen && isMobile ? "h-auto" : "h-full",
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
                <div className="absolute inset-0 z-0 opacity-[0.015] dark:opacity-[0.006] pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
                {/* Вторая накладка для темной темы чтобы было как раньше */}
                {isDarkTheme && (
                    <div className="absolute inset-0 z-0 opacity-[0.005] pointer-events-none"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }}
                    />
                )}


                {RecoveryOverlay}

                {/* Official Header */}
                <div className={cn(
                    "relative z-10 flex flex-row items-center px-4 md:px-6 py-2 md:py-3 border-b",
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

                    {/* Laser Hologram Shield */}
                    <div className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-tr from-cyan-400/20 via-fuchsia-500/20 to-yellow-400/20 backdrop-blur-md border border-white/20 flex items-center justify-center relative overflow-hidden group/holo ml-auto">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover/holo:animate-[shimmer_1.5s_infinite]" />
                        <ShieldCheck size={18} className={isDarkTheme ? "text-zinc-300 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]" : "text-indigo-500"} />
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 p-3 md:p-5 flex flex-row gap-4 md:gap-6 z-10 relative mt-0 md:mt-1">
                    {/* Left Side: User Photo Area */}
                    <div className="flex flex-col gap-2 shrink-0">
                        <div className={cn(
                            "w-20 h-28 sm:w-24 sm:h-[120px] md:w-[100px] md:h-[136px] rounded-xl md:rounded-2xl overflow-hidden border-2 shadow-inner relative group/photo",
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

                    {/* Right Side: Info + Meta Data Stack */}
                    <div className="flex-1 min-w-0 flex flex-col">
                        {/* Information Fields & Points Indicator Cluster */}
                        <div className="flex-1 min-w-0 flex flex-row items-center justify-between gap-4 md:gap-6 overflow-visible">
                            <div className="grid grid-cols-1 gap-y-1 md:gap-y-2 flex-1 min-w-0 max-w-[65%] sm:max-w-none">
                                <Field label={localeConfig.fields.name} value={fullName} />

                                <div className="hidden sm:block">
                                    <Field label={localeConfig.fields.dob} value={localeConfig.fields.dobVal} />
                                </div>

                                <Field
                                    label={localeConfig.fields.issue}
                                    value={localeConfig.fields.issueVal}
                                />

                                <div className="grid grid-cols-2 gap-2 md:gap-4">
                                    <Field label={localeConfig.fields.issuer} value={localeConfig.fields.issuerVal} />
                                    <Field label={localeConfig.fields.id} value={<span className="font-mono">{globalId}</span>} highlight />
                                </div>
                            </div>

                            {/* Interactive Points Indicator - Perfectly placed in the cluster */}
                            <div className="flex items-center justify-center shrink-0 z-20 pr-1 md:pr-4">
                                <div
                                    onClick={() => setIsPointsModalOpen(true)}
                                    className="cursor-pointer transition-transform active:scale-95 w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] md:w-[110px] md:h-[110px] flex items-center justify-center overflow-visible"
                                >
                                    <div className="scale-[0.28] sm:scale-[0.38] md:scale-[0.55] origin-center shrink-0 overflow-visible">
                                        <PuntosIndicator currentPoints={points} isDarkTheme={isDarkTheme} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Meta Row (Categories & Verification) */}
                        <div className="mt-auto pt-2 border-t border-white/10 dark:border-white/5 flex items-end justify-between gap-3">
                            <div className="flex items-center gap-4">
                                {/* Categories */}
                                <div className="flex flex-col">
                                    <span className={cn(
                                        "text-[7px] sm:text-[9px] font-bold tracking-tight mb-1",
                                        isDarkTheme ? "text-indigo-200/50" : "text-black/40"
                                    )}>{localeConfig.fields.cat}</span>
                                    <div className={cn(
                                        "px-2 py-0.5 rounded-md border text-[10px] font-black leading-none",
                                        isDarkTheme ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-700"
                                    )}>
                                        B
                                    </div>
                                </div>
                            </div>

                            {/* Verification Sign - Official & Premium badge */}
                            <div className={cn(
                                "flex flex-col items-center justify-center transition-all duration-500 pb-0.5",
                                isExpert ? "opacity-100" : "opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-60"
                            )}>
                                <span className={cn(
                                    "text-[6px] font-black uppercase mb-1 tracking-[0.2em] leading-none",
                                    isExpert ? "text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" : (isDarkTheme ? "text-white" : "text-black")
                                )}>
                                    {isExpert ? "PREMIUM UNIT" : "VERIFIED"}
                                </span>
                                <div className={cn(
                                    "w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-dashed flex items-center justify-center transition-transform group-hover:rotate-12",
                                    isExpert ? "border-amber-500 bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "border-current"
                                )}>
                                    <CheckCircle2 size={12} className={isExpert ? "animate-pulse" : ""} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Points Info - Ultra Premium Glass Overlay (Fixed on DT, Relative Expand on Mobile) */}
                <AnimatePresence>
                    {isPointsModalOpen && (
                        <motion.div
                            initial={isMobile ? { height: 0, opacity: 0 } : { opacity: 0, scale: 0.95 }}
                            animate={isMobile ? { height: 'auto', opacity: 1 } : { opacity: 1, scale: 1 }}
                            exit={isMobile ? { height: 0, opacity: 0 } : { opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.4, ease: "circOut" }}
                            className={cn(
                                "flex flex-col items-center justify-center",
                                isMobile
                                    ? "relative z-[100] w-full border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5"
                                    : "fixed md:absolute inset-0 z-[1000] md:z-[100] md:rounded-[24px] lg:rounded-[32px] overflow-hidden backdrop-blur-3xl"
                            )}
                        >
                            {/* High-quality deep backdrop - DT Only */}
                            {!isMobile && (
                                <div className={cn(
                                    "absolute inset-0",
                                    isDarkTheme ? "bg-zinc-950/95" : "bg-white/95"
                                )} />
                            )}

                            {/* Content Container */}
                            <div className={cn(
                                "w-full relative z-10 flex flex-col gap-4 no-scrollbar",
                                isMobile
                                    ? "p-4"
                                    : "h-full p-6 md:p-8 overflow-y-auto pt-16 md:pt-6"
                            )}>

                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsPointsModalOpen(false); }}
                                    className={cn(
                                        isMobile
                                            ? "absolute top-4 right-4 p-1.5 rounded-full z-[1001] bg-black/10 dark:bg-white/10"
                                            : "fixed md:absolute top-4 right-4 p-2.5 rounded-full transition-all z-[1001] border backdrop-blur-md active:scale-90",
                                        !isMobile && (isDarkTheme ? "bg-white/10 hover:bg-white/20 border-white/10" : "bg-black/5 hover:bg-black/10 border-black/10")
                                    )}
                                >
                                    <X size={isMobile ? 16 : 24} className={isDarkTheme ? "text-white" : "text-black"} />
                                </button>

                                {/* Title/Header for mobile details */}
                                {isMobile && (
                                    <div className="mb-2">
                                        <h3 className={cn("text-xs font-black uppercase tracking-widest", isDarkTheme ? "text-white/40" : "text-black/40")}>
                                            {localeConfig.fields.pointsLabel}
                                        </h3>
                                    </div>
                                )}

                                {/* Points Summary Card */}
                                <div className={cn(
                                    "flex items-center justify-between p-4 rounded-2xl border",
                                    isDarkTheme ? "bg-white/[0.02] border-white/5" : "bg-black/[0.02] border-black/5"
                                )}>
                                    <div className="space-y-1">
                                        <div className={cn(
                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] md:text-xs font-black uppercase tracking-[0.05em] border shadow-md",
                                            points >= 10
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                        )}>
                                            {points >= 10 ? <ShieldCheck size={12} className="animate-pulse" /> : <AlertTriangle size={12} />}
                                            {points >= 10 ? "Допуск к экзамену открыт" : "Для экзамена нужно 10"}
                                        </div>
                                    </div>
                                    <div className="relative shrink-0 flex items-center justify-center w-8 h-8 md:w-16 md:h-16">
                                        <div className="scale-[0.15] md:scale-[0.28] origin-center absolute pointer-events-none overflow-visible">
                                            <PuntosIndicator currentPoints={points} isDarkTheme={isDarkTheme} />
                                        </div>
                                    </div>
                                </div>

                                {/* Stats & Rules */}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4">
                                    <div className={cn(
                                        "md:col-span-3 p-3 md:p-4 rounded-2xl border shadow-xl",
                                        isDarkTheme ? "bg-white/[0.02] border-white/5" : "bg-black/[0.02] border-black/5"
                                    )}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-widest">Аналитика</span>
                                            <Activity size={12} className="text-indigo-400/60" />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[6px] font-bold text-zinc-500 uppercase">Stability</span>
                                                    <span className={cn("text-[10px] font-black", isDarkTheme ? "text-white" : "text-black")}>{stats.accuracy || 85}%</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[6px] font-bold text-zinc-500 uppercase">Streak</span>
                                                    <div className="flex items-center gap-1">
                                                        <Zap size={8} className="text-amber-500" />
                                                        <span className="text-[10px] font-black text-amber-500">+{stats.currentStreak || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "md:col-span-2 p-3 md:p-4 rounded-2xl border shadow-lg flex flex-col justify-center gap-3",
                                        isDarkTheme ? "bg-white/[0.02] border-white/5" : "bg-black/[0.02] border-black/5"
                                    )}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                                <span className="text-emerald-400 text-[10px] font-black">+1</span>
                                            </div>
                                            <p className="text-[9px] text-zinc-400 font-medium">Вход, победы, чистые тесты.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                                                <span className="text-rose-400 text-[10px] font-black">-1</span>
                                            </div>
                                            <p className="text-[9px] text-zinc-400 font-medium">Ошибки, простой более 48ч.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom Neon Edge Line - Now INSIDE the overflow-hidden container */}
                <div className="absolute bottom-0 left-0 h-[2px] w-full bg-white/5 overflow-hidden z-20">
                    <div
                        className={cn("h-full transition-all duration-[2000ms] shadow-[0_0_10px_2px_rgba(255,255,255,0.3)]", rankStyle.badge.split(' ')[0])}
                        style={{ width: `${(points / 15) * 100}%` }}
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
