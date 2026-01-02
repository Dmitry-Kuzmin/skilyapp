import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { ArrowLeft, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SuccessScreenProps {
    step: 'check-email' | 'password-recovery';
    email: string;
    userName: string | null;
    resendCooldown: number;
    showResendRecovery: boolean;
    onBack: () => void;
    onResend: () => void;
    onChangeEmail: () => void;
}

export function SuccessScreen({
    step,
    email,
    userName,
    resendCooldown,
    showResendRecovery,
    onBack,
    onResend,
    onChangeEmail
}: SuccessScreenProps) {
    const { t } = useLanguage();

    return (
        <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="relative text-center"
        >
            {/* Back Button */}
            <button
                onClick={onBack}
                className="absolute top-7 left-0 w-10 h-10 flex items-center justify-center rounded-full border border-white/10 text-zinc-500/50 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all group z-20"
            >
                <ArrowLeft className="w-5 h-5 group-active:scale-95 transition-transform" />
            </button>

            {/* Animated Paper Plane Icon */}
            <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="relative w-24 h-24 mx-auto mt-0"
            >
                <div className="absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-30 animate-pulse" />
                <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(59,130,246,0.5)] animate-levitate">
                    <Send className="w-10 h-10 text-white transform rotate-45 translate-x-[-2px] translate-y-[-2px]" />
                </div>
            </motion.div>

            {/* Success Message */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4 mt-6"
            >
                <div className="space-y-2">
                    <h3 className="text-2xl font-extrabold text-white tracking-tight">
                        {step === 'check-email' ? 'Проверьте почту!' : 'Инструкции отправлены!'}
                    </h3>
                    <p className="text-zinc-400 font-medium">
                        {step === 'check-email'
                            ? 'Мы отправили магическую ссылку для входа'
                            : (userName ? `${userName.split(' ')[0]}, проверьте вашу почту` : 'Проверьте вашу почту')
                        }
                    </p>
                </div>

                {/* Email Pill & Time Info */}
                <div className="pt-2 space-y-4 flex flex-col items-center">
                    <div
                        onClick={onChangeEmail}
                        className="group flex items-center gap-2 bg-zinc-900/50 border border-white/10 rounded-full py-1.5 px-5 cursor-pointer hover:bg-zinc-800 hover:border-white/20 transition-all shadow-lg"
                    >
                        <span className="text-blue-400 text-sm font-bold">{email}</span>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest group-hover:text-sky-400">
                            {t('auth.changeEmail')}
                        </span>
                    </div>

                    <div className="space-y-1">
                        <p className="text-[11px] text-zinc-500 font-medium opacity-80">
                            Ссылка будет активна 1 час
                        </p>

                        <AnimatePresence>
                            {(showResendRecovery || (step === 'check-email' && resendCooldown === 0)) && (
                                <motion.button
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    onClick={onResend}
                                    className="text-[11px] text-blue-500/80 hover:text-blue-400 font-semibold underline underline-offset-4 decoration-blue-500/30 transition-colors"
                                >
                                    Не пришло письмо? {step === 'check-email' ? 'Отправить еще раз' : 'Отправить инструкции снова'}
                                </motion.button>
                            )}
                            {step === 'check-email' && resendCooldown > 0 && (
                                <p className="text-[10px] text-zinc-600">
                                    Отправить повторно через {resendCooldown}с
                                </p>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
