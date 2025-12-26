import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Battery, Clock, Crown, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { triggerHapticFeedback } from '@/lib/telegram';

interface AILimitReachedModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCount: number;
    limit: number;
    message?: string;
}

export const AILimitReachedModal: React.FC<AILimitReachedModalProps> = ({
    isOpen,
    onClose,
    currentCount,
    limit,
    message
}) => {
    const navigate = useNavigate();
    const [timeUntilReset, setTimeUntilReset] = useState<string>('');

    // Вычисляем время до полуночи (сброс лимита)
    useEffect(() => {
        const calculateTimeUntilMidnight = () => {
            const now = new Date();
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0);

            const diff = midnight.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            return `${hours}ч ${minutes}м`;
        };

        setTimeUntilReset(calculateTimeUntilMidnight());

        const interval = setInterval(() => {
            setTimeUntilReset(calculateTimeUntilMidnight());
        }, 60000); // Обновляем каждую минуту

        return () => clearInterval(interval);
    }, []);

    // Вибрация при открытии
    useEffect(() => {
        if (isOpen) {
            triggerHapticFeedback('warning');
        }
    }, [isOpen]);

    const handleUpgrade = () => {
        triggerHapticFeedback('light');
        onClose();
        navigate('/shop?tab=premium');
    };

    const progress = Math.min((currentCount / limit) * 100, 100);

    // Используем Portal, чтобы модалка была поверх всего (решает проблему с z-index)
    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-md max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative overflow-hidden rounded-3xl bg-slate-950 border border-white/10 shadow-2xl">

                            {/* Animated Background Glow */}
                            <div className="absolute inset-0 overflow-hidden">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        opacity: [0.3, 0.5, 0.3],
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-amber-500/20 via-transparent to-transparent"
                                />
                                <motion.div
                                    animate={{
                                        scale: [1.2, 1, 1.2],
                                        opacity: [0.2, 0.4, 0.2],
                                    }}
                                    transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                                    className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-orange-500/20 via-transparent to-transparent"
                                />
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
                            >
                                <X className="w-5 h-5 text-white/60" />
                            </button>

                            {/* Content */}
                            <div className="relative p-6 pt-8">

                                {/* Battery Animation */}
                                <div className="flex justify-center mb-6">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', delay: 0.1 }}
                                        className="relative"
                                    >
                                        {/* Battery Container */}
                                        <div className="relative w-24 h-40 rounded-2xl bg-gradient-to-b from-slate-700 to-slate-800 border-4 border-slate-600 overflow-hidden">
                                            {/* Battery Top */}
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-4 rounded-t-lg bg-slate-600" />

                                            {/* Battery Level */}
                                            <motion.div
                                                initial={{ height: '100%' }}
                                                animate={{ height: '5%' }}
                                                transition={{ duration: 1.5, ease: 'easeOut' }}
                                                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-500 to-red-400"
                                            />

                                            {/* Lightning Bolt */}
                                            <motion.div
                                                animate={{
                                                    opacity: [0.5, 1, 0.5],
                                                    scale: [0.95, 1.05, 0.95],
                                                }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                className="absolute inset-0 flex items-center justify-center"
                                            >
                                                <Zap className="w-10 h-10 text-white/80" strokeWidth={2.5} />
                                            </motion.div>
                                        </div>

                                        {/* Sparks */}
                                        <motion.div
                                            animate={{
                                                opacity: [0, 1, 0],
                                                y: [-20, -40],
                                                x: [0, 10],
                                            }}
                                            transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
                                            className="absolute -top-2 right-0"
                                        >
                                            <Sparkles className="w-4 h-4 text-amber-400" />
                                        </motion.div>
                                        <motion.div
                                            animate={{
                                                opacity: [0, 1, 0],
                                                y: [-20, -35],
                                                x: [0, -10],
                                            }}
                                            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.3 }}
                                            className="absolute -top-2 left-0"
                                        >
                                            <Sparkles className="w-3 h-3 text-orange-400" />
                                        </motion.div>
                                    </motion.div>
                                </div>

                                {/* Title */}
                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-2xl font-bold text-center text-white mb-2"
                                >
                                    Skily устал 😴
                                </motion.h2>

                                {/* Message */}
                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-center text-slate-400 mb-6 text-sm leading-relaxed"
                                >
                                    {message || 'Ты сегодня в ударе! Skily нужно время на перезарядку. Он вернётся завтра, или разблокируй безлимит прямо сейчас!'}
                                </motion.p>

                                {/* Usage Progress */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="mb-6"
                                >
                                    <div className="flex justify-between items-center mb-2 text-xs">
                                        <span className="text-slate-500">Использовано сегодня</span>
                                        <span className="text-slate-400 font-medium">{currentCount}/{limit}</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                                            className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                                        />
                                    </div>
                                </motion.div>

                                {/* Timer */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="flex items-center justify-center gap-2 mb-6 py-3 px-4 bg-slate-800/50 rounded-xl border border-slate-700/50"
                                >
                                    <Clock className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm text-slate-400">
                                        Сброс через <span className="text-white font-semibold">{timeUntilReset}</span>
                                    </span>
                                </motion.div>

                                {/* CTA Buttons */}
                                <div className="space-y-3">
                                    {/* Premium Button */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 }}
                                    >
                                        <Button
                                            onClick={handleUpgrade}
                                            className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:via-orange-400 hover:to-amber-400 text-white shadow-lg shadow-orange-500/25 border-0 relative overflow-hidden group"
                                        >
                                            {/* Shine Effect */}
                                            <motion.div
                                                animate={{
                                                    x: ['-100%', '200%'],
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    repeatDelay: 1,
                                                }}
                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                                            />

                                            <div className="relative flex items-center justify-center gap-2">
                                                <Crown className="w-5 h-5" />
                                                <span>Разблокировать безлимит</span>
                                            </div>
                                        </Button>
                                    </motion.div>

                                    {/* Wait Button */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.7 }}
                                    >
                                        <Button
                                            variant="ghost"
                                            onClick={onClose}
                                            className="w-full h-12 text-sm font-medium text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 rounded-xl"
                                        >
                                            Подожду до завтра
                                        </Button>
                                    </motion.div>
                                </div>

                                {/* Premium Benefits */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="mt-6 pt-4 border-t border-slate-800"
                                >
                                    <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Zap className="w-3 h-3 text-amber-500" />
                                            <span>Безлимит AI</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Battery className="w-3 h-3 text-green-500" />
                                            <span>Полная память</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Sparkles className="w-3 h-3 text-purple-500" />
                                            <span>Приоритет</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default AILimitReachedModal;
