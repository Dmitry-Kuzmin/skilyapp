import React, { useMemo, useState } from 'react';
import { User, AlertTriangle, ShieldCheck, ShieldAlert, TrendingUp, Check, Flame, Zap, Camera, Info, HelpCircle, CheckCircle2, Activity as ActivityIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
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
    selectedCountry: string;
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
    licenseAudit?: Array<{
        delta: number;
        event_type: string;
        created_at: string;
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
    }
};

export const LicenseCard: React.FC<LicenseCardProps> = ({
    userProfile,
    stats,
    isDarkTheme,
    selectedCountry,
    language,
    hasClaimedToday,
    onRecoverPoints,
    animatePoints = false,
    t,
    licenseHistory = [],
    licenseAudit = []
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
        const effectiveCountry = (normCountry === 'russia' || normCountry === 'ru') ? 'ru' : 'es';
        const countryCode = effectiveCountry === 'ru' ? 'RUS' : 'E';
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

    // Avatar Upload Logic
    const { isUploading, fileInputRef, handleAvatarClick, handleAvatarUpload } = useAvatarUpload();

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
            "w-full relative group perspective-[2000px]",
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
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarUpload}
                            className="hidden"
                            accept="image/*"
                            disabled={isUploading}
                        />
                        <div className={cn(
                            "w-20 h-28 sm:w-24 sm:h-[120px] md:w-[100px] md:h-[136px] rounded-xl md:rounded-2xl overflow-hidden border-2 shadow-inner relative group/photo",
                            isDarkTheme ? "border-white/10 bg-black/40" : "border-slate-200/80 bg-slate-50",
                            "cursor-pointer active:scale-[0.98] transition-all",
                            isUploading && "opacity-50"
                        )}
                            onClick={handleAvatarClick}
                        >
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
                            ) : isUploading ? (
                                <div className="w-full h-full flex flex-col items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
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
                                    ? "relative z-[100] w-full border-t border-black/20 dark:border-white/20 bg-white dark:bg-[#0F1014]"
                                    : "fixed md:absolute inset-0 z-[1000] md:z-[100] md:rounded-[24px] lg:rounded-[32px] overflow-hidden backdrop-blur-[60px]"
                            )}
                        >
                            {/* High-quality deep backdrop - DT Only */}
                            {!isMobile && (
                                <div className={cn(
                                    "absolute inset-0",
                                    isDarkTheme ? "bg-[#0F1014]" : "bg-zinc-50"
                                )} />
                            )}

                            {/* Content Container */}
                            <div className={cn(
                                "w-full relative z-10 flex flex-col gap-4 no-scrollbar",
                                isMobile
                                    ? "p-4"
                                    : "h-full p-6 md:p-8 overflow-y-auto pt-16 md:pt-6"
                            )}>

                                {/* Title/Header for mobile details (removed absolute close button from here) */}
                                {isMobile && (
                                    <div className="mb-2">
                                        <h3 className={cn("text-xs font-black uppercase tracking-widest", isDarkTheme ? "text-white/40" : "text-black/40")}>
                                            {localeConfig.fields.pointsLabel}
                                        </h3>
                                    </div>
                                )}

                                {/* Status Banner Area with Integrated Close */}
                                <div className="flex items-stretch gap-2 mb-4">
                                    <div className={cn(
                                        "flex-1 flex items-center gap-4 p-4 rounded-3xl border shadow-xl transition-all duration-700",
                                        points >= 10
                                            ? "bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5"
                                            : "bg-amber-500/10 border-amber-500/20 shadow-amber-500/5"
                                    )}>
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-transform",
                                            points >= 10 ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-amber-500/20 border-amber-500/30 text-amber-400"
                                        )}>
                                            {points >= 10 ? <ShieldCheck size={28} className="animate-pulse" /> : <ShieldAlert size={28} />}
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className={cn(
                                                "text-[12px] font-black uppercase tracking-widest",
                                                points >= 10 ? "text-emerald-400" : "text-amber-400"
                                            )}>
                                                {points >= 10 ? 'Допуск к экзаменам открыт' : 'Допуск ограничен'}
                                            </span>
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                                                {points >= 10 ? 'Вы набрали необходимые 10 баллов' : `Нужно еще ${10 - points} баллов до экзамена`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Embedded Close Button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsPointsModalOpen(false); }}
                                        className={cn(
                                            "w-14 md:w-20 flex items-center justify-center rounded-3xl border transition-all active:scale-90 shadow-xl",
                                            isDarkTheme ? "bg-white/5 hover:bg-white/10 border-white/10" : "bg-black/5 hover:bg-black/10 border-black/5"
                                        )}
                                    >
                                        <X size={24} className={isDarkTheme ? "text-white" : "text-black"} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className={cn(
                                        "p-6 rounded-3xl border shadow-xl flex items-center justify-between overflow-hidden relative group",
                                        isDarkTheme ? "bg-white/[0.02] border-white/5" : "bg-black/[0.02] border-black/5"
                                    )}>
                                        {/* Subtle background glow for points */}
                                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/10 blur-3xl rounded-full" />

                                        <div className="flex flex-col gap-1 text-left relative z-10">
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Текущий счет</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className={cn("text-4xl font-black tabular-nums tracking-tighter", isDarkTheme ? "text-white" : "text-black")}>
                                                    {points}
                                                </span>
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase">баллов</span>
                                            </div>
                                        </div>
                                        <div className="relative w-20 h-20 flex items-center justify-center z-10">
                                            <div className="scale-[0.35] origin-center absolute pointer-events-none">
                                                <PuntosIndicator currentPoints={points} isDarkTheme={isDarkTheme} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "p-6 rounded-3xl border shadow-xl flex items-center gap-5",
                                        isDarkTheme ? "bg-white/[0.02] border-white/5" : "bg-black/[0.02] border-black/5"
                                    )}>
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                                            <TrendingUp size={28} className="text-indigo-400" />
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Профит-фактор</span>
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-3xl font-black", isDarkTheme ? "text-white" : "text-black")}>
                                                    {((stats.accuracy || 100) / 10).toFixed(1)}
                                                </span>
                                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase">Good</span>
                                            </div>
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
                                            <ActivityIcon size={12} className="text-indigo-400/60" />
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
                                        "md:col-span-3 p-3 md:p-5 rounded-2xl border shadow-lg flex flex-col gap-4 overflow-hidden",
                                        isDarkTheme ? "bg-black/40 border-white/5" : "bg-white border-black/5"
                                    )}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Журнал событий</span>
                                            <div className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                                                <span className="text-[7px] font-bold text-indigo-400 uppercase">Последние действия</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-3 overflow-y-auto max-h-[160px] pr-1 custom-scrollbar">
                                            {licenseAudit.length > 0 ? (
                                                licenseAudit.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between gap-3 group/item">
                                                        <div className="flex items-center gap-3 truncate">
                                                            <div className={cn(
                                                                "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-transform group-hover/item:scale-110",
                                                                item.delta > 0
                                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                                    : item.delta < 0 ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                                                        : "bg-zinc-500/10 border-zinc-500/20 text-zinc-400"
                                                            )}>
                                                                <span className="text-[10px] font-black">
                                                                    {item.delta > 0 ? `+${item.delta}` : item.delta}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col truncate text-left">
                                                                <span className={cn("text-[10px] font-black truncate", isDarkTheme ? "text-zinc-200" : "text-zinc-800")}>
                                                                    {item.event_type === 'daily_login' ? 'Вход в систему' :
                                                                        item.event_type === 'inactivity_decay' ? 'Простой > 48ч' :
                                                                            item.event_type === 'admin_restore' ? 'Коррекция ИИ' :
                                                                                item.event_type === 'topic_perfect' ? 'Чистый тест' :
                                                                                    item.event_type === 'exam_pass' ? 'Экзамен сдан' :
                                                                                        item.event_type === 'exam_fail' ? 'Экзамен провален' : item.event_type}
                                                                </span>
                                                                <span className="text-[7px] text-zinc-500 uppercase font-bold tracking-tighter">
                                                                    {new Date(item.created_at).toLocaleString(language, { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/20" />
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-6 opacity-30">
                                                    <Info size={20} className="mb-2" />
                                                    <span className="text-[10px] uppercase font-black tracking-widest">История пуста</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "md:col-span-2 p-3 md:p-5 rounded-2xl border shadow-lg flex flex-col gap-4",
                                        isDarkTheme ? "bg-indigo-500/[0.03] border-indigo-500/10" : "bg-indigo-50 border-indigo-100"
                                    )}>
                                        <span className="text-[8px] md:text-[10px] font-black text-indigo-500/60 uppercase tracking-widest text-left">Система баллов</span>
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3 group/rule">
                                                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 transition-all group-hover/rule:bg-emerald-500/20">
                                                    <span className="text-emerald-500 text-[11px] font-black">+1</span>
                                                </div>
                                                <div className="flex flex-col text-left">
                                                    <span className={cn("text-[10px] font-black", isDarkTheme ? "text-zinc-200" : "text-zinc-800")}>Бонусы</span>
                                                    <p className="text-[9px] text-zinc-500 font-medium leading-tight">Ежедневный вход, победы в дуэлях, идеальные тесты.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3 group/rule">
                                                <div className="w-7 h-7 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 transition-all group-hover/rule:bg-rose-500/20">
                                                    <span className="text-rose-500 text-[11px] font-black">-1</span>
                                                </div>
                                                <div className="flex flex-col text-left">
                                                    <span className={cn("text-[10px] font-black", isDarkTheme ? "text-zinc-200" : "text-zinc-800")}>Штрафы</span>
                                                    <p className="text-[9px] text-zinc-500 font-medium leading-tight">Ошибки в тестах, простой в обучении более 48 часов.</p>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-indigo-500/10 text-left">
                                                <div className="flex items-center gap-2 text-indigo-500/60">
                                                    <HelpCircle size={12} />
                                                    <span className="text-[8px] font-black uppercase tracking-tighter">Нужно 10 для экзамена</span>
                                                </div>
                                            </div>
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

            <div className={cn(
                "absolute -inset-2 z-0 opacity-20 blur-2xl rounded-[40px] transition-all duration-1000",
                rankStyle.bg
            )} />
        </div>
    );
};
