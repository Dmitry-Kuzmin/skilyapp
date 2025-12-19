
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, ArrowRight, Ban } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExamFailureModalProps {
    open: boolean;
    reason: string;
    onViewResults: () => void;
}

export function ExamFailureModal({
    open,
    reason,
    onViewResults,
}: ExamFailureModalProps) {
    return (
        <AnimatePresence>
            {open && (
                <Dialog open={open} onOpenChange={() => { }}>
                    <DialogContent
                        className="sm:max-w-md border-none bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden"
                        onInteractOutside={(e) => e.preventDefault()}
                        onEscapeKeyDown={(e) => e.preventDefault()}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-red-500/5 pointer-events-none" />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            className="relative z-10 p-2"
                        >
                            <DialogHeader className="space-y-4">
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.1, 1],
                                            rotate: [0, 10, -10, 0]
                                        }}
                                        transition={{ duration: 0.5, delay: 0.2 }}
                                        className="p-4 rounded-3xl bg-red-500 shadow-lg shadow-red-500/30"
                                    >
                                        <Ban className="w-10 h-10 text-white" />
                                    </motion.div>

                                    <div className="space-y-1">
                                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                                            Экзамен не сдан
                                        </DialogTitle>
                                        <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium text-base">
                                            {reason}
                                        </DialogDescription>
                                    </div>
                                </div>

                                <div className="bg-red-500/10 rounded-2xl p-4 border border-red-500/20 text-center">
                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                        К сожалению, вы допустили критическое количество ошибок. Попробуйте еще раз!
                                    </p>
                                </div>
                            </DialogHeader>

                            <div className="mt-8">
                                <Button
                                    onClick={onViewResults}
                                    className="w-full h-14 rounded-2xl text-lg font-black transition-all duration-300 shadow-xl bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                                >
                                    <motion.div
                                        className="flex items-center gap-2"
                                        whileHover={{ x: 5 }}
                                    >
                                        К РЕЗУЛЬТАТАМ <ArrowRight className="w-5 h-5" />
                                    </motion.div>
                                </Button>
                            </div>
                        </motion.div>
                    </DialogContent>
                </Dialog>
            )}
        </AnimatePresence>
    );
}
