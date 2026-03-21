import React from 'react';
import { ShieldCheck, CheckCircle2, Calendar, Copy, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import PuntosIndicator from './PuntosIndicator3D';
import { useGyroscope } from '@/hooks/useGyroscope';

interface LicenseCardVisualProps {
    userProfile: any;
    stats: any;
    isDarkTheme: boolean;
    language: string;
    selectedCountry: string;
    isStatic?: boolean;
    // Pre-calculated values to avoid re-calculation in both places
    rankStyle: any;
    fullName: string;
    photoUrl?: string | null;
    isExpert: boolean;
    globalId: string;
    countryCode: string;
    localeConfig: any;
    daysUntilExam: number | null;
    examCity?: string | null;
    points: number;
    t: (key: string) => string;
    // For interactive mode
    onPhotoClick?: () => void;
    onDateClick?: () => void;
    onLocationClick?: () => void;
    onPromoClick?: () => void;
    onPointsClick?: () => void;
    isUploading?: boolean;
    imageError?: boolean;
    setImageError?: (val: boolean) => void;
    shareActionControl?: React.ReactNode;
}

export const LicenseCardVisual: React.FC<LicenseCardVisualProps> = ({
    userProfile,
    stats,
    isDarkTheme,
    language,
    selectedCountry,
    isStatic = false,
    rankStyle,
    fullName,
    photoUrl,
    isExpert,
    globalId,
    countryCode,
    localeConfig,
    daysUntilExam,
    examCity,
    points,
    t,
    onPhotoClick,
    onDateClick,
    onLocationClick,
    onPromoClick,
    onPointsClick,
    isUploading,
    imageError,
    setImageError,
    shareActionControl
}) => {
    const gyro = useGyroscope();
    
    const Field = ({ label, value, valueClassName, highlight }: { label: string, value: React.ReactNode, valueClassName?: string, highlight?: boolean }) => (
        <div className="flex flex-col min-w-0 group/field">
            <span className={cn(
                "text-[7px] sm:text-[8px] md:text-[9px] font-bold tracking-tight mb-0.5",
                isDarkTheme ? "text-slate-400/80" : "text-black/60"
            )}>
                {label}
            </span>
            <span className={cn(
                "text-xs sm:text-[13px] md:text-sm font-black truncate leading-tight tracking-tight",
                isDarkTheme ? "text-white" : "text-slate-900",
                highlight && (isDarkTheme ? "text-indigo-400 group-hover/field:text-indigo-300 transition-colors" : "text-indigo-600"),
                valueClassName
            )}>
                {value}
            </span>
        </div>
    );

    const hasReferralCode = !!userProfile?.referral_code;
    const displayCode = hasReferralCode 
        ? userProfile.referral_code.toUpperCase()
        : '---';

    return (
        <div className={cn(
            "w-full h-full relative z-10 rounded-3xl xl:rounded-[2.5rem] overflow-hidden border transition-all duration-700 flex flex-col shadow-lg backdrop-blur-md",
            isDarkTheme
                ? "bg-slate-800/80 border-slate-700"
                : "bg-white border-slate-200/80 shadow-[0_20px_45px_rgba(0,0,0,0.06)]"
        )}>
            {/* EU Pink/Blue Gradient Background */}
            <div className={cn(
                "absolute inset-0 z-0 opacity-40 pointer-events-none",
                !isStatic && "mix-blend-overlay",
                isDarkTheme ? "bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/10 to-cyan-500/20" : localeConfig.lightBg
            )} />

            {/* DGT Security Grid - Pure Reference Based Pattern (Subtle tilt effect) */}
            <div className="absolute inset-0 z-0 opacity-[0.25] dark:opacity-[0.18] pointer-events-none overflow-hidden"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cstyle%3E.c%7Bstroke-width:0.35;fill:none;opacity:0.5;%7D.i%7Bstroke-width:0.4;fill:none;opacity:0.6;%7D.f%7Bfill:currentcolor;opacity:0.4;%7D%3C/style%3E%3C!-- Grid 1 --%3E%3Cg stroke='%234facfe'%3E%3Ccircle cx='20' cy='20' r='14' class='c'/%3E%3Cpath d='M16 20 h8 M20 16 v8' class='i'/%3E%3C/g%3E%3Cg stroke='%2300f2fe'%3E%3Ccircle cx='60' cy='20' r='14' class='c'/%3E%3Cpath d='M56 16 l8 8 M64 16 l-8 8' class='i'/%3E%3C/g%3E%3Cg stroke='%23a8cffb'%3E%3Ccircle cx='100' cy='20' r='14' class='c'/%3E%3Ccircle cx='100' cy='20' r='4' class='f'/%3E%3C/g%3E%3C!-- Grid 2 --%3E%3Cg stroke='%23f093fb'%3E%3Ccircle cx='20' cy='60' r='14' class='c'/%3E%3Ctext x='13' y='63' style='font:bold 5px sans-serif;fill:currentcolor'%3EDGT%3C/text%3E%3C/g%3E%3Cg stroke='%23f5576c'%3E%3Ccircle cx='60' cy='60' r='14' class='c'/%3E%3Cpath d='M54 60 h12 M60 54 v12' class='i'/%3E%3C/g%3E%3Cg stroke='%234facfe'%3E%3Ccircle cx='100' cy='60' r='14' class='c'/%3E%3Cpath d='M95 55 h10 v10 h-10 Z' class='i'/%3E%3C/g%3E%3C!-- Grid 3 --%3E%3Cg stroke='%2389f7fe'%3E%3Ccircle cx='20' cy='100' r='14' class='c'/%3E%3Ccircle cx='20' cy='100' r='6' class='i'/%3E%3C/g%3E%3Cg stroke='%23667eea'%3E%3Ccircle cx='60' cy='100' r='14' class='c'/%3E%3Cpath d='M55 95 l10 10 M65 95 l-10 10' class='i'/%3E%3C/g%3E%3Cg stroke='%2348c6ef'%3E%3Ccircle cx='100' cy='100' r='14' class='c'/%3E%3Cpath d='M96 96 q4-4 8 0 t8 0' class='i'/%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundSize: '100px 100px',
                    backgroundPosition: `${gyro.x * 0.3}px ${gyro.y * 0.3}px`,
                    filter: `hue-rotate(${gyro.x * 1.5}deg)`,
                    maskImage: 'radial-gradient(circle at center, black 25%, transparent 95%)'
                }}
            />

            {/* Official Spanish Coat of Arms Watermark (Low Opacity) */}
            <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none overflow-hidden">
                <svg viewBox="0 0 100 100" className="w-[65%] h-auto text-current fill-none stroke-current stroke-[0.2]">
                    <path d="M50 5 L75 5 L75 45 C75 65 50 95 50 95 C50 95 25 65 25 45 L25 5 Z" />
                    <circle cx="50" cy="30" r="10" />
                    <path d="M25 45 Q50 35 75 45" />
                    <path d="M50 20 V80" />
                    <path d="M40 30 H60" />
                </svg>
            </div>

            {/* Guilloche / Security Pattern - Complex Spirograph Mesh */}
            <div className="absolute inset-0 z-0 opacity-[0.04] dark:opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='160' height='160' viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 80 C 40 10, 120 150, 160 80' stroke='%23000' stroke-width='0.1' fill='none'/%3E%3Cpath d='M0 80 C 40 150, 120 10, 160 80' stroke='%23000' stroke-width='0.1' fill='none'/%3E%3Cpath d='M80 0 C 10 40, 150 120, 80 160' stroke='%23000' stroke-width='0.1' fill='none'/%3E%3Cpath d='M80 0 C 150 40, 10 120, 80 160' stroke='%23000' stroke-width='0.1' fill='none'/%3E%3Cpath d='M0 0 Q 80 160 160 0' stroke='%23000' stroke-width='0.05' fill='none'/%3E%3Cpath d='M0 160 Q 80 0 160 160' stroke='%23000' stroke-width='0.05' fill='none'/%3E%3C/svg%3E")`,
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Glass Background Content Plate - Improves Readability over mesh */}
            <div className={cn(
                "absolute inset-[5%] z-0 rounded-[2rem] pointer-events-none opacity-50",
                isDarkTheme ? "bg-slate-800/20" : "bg-white/30"
            )} />

            {/* Official Header */}
            <div className={cn(
                "relative z-10 flex flex-row items-center px-4 md:px-6 py-2 md:py-3 border-b",
                isDarkTheme ? "border-slate-700/50 bg-slate-700/20" : "border-indigo-900/10 bg-indigo-50/50"
            )}>
                {/* EU Flag Hologram Icon - Rectangular and Sharp */}
                <div 
                    className="relative flex items-center justify-center w-10 h-7 md:w-12 md:h-8 bg-[#003399] rounded-sm overflow-hidden shrink-0 shadow-lg mr-3 md:mr-4 border border-white/20 group/eu"
                    style={{
                        transform: !isStatic ? `perspective(500px) rotateY(${gyro.x * 0.2}deg) rotateX(${-gyro.y * 0.2}deg)` : 'none',
                        transition: 'transform 0.1s ease-out'
                    }}
                >
                    {/* EU 12 Stars Circle - Razor Sharp Vector Stars */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-90">
                        <svg viewBox="0 0 100 100" className="w-full h-full p-0.5 filter-none">
                            {[...Array(12)].map((_, i) => (
                                <polygon 
                                    key={i}
                                    points="50,11 52.5,18 59.5,18 54,22.5 56,29.5 50,25 44,29.5 46,22.5 40.5,18 47.5,18"
                                    fill="#FFCC00" 
                                    transform={`rotate(${i * 30}, 50, 50)`}
                                    style={{ filter: 'none' }}
                                />
                            ))}
                        </svg>
                    </div>

                    <span className="relative z-10 text-white font-black text-[10px] md:text-xs tracking-tighter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                        {countryCode}
                    </span>

                    {/* Holographic Refraction Layer - Sharp Metallic Shine */}
                    {!isStatic && (
                        <div 
                            className="absolute inset-[-200%] opacity-0 group-hover/eu:opacity-100 transition-opacity duration-700 pointer-events-none"
                            style={{
                                background: `linear-gradient(135deg, 
                                    transparent 30%, 
                                    rgba(255, 255, 255, 0.6) 45%, 
                                    rgba(255, 255, 255, 0.8) 50%, 
                                    rgba(255, 255, 255, 0.6) 55%, 
                                    transparent 70%
                                )`,
                                transform: `translateX(${(gyro.x) * 4}%) translateY(${(gyro.y) * 4}%) rotate(25deg)`,
                                mixBlendMode: 'overlay'
                            }}
                        />
                    )}
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

                {/* Laser Hologram Shield OR Share Action */}
                <div className="shrink-0 ml-auto flex items-center justify-center relative z-40">
                    {!isStatic && shareActionControl ? (
                        shareActionControl
                    ) : (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-tr from-cyan-400/20 via-fuchsia-500/20 to-yellow-400/20 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden group/holo">
                            <ShieldCheck size={18} className={isDarkTheme ? "text-zinc-300 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]" : "text-indigo-500"} />
                        </div>
                    )}
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 p-3 md:p-5 flex flex-row items-start gap-3 md:gap-5 z-10 relative mt-0">
                {/* Left Side: Photo Area */}
                <div className="flex flex-col gap-2 shrink-0">
                    <div className={cn(
                        "w-20 h-28 sm:w-24 sm:h-[120px] md:w-[100px] md:h-[136px] rounded-xl md:rounded-2xl overflow-hidden border-2 shadow-inner relative group/photo",
                        isDarkTheme ? "border-white/10 bg-black/40" : "border-slate-200/80 bg-slate-50",
                        !isStatic && "cursor-pointer active:scale-[0.98] transition-all",
                        isUploading && "opacity-50"
                    )}
                    onClick={!isStatic ? onPhotoClick : undefined}
                    >
                        {photoUrl && !imageError ? (
                                <img
                                    src={photoUrl}
                                    alt="Driver"
                                    crossOrigin="anonymous"
                                    className="w-full h-full object-cover transition-all"
                                    onError={() => setImageError && setImageError(true)}
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

                        {/* Premium Corner Frames */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/40 rounded-tl-sm shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/40 rounded-tr-sm shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/40 rounded-bl-sm shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/40 rounded-br-sm shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                        </div>
                    </div>

                </div>

                {/* Right Side Info */}
                <div className="flex-1 min-w-0 flex flex-col mt-0 md:mt-2">
                    <div className="flex-1 min-w-0 flex flex-row items-center justify-between gap-4 md:gap-6 overflow-visible">
                        <div className="grid grid-cols-1 gap-y-2 md:gap-y-3 flex-1 min-w-0 max-w-[65%] sm:max-w-none">
                            <Field label={localeConfig.fields.name} value={fullName} />

                            <div className="grid grid-cols-2 gap-2">
                                <Field 
                                    label={localeConfig.fields.location} 
                                    value={
                                        <button 
                                            onClick={!isStatic ? (e) => { e.stopPropagation(); onLocationClick?.(); } : undefined}
                                            disabled={isStatic}
                                            className={cn(
                                                "text-left transition-all group/loc focus:outline-none flex items-center gap-1",
                                                !isStatic && "active:scale-95",
                                                examCity ? "text-indigo-400 hover:text-indigo-300" : "text-slate-500 hover:text-indigo-400"
                                            )}
                                        >
                                            <span className="truncate">
                                                {examCity || (selectedCountry === 'ru' ? '[ВЫБРАТЬ]' : '[ELEGIR]')}
                                            </span>
                                        </button>
                                    } 
                                />

                                <Field
                                    label={localeConfig.fields.examDate}
                                    value={
                                        <button 
                                            onClick={!isStatic ? (e) => { e.stopPropagation(); onDateClick?.(); } : undefined}
                                            disabled={isStatic}
                                            className={cn(
                                                "text-left transition-all group/goal focus:outline-none",
                                                !isStatic && "active:scale-95",
                                                daysUntilExam !== null ? "text-indigo-400 hover:text-indigo-300" : "text-slate-500 hover:text-indigo-400"
                                            )}
                                        >
                                            {daysUntilExam !== null ? (
                                                <span className="flex items-center gap-1.5">
                                                    <span className={cn(!isStatic && "animate-pulse")}>
                                                        {selectedCountry === 'ru' 
                                                            ? `${daysUntilExam} ${daysUntilExam === 1 ? 'Д.' : 'ДН.'}` 
                                                            : `${daysUntilExam} DÍAS`}
                                                    </span>
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-[10px] md:text-xs">
                                                    <span className="opacity-50">--.--.--</span>
                                                </span>
                                            )}
                                        </button>
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-[-2px]">
                                <Field 
                                    label={localeConfig.fields.streak} 
                                    value={
                                        <span className="flex items-center gap-1.5">
                                            <span className="text-amber-500 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                                                {stats.currentStreak} 
                                                {language === 'ru' ? ' ДН.' : language === 'es' ? ' DÍAS' : ' DAYS'}
                                            </span>
                                        </span>
                                    } 
                                />

                                <div className="flex flex-col">
                                    <span className={cn(
                                        "text-[7px] sm:text-[8px] md:text-[9px] font-bold tracking-tight mb-0.5",
                                        isDarkTheme ? "text-slate-400/80" : "text-black/60"
                                    )}>
                                        {localeConfig.fields.cat}
                                    </span>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            import('@/store/modalStore').then(m => m.useModalStore.getState().openModal('CONTEXT_SETTINGS'));
                                        }}
                                        className={cn(
                                            "w-fit px-2 py-0.5 rounded-md border text-[10px] font-black leading-none transition-all active:scale-95 hover:brightness-110",
                                            isDarkTheme ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-indigo-100 border-indigo-300 text-indigo-700"
                                        )}
                                    >
                                        B
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-[45%_55%] gap-2 md:gap-4">
                                <Field label={localeConfig.fields.issuer} value={localeConfig.fields.issuerVal} />
                                <Field 
                                    label={localeConfig.fields.id} 
                                    value={
                                        <button 
                                            onClick={!isStatic ? (e) => { e.stopPropagation(); onPromoClick?.(); } : undefined}
                                            disabled={isStatic}
                                            className={cn(
                                                "flex items-center gap-1.5 group/promo transition-transform focus:outline-none",
                                                !isStatic && "active:scale-95"
                                            )}
                                            title="Скопировать ссылку-приглашение"
                                        >
                                            <span className={cn(
                                                "font-mono transition-colors uppercase text-sm md:text-[15px] font-black tracking-tighter truncate",
                                                isDarkTheme ? "text-zinc-200" : "text-slate-900"
                                            )}>
                                                {displayCode}
                                            </span>
                                            {!isStatic && hasReferralCode && <Copy size={13} className="text-zinc-500/30 group-hover:text-zinc-500 transition-colors shrink-0" />}
                                        </button>
                                    } 
                                />
                            </div>
                        </div>

                        {/* Points Indicator & Signature */}
                        <div className="flex flex-col items-center gap-1 shrink-0 z-20 pr-1 md:pr-4">
                            <div
                                onClick={!isStatic ? onPointsClick : undefined}
                                className={cn(
                                    "w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] md:w-[110px] md:h-[110px] flex items-center justify-center overflow-visible",
                                    !isStatic && "cursor-pointer transition-transform active:scale-95"
                                )}
                            >
                                <div className="scale-[0.28] sm:scale-[0.38] md:scale-[0.55] origin-center shrink-0 overflow-visible">
                                    <PuntosIndicator 
                                        currentPoints={points} 
                                        isDarkTheme={isDarkTheme} 
                                        isStatic={isStatic}
                                    />
                                </div>
                            </div>

                            {/* Signature Area (Firma) - Now under the Points circle */}
                            <div className="flex flex-col items-center mt-1 sm:mt-2 md:mt-3 scale-[0.7] sm:scale-[0.85] md:scale-100">
                                <span className={cn(
                                    "text-[6px] font-bold uppercase tracking-widest opacity-40 mb-1",
                                    isDarkTheme ? "text-white" : "text-black"
                                )}>7. Firma</span>
                                <div className="relative w-24 h-10 md:w-32 md:h-12 flex items-center justify-center">
                                    <img 
                                        src="/skily-signature.png" 
                                        alt="Signature" 
                                        className={cn(
                                            "w-full h-full object-contain filter",
                                            isDarkTheme ? "invert opacity-95 contrast-[2.5]" : "contrast-[2.0] brightness-50"
                                        )}
                                        style={{ transform: 'rotate(-4deg)' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MRZ Zone / Machine Readable Zone - Raised Up */}
            <div className={cn(
                "mt-auto px-6 py-2 pb-6 font-mono text-[7px] md:text-[8px] tracking-[0.4em] opacity-40 select-none overflow-hidden whitespace-nowrap border-none text-left",
                isDarkTheme ? "text-zinc-400" : "text-slate-900"
            )}>
                {(() => {
                    const translit = (text: string) => {
                        const map: Record<string, string> = {
                            'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'E','Ж':'ZH','З':'Z','И':'I','Й':'Y','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R','С':'S','Т':'T','У':'U','Ф':'F','Х':'KH','Ц':'TS','Ч':'CH','Ш':'SH','Щ':'SHCH','Ъ':'','Ы':'Y','Ь':'','Э':'E','Ю':'YU','Я':'YA'
                        };
                        return (text || '').toUpperCase().split('').map(char => map[char] || char).join('');
                    };
                    const nameParts = (fullName || '').split(' ');
                    const surname = translit(nameParts[nameParts.length - 1] || '');
                    const name = translit(nameParts[0] || '');
                    const country = countryCode === 'RUS' ? 'RUS' : 'ESP';
                    const mrz = `ID${country}${globalId.replace('ID-', '')}<<${surname}<<${name}<<<<<<<<<<<<<<<<<<<<<<`.substring(0, 44);
                    return (
                        <div className="pointer-events-none">
                            {mrz}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};
