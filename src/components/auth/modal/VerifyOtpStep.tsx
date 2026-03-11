import { useState, useRef, useEffect } from 'react';
import { motion } from '@/components/optimized/Motion';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface VerifyOtpStepProps {
    email: string;
    isSubmitting: boolean;
    onVerify: (otp: string) => void;
    onResend: () => void;
    resendCooldown: number;
    onBackToEmail: () => void;
}

export function VerifyOtpStep({
    email,
    isSubmitting,
    onVerify,
    onResend,
    resendCooldown,
    onBackToEmail
}: VerifyOtpStepProps) {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const inputRef = useRef<HTMLInputElement>(null);
    const { t } = useLanguage();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
        const newOtp = val.split('').concat(Array(6 - val.length).fill(''));
        setOtp(newOtp);

        if (val.length === 6) {
            onVerify(val);
        }
    };

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <motion.div
            key="step-otp-verify"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-8 py-2"
        >
            <div className="text-center space-y-1">
                <p className="text-sm text-zinc-400">
                    {t('auth.otpSentTo') || 'Код отправлен на'} <br/>
                    <span className="text-zinc-100 font-semibold">{email}</span>
                </p>
                <button 
                  onClick={onBackToEmail}
                  className="text-[10px] text-zinc-500 hover:text-blue-400 font-bold uppercase tracking-widest transition-colors"
                >
                  {t('auth.changeEmail')}
                </button>
            </div>

            <div className="relative group max-w-[320px] mx-auto" onClick={() => inputRef.current?.focus()}>
                {/* Hidden Input */}
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp.join('').trim()}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="absolute inset-0 opacity-0 cursor-default"
                />

                {/* Decorative Slots */}
                <div className="flex justify-between gap-3">
                    {otp.map((digit, index) => {
                        const isActive = otp.findIndex(d => d === '') === index;
                        const hasValue = digit !== '';
                        
                        return (
                            <div
                                key={index}
                                className={cn(
                                    "w-11 h-16 flex items-center justify-center text-2xl font-black rounded-2xl border-2 transition-all duration-300",
                                    isActive 
                                        ? "border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-110" 
                                        : hasValue 
                                            ? "border-zinc-700 bg-zinc-900 text-white" 
                                            : "border-zinc-800 bg-zinc-900/50 text-zinc-700"
                                )}
                            >
                                {digit}
                                {isActive && (
                                    <motion.div
                                        animate={{ opacity: [0, 1, 0] }}
                                        transition={{ repeat: Infinity, duration: 1 }}
                                        className="absolute w-0.5 h-8 bg-blue-400 rounded-full"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="pt-2 px-2">
              <Button
                  onClick={() => onVerify(otp.join(''))}
                  disabled={isSubmitting || otp.some(d => d === '')}
                  className="group relative h-14 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] hover:bg-[right_center] transition-all duration-500 text-white font-black text-lg rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.4)] overflow-hidden"
              >
                  {/* Magic Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  
                  {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  ) : (
                    <span className="flex items-center justify-center gap-2 relative z-10">
                      <Sparkles className="w-5 h-5 text-amber-200" />
                      {t('auth.verifyCode') || 'ВОЙТИ В СИСТЕМУ'}
                      <Sparkles className="w-5 h-5 text-amber-200" />
                    </span>
                  )}
              </Button>

              <div className="text-center mt-8">
                {resendCooldown > 0 ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                      Повтор через <span className="text-zinc-300 ml-1">{resendCooldown}с</span>
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={onResend}
                    disabled={isSubmitting}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-black uppercase tracking-widest flex items-center justify-center gap-2 mx-auto transition-all hover:gap-3"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Отправить код еще раз</span>
                  </button>
                )}
              </div>
            </div>
        </motion.div>
    );
}
