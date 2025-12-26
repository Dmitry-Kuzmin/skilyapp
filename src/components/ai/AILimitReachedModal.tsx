import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Battery, Clock, Crown, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { triggerHapticFeedback } from '@/lib/telegram';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from '@/components/ui/drawer';

interface AILimitReachedModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCount: number;
    limit: number;
    message?: string;
}

// Shared content component for both modal and drawer
const AILimitContent: React.FC<{
    currentCount: number;
    limit: number;
    message?: string;
    timeUntilReset: string;
    onUpgrade: () => void;
    onClose: () => void;
    progress: number;
}> = ({ currentCount, limit, message, timeUntilReset, onUpgrade, onClose, progress }) => (
    <>
        {/* Battery Animation */}
        <div className="flex justify-center mb-6">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="relative"
            >
                {/* Battery Container */}
                <div className="relative w-20 h-32 rounded-2xl bg-gradient-to-b from-slate-700 to-slate-800 border-4 border-slate-600 overflow-hidden">
                    {/* Battery Top */}
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-8 h-3 rounded-t-lg bg-slate-600" />

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
                        <Zap className="w-8 h-8 text-white/80" strokeWidth={2.5} />
                    </motion.div>
                </div>

                {/* Sparks */}
                <motion.div
                    animate={{
                        opacity: [0, 1, 0],
                        y: [-15, -30],
                        x: [0, 8],
                    }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
                    className="absolute -top-1 right-0"
                >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                </motion.div>
            </motion.div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-center text-white mb-2">
            Skily устал 😴
        </h2>

        {/* Message */}
        <p className="text-center text-slate-400 mb-5 text-sm leading-relaxed px-2">
            {message || 'Ого, ты сегодня в ударе! 🚀 Skily нужно перезарядить батарейки. Он вернётся завтра, или разблокируй безлимит с Premium!'}
        </p>

        {/* Usage Progress */}
        <div className="mb-5">
            <div className="flex justify-between items-center mb-2 text-xs">
                <span className="text-slate-500">Использовано сегодня</span>
                <span className="text-slate-400 font-medium">{currentCount}/{limit}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                />
            </div>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-5 py-2.5 px-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-400">
                Сброс через <span className="text-white font-semibold">{timeUntilReset}</span>
            </span>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-2.5">
            {/* Premium Button */}
            <Button
                onClick={onUpgrade}
                className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:via-orange-400 hover:to-amber-400 text-white shadow-lg shadow-orange-500/25 border-0 relative overflow-hidden group"
            >
                {/* Shine Effect */}
                <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                />
                <div className="relative flex items-center justify-center gap-2">
                    <Crown className="w-5 h-5" />
                    <span>Разблокировать безлимит</span>
                </div>
            </Button>

            {/* Wait Button */}
            <Button
                variant="ghost"
                onClick={onClose}
                className="w-full h-10 text-sm font-medium text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 rounded-xl"
            >
                Подожду до завтра
            </Button>
        </div>

        {/* Premium Benefits */}
        <div className="mt-5 pt-4 border-t border-slate-800">
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
        </div>
    </>
);

export const AILimitReachedModal: React.FC<AILimitReachedModalProps> = ({
    isOpen,
    onClose,
    currentCount,
    limit,
    message
}) => {
    const navigate = useNavigate();
    const [timeUntilReset, setTimeUntilReset] = useState<string>('');
    const isMobile = useIsMobile();

    // Вычисляем время до полуночи (сброс лимита)
    useEffect(() => {
        const calculateTimeUntilMidnight = () => {
            const now = new Date();
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0);

            const diff = midnight.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            // Если 0 часов — показываем только минуты
            if (hours === 0) {
                return `${minutes}м`;
            }
            return `${hours}ч ${minutes}м`;
        };

        setTimeUntilReset(calculateTimeUntilMidnight());

        const interval = setInterval(() => {
            setTimeUntilReset(calculateTimeUntilMidnight());
        }, 60000);

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

    // На мобильных — используем Vaul Drawer с физикой
    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DrawerContent className="bg-slate-950/95 border-slate-800 max-h-[90vh]">
                    <DrawerHeader className="sr-only">
                        <DrawerTitle>Лимит AI исчерпан</DrawerTitle>
                        <DrawerDescription>Skily устал и нужно время на перезарядку</DrawerDescription>
                    </DrawerHeader>
                    <div className="px-6 pb-8 pt-2 overflow-y-auto">
                        <AILimitContent
                            currentCount={currentCount}
                            limit={limit}
                            message={message}
                            timeUntilReset={timeUntilReset}
                            onUpgrade={handleUpgrade}
                            onClose={onClose}
                            progress={progress}
                        />
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    // На десктопе — используем Portal Modal
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
                        className="w-full max-w-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative overflow-hidden rounded-3xl bg-slate-950 border border-white/10 shadow-2xl">
                            {/* Animated Background Glow */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
                                className="absolute top-3 right-3 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
                            >
                                <X className="w-4 h-4 text-white/60" />
                            </button>

                            {/* Content */}
                            <div className="relative p-6 pt-8">
                                <AILimitContent
                                    currentCount={currentCount}
                                    limit={limit}
                                    message={message}
                                    timeUntilReset={timeUntilReset}
                                    onUpgrade={handleUpgrade}
                                    onClose={onClose}
                                    progress={progress}
                                />
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
