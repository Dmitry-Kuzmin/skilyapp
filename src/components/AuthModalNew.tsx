import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { UserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { openTelegramLogin, preinitTelegramLogin } from '@/lib/telegram-oidc';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { checkUserAuthMethod, getClientIP } from '@/lib/auth-utils';
import { isPasskeySupported, isPlatformAuthenticatorAvailable } from '@/lib/passkey';
import { useIsMobile } from "@/hooks/use-mobile";
import { useTelegram } from '@/contexts/TelegramContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Extracted Components
import { AuthModalHeader } from './auth/modal/AuthModalHeader';
import { AuthModalFooter } from './auth/modal/AuthModalFooter';
import { EmailStep } from './auth/modal/EmailStep';
import { PasswordStep } from './auth/modal/PasswordStep';
import { MagicLinkStep } from './auth/modal/MagicLinkStep';
import { SuccessScreen } from './auth/modal/SuccessScreen';
import { ResetPasswordScreen } from './auth/modal/ResetPasswordScreen';
import { VerifyOtpStep } from './auth/modal/VerifyOtpStep';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialStep?: 'email' | 'password-existing' | 'magic-link-new' | 'magic-link-existing' | 'reset-password';
  variant?: 'modal' | 'page';
}

export function AuthModalNew({ open, onClose, initialStep = 'email', variant = 'modal' }: AuthModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'password-existing' | 'magic-link-new' | 'magic-link-existing' | 'check-email' | 'otp-verify' | 'password-recovery' | 'reset-password' | 'reset-success'>(initialStep);
  const [email, setEmail] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isEmailShaking, setIsEmailShaking] = useState(false);
  const [isPasswordShaking, setIsPasswordShaking] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [userHasPassword, setUserHasPassword] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [magicLinkState, setMagicLinkState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [isPasskeyAvailable, setIsPasskeyAvailable] = useState(false);
  const [recoverySentAt, setRecoverySentAt] = useState<number | null>(null);
  const [showResendRecovery, setShowResendRecovery] = useState(false);
  const [displayedPassword, setDisplayedPassword] = useState('');
  const [isScrambling, setIsScrambling] = useState(false);
  const [isNewUserForOtp, setIsNewUserForOtp] = useState(false);


  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const webApp = useTelegram();
  const scrambleRef = useRef<NodeJS.Timeout | null>(null);

  const isValidEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

  useEffect(() => {
    const checkPasskey = async () => {
      const supported = isPasskeySupported();
      const available = await isPlatformAuthenticatorAvailable();
      setIsPasskeyAvailable(supported && available);
    };
    checkPasskey();
  }, []);

  // Шаг 2: При открытии модалки вызываем sdk.init() — при клике sdk.open() сработает мгновенно
  useEffect(() => {
    if (open) {
      const clientId = import.meta.env.VITE_TELEGRAM_BOT_ID;
      if (clientId) {
        preinitTelegramLogin(clientId);
      }
    }
  }, [open]);

  useEffect(() => {
    if (step === 'password-recovery' && recoverySentAt) {
      const timer = setTimeout(() => {
        setShowResendRecovery(true);
      }, 30000);
      return () => clearTimeout(timer);
    } else {
      setShowResendRecovery(false);
    }
  }, [step, recoverySentAt]);

  useEffect(() => {
    if (!isScrambling) {
      setDisplayedPassword(password);
    }
  }, [password, isScrambling]);

  const scramblePassword = useCallback(() => {
    setIsScrambling(true);
    let iteration = 0;
    if (scrambleRef.current) clearInterval(scrambleRef.current);

    scrambleRef.current = setInterval(() => {
      setDisplayedPassword(password.split('').map((char, index) => {
        if (index < iteration) return password[index];
        const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return pool.charAt(Math.floor(Math.random() * pool.length));
      }).join(''));

      if (iteration >= password.length) {
        if (scrambleRef.current) clearInterval(scrambleRef.current);
        setIsScrambling(false);
      }
      iteration += 1 / 3;
    }, 30);
  }, [password]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Проверка валидности email на клиенте ПЕРЕД отправкой на сервер
    if (!isValidEmail) {
      setEmailError(t('auth.errors.invalidEmail'));
      setIsEmailShaking(true);
      if ((webApp as any)?.HapticFeedback) {
        (webApp as any).HapticFeedback.notificationOccurred('error');
      }
      setTimeout(() => setIsEmailShaking(false), 500);
      return;
    }

    if (checkingEmail) return;

    setCheckingEmail(true);
    setEmailError(null);

    try {
      const { exists, hasPassword } = await checkUserAuthMethod(email);
      setUserHasPassword(hasPassword);

      // Сброс старых данных
      setUserName(null);
      setUserAvatar(null);
      setUserProfileId(null);

      // Если пользователь существует, пытаемся получить его публичный профиль (аватар/имя)
      if (exists) {
        const { data: profile } = await supabase.rpc('get_user_profile_by_email', { 
          p_email: email.trim().toLowerCase() 
        });

        if (profile) {
          const profileData = Array.isArray(profile) ? profile[0] : profile;
          if (profileData) {
            setUserProfileId(profileData.id);
            
            const emailPrefix = email.split('@')[0];
            const fullName = profileData.full_name || (profileData.first_name ? `${profileData.first_name} ${profileData.last_name || ''}` : null);
            setUserName(fullName || profileData.username || emailPrefix);
            setUserAvatar(profileData.avatar_url || profileData.photo_url);
          }
        }
      }

      if ((webApp as any)?.HapticFeedback) {
        (webApp as any).HapticFeedback.notificationOccurred('success');
      }

      // Умный роутинг:
      if (!exists) {
        setStep('magic-link-new');
      } else if (!hasPassword) {
        setStep('magic-link-existing');
      } else {
        setStep('password-existing');
      }
    } catch (err: any) {
      console.error('Email check failed:', err);
      setEmailError(t('auth.errors.checkFailed'));
      setIsEmailShaking(true);
      if ((webApp as any)?.HapticFeedback) {
        (webApp as any).HapticFeedback.notificationOccurred('error');
      }
      setTimeout(() => setIsEmailShaking(false), 500);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isSubmitting) return;

    setIsSubmitting(true);
    setPasswordError(null);

    try {
      console.log('[Auth] Attempting signInWithPassword for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[Auth] signInWithPassword error:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        throw error;
      }

      console.log('[Auth] signInWithPassword success:', data?.user?.id);

      // 🎉 Показываем красивую success анимацию
      setShowSuccessAnimation(true);
      toast.success(t('auth.success.loggedIn'));
      if ((webApp as any)?.HapticFeedback) {
        (webApp as any).HapticFeedback.notificationOccurred('success');
      }

      // 🚀 Даем время на анимацию, затем редирект на dashboard
      setTimeout(() => {
        onClose();
        navigate('/dashboard', { replace: true });
      }, 1200);
    } catch (err: any) {
      console.error('[Auth] Login failed:', err);

      // Обработка разных типов ошибок
      const errorMessage = err.message?.toLowerCase() || '';

      if (errorMessage.includes('email not confirmed')) {
        setPasswordError('Подтвердите email. Проверьте почту и перейдите по ссылке.');
      } else if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid email or password')) {
        setPasswordError(t('auth.errors.invalidCredentials'));
      } else {
        setPasswordError(err.message || t('auth.errors.invalidCredentials'));
      }

      setIsPasswordShaking(true);
      if ((webApp as any)?.HapticFeedback) {
        (webApp as any).HapticFeedback.notificationOccurred('error');
      }
      setTimeout(() => setIsPasswordShaking(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMagicLink = async (isNew: boolean = false) => {
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    setMagicLinkState('sending');
    setIsNewUserForOtp(isNew);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: isNew,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) throw error;

      setMagicLinkState('sent');
      setStep('otp-verify');
      setResendCooldown(60);
      if ((webApp as any)?.HapticFeedback) {
        (webApp as any).HapticFeedback.notificationOccurred('success');
      }
    } catch (err: any) {
      console.error('Magic link failed:', err);
      toast.error(err.message || 'Ошибка отправки кода');
      setMagicLinkState('idle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (token: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: isNewUserForOtp ? 'signup' : 'magiclink'
      });

      if (error) throw error;

      setShowSuccessAnimation(true);
      toast.success(t('auth.success.loggedIn'));
      
      setTimeout(() => {
        onClose();
        navigate('/dashboard', { replace: true });
      }, 1200);
    } catch (err: any) {
      console.error('OTP verification failed:', err);
      toast.error(t('auth.verificationFailed') || 'Неверный код');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordRecovery = async () => {
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}?step=reset-password`,
      });

      if (error) throw error;

      setStep('password-recovery');
      setRecoverySentAt(Date.now());
      toast.success('Инструкции отправлены на почту');
    } catch (err: any) {
      console.error('Recovery failed:', err);
      toast.error(err.message || 'Ошибка восстановления пароля');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Google login error:', err);
      toast.error('Google login failed');
    }
  };

  const [telegramLoading, setTelegramLoading] = useState(false);

  const handleTelegramOIDCLogin = async () => {
    if (telegramLoading) return;
    setTelegramLoading(true);
    try {
      const clientId = import.meta.env.VITE_TELEGRAM_BOT_ID;
      if (!clientId) throw new Error('VITE_TELEGRAM_BOT_ID не настроен');

      // Telegram.Login.auth() открывает попап сам, без redirect
      const idToken = await openTelegramLogin(clientId);

      const loadingToast = toast.loading('Входим через Telegram…');

      const { data, error: fnError } = await supabase.functions.invoke('telegram-oidc-auth', {
        body: { id_token: idToken },
      });

      toast.dismiss(loadingToast);

      if (fnError || !data?.session) {
        throw new Error(data?.error ?? fnError?.message ?? 'Ошибка входа');
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) throw sessionError;

      toast.success('Вход выполнен!');
      onClose();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('[Auth] Telegram OIDC failed:', err);
      toast.error(err.message ?? 'Не удалось войти через Telegram');
    } finally {
      setTelegramLoading(false);
    }
  };

  const getPasskeyLabel = () => {
    // Для обычного пользователя "Passkey" – это непонятный термин.
    // Используем понятные названия: Face ID / Touch ID / Отпечаток
    const ua = navigator.userAgent.toLowerCase();
    const isMac = /macintosh|macintel|macppc|mac68k/.test(ua);
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);

    if (isIOS) return 'Face ID';
    if (isMac) return 'Touch ID';
    if (isAndroid) return 'Touch ID';

    return 'Windows Hello';
  };

  const handleBackToEmail = () => {
    setStep('email');
    setPassword('');
    setPasswordError(null);
  };

  // Cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  const modalContent = (
    <div className="relative overflow-hidden flex flex-col">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 p-6 flex flex-col">
        <AuthModalHeader
          step={step}
          userName={userName}
          userAvatar={userAvatar}
          profileId={userProfileId}
          email={email}
          onAvatarError={() => setUserAvatar(null)}
        />

        <div className="flex flex-col w-full max-w-[320px] mx-auto">
          <AnimatePresence mode="wait">
            {step === 'email' && (
              <EmailStep
                key="email-step"
                email={email}
                setEmail={setEmail}
                emailError={emailError}
                checkingEmail={checkingEmail}
                isValidEmail={isValidEmail}
                isEmailShaking={isEmailShaking}
                isPasskeyAvailable={isPasskeyAvailable}
                telegramLoading={telegramLoading}
                onContinue={handleEmailSubmit}
                onGoogleLogin={handleGoogleLogin}
                onTelegramLogin={handleTelegramOIDCLogin}
                getPasskeyLabel={getPasskeyLabel}
                onClose={onClose}
              />
            )}

            {step === 'password-existing' && (
              <PasswordStep
                key="password-step"
                email={email}
                password={password}
                displayedPassword={displayedPassword}
                passwordError={passwordError}
                isPasswordShaking={isPasswordShaking}
                isSubmitting={isSubmitting}
                showPassword={showPassword}
                isScrambling={isScrambling}
                isButtonHovered={isButtonHovered}
                isInputFocused={isInputFocused}
                userHasPassword={userHasPassword}
                magicLinkState={magicLinkState}
                onPasswordChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                onBackToEmail={handleBackToEmail}
                onFinalSubmit={handleFinalSubmit}
                onPasswordRecovery={handlePasswordRecovery}
                onSendMagicLink={handleSendMagicLink}
                onStepChange={setStep}
                toggleShowPassword={() => {
                  const nextState = !showPassword;
                  setShowPassword(nextState);
                  if (nextState) scramblePassword();
                }}
                setIsButtonHovered={setIsButtonHovered}
                setIsInputFocused={setIsInputFocused}
              />
            )}

            {(step === 'magic-link-new' || step === 'magic-link-existing') && (
              <MagicLinkStep
                key="magic-link-step"
                email={email}
                isSubmitting={isSubmitting}
                magicLinkState={magicLinkState}
                isExistingUser={step === 'magic-link-existing'}
                onBackToEmail={handleBackToEmail}
                onSendMagicLink={handleSendMagicLink}
              />
            )}

            {step === 'otp-verify' && (
              <VerifyOtpStep
                key="otp-verify-step"
                email={email}
                isSubmitting={isSubmitting}
                onVerify={handleVerifyOtp}
                onResend={() => handleSendMagicLink(false)}
                resendCooldown={resendCooldown}
                onBackToEmail={handleBackToEmail}
              />
            )}

            {(step === 'check-email' || step === 'password-recovery') && (
              <SuccessScreen
                key="success-screen"
                step={step}
                email={email}
                userName={userName}
                resendCooldown={resendCooldown}
                showResendRecovery={showResendRecovery}
                onBack={() => step === 'check-email' ? setStep('email') : setStep('password-existing')}
                onResend={() => step === 'check-email' ? handleSendMagicLink(false) : handlePasswordRecovery()}
                onChangeEmail={handleBackToEmail}
              />
            )}

            {step === 'reset-password' && (
              <ResetPasswordScreen
                key="reset-password-step"
                onSuccess={() => setStep('reset-success')}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
              />
            )}

            {step === 'reset-success' && (
              <motion.div
                key="reset-success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
                  <ShieldCheck className="w-10 h-10 text-green-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">Пароль обновлен!</h3>
                  <p className="text-zinc-400">Теперь вы можете войти в свой аккаунт с новым паролем.</p>
                </div>
                <Button
                  onClick={() => setStep('password-existing')}
                  className="bg-blue-600 hover:bg-blue-500 text-white w-full h-12 rounded-xl"
                >
                  Вернуться к входу
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step === 'email' && <AuthModalFooter />}
      </div>
    </div>
  );

  if (variant === 'page') {
    return (
      <div className="min-h-[100dvh] bg-[#09090b] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#09090b] rounded-[3rem] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_50px_rgba(0,0,0,0.7)] border border-white/5 relative">
          {/* Back button for Page Variant */}
          <AnimatePresence>
            {step !== 'email' && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 0.6, x: 0 }}
                whileHover={{ opacity: 1, scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={handleBackToEmail}
                className="absolute left-6 top-6 z-50 flex items-center justify-center h-10 w-10 bg-white/5 border border-white/10 rounded-full text-zinc-400 transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.3)] group backdrop-blur-md"
                aria-label="Назад"
              >
                <ArrowLeft className="h-5 w-5" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Close button for Page Variant (Mobile) */}
          <button
            onClick={onClose}
            className="absolute right-6 top-6 z-50 flex items-center justify-center h-10 w-10 bg-white/5 border border-white/10 rounded-full text-zinc-400 opacity-60 transition-all duration-300 hover:opacity-100 hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95 shadow-[0_4px_15px_rgba(0,0,0,0.3)] group backdrop-blur-md"
            aria-label="Вернуться"
          >
            <X className="h-5 w-5 transition-transform duration-500 group-hover:rotate-180" />
            <div className="absolute inset-0 rounded-full border border-white/0 group-hover:border-white/20 transition-all duration-300 scale-125 group-hover:scale-100" />
          </button>

          {/* Subtle top glare for 3D effect */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none z-20" />
          
          {/* Success Animation Overlay */}
          <AnimatePresence>
            {showSuccessAnimation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-950/95 via-emerald-950/95 to-teal-950/95 backdrop-blur-sm"
              >
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      delay: 0.1
                    }}
                    className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/50"
                  >
                    <CheckCircle2 className="w-12 h-12 text-green-400" strokeWidth={2.5} />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center"
                  >
                    <h3 className="text-2xl font-bold text-white mb-1">Успешно!</h3>
                    <p className="text-sm text-green-300/80">Переходим в личный кабинет...</p>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {modalContent}
        </div>
      </div>
    );
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(val) => !val && onClose()}
      dismissible={!isSubmitting}
      className="!border-none !border-0 !outline-none !ring-0 !bg-[#09090b] rounded-[3rem] shadow-[0_30px_70px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05)] p-0 overflow-hidden"
    >
      <div className="relative">
        {/* Back button for Modal Variant */}
        <AnimatePresence>
          {step !== 'email' && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 0.6, x: 0 }}
              whileHover={{ opacity: 1, scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              exit={{ opacity: 0, x: -10 }}
              onClick={handleBackToEmail}
              className="absolute left-6 top-6 z-50 flex items-center justify-center h-10 w-10 bg-white/5 border border-white/10 rounded-full text-zinc-400 transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.3)] group backdrop-blur-md"
              aria-label="Назад"
            >
              <ArrowLeft className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Close button for Modal Variant (Mobile) */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 z-50 flex items-center justify-center h-10 w-10 bg-white/5 border border-white/10 rounded-full text-zinc-400 opacity-60 transition-all duration-300 hover:opacity-100 hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95 shadow-[0_4px_15px_rgba(0,0,0,0.3)] group backdrop-blur-md md:hidden"
          aria-label="Закрыть"
        >
          <X className="h-5 w-5 transition-transform duration-500 group-hover:rotate-180" />
          <div className="absolute inset-0 rounded-full border border-white/0 group-hover:border-white/20 transition-all duration-300 scale-125 group-hover:scale-100" />
        </button>

        {/* Subtle top glare for 3D effect */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none z-20" />

        {/* Success Animation Overlay */}
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-950/95 via-emerald-950/95 to-teal-950/95 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.1
                  }}
                  className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/50"
                >
                  <CheckCircle2 className="w-12 h-12 text-green-400" strokeWidth={2.5} />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <h3 className="text-2xl font-bold text-white mb-1">Успешно!</h3>
                  <p className="text-sm text-green-300/80">Переходим в личный кабинет...</p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {modalContent}
      </div>
    </ResponsiveModal>
  );
}
