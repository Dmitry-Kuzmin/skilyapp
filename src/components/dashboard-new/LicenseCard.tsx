import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, ShieldCheck, ShieldAlert, TrendingUp, Zap, Info, HelpCircle, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/lib/toast';
import { useModalRoute } from '@/hooks/useModalRoute';
import { LicenseCardVisual } from './LicenseCardVisual';
const LicenseShareAction = React.lazy(() => import('./LicenseShareAction').then(m => ({ default: m.LicenseShareAction })));
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
        referral_code?: string | null;
        duel_wins?: number;
        duel_total?: number;
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
            location: "3. LUGAR",
            streak: "5. MODO RACHA",
            examDate: "4. FECHA",
            issuer: "4c. EXPEDIDO POR",
            issuerVal: "JEFATURA DE TRÁFICO",
            id: "4d. CÓDIGO PROMO",
            cat: "9. CAT.",
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
            location: "3. ГОРОД",
            streak: "5. В УДАРЕ",
            examDate: "4. ДАТА",
            issuer: "4c. ВЫДАНО МАДИ/ГИБДД",
            issuerVal: "ГУ ОБДД МВД РОССИИ",
            id: "4d. ПРОМОКОД",
            cat: "9. КАТ.",
            pointsLabel: "12. ШТРАФНЫЕ БАЛЛЫ",
        }
    },
    en: {
        bg: "from-blue-500/10 via-indigo-500/10 to-white/5",
        lightBg: "bg-gradient-to-br from-blue-100 via-white to-indigo-100",
        header: "UNITED KINGDOM",
        docType: "DRIVING LICENCE",
        fields: {
            name: "1. 2. SURNAME FIRST NAMES",
            location: "3. LOCATION",
            streak: "5. STREAK MODE",
            examDate: "4. DATE",
            issuer: "4c. ISSUED BY",
            issuerVal: "DVLA SWANSEA",
            id: "4d. PROMO CODE",
            cat: "9. CAT.",
            pointsLabel: "12. PENALTY POINTS",
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
    const { examDate, examCity, openSettings } = useSettingsStore();
    const { openModal: openReferralModal } = useModalRoute('referral');

    const { data: realReferralCode } = useQuery({
        queryKey: ['referral-code', userProfile?.id],
        queryFn: async () => {
            if (!userProfile?.id) return null;
            const { data } = await supabase.from('profiles').select('referral_code').eq('id', userProfile.id).single();
            return (data as { referral_code: string | null } | null)?.referral_code || null;
        },
        enabled: !!userProfile?.id
    });

    const activeProfile = useMemo(() => ({
        ...userProfile,
        referral_code: userProfile?.referral_code || realReferralCode || null
    }), [userProfile, realReferralCode]);

    const daysUntilExam = useMemo(() => {
        if (!examDate) return null;
        const target = new Date(examDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);
        const diff = target.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }, [examDate]);

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
        const points = activeProfile?.license_points ?? 8;

        const rawName = ([activeProfile?.first_name, activeProfile?.last_name].filter(Boolean).join(' ') ||
            activeProfile?.username ||
            t('common.student') ||
            'USER').toUpperCase();

        const fullName = rawName;
        const isSuspended = points === 0;
        const isExpert = points >= 12;
        const rankLabel = isSuspended ? t('licenseCard.ranks.suspended') : isExpert ? t('licenseCard.ranks.expert') : t('licenseCard.ranks.novel');

        const globalIdMatch = activeProfile?.id?.split('-')[0] ?? '---';
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
        const effectiveCountry = (normCountry === 'russia' || normCountry === 'ru') ? 'ru' : (normCountry === 'spain' || normCountry === 'es') ? 'es' : 'en';
        const countryCode = effectiveCountry === 'ru' ? 'RUS' : effectiveCountry === 'es' ? 'E' : 'UK';
        const localeConfig = T_MAP[effectiveCountry as keyof typeof T_MAP] || T_MAP['en'];

        return {
            points,
            rankStyle,
            fullName,
            photoUrl: activeProfile?.photo_url,
            isSuspended,
            rankLabel,
            globalId,
            isExpert,
            countryCode,
            localeConfig
        };
    }, [activeProfile, selectedCountry, t]);

    const [imageError, setImageError] = useState(false);
    const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);

    const { isUploading, fileInputRef, handleAvatarClick, handleAvatarUpload } = useAvatarUpload();

    const RecoveryOverlay = isSuspended && (
        <div className="absolute inset-0 z-[60] bg-[#0F1014]/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700 rounded-[28px] md:rounded-[36px]">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={40} className="text-red-500 animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 translate-y-2">{t('licenseCard.suspended.title')}</h3>
            <button
                onClick={onRecoverPoints}
                className="bg-white text-black px-8 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(239,68,68,0.3)] mt-2 focus:outline-none"
            >
                {t('licenseCard.suspended.recoverButton')}
            </button>
        </div>
    );

    return (
        <div className={cn(
            "w-full relative group perspective-[2000px]",
            isPointsModalOpen && isMobile ? "h-auto" : "h-full"
        )}>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarUpload} 
                className="hidden" 
                accept="image/*"
            />
            {/* The 3D Glassmorphism License Card via Visual Component */}
            {(!isMobile || !isPointsModalOpen) && (
                <LicenseCardVisual 
                    userProfile={activeProfile}
                    stats={stats}
                    isDarkTheme={isDarkTheme}
                    language={language}
                    selectedCountry={selectedCountry}
                    rankStyle={rankStyle}
                    fullName={fullName}
                    photoUrl={photoUrl}
                    isExpert={isExpert}
                    globalId={globalId}
                    countryCode={countryCode}
                    localeConfig={localeConfig}
                    daysUntilExam={daysUntilExam}
                    examCity={examCity}
                    points={points}
                    t={t}
                    imageError={imageError}
                    setImageError={setImageError}
                    isUploading={isUploading}
                    onPhotoClick={handleAvatarClick}
                    onDateClick={() => openSettings('general', 'exam-date-section')}
                    onLocationClick={() => openSettings('general', 'exam-city-section')}
                    onPromoClick={() => {
                        const code = userProfile?.referral_code;
                        
                        if (code) {
                            const referralLink = `${window.location.origin}/join/${code}`;
                            navigator.clipboard.writeText(referralLink);
                            toast.success(t('referral.linkCopied'));
                        }
                        
                        import('@/store/modalStore').then(m => m.useModalStore.getState().openModal('REFERRAL'));
                    }}
                    onPointsClick={() => setIsPointsModalOpen(true)}
                    shareActionControl={
                        <React.Suspense fallback={<div className="w-10 h-10 animate-pulse bg-white/5 rounded-full" />}>
                            <LicenseShareAction 
                                userProfile={userProfile}
                                stats={stats}
                                isDarkTheme={isDarkTheme}
                                language={language}
                                cardContent={
                                    <div className="w-full h-full pointer-events-none">
                                        <LicenseCardVisual 
                                            userProfile={userProfile}
                                            stats={stats}
                                            isDarkTheme={isDarkTheme}
                                            language={language}
                                            selectedCountry={selectedCountry}
                                            rankStyle={rankStyle}
                                            fullName={fullName}
                                            photoUrl={photoUrl}
                                            isExpert={isExpert}
                                            globalId={globalId}
                                            countryCode={countryCode}
                                            localeConfig={localeConfig}
                                            daysUntilExam={daysUntilExam}
                                            points={points}
                                            t={t}
                                            isStatic={true}
                                        />
                                    </div>
                                }
                            />
                        </React.Suspense>
                    }
                />
            )}

            {RecoveryOverlay}

            {/* Points Info Overlay - Back to Original Inside Design */}
            <AnimatePresence>
                {isPointsModalOpen && (
                    <motion.div
                        initial={isMobile ? { opacity: 0, y: 10 } : { opacity: 0, scale: 0.95 }}
                        animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1 }}
                        exit={isMobile ? { opacity: 0, y: 10 } : { opacity: 0, scale: 0.95 }}
                        className={cn(
                            "z-[150] overflow-hidden",
                            isMobile 
                                ? "relative w-full rounded-3xl" 
                                : "absolute inset-0 flex items-center justify-center p-4 backdrop-blur-xl bg-[#0a0a0f]/95 rounded-[2.5rem]"
                        )}
                    >
                        {isMobile && <div className="absolute inset-0 bg-[#0a0a0f]/95 backdrop-blur-3xl" />}
                        <div className="relative z-10 w-full h-full flex flex-col p-4 md:p-6 overflow-hidden">
                            <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-xl", rankStyle.bg)}>
                                        <ShieldCheck className={rankStyle.text} size={isMobile ? 20 : 24} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-tight leading-none mb-1">
                                            {t('licenseCard.pointsModal.title')}
                                        </h3>
                                        <span className="text-[7px] md:text-[9px] font-bold uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-fuchsia-400">
                                            AUTHENTICATED BLOCKCHAIN RECORD
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsPointsModalOpen(false)}
                                    className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                                >
                                    <X size={isMobile ? 16 : 20} className="text-zinc-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    {/* Left: Summary & Journal */}
                                    <div className="md:col-span-3 flex flex-col gap-4">
                                        <div className={cn(
                                            "flex items-center gap-4 p-4 rounded-2xl border shadow-xl",
                                            points >= 10 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20"
                                        )}>
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center border shrink-0",
                                                points >= 10 ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-amber-500/20 border-amber-500/30 text-amber-400"
                                            )}>
                                                {points >= 10 ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                                            </div>
                                            <div className="flex flex-col text-left truncate">
                                                <span className={cn("text-[10px] md:text-[12px] font-black uppercase tracking-widest", points >= 10 ? "text-emerald-400" : "text-amber-400")}>
                                                    {points >= 10 ? t('licenseCard.pointsModal.statusReady') : t('licenseCard.pointsModal.statusLocked')}
                                                </span>
                                                <span className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase truncate">
                                                    {points >= 10 ? t('licenseCard.pointsModal.descReady') : t('licenseCard.pointsModal.descLocked').replace('{{points}}', String(10 - points))}
                                                </span>
                                            </div>
                                        </div>
 
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 rounded-xl border bg-white/[0.02] border-white/5 text-left">
                                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">{t('licenseCard.pointsModal.score')}</span>
                                                <span className="text-xl md:text-2xl font-black text-white">{points}</span>
                                            </div>
                                            <div className="p-3 rounded-xl border bg-white/[0.02] border-white/5 text-left">
                                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">{t('licenseCard.pointsModal.accuracy')}</span>
                                                <span className="text-xl md:text-2xl font-black text-white">{stats.accuracy || 100}%</span>
                                            </div>
                                        </div>
 
                                        <div className="flex flex-col gap-2">
                                            <h4 className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest text-left">{t('licenseCard.pointsModal.journalTitle')}</h4>
                                            <div className="space-y-1">
                                                {licenseAudit.length > 0 ? (
                                                    licenseAudit.slice(0, 10).map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                                                            <div className="flex flex-col text-left truncate">
                                                                <span className="text-[9px] font-black text-zinc-300 uppercase truncate tracking-tighter">
                                                                    {t(`licenseCard.licenceEvents.${item.event_type}`) || item.event_type.replace(/_/g, ' ')}
                                                                </span>
                                                                <span className="text-[7px] text-zinc-500 font-bold">
                                                                    {new Date(item.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <span className={cn("text-[9px] font-black", item.delta > 0 ? "text-emerald-400" : "text-rose-400")}>
                                                                {item.delta > 0 ? `+${item.delta}` : item.delta}
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-4 text-center text-zinc-600 text-[8px] uppercase font-black tracking-widest">{t('licenseCard.pointsModal.emptyJournal')}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Rules Information */}
                                    <div className="md:col-span-2 flex flex-col gap-4">
                                        <div className="p-4 rounded-2xl border bg-indigo-500/[0.03] border-indigo-500/10 flex flex-col gap-4">
                                            <span className="text-[8px] md:text-[10px] font-black text-indigo-500/60 uppercase tracking-widest text-left">{t('licenseCard.pointsModal.systemTitle')}</span>
                                            <div className="space-y-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                                        <span className="text-emerald-500 text-[9px] font-black">+1</span>
                                                    </div>
                                                    <div className="flex flex-col text-left">
                                                        <span className="text-[9px] font-black text-zinc-200">{t('licenseCard.pointsModal.bonusesTitle')}</span>
                                                        <p className="text-[8px] text-zinc-500 font-medium leading-tight">{t('licenseCard.pointsModal.bonusesDesc')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <div className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                                                        <span className="text-rose-500 text-[9px] font-black">-1</span>
                                                    </div>
                                                    <div className="flex flex-col text-left">
                                                        <span className="text-[9px] font-black text-zinc-200">{t('licenseCard.pointsModal.penaltiesTitle')}</span>
                                                        <p className="text-[8px] text-zinc-500 font-medium leading-tight">{t('licenseCard.pointsModal.penaltiesDesc')}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2 pt-3 border-t border-indigo-500/10 text-left">
                                                    <div className="flex items-center gap-2 text-indigo-500/60">
                                                        <HelpCircle size={10} />
                                                        <span className="text-[8px] font-black uppercase tracking-tighter">{t('licenseCard.pointsModal.examRequirement')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
