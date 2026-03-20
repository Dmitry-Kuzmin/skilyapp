import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, Motion } from '@/components/optimized/Motion';
import { Sparkles, Zap, Shield, Trophy, Clock, Target, Swords, AlertCircle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const IconMap = {
    Sparkles: <Sparkles className="w-5 h-5 text-cyan-400" />,
    Zap: <Zap className="w-5 h-5 text-yellow-400" />,
    Shield: <Shield className="w-5 h-5 text-blue-400" />,
    Trophy: <Trophy className="w-5 h-5 text-purple-400" />,
    Clock: <Clock className="w-5 h-5 text-emerald-400" />,
    Target: <Target className="w-5 h-5 text-rose-400" />
};

interface DuelLoadingViewProps {
    loading: boolean;
    questionsCount?: number;
    message?: string;
    onExit?: () => void;
    isError?: boolean;
}

export function DuelLoadingView({
    loading,
    questionsCount = 0,
    message,
    onExit,
    isError = false
}: DuelLoadingViewProps) {
    const { t } = useLanguage();

    const tips = useMemo(() => [
        { icon: 'Zap', text: t('duelBattle.arena.tips.boosts') },
        { icon: 'Shield', text: t('duelBattle.arena.tips.insurance') },
        { icon: 'Target', text: t('duelBattle.arena.tips.speed') },
        { icon: 'Trophy', text: t('duelBattle.arena.tips.combo') },
        { icon: 'Sparkles', text: t('duelBattle.arena.tips.premium') },
        { icon: 'Clock', text: t('duelBattle.arena.tips.time') }
    ], [t]);

    const [currentTip, setCurrentTip] = useState(tips[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTip(prev => {
                const nextIdx = (tips.indexOf(prev) + 1) % tips.length;
                return tips[nextIdx];
            });
        }, 4000);
        return () => clearInterval(interval);
    }, [tips]);

    const displayMessage = message || t('duelBattle.arena.loadingArena');

    if (isError) {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#06080F] flex flex-col items-center justify-center p-6 text-center">
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), 
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}></div>

                <div className="relative z-10 space-y-6 max-w-sm">
                    <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{t('duelBattle.arena.errors.somethingWrong')}</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">{t('duelBattle.arena.errors.duelError')}</p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={() => window.location.reload()}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold uppercase tracking-widest text-sm shadow-[0_0_25px_rgba(79,70,229,0.4)] transition-all active:scale-95"
                        >
                            {t('duelBattle.arena.errors.reload')}
                        </Button>

                        <Button
                            onClick={() => {
                                if (onExit) onExit();
                                window.location.href = '/';
                            }}
                            variant="outline"
                            className="w-full h-12 bg-white/5 border-white/10 hover:bg-white/10 text-white/70 rounded-2xl uppercase tracking-widest text-xs font-bold transition-all"
                        >
                            {t('duelBattle.arena.errors.toDashboard')}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Motion>
            <div className="fixed inset-0 z-[9999] bg-[#06080F] flex flex-col items-center justify-center overflow-hidden font-sans">
                {/* Ambient Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

                {/* Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.05]" style={{
                    backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), 
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}></div>

                <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-2xl px-6">

                    {/* Cyber-Ring Animation */}
                    <div className="relative w-64 h-64 md:w-80 md:h-80 flex flex-col items-center justify-center">
                        {/* Ring 1 - Outer Slow */}
                        <div className="absolute inset-0 rounded-full border border-white/5 border-t-indigo-500/50 animate-[spin_4s_linear_infinite]" />

                        {/* Ring 2 - Inner Fast Reverse */}
                        <div className="absolute inset-6 md:inset-8 rounded-full border border-white/5 border-b-purple-500/50 animate-[spin_2.5s_linear_infinite_reverse]" />

                        {/* Ring 3 - Dashed Core */}
                        <div className="absolute inset-12 md:inset-16 outline outline-1 outline-dashed outline-white/10 rounded-full animate-[spin_6s_linear_infinite]" />

                        {/* Core Content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0 flex flex-col items-center justify-center z-10 text-center px-4"
                        >
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/10 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                                <Swords className="w-8 h-8 text-indigo-400" />
                            </div>
                            <span className="text-white/40 text-[10px] font-bold tracking-[0.3em] uppercase mb-1">Duel Arena</span>
                            <div className="h-px w-8 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent mb-2" />
                            <span className="text-white font-black text-base sm:text-xl tracking-tight sm:tracking-[0.1em] uppercase text-center leading-tight">
                                {loading ? (
                                    <motion.span
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        {displayMessage}
                                    </motion.span>
                                ) : (
                                    t('duelBattle.arena.battleStarts')
                                )}
                            </span>
                        </motion.div>
                    </div>

                    {/* Tips Section */}
                    <div className="relative h-24 w-full flex items-center justify-center -mt-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentTip.text}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute inset-0 flex flex-col items-center justify-center text-center px-4"
                            >
                                <div className="flex items-center gap-3 mb-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                                    {IconMap[currentTip.icon as keyof typeof IconMap] || <Sparkles className="w-4 h-4 text-cyan-400" />}
                                    <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">{t('duelBattle.arena.tips.label')}</span>
                                </div>
                                <p className="text-sm md:text-base text-zinc-300 max-w-md font-medium leading-relaxed">
                                    {currentTip.text}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Progress Text */}
                    <div className="text-[10px] font-mono tracking-[0.4em] text-white/30 uppercase">
                        {questionsCount > 0 ? t('duelBattle.arena.loadedQuestions', { count: questionsCount }) : t('duelBattle.arena.syncingData')}
                    </div>
                </div>

                {/* Footer Branding */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-20">
                    <div className="text-[8px] font-mono tracking-[0.6em] text-white/50">
                        S K I L Y  A R E N A  X
                    </div>
                </div>
            </div>
        </Motion>
    );
}
