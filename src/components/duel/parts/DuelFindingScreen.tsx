import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Coins, Shield, Clock, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getImageUrl } from '@/utils/imageUtils';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface DuelFindingScreenProps {
    userName: string | null;
    userPhotoUrl: string | null;
    betAmount: number;
    questionCount: number;
    insuranceEnabled: boolean;
    onCancel: () => void;
    rematchOpponent?: { name?: string } | null;
}

export function DuelFindingScreen({
    userName,
    userPhotoUrl,
    betAmount,
    questionCount,
    insuranceEnabled,
    onCancel,
    rematchOpponent
}: DuelFindingScreenProps) {
    const { t } = useLanguage();

    return (
        <div className="fixed inset-0 z-[9999] bg-[#06080F] flex flex-col items-center justify-center overflow-hidden font-sans">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), 
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
            }}></div>

            <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-lg px-6">

                {/* Main Circular Matchmaking Container */}
                <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">

                    {/* Animated Rings (Cyber-Radar) */}
                    {/* Outer slow pulse */}
                    <motion.div
                        animate={{ scale: [1, 1.4], opacity: [0.3, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full border-2 border-blue-500/20"
                    />

                    {/* Middle steady pulsing ring */}
                    <motion.div
                        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="absolute inset-4 rounded-full border border-blue-400/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                    />

                    {/* inner spinning ring */}
                    <div className="absolute inset-8 rounded-full border-2 border-transparent border-t-blue-500/40 animate-[spin_3s_linear_infinite]" />
                    <div className="absolute inset-10 rounded-full border-2 border-transparent border-b-indigo-500/30 animate-[spin_5s_linear_infinite_reverse]" />

                    {/* Central Area: Avatar or Icon */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative z-10 w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.3)] bg-slate-900/50 backdrop-blur-md flex items-center justify-center group"
                    >
                        {userPhotoUrl ? (
                            <img
                                src={getImageUrl(userPhotoUrl)}
                                className="w-full h-full object-cover"
                                alt={userName || 'User'}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                <User className="w-12 h-12 text-slate-500 mb-1" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{userName || 'Player'}</span>
                            </div>
                        )}

                        {/* Overlay scan effect */}
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-blue-500/5 opacity-50" />
                        <motion.div
                            animate={{ top: ['-100%', '200%'] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-1 bg-blue-500/20 blur-[2px]"
                        />
                    </motion.div>

                    {/* Floating Info Elements around the circle */}
                    {/* Bet Info - Top Right */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="absolute top-0 -right-4 bg-slate-900/80 backdrop-blur-md border border-amber-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg shadow-amber-500/10"
                    >
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-black text-white">{betAmount}</span>
                    </motion.div>

                    {/* Questions Info - Top Left */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="absolute top-0 -left-4 bg-slate-900/80 backdrop-blur-md border border-blue-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg shadow-blue-500/10"
                    >
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs font-black text-white">{questionCount}</span>
                    </motion.div>

                    {insuranceEnabled && (
                        /* Insurance Info - Bottom */
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="absolute -bottom-4 bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg shadow-emerald-500/10"
                        >
                            <Shield className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">{t('duelMenu.finding.insurance')}</span>
                        </motion.div>
                    )}
                </div>

                {/* Status Column */}
                <div className="text-center space-y-6">
                    <div className="space-y-4">
                        <motion.h3
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-2xl font-black text-white uppercase tracking-[0.2em]"
                        >
                            {rematchOpponent ? t('duelMenu.finding.rematchTitle') : t('duelMenu.finding.searchTitle')}
                        </motion.h3>

                        <div className="space-y-2">
                            {userName && (
                                <div className="text-blue-400 font-black text-sm uppercase tracking-widest">
                                    {userName}
                                </div>
                            )}
                            <p className="text-slate-400 text-sm font-medium max-w-[280px] mx-auto leading-relaxed h-10 flex items-center justify-center">
                                {rematchOpponent
                                    ? t('duelMenu.finding.waitingForResponse', { name: rematchOpponent.name || t('duelMenu.finding.opponentFallback') })
                                    : t('duelMenu.finding.searchSubtitle')}
                            </p>
                        </div>
                    </div>

                    {/* Progress Loader Dots */}
                    <div className="flex items-center justify-center gap-2">
                        {[0, 1, 2, 3].map(i => (
                            <motion.div
                                key={i}
                                animate={{
                                    scale: [1, 1.4, 1],
                                    opacity: [0.3, 1, 0.3],
                                    backgroundColor: ['#3b82f6', '#818cf8', '#3b82f6']
                                }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                className="w-2 h-2 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                            />
                        ))}
                    </div>
                </div>

                {/* Cancel Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="pt-4"
                >
                    <Button
                        onClick={onCancel}
                        variant="outline"
                        className="bg-red-500/5 border-red-500/20 hover:bg-red-500/10 text-red-400 rounded-2xl px-8 h-12 uppercase tracking-widest text-xs font-black transition-all active:scale-95 group"
                    >
                        <X className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
                        {t('duelMenu.finding.cancel')}
                    </Button>
                </motion.div>
            </div>

            {/* Subliminal Brand Footer */}
            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center opacity-20 pointer-events-none">
                <div className="flex items-center gap-4 text-[9px] font-mono tracking-[0.5em] text-white/50 uppercase">
                    <span>Multiplayer</span>
                    <div className="w-1 h-1 bg-white/30 rounded-full" />
                    <span>Realtime Sync</span>
                    <div className="w-1 h-1 bg-white/30 rounded-full" />
                    <span>Fair Play</span>
                </div>
            </div>
        </div>
    );
}
