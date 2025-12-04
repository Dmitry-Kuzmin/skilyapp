import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanFace, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { Drawer } from 'vaul';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserContext } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { GoogleIcon, TelegramIcon } from '@/components/icons/SocialIcons';
import { PasskeyLoginButton } from '@/components/auth/PasskeyLoginButton';
import { checkEmailExists, getClientIP } from '@/lib/auth-utils';

const authSchema = z.object({
  email: z.string().email({ message: "Неверный формат email" }).max(255),
  password: z.string().min(6, { message: "Пароль должен быть минимум 6 символов" })
});

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

// Fallback avatar если у пользователя нет аватара
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces";

export function AuthModalNew({ open, onClose }: AuthModalProps) {
  // --- State Machine ---
  const [step, setStep] = useState<'email' | 'password-existing' | 'password-new'>('email');
  
  // --- Data & Validation ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  
  // --- Loading States ---
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- Refs & Context ---
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const { login } = useUserContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // --- Reset on Close ---
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('email');
        setEmail('');
        setPassword('');
        setEmailError(null);
        setUserAvatar(null);
        setUserName(null);
        setCheckingEmail(false);
        setIsSubmitting(false);
      }, 300);
    }
  }, [open]);

  // --- Auto Focus Logic ---
  useEffect(() => {
    if (open) {
      // Не фокусируем на мобилках чтобы не раскрывать клавиатуру
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) return;

      if (step === 'email') {
        setTimeout(() => emailInputRef.current?.focus(), 400);
      } else if (step === 'password-existing' || step === 'password-new') {
        setTimeout(() => passwordInputRef.current?.focus(), 400);
      }
    }
  }, [open, step]);

  // --- Telegram Widget Setup ---
  useEffect(() => {
    if (!open) return;

    console.log('[AuthModalNew] Loading Telegram widget...');
    
    (window as any).onTelegramAuth = async (user: any) => {
      console.log('[AuthModalNew] Telegram auth callback triggered:', user);
      
      try {
        await login({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          photo_url: user.photo_url,
        });
        
        toast({
          title: "Вход выполнен",
          description: `Добро пожаловать, ${user.first_name}!`,
        });
        
        onClose();
        
        setTimeout(() => {
          navigate('/');
        }, 300);
      } catch (error) {
        console.error('[AuthModalNew] Telegram login error:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось войти через Telegram",
          variant: "destructive"
        });
      }
    };

    setTimeout(() => {
      const container = document.getElementById('telegram-login-container-new');
      if (!container) {
        console.error('[AuthModalNew] Telegram container not found!');
        return;
      }

      container.innerHTML = '';
      
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.setAttribute('data-telegram-login', 'sdadimtutbot');
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');

      container.appendChild(script);
      console.log('[AuthModalNew] Telegram widget script appended');
    }, 100);

    return () => {
      console.log('[AuthModalNew] Cleaning up Telegram widget');
      delete (window as any).onTelegramAuth;
      const container = document.getElementById('telegram-login-container-new');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [login, onClose, toast, open, navigate]);

  // --- Handlers ---

  const handleEmailSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isValidEmail) {
      setEmailError("Пожалуйста, введите корректный email.");
      return;
    }
    
    setCheckingEmail(true);
    setEmailError(null);

    try {
      // Проверяем существование пользователя в Supabase
      const exists = await checkEmailExists(email);
      
      if (exists) {
        // Пытаемся получить данные профиля пользователя через RPC
        try {
          console.log('[AuthModalNew] Fetching profile for email:', email);
          const { data: profileData, error } = await supabase
            .rpc('get_user_profile_by_email', { p_email: email });

          console.log('[AuthModalNew] RPC Response:', { 
            data: profileData, 
            error: error,
            errorMessage: error?.message,
            errorDetails: error?.details,
            errorHint: error?.hint
          });

          if (!error && profileData && profileData.length > 0) {
            const profile = profileData[0];
            console.log('[AuthModalNew] Profile data:', profile);
            setUserAvatar(profile.avatar_url || null);
            
            // Формируем имя из доступных полей
            const displayName = [profile.first_name, profile.last_name]
              .filter(Boolean)
              .join(' ') || profile.username || email.split('@')[0];
            
            setUserName(displayName);
          } else {
            console.warn('[AuthModalNew] No profile data found. Error details:', {
              message: error?.message,
              details: error?.details,
              hint: error?.hint,
              code: error?.code
            });
            // Устанавливаем имя хотя бы из email
            setUserName(email.split('@')[0]);
          }
        } catch (profileError) {
          console.error('[AuthModalNew] Exception fetching profile:', profileError);
          setUserName(email.split('@')[0]);
        }
        
        setCheckingEmail(false);
        setStep('password-existing');
      } else {
        setCheckingEmail(false);
        setStep('password-new');
      }
    } catch (error) {
      console.error('[AuthModalNew] Email check error:', error);
      setCheckingEmail(false);
      setEmailError("Не удалось проверить email. Попробуйте снова.");
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setIsSubmitting(true);

    try {
      const validated = authSchema.parse({ email, password });

      if (step === 'password-new') {
        // Регистрация
        const { error } = await supabase.auth.signUp({
          email: validated.email,
          password: validated.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: validated.email.split('@')[0],
            }
          }
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: "Ошибка",
              description: "Этот email уже зарегистрирован. Попробуйте войти.",
              variant: "destructive"
            });
          } else {
            throw error;
          }
          setIsSubmitting(false);
          return;
        }

        // Получаем user ID после регистрации
        const { data: { user: newUser } } = await supabase.auth.getUser();
        
        if (newUser) {
          // Ждем создания профиля
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Получаем profile ID
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', newUser.id)
            .single();

          // Проверяем partner code (приоритет над referral)
          const partnerDataStr = sessionStorage.getItem('partner_code');
          if (partnerDataStr && profile) {
            try {
              const partnerData = JSON.parse(partnerDataStr);
              const ipAddress = await getClientIP();
              const userAgent = navigator.userAgent;

              const { data: activationData, error: activationError } = await supabase.functions.invoke('activate-partner-premium', {
                body: {
                  partner_code: partnerData.code.toUpperCase(),
                  user_id: profile.id,
                  utm_source: partnerData.utm_source,
                  utm_medium: partnerData.utm_medium,
                  utm_campaign: partnerData.utm_campaign,
                  ip_address: ipAddress,
                  user_agent: userAgent,
                },
              });

              if (!activationError && activationData?.success) {
                toast({
                  title: "🎉 Premium активирован!",
                  description: `Premium на 30 дней активирован!`,
                });
                window.dispatchEvent(new CustomEvent('premium-status-updated'));
              }
              sessionStorage.removeItem('partner_code');
            } catch (partnerError) {
              console.error('[AuthModalNew] Partner activation error:', partnerError);
              sessionStorage.removeItem('partner_code');
            }
          } else {
            // Применяем referral code если есть
            const referralCode = sessionStorage.getItem('referral_code');
            if (referralCode && profile) {
              console.log('[AuthModalNew] Applying referral code:', referralCode);
              const { data: referralResult, error: referralError } = await supabase.rpc('create_referral', {
                p_referrer_code: referralCode.toUpperCase(),
                p_referred_id: profile.id
              });

              if (referralError) {
                console.error('[AuthModalNew] Referral error:', referralError);
              } else if (referralResult && referralResult.length > 0 && referralResult[0].success) {
                toast({
                  title: "🎉 Вы получили +50 монет!",
                  description: `Бонус за регистрацию по приглашению`,
                });
                sessionStorage.removeItem('referral_code');
              }
            }
          }
        }

        toast({
          title: "Регистрация успешна",
          description: "Добро пожаловать!",
        });

        sessionStorage.removeItem('partner_code');
        sessionStorage.removeItem('referral_code');

        onClose();
        
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } else {
        // Вход
        const { error } = await supabase.auth.signInWithPassword({
          email: validated.email,
          password: validated.password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: "Ошибка",
              description: "Неверный email или пароль",
              variant: "destructive"
            });
          } else {
            throw error;
          }
          setIsSubmitting(false);
          return;
        }

        toast({
          title: "Вход выполнен",
          description: "Добро пожаловать!",
        });

        onClose();
        
        setTimeout(() => {
          navigate('/');
        }, 300);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Ошибка валидации",
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else {
        console.error('[AuthModalNew] Auth error:', error);
        toast({
          title: "Ошибка",
          description: "Произошла ошибка. Попробуйте снова.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setPassword('');
    setUserAvatar(null);
    setUserName(null);
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('[AuthModalNew] Google OAuth error:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось войти через Google",
        variant: "destructive"
      });
    }
  };

  const getPasskeyText = () => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (isMac) return "Войти с Face ID / Touch ID";
    return "Войти с устройством";
  };

  return (
    <Drawer.Root 
      open={open} 
      onOpenChange={onClose}
      shouldScaleBackground
      dismissible={true}
      modal={true}
      snapPoints={[1]}
      fadeFromIndex={0}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Drawer.Content
          className="
            bg-zinc-950 flex flex-col rounded-t-[32px] sm:rounded-[32px]
            h-[96%] sm:h-auto
            max-h-[96vh] sm:max-h-[90vh]
            fixed bottom-0 left-0 right-0
            sm:inset-0 sm:m-auto
            sm:w-[420px] sm:max-w-[95vw]
            border-t sm:border border-white/10 
            shadow-2xl z-50
            focus:outline-none
          "
        >
          {/* Drawer Handle для мобилок - нативный iOS стиль */}
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-800 mt-4 sm:hidden" aria-hidden="true" />
          
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {/* Ambient Glow */}
            <motion.div 
              animate={{ 
                background: emailError 
                  ? 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.15), transparent 70%)' 
                  : step !== 'email'
                    ? 'radial-gradient(circle at 50% 20%, rgba(59, 130, 246, 0.15), transparent 70%)'
                    : 'radial-gradient(circle at 50% 100%, rgba(37, 99, 235, 0.1), transparent 70%)'
              }}
              className="absolute inset-0 pointer-events-none transition-colors duration-1000"
            />

            {/* Content */}
            <div className="relative z-10 p-6 sm:p-8 flex flex-col">
          
          {/* --- HEADER SECTION --- */}
          <div className="flex flex-col items-center mb-6 min-h-[140px] justify-end">
            <AnimatePresence mode="wait">
              {step === 'password-existing' ? (
                /* Avatar State */
                <motion.div
                  key="avatar"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="relative mb-2"
                >
                  {userAvatar ? (
                    <img 
                      src={userAvatar} 
                      alt={userName || "User"} 
                      className="w-20 h-20 rounded-full border-2 border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)] object-cover"
                      onError={(e) => {
                        console.log('[AuthModalNew] Avatar failed to load, using fallback');
                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                      }}
                    />
                  ) : (
                    /* Fallback - First Letter Avatar */
                    <div className="w-20 h-20 rounded-full border-2 border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)] bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        {(userName || email || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {/* Verified Shield Badge */}
                  <div className="absolute -bottom-1 -right-1 bg-zinc-950 rounded-full p-1 border border-zinc-800">
                    <ShieldCheck className="w-4 h-4 text-green-500 fill-green-500/20" />
                  </div>
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
                  <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
                    <div className="w-6 h-6 border-2 border-white/80 rounded-lg" />
                  </div>
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
                    {step === 'email' && "Идентификация"}
                    {step === 'password-existing' && (userName ? `С возвращением, ${userName}` : "С возвращением")}
                    {step === 'password-new' && "Создание аккаунта"}
                  </h2>
                  
                  <p className="text-sm text-zinc-500 mt-2 font-medium">
                    {step === 'email' && "Введите email — мы войдем или создадим аккаунт."}
                    {step === 'password-existing' && "Ваш аккаунт подтвержден на этом устройстве."}
                    {step === 'password-new' && "Похоже, вы здесь впервые."}
                  </p>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* --- FORM SECTION --- */}
          <div className="flex-1 flex flex-col w-full max-w-[320px] mx-auto">
            
            {/* --- STEP 1: EMAIL --- */}
            <AnimatePresence mode="popLayout">
              {step === 'email' ? (
                <motion.div 
                  key="step-email"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <form onSubmit={handleEmailSubmit} className="space-y-2">
                    <Input 
                      ref={emailInputRef}
                      type="email" 
                      placeholder="name@company.com" 
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if(emailError) setEmailError(null);
                      }}
                      error={emailError ?? undefined}
                      className="bg-zinc-900/50 border-zinc-800 h-14 text-lg text-center placeholder:text-center"
                      rightElement={
                         <motion.button
                           type="submit"
                           disabled={!isValidEmail || checkingEmail}
                           initial={{ opacity: 0, scale: 0.5 }}
                           animate={{ 
                             opacity: isValidEmail ? 1 : 0, 
                             scale: isValidEmail ? 1 : 0.5,
                             pointerEvents: isValidEmail ? 'auto' : 'none'
                           }}
                           className="bg-white text-black w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-200 transition-colors disabled:opacity-50"
                         >
                           {checkingEmail ? (
                             <Loader2 className="w-4 h-4 animate-spin" />
                           ) : (
                             <ArrowRight className="w-4 h-4" />
                           )}
                         </motion.button>
                      }
                    />
                    
                    {/* Micro-hint under input */}
                    {isValidEmail && !emailError && (
                      <motion.p 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-[11px] text-center text-zinc-500 font-medium"
                      >
                        Нажмите стрелку для продолжения
                      </motion.p>
                    )}
                  </form>

                  {/* Passkey Button - показывается между email и соцсетями */}
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                  >
                    {/* PasskeyLoginButton имеет свой divider внутри */}
                    <PasskeyLoginButton onSuccess={onClose} />
                  </motion.div>

                  {/* Divider & Socials */}
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1, transition: { delay: 0.2 } }}
                    className="pt-2"
                  >
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-zinc-800"></div>
                      <span className="flex-shrink-0 mx-4 text-zinc-600 text-[11px] font-medium uppercase tracking-wider">Или продолжить с</span>
                      <div className="flex-grow border-t border-zinc-800"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <Button 
                        variant="secondary" 
                        className="bg-zinc-900 h-11 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all" 
                        onClick={handleGoogleLogin}
                      >
                        <GoogleIcon />
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="bg-zinc-900 h-11 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all relative overflow-hidden" 
                      >
                        <TelegramIcon />
                        <div 
                          id="telegram-login-container-new" 
                          className="absolute inset-0 flex items-center justify-center opacity-0 pointer-events-auto [&>iframe]:!w-full [&>iframe]:!h-full"
                        />
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : (
                /* --- STEP 2: PASSWORD (Existing or New) --- */
                <motion.div
                  key="step-password"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                   {/* Email Pill */}
                   <div className="flex justify-center">
                      <div 
                        onClick={handleBackToEmail}
                        className="
                          group flex items-center justify-center gap-3 
                          bg-zinc-900/50 border border-white/5 
                          rounded-full py-1.5 px-4 
                          cursor-pointer hover:bg-zinc-900 hover:border-white/10 transition-all
                        "
                      >
                        <span className="text-zinc-300 text-sm font-medium">{email}</span>
                        <span className="text-[11px] text-blue-400 font-medium group-hover:text-blue-300 transition-colors">
                          Изменить
                        </span>
                      </div>
                   </div>

                   <form onSubmit={handleFinalSubmit} className="space-y-4">
                     <Input 
                       ref={passwordInputRef}
                       type="password" 
                       label="Пароль"
                       placeholder="Введите ваш пароль"
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       className="bg-zinc-900/50 border-zinc-800 h-12 text-lg shadow-inner"
                       autoFocus
                     />
                     
                     <Button 
                       type="submit"
                       variant="primary" 
                       fullWidth 
                       loading={isSubmitting}
                       className="h-12 text-[15px] font-semibold"
                     >
                       {step === 'password-new' ? "Создать аккаунт" : "Войти"}
                     </Button>
                   </form>

                   {/* Alternatives */}
                   <div className="space-y-3 text-center">
                      {step === 'password-existing' && (
                        <>
                          <button className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors">
                            Забыли пароль?
                          </button>
                          <p className="text-[11px] text-zinc-600">
                            Или используйте другие способы входа выше
                          </p>
                        </>
                      )}
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Statement */}
          <div className="mt-6 pt-6 border-t border-white/5">
             <p className="text-[10px] text-zinc-600 text-center leading-relaxed max-w-[280px] mx-auto">
               Мы используем ваш email или устройство для входа или создания нового аккаунта Skily. Никаких лишних шагов.
             </p>
          </div>

            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

