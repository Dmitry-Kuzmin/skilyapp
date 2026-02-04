import { motion, AnimatePresence } from 'framer-motion';
import { Share, PlusSquare, X, MoreHorizontal, ArrowDown } from 'lucide-react';
import React, { useEffect } from 'react';

interface IOSInstallInstructionsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const IOSInstallInstructions: React.FC<IOSInstallInstructionsProps> = ({ isOpen, onClose }) => {
    // Блокируем скролл при открытой шторке
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [isOpen]);

    // Универсальный конфиг под новый iOS (iOS 17/18 стиль с меню справа или Chrome)
    // Мы предполагаем, что меню (три точки) или кнопка настроек находится справа внизу,
    // так как адресная строка сместила всё туда.
    const config = {
        actionButtonIcon: <MoreHorizontal className="w-6 h-6 text-white" />,
        actionButtonName: "Меню (•••) или Поделиться",
        arrowPositionClass: "right-6 translate-x-0", // Правый угол, чуть от края
        helperText: "Нажмите кнопку меню справа",
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] safe-area-bottom">
                    {/* 1. Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    >
                        {/* Animated Arrow & Pointer (Pointing to Bottom Right) */}
                        <div className={`absolute bottom-6 ${config.arrowPositionClass} flex flex-col items-center gap-2 pointer-events-none z-50`}>
                            <motion.div
                                initial={{ y: -20, opacity: 0 }}
                                animate={{
                                    y: 0,
                                    opacity: 1,
                                    transition: {
                                        y: { repeat: Infinity, repeatType: "reverse", duration: 1 },
                                        opacity: { duration: 0.3 }
                                    }
                                }}
                                className="flex flex-col items-center"
                            >
                                <div className="text-white font-semibold text-sm mb-2 drop-shadow-md text-center w-max bg-black/50 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                                    {config.helperText}
                                </div>
                                {/* Стрелка */}
                                <ArrowDown className="w-10 h-10 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" strokeWidth={3} />
                            </motion.div>

                            {/* Pulsing Circle Target */}
                            <motion.div
                                animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0.4, 0.8] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-14 h-14 rounded-full border-4 border-white/30 bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                            />
                        </div>
                    </motion.div>

                    {/* 2. Main Instruction Card */}
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="absolute bottom-[20vh] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-sm"
                    >
                        <div className="bg-[#1c1c1e]/90 backdrop-blur-xl text-white rounded-[32px] p-6 shadow-2xl border border-white/10 relative overflow-hidden">
                            {/* Background Glow */}
                            <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/20 blur-[80px] -z-10 rounded-full pointer-events-none" />

                            <div className="flex justify-between items-center mb-6 pl-2">
                                <div>
                                    <h3 className="text-xl font-bold tracking-tight">Установка</h3>
                                    <p className="text-zinc-400 text-xs font-medium">Бесплатно • Быстро</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Step 1 */}
                                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
                                        1
                                    </div>
                                    <div>
                                        <p className="text-zinc-200 text-sm font-medium leading-snug">
                                            Нажмите <span className="text-white font-bold">Меню</span> или <span className="text-white font-bold">Поделиться</span>
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5 opacity-60">
                                            <MoreHorizontal className="w-4 h-4" />
                                            <span className="text-xs">или</span>
                                            <Share className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <div className="shrink-0 w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold text-lg">
                                        2
                                    </div>
                                    <div>
                                        <p className="text-zinc-200 text-sm font-medium leading-snug">
                                            Выберите <span className="text-white font-bold">"На экран «Домой»"</span>
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5 text-blue-400">
                                            <PlusSquare className="w-4 h-4" />
                                            <span className="text-xs font-semibold">Добавить</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Fake Home Bar for iPhone Aesthetics */}
                            <div className="w-full flex justify-center mt-6 opacity-30">
                                <div className="w-20 h-1 bg-white rounded-full transition-opacity" />
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
