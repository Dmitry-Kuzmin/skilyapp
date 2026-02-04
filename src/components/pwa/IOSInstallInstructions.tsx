import { motion, AnimatePresence } from 'framer-motion';
import { Share, PlusSquare, X } from 'lucide-react';
import React from 'react';

interface IOSInstallInstructionsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const IOSInstallInstructions: React.FC<IOSInstallInstructionsProps> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[101] bg-[#1c1c1e] text-white rounded-t-2xl p-6 shadow-2xl safe-area-bottom pb-10"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold">Установка приложения</h3>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Step 1 */}
                            <div className="flex items-start gap-4">
                                <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-lg">
                                    1
                                </div>
                                <div>
                                    <p className="text-zinc-300 text-sm mb-2">
                                        Нажмите кнопку <span className="font-semibold text-blue-400">"Поделиться"</span> внизу экрана Safari
                                    </p>
                                    <div className="flex items-center gap-2 text-zinc-500 text-xs">
                                        <Share className="w-5 h-5 text-blue-500" />
                                        <span>Иконка выглядит так</span>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex items-start gap-4">
                                <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-lg">
                                    2
                                </div>
                                <div>
                                    <p className="text-zinc-300 text-sm mb-2">
                                        Прокрутите вниз и выберите <span className="font-semibold text-white">"На экран «Домой»"</span>
                                    </p>
                                    <div className="flex items-center gap-2 text-zinc-500 text-xs">
                                        <PlusSquare className="w-5 h-5 text-zinc-300" />
                                        <span>Может называться "Add to Home Screen"</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Visual Pointer logic could go here, but usually just pointing down works */}
                        <div className="mt-8 flex justify-center animate-bounce">
                            <div className="text-zinc-500 text-xs flex flex-col items-center gap-1">
                                <span>Кнопка внизу</span>
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M12 5v14M19 12l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Fake Home Bar for iPhone Aesthetics */}
                        <div className="w-full flex justify-center mt-6">
                            <div className="w-32 h-1 bg-white/20 rounded-full" />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
