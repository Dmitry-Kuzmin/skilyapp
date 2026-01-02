import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { ShieldCheck, Rocket, User } from 'lucide-react';
import { LandingLogo } from '@/components/landing/LandingLogo';
import { useLanguage } from '@/contexts/LanguageContext';

interface AuthModalHeaderProps {
    step: string;
    userName: string | null;
    userAvatar: string | null;
    email: string;
    onAvatarError: () => void;
}

export function AuthModalHeader({
    step,
    userName,
    userAvatar,
    email,
    onAvatarError
}: AuthModalHeaderProps) {
    const { t } = useLanguage();

    const isSuccessScreen = step === 'password-recovery' || step === 'check-email';

    if (isSuccessScreen) return null;

    return (
        <div className={`flex flex-col items-center mb-6 justify-end transition-all duration-500 min-h-[140px]`}>
            <AnimatePresence mode="wait">
                {step !== 'email' ? (
                    /* Avatar State - Show for all non-email steps where user is identified */
                    <motion.div
                        key="avatar"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="relative mb-2 mt-2"
                    >
                        {/* Rotating Gradient Border */}
                        <div className="absolute -inset-[3px] rounded-full bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 animate-spin-slow opacity-70 blur-[1px]" />

                        <div className="relative rounded-full z-10 bg-zinc-950 p-[2px]">
                            {userAvatar ? (
                                <img
                                    src={userAvatar}
                                    alt={userName || "User"}
                                    className="w-20 h-20 rounded-full border-2 border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)] object-cover"
                                    onError={onAvatarError}
                                />
                            ) : step === 'magic-link-new' ? (
                                /* Newcomer Rocket Avatar */
                                <div className="w-20 h-20 rounded-full border-2 border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.3)] bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center">
                                    <Rocket className="w-10 h-10 text-white animate-levitate" />
                                </div>
                            ) : (
                                /* Fallback - First Letter Avatar */
                                <div className="w-20 h-20 rounded-full border-2 border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)] bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-white">
                                        {(userName || email || 'U').charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                        {/* Verified Shield Badge - Only for existing users */}
                        {step !== 'magic-link-new' && (
                            <div className="absolute -bottom-1 -right-1 bg-zinc-950 rounded-full p-1 border border-zinc-800 z-20">
                                <ShieldCheck className="w-4 h-4 text-green-500 fill-green-500/20" />
                            </div>
                        )}
                        {/* New User Badge */}
                        {step === 'magic-link-new' && (
                            <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-lg px-2 py-0.5 border border-blue-400 z-20 shadow-lg">
                                <span className="text-[9px] font-black text-white uppercase tracking-tighter">New Pilot</span>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    /* Logo State */
                    <motion.div
                        key="logo"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="mb-4"
                    >
                        <LandingLogo variant="bold" showText={false} className="mx-auto" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dynamic Headings */}
            <motion.div layout className="text-center w-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col items-center"
                    >
                        <h2 className="text-2xl font-semibold text-white tracking-tight">
                            {step === 'email' && t('auth.identification')}
                            {step === 'password-existing' && (userName ? t('auth.welcomeBackWithName', { name: userName }) : t('auth.welcomeBack'))}
                            {step === 'magic-link-new' && 'Регистрация'}
                            {step === 'magic-link-existing' && 'Вход без пароля'}
                            {step === 'check-email' && 'Проверьте почту'}
                        </h2>

                        <p className="text-sm text-zinc-400 mt-4 font-medium">
                            {step === 'email' && t('auth.emailPrompt')}
                            {step === 'password-existing' && (userName ? t('auth.continueProgress') : t('auth.accountVerified'))}
                            {step === 'magic-link-new' && t('auth.newUser')}
                            {step === 'magic-link-existing' && 'Мы отправим безопасную ссылку прямо к вам в почтовый ящик'}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
