import { useState, useRef, useEffect, useCallback, memo } from 'react';
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

export const VerifyOtpStep = memo(function VerifyOtpStep({
    email,
    isSubmitting,
    onVerify,
    onResend,
    resendCooldown,
    onBackToEmail
}: VerifyOtpStepProps) {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);
    const { t } = useLanguage();

    const handleFocus = useCallback((index: number) => {
        setActiveIndex(index);
        // Используем requestAnimationFrame для синхронизации с циклом отрисовки браузера
        requestAnimationFrame(() => {
            if (inputs.current[index]) {
                inputs.current[index]?.select();
            }
        });
    }, []);

    const handleChange = useCallback((index: number, value: string) => {
        const cleanedValue = value.replace(/\D/g, '');
        if (!cleanedValue && value !== '') return;

        setOtp(prevOtp => {
            const newOtp = [...prevOtp];
            const char = cleanedValue.slice(-1);
            newOtp[index] = char;

            // Если ввели символ, переходим вперед
            if (char && index < 5) {
                inputs.current[index + 1]?.focus();
            }

            // Авто-отправка
            if (newOtp.every(digit => digit !== '') && char) {
                onVerify(newOtp.join(''));
            }

            return newOtp;
        });
    }, [onVerify]);

    const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            setOtp(prevOtp => {
                const newOtp = [...prevOtp];
                if (!newOtp[index] && index > 0) {
                    newOtp[index - 1] = '';
                    inputs.current[index - 1]?.focus();
                } else {
                    newOtp[index] = '';
                }
                return newOtp;
            });
        }
    }, []);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const data = e.clipboardData.getData('text').trim().slice(0, 6);
        if (!/^\d+$/.test(data)) return;

        const newOtp = data.split('').concat(Array(6 - data.length).fill(''));
        setOtp(newOtp);
        
        const nextIdx = Math.min(data.length, 5);
        inputs.current[nextIdx]?.focus();

        if (data.length === 6) {
            onVerify(data);
        }
    }, [onVerify]);

    useEffect(() => {
        inputs.current[0]?.focus();
    }, []);

    return (
        <motion.div
            key="step-otp-verify"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8 py-2"
        >
            <div className="text-center space-y-4">
                <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                        {t('auth.enterOtpTitle') || 'Введите код'}
                    </h3>
                    <p className="text-sm text-zinc-400 max-w-[280px] mx-auto leading-relaxed">
                        {t('auth.otpSent')} <br/>
                        <span className="text-blue-400/90 font-medium selection:bg-blue-500/30">{email}</span>
                    </p>
                </div>

                <button 
                  onClick={onBackToEmail}
                  className="text-[11px] text-zinc-500 hover:text-blue-400 font-bold uppercase tracking-widest transition-all pt-1 flex items-center justify-center gap-2 mx-auto group"
                >
                  <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full group-hover:bg-blue-500 group-hover:scale-125 transition-all" />
                  {t('auth.changeEmail') || 'Изменить почту'}
                </button>
            </div>

            <div className="flex justify-center gap-2.5 sm:gap-3">
                {otp.map((digit, index) => (
                    <div key={index} className="relative">
                        <input
                            ref={el => inputs.current[index] = el}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={1}
                            value={digit}
                            onFocus={() => handleFocus(index)}
                            onMouseUp={(e) => e.preventDefault()}
                            onChange={e => handleChange(index, e.target.value)}
                            onKeyDown={e => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            disabled={isSubmitting}
                            className={cn(
                                "w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold transition-all duration-300 outline-none rounded-2xl",
                                "bg-zinc-900/40 border-2",
                                activeIndex === index 
                                    ? "border-blue-500 text-white shadow-[0_0_25px_rgba(59,130,246,0.25)] bg-blue-500/5 scale-105" 
                                    : "border-white/5 text-zinc-300 hover:border-white/10",
                                digit && activeIndex !== index ? "border-white/10 bg-white/[0.03] text-white" : ""
                            )}
                        />
                        {activeIndex === index && (
                            <motion.div 
                                layoutId="otp-glow-ring"
                                className="absolute -inset-1.5 bg-blue-500/10 blur-xl rounded-2xl -z-10"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            />
                        )}
                    </div>
                ))}
            </div>

            <div className="pt-4 space-y-6">
              <Button
                  onClick={() => onVerify(otp.join(''))}
                  disabled={isSubmitting || otp.some(d => d === '')}
                  className={cn(
                    "h-14 w-full text-lg font-bold rounded-2xl transition-all duration-500 border-2 relative overflow-hidden group/btn",
                    otp.every(d => d !== '') 
                        ? "bg-white text-black border-white shadow-[0_20px_40px_rgba(255,255,255,0.15)] scale-[1.02] active:scale-[0.98]" 
                        : "bg-white/5 text-zinc-600 border-white/5 grayscale"
                  )}
              >
                  {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  ) : (
                    <div className="flex items-center justify-center gap-2 relative z-10">
                      <span>{t('auth.verifyCode') || 'Подтвердить'}</span>
                      <motion.div
                        animate={otp.every(d => d !== '') ? { x: [0, 5, 0] } : {}}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <Sparkles className={cn(
                            "w-5 h-5 transition-colors duration-500",
                            otp.every(d => d !== '') ? "text-amber-500" : "text-zinc-600"
                        )} />
                      </motion.div>
                    </div>
                  )}
                  {otp.every(d => d !== '') && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                  )}
              </Button>

              <div className="text-center">
                {resendCooldown > 0 ? (
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/5 rounded-full border border-white/5 backdrop-blur-sm">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                    <p className="text-[11px] text-zinc-500 font-semibold tracking-wide uppercase">
                      {t('auth.resendIn')} <span className="text-blue-400 font-mono text-xs ml-1">{resendCooldown}s</span>
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={onResend}
                    disabled={isSubmitting}
                    className="text-[11px] text-zinc-500 hover:text-blue-400 font-bold flex items-center justify-center gap-2 mx-auto transition-all hover:scale-105 active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="uppercase tracking-widest">{t('auth.resendCode')}</span>
                  </button>
                )}
              </div>
            </div>
        </motion.div>
    );
});
