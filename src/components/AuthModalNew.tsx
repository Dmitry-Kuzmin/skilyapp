import { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { ScanFace, ArrowRight, ArrowLeft, ShieldCheck, Check, Loader2, Mail, Eye, EyeOff, Sparkles, Wand2, Send, Lock } from 'lucide-react';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserContext } from '@/contexts/UserContext';
import { useToast } from '@/lib/toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { GoogleIcon, TelegramIcon } from '@/components/icons/SocialIcons';
import { PasskeyLoginButton } from '@/components/auth/PasskeyLoginButton';
import { LandingLogo } from '@/components/landing/LandingLogo';
import { checkUserAuthMethod, getClientIP } from '@/lib/auth-utils';
import { isPasskeySupported, isPlatformAuthenticatorAvailable } from '@/lib/passkey';
import { ParticleEmitter } from '@/components/ui/ParticleEmitter';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTelegram } from '@/contexts/TelegramContext';

// Schema будет использовать переводы через context
const createAuthSchema = (t: (key: string) => string) => z.object({
  email: z.string().email({ message: t('auth.errors.invalidEmail') }).max(255),
  password: z.string().min(6, { message: t('auth.errors.minPassword') })
});

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialStep?: 'email' | 'password-existing' | 'magic-link-new' | 'magic-link-existing' | 'reset-password';
}

// Fallback avatar если у пользователя нет аватара
// Убран DEFAULT_AVATAR — если нет фото, показываем красивые инициалы

export function AuthModalNew({ open, onClose, initialStep = 'email' }: AuthModalProps) {
  // --- State ---
  const [step, setStep] = useState<'email' | 'password-existing' | 'magic-link-new' | 'magic-link-existing' | 'check-email' | 'password-recovery' | 'reset-password' | 'reset-success'>(initialStep);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isEmailShaking, setIsEmailShaking] = useState(false);
  const [isPasswordShaking, setIsPasswordShaking] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userHasPassword, setUserHasPassword] = useState(true); // по умолчанию true для безопасности
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [magicLinkState, setMagicLinkState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // --- Password Reveal Effect State ---
  const [displayedPassword, setDisplayedPassword] = useState('');
  const [isScrambling, setIsScrambling] = useState(false);
  const [recoverySentAt, setRecoverySentAt] = useState<number | null>(null);
  const [showResendRecovery, setShowResendRecovery] = useState(false);
  const scrambleRef = useRef<NodeJS.Timeout | null>(null);

  // Timer for password recovery resend link
  useEffect(() => {
    if (step === 'password-recovery' && recoverySentAt) {
      const timer = setTimeout(() => {
        setShowResendRecovery(true);
      }, 30000); // 30 seconds
      return () => clearTimeout(timer);
    } else {
      setShowResendRecovery(false);
    }
  }, [step, recoverySentAt]);

  // Sync displayedPassword with password when not scrambling
  useEffect(() => {
    if (!isScrambling) {
      setDisplayedPassword(password);
    }
  }, [password, isScrambling]);

  const scramblePassword = () => {
    setIsScrambling(true);
    let iteration = 0;

    if (scrambleRef.current) clearInterval(scrambleRef.current);

    scrambleRef.current = setInterval(() => {
      setDisplayedPassword(password.split('').map((char, index) => {
        if (index < iteration) {
          return password[index];
        }
        // Используем более спокойные символы (буквы и цифры) вместо спецсимволов
        const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return pool.charAt(Math.floor(Math.random() * pool.length));
      }).join(''));

      if (iteration >= password.length) {
        if (scrambleRef.current) clearInterval(scrambleRef.current);
        setIsScrambling(false);
        setDisplayedPassword(password);
      }

      iteration += 1 / 2; // Speed of decryption
    }, 20); // Faster updates
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // If user types, stop scrambling immediately
    if (isScrambling) {
      setIsScrambling(false);
      if (scrambleRef.current) clearInterval(scrambleRef.current);
    }
    setPassword(e.target.value);
    if (passwordError) setPasswordError(null);
  };


  // --- Loading States ---
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [isPasskeyAvailable, setIsPasskeyAvailable] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const drawerContentRef = useRef<HTMLDivElement>(null);

  // --- Refs & Context ---
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const webApp = useTelegram();
  // КРИТИЧНО: Безопасное получение UserContext - не выбрасывает ошибку если провайдер отсутствует
  // Это позволяет AuthModalNew работать на лендинге (где UserProvider отсутствует)
  const userContext = useContext(UserContext);
  const login = userContext?.login;

  // Фолбек для Telegram, если UserProvider не загружен (например, на лендинге)
  const fallbackTelegramLogin = async (user: any) => {
    console.warn('[AuthModalNew] UserProvider not loaded, using fallback Telegram login');
    setTelegramLoading(true);

    const userData = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      photo_url: user.photo_url,
      language_code: user.language_code,
    };

    // Сохраняем локально, чтобы LandingUserContext/UserContext могли подхватить
    try {
      window.puzzleUser = userData;
      window.puzzleCodeData = {
        ...(window.puzzleCodeData || {}),
        FIRST_NAME: userData.first_name,
        LAST_NAME: userData.last_name,
        USERNAME: userData.username,
        ID: userData.id,
        LANGUAGE: userData.language_code,
        PLATFORM: 'web',
      };
      localStorage.setItem('puzzle_user', JSON.stringify(userData));
      console.log('[AuthModalNew] Fallback: stored Telegram user locally');
    } catch (err) {
      console.error('[AuthModalNew] Fallback: failed to store Telegram user locally', err);
    }

    // Пытаемся дернуть серверную функцию и ЖДЕМ ответа
    const referralCode = sessionStorage.getItem('referral_code') || undefined;
    try {
      const { error } = await supabase.functions.invoke('telegram-auth', {
        body: {
          user: userData,
          platform: 'web',
          referred_by_code: referralCode,
        },
      });

      if (error) {
        throw error;
      }

      console.log('[AuthModalNew] Fallback: telegram-auth success, redirecting');
      // Используем navigate вместо window.location.href для безопасности
      if (window.location.pathname !== '/dashboard') {
        navigate('/dashboard', { replace: true });
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('[AuthModalNew] Fallback: telegram-auth failed', err);
      toast({
        title: t('auth.errors.validationError'),
        description: t('auth.errors.genericError'),
        variant: 'destructive',
      });
    } finally {
      setTelegramLoading(false);
    }
  };
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Reset step when opening
  useEffect(() => {
    if (open) {
      setStep(initialStep);
      setEmail('');
      setPassword('');
      setEmailError(null);
      setPasswordError(null);
      setIsEmailShaking(false);
      setIsPasswordShaking(false);

      // Auto-focus logic
      if (initialStep === 'email') {
        setTimeout(() => setIsInputFocused(true), 100);
      }
    } else {
      setIsInputFocused(false);
    }
  }, [open, initialStep]);

  // Сброс magicLinkState
  useEffect(() => {
    if (step === 'email') {
      setMagicLinkState('idle');
    }
  }, [step]);

  // --- Auto Focus Logic ---
  useEffect(() => {
    if (open) {
      // Не фокусируем на мобилках чтобы не раскрывать клавиатуру
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) return;

      if (step === 'email') {
        setTimeout(() => emailInputRef.current?.focus(), 400);
      } else if (step === 'password-existing') {
        setTimeout(() => passwordInputRef.current?.focus(), 400);
      }
    }
  }, [open, step]);

  // --- Telegram Widget Setup ---
  useEffect(() => {
    if (!open) return;

    console.log('[AuthModalNew] Loading Telegram widget...');

    (window as any).onTelegramAuth = async (user: any) => {
      console.log('[AuthModalNew] 🔔 Telegram auth callback triggered:', {
        hasUser: !!user,
        userId: user?.id,
        firstName: user?.first_name,
        username: user?.username
      });

      if (!user || !user.id) {
        console.error('[AuthModalNew] ❌ Invalid user data in callback:', user);
        toast({
          title: t('auth.errors.validationError'),
          description: t('auth.errors.incompleteUserData'),
          variant: "destructive"
        });
        setTelegramLoading(false);
        return;
      }

      setTelegramLoading(true);

      try {
        // КРИТИЧНО: Проверяем наличие login функции перед использованием
        if (!login) {
          console.warn('[AuthModalNew] login function not available - UserProvider not loaded, using fallback');

          await fallbackTelegramLogin(user);

          toast({
            title: t('auth.success.loggedIn'),
            description: t('auth.success.welcomeUser', { name: user.first_name }),
          });

          return;
        }

        await login({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          photo_url: user.photo_url,
          auth_date: user.auth_date,
          hash: user.hash,
        });

        toast({
          title: t('auth.success.loggedIn'),
          description: t('auth.success.welcomeUser', { name: user.first_name }),
        });

        onClose();

        // КРИТИЧНО: Предотвращаем переключение на другую вкладку в Safari
        // Telegram widget может открывать popup/вкладку, поэтому нужно вернуть фокус на текущую
        try {
          // Закрываем все popup окна, которые мог открыть виджет
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.close();
            } catch (e) {
              console.warn('[AuthModalNew] Could not close opener window:', e);
            }
          }

          // Пытаемся вернуть фокус на текущее окно/вкладку
          if (window.focus) {
            window.focus();
          }

          // Также пытаемся вернуть фокус через blur/focus
          if (document.hasFocus && !document.hasFocus()) {
            window.blur();
            window.focus();
          }
        } catch (e) {
          console.warn('[AuthModalNew] Could not focus window:', e);
        }

        // Используем navigate вместо window.location.href для предотвращения проблем
        // с переключением вкладок в Safari. navigate безопаснее и работает корректно
        setTimeout(() => {
          // Проверяем, не находимся ли мы уже на dashboard
          if (window.location.pathname !== '/dashboard') {
            navigate('/dashboard', { replace: true });
          } else {
            // Если уже на dashboard, просто обновляем страницу
            window.location.reload();
          }

          // Дополнительно пытаемся вернуть фокус после навигации
          setTimeout(() => {
            try {
              window.focus();
            } catch (e) {
              // Игнорируем ошибки фокуса
            }
          }, 100);
        }, 300);
      } catch (error) {
        console.error('[AuthModalNew] Telegram login error:', error);
        toast({
          title: t('auth.errors.validationError'),
          description: t('auth.errors.genericError'),
          variant: "destructive"
        });
      } finally {
        // Если произойдет redirect, это не успеет мигнуть; нужен для сценария ошибки
        setTelegramLoading(false);
      }
    };

    setTimeout(() => {
      const container = document.getElementById('telegram-login-container-new');
      if (!container) {
        console.error('[AuthModalNew] Telegram container not found!');
        return;
      }

      container.innerHTML = '';

      // Проверяем, что callback функция установлена
      if (typeof (window as any).onTelegramAuth !== 'function') {
        console.error('[AuthModalNew] onTelegramAuth callback not set!');
      } else {
        console.log('[AuthModalNew] onTelegramAuth callback is ready');
      }

      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.crossOrigin = 'anonymous'; // Для совместимости с Safari Privacy
      script.setAttribute('data-telegram-login', 'skilyapp_bot');
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      // КРИТИЧНО: Предотвращаем открытие popup/новой вкладки виджетом
      // Используем корс-атрибут для безопасности
      script.setAttribute('data-cors', 'anonymous');

      // Обработка успешной загрузки
      script.onload = () => {
        console.log('[AuthModalNew] ✅ Telegram widget script loaded successfully');
      };

      // Обработка ошибок загрузки
      script.onerror = (error) => {
        console.error('[AuthModalNew] ❌ Failed to load Telegram widget script:', error);
        toast({
          title: t('auth.errors.validationError'),
          description: t('auth.errors.widgetLoadFailed'),
          variant: "destructive"
        });
        setTelegramLoading(false);
      };

      container.appendChild(script);
      console.log('[AuthModalNew] Telegram widget script appended, waiting for load...');

      // КРИТИЧНО: Перехватываем клики на виджете, чтобы предотвратить открытие новых окон/вкладок
      // Telegram widget может открывать popup, нужно предотвратить это
      const handleContainerClick = (e: MouseEvent) => {
        // Позволяем только клики на кнопку виджета, но предотвращаем открытие новых окон
        const target = e.target as HTMLElement;
        if (target.closest('iframe') || target.closest('script')) {
          // Если клик на iframe виджета, предотвращаем открытие нового окна
          e.preventDefault();
          e.stopPropagation();
        }
      };

      // Перехватываем клики на контейнере
      container.addEventListener('click', handleContainerClick, true);

      // Также перехватываем события открытия новых окон
      const originalOpen = window.open;
      let windowOpenBlocked = false;
      window.open = function (...args) {
        if (windowOpenBlocked) {
          console.log('[AuthModalNew] Blocked window.open call:', args);
          // Блокируем открытие новых окон во время авторизации
          return null;
        }
        return originalOpen.apply(this, args);
      };

      // Блокируем window.open во время авторизации
      windowOpenBlocked = true;

      // Обработка успешной загрузки виджета
      const originalOnLoad = script.onload;
      script.onload = () => {
        console.log('[AuthModalNew] ✅ Telegram widget script loaded successfully');
        if (originalOnLoad) originalOnLoad();
        // Восстанавливаем window.open после небольшой задержки
        setTimeout(() => {
          windowOpenBlocked = false;
          container.removeEventListener('click', handleContainerClick, true);
        }, 2000); // Увеличиваем задержку для безопасности
      };
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
      setEmailError(t('auth.errors.invalidEmail'));

      // Telegram вибрация при ошибке
      if (webApp?.HapticFeedback) {
        webApp.HapticFeedback.notificationOccurred('error');
      }

      // Shake анимация
      setIsEmailShaking(true);
      setTimeout(() => setIsEmailShaking(false), 500);

      return;
    }

    setCheckingEmail(true);
    setEmailError(null);

    try {
      // УМНЫЙ ВХОД: Проверяем существование пользователя И наличие пароля
      const authCheck = await checkUserAuthMethod(email);
      console.log('[AuthModalNew] Auth check result:', authCheck);

      if (authCheck.exists) {
        // Пользователь существует — получаем профиль для отображения
        try {
          console.log('[AuthModalNew] Fetching profile for email:', email);
          const { data: profileData, error } = await supabase
            .rpc('get_user_profile_by_email', { p_email: email });

          if (!error && profileData && profileData.length > 0) {
            const profile = profileData[0];
            console.log('[AuthModalNew] Profile data:', profile);
            setUserAvatar(profile.avatar_url || null);

            const displayName = profile.first_name || profile.username || email.split('@')[0];

            setUserName(displayName);
          } else {
            console.warn('[AuthModalNew] No profile data found');
            setUserName(email.split('@')[0]);
          }
        } catch (profileError) {
          console.error('[AuthModalNew] Exception fetching profile:', profileError);
          setUserName(email.split('@')[0]);
        }

        setCheckingEmail(false);

        // Устанавливаем флаг наличия пароля — UI сам решит что показывать
        setUserHasPassword(authCheck.hasPassword);
        console.log('[AuthModalNew] User has password:', authCheck.hasPassword);

        // Всегда идём на password-existing, UI покажет нужную форму
        setStep('password-existing');
      } else {
        // Новый пользователь → переходим на Magic Link регистрацию
        setCheckingEmail(false);
        setStep('magic-link-new');
      }
    } catch (error) {
      console.error('[AuthModalNew] Email check error:', error);
      setCheckingEmail(false);
      setEmailError(t('auth.errors.checkFailed'));
    }
  };

  const handlePasswordRecovery = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) {
        throw error;
      }

      setRecoverySentAt(Date.now());
      setStep('password-recovery');
    } catch (error: any) {
      console.error('[AuthModalNew] Password recovery error:', error);
      toast({
        title: t('auth.errors.validationError'),
        description: error.message || t('auth.errors.genericError'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация пустого пароля
    if (!password || password.trim() === '') {
      setPasswordError(t('auth.errors.passwordRequired'));

      if (webApp?.HapticFeedback) {
        webApp.HapticFeedback.notificationOccurred('error');
      }

      setIsPasswordShaking(true);
      setTimeout(() => setIsPasswordShaking(false), 500);

      return;
    }

    // Валидация минимальной длины
    if (password.length < 6) {
      setPasswordError(t('auth.errors.minPassword'));

      if (webApp?.HapticFeedback) {
        webApp.HapticFeedback.notificationOccurred('error');
      }

      setIsPasswordShaking(true);
      setTimeout(() => setIsPasswordShaking(false), 500);

      return;
    }

    setIsSubmitting(true);

    try {
      const authSchema = createAuthSchema(t);
      const validated = authSchema.parse({ email, password });

      // Теперь только вход (регистрация только через Magic Link)
      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setPasswordError(t('auth.errors.invalidCredentials'));

          setIsPasswordShaking(true);
          setTimeout(() => setIsPasswordShaking(false), 500);

          // Telegram вибрация при ошибке
          if (webApp?.HapticFeedback) {
            webApp.HapticFeedback.notificationOccurred('error');
          }

          toast({
            title: t('auth.errors.validationError'),
            description: t('auth.errors.invalidCredentials'),
            variant: "destructive"
          });
        } else {
          // Telegram вибрация при любой другой ошибке
          if (webApp?.HapticFeedback) {
            webApp.HapticFeedback.notificationOccurred('error');
          }
          throw error;
        }
        setIsSubmitting(false);
        return;
      }

      toast({
        title: t('auth.success.loggedIn'),
        description: t('auth.success.welcome'),
      });

      onClose();

      // КРИТИЧНО: Ждем обновления сессии перед редиреком
      // Проверяем, что сессия обновилась, и только потом редиректим
      // Используем window.location.href для полного перезапуска приложения
      // Это гарантирует, что UserProvider загрузится и обработает новую сессию
      (() => {
        let signInAttempts = 0;
        const signInMaxAttempts = 15; // Увеличиваем до 15 попыток (3 секунды)
        const checkSignInSession = async () => {
          const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

          if (currentSession?.user) {
            console.log('[AuthModalNew] Session confirmed after signIn, redirecting to dashboard');
            if (window.location.pathname !== '/dashboard') {
              navigate('/dashboard', { replace: true });
            } else {
              window.location.reload();
            }
            return;
          }

          if (signInAttempts >= signInMaxAttempts) {
            console.warn('[AuthModalNew] Max attempts reached after signIn, redirecting anyway');
            // Даже если сессия не подтверждена, редиректим
            // UserProvider на dashboard проверит сессию при загрузке
            if (window.location.pathname !== '/dashboard') {
              navigate('/dashboard', { replace: true });
            } else {
              window.location.reload();
            }
            return;
          }

          signInAttempts++;
          console.log(`[AuthModalNew] Waiting for session after signIn... (attempt ${signInAttempts}/${signInMaxAttempts})`);
          setTimeout(checkSignInSession, 200);
        };

        // Начинаем проверку сразу после закрытия модалки
        setTimeout(checkSignInSession, 100);
      })();
    } catch (error) {
      if (error instanceof z.ZodError) {
        setIsPasswordShaking(true);
        setTimeout(() => setIsPasswordShaking(false), 500);
        if (webApp?.HapticFeedback) {
          webApp.HapticFeedback.notificationOccurred('error');
        }
        toast({
          title: t('auth.errors.validationError'),
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else {
        console.error('[AuthModalNew] Auth error:', error);
        toast({
          title: t('auth.errors.validationError'),
          description: t('auth.errors.genericError'),
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
          // КРИТИЧНО: Редиректим на отдельный callback маршрут
          // Это решает race condition - dashboard не будет делать запросы
          // до того, как сессия будет готова
          redirectTo: `${window.location.origin}/auth/callback`,
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
        title: t('auth.errors.validationError'),
        description: error.message || t('auth.errors.genericError'),
        variant: "destructive"
      });
    }
  };

  // --- Magic Link Handlers ---

  const handleSendMagicLink = async (isNewUser: boolean) => {
    setMagicLinkState('sending');
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: isNewUser, // Создаем нового юзера только для регистрации
        }
      });

      if (error) {
        console.error('[AuthModalNew] Magic Link error:', error);
        toast({
          title: t('auth.errors.validationError'),
          description: error.message || t('auth.errors.genericError'),
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Успех — переходим на экран "Проверьте почту"
      setMagicLinkState('sent');

      setTimeout(() => {
        setStep('check-email');
        setIsSubmitting(false);
        setMagicLinkState('idle');
      }, 1500);

      // Запускаем таймер для повторной отправки (60 секунд)
      setResendCooldown(60);
      const cooldownInterval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(cooldownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      console.error('[AuthModalNew] Magic Link exception:', error);
      toast({
        title: t('auth.errors.validationError'),
        description: error.message || t('auth.errors.genericError'),
        variant: "destructive"
      });
      setIsSubmitting(false);
      setMagicLinkState('idle');
    }
  };


  const handleResendMagicLink = async () => {
    if (resendCooldown > 0) return;

    // Определяем тип пользователя по текущему шагу
    const isNewUser = step === 'check-email' && !userName; // Если нет userName, значит новый
    await handleSendMagicLink(isNewUser);

    toast({
      title: t('auth.success.emailSent'),
      description: t('auth.success.checkEmail'),
    });
  };


  // Определяем мобильное устройство в начале компонента (до использования в useEffect)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Проверка доступности Passkey для адаптации layout
  useEffect(() => {
    const checkPasskeyAvailability = async () => {
      const supported = isPasskeySupported();
      if (supported) {
        const available = await isPlatformAuthenticatorAvailable();
        setIsPasskeyAvailable(available);
      } else {
        setIsPasskeyAvailable(false);
      }
    };

    if (open) {
      checkPasskeyAvailability();
    }
  }, [open]);

  // Обработка изменения viewport при появлении клавиатуры на мобильных
  useEffect(() => {
    if (!open || !isMobile || typeof window === 'undefined') return;

    const initialHeight = window.innerHeight;

    const updateViewportHeight = () => {
      if (window.visualViewport) {
        const vpHeight = window.visualViewport.height;
        const vpTop = window.visualViewport.offsetTop || 0;
        setViewportHeight(vpHeight);

        // Определяем, открыта ли клавиатура
        // Клавиатура считается открытой, если viewport уменьшился более чем на 150px
        // Или если есть offsetTop (viewport сдвинулся вверх)
        const keyboardThreshold = 150;
        const heightDiff = initialHeight - vpHeight;
        const keyboardIsOpen = heightDiff > keyboardThreshold || vpTop > 0;
        setIsKeyboardOpen(keyboardIsOpen);

        // Позиционируем модалку относительно visualViewport
        if (keyboardIsOpen && drawerContentRef.current) {
          // Используем transform для позиционирования относительно visualViewport
          const drawerContent = drawerContentRef.current;
          drawerContent.style.transform = `translateY(${vpTop}px)`;
        } else if (drawerContentRef.current) {
          drawerContentRef.current.style.transform = '';
        }
      } else {
        const currentHeight = window.innerHeight;
        setViewportHeight(currentHeight);
        const keyboardIsOpen = currentHeight < initialHeight - 150;
        setIsKeyboardOpen(keyboardIsOpen);

        if (drawerContentRef.current) {
          drawerContentRef.current.style.transform = '';
        }
      }
    };

    // Инициализация
    updateViewportHeight();

    // Отслеживаем изменения viewport (появление/скрытие клавиатуры)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportHeight);
      window.visualViewport.addEventListener('scroll', updateViewportHeight);
    } else {
      window.addEventListener('resize', updateViewportHeight);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportHeight);
        window.visualViewport.removeEventListener('scroll', updateViewportHeight);
      } else {
        window.removeEventListener('resize', updateViewportHeight);
      }
      setIsKeyboardOpen(false);
    };
  }, [open, isMobile]);

  // Автоскролл к полю ввода при фокусе на мобильных
  useEffect(() => {
    if (!open || !isMobile) return;

    const handleFocus = (inputElement: HTMLInputElement) => {
      // Увеличиваем задержку для того, чтобы клавиатура успела появиться и viewport обновился
      setTimeout(() => {
        const drawerContent = drawerContentRef.current;
        if (!drawerContent || !inputElement) return;

        const currentViewportHeight = window.visualViewport?.height || window.innerHeight;
        const inputRect = inputElement.getBoundingClientRect();

        // Вычисляем желаемую позицию: поле должно быть в верхней трети видимой области
        const targetTop = currentViewportHeight * 0.2; // 20% от верха viewport
        const inputTop = inputRect.top;
        const scrollContainer = drawerContent.querySelector('[class*="overflow-y-auto"]') as HTMLElement || drawerContent;

        // Вычисляем необходимый скролл
        const scrollOffset = inputTop - targetTop;

        if (Math.abs(scrollOffset) > 10) {
          scrollContainer.scrollBy({
            top: scrollOffset,
            behavior: 'smooth'
          });
        }
      }, 400); // Увеличена задержка для надежности
    };

    // Обработчик для email поля
    const emailInput = emailInputRef.current;
    if (emailInput) {
      const emailHandler = () => handleFocus(emailInput);
      emailInput.addEventListener('focus', emailHandler);

      return () => {
        emailInput.removeEventListener('focus', emailHandler);
      };
    }

    // Обработчик для password поля
    const passwordInput = passwordInputRef.current;
    if (passwordInput) {
      const passwordHandler = () => handleFocus(passwordInput);
      passwordInput.addEventListener('focus', passwordHandler);

      return () => {
        passwordInput?.removeEventListener('focus', passwordHandler);
      };
    }
  }, [open, isMobile, viewportHeight]);

  // Обработка фокуса на инпутах
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsInputFocused(true);

    // На мобильных устройствах скроллим к элементу
    if (isMobile) {
      setTimeout(() => {
        e.target.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }, 300);
    }
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
  };

  const getPasskeyLabel = () => {
    if (typeof navigator === 'undefined') return 'Устройство';

    const ua = navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(ua)) {
      return 'Face ID';
    }

    if (/macintosh|mac os x/.test(ua)) {
      return 'Touch ID';
    }

    if (/win/.test(ua)) {
      return 'Windows Hello';
    }

    if (/android/.test(ua)) {
      return 'Отпечаток / лицо';
    }

    return 'Устройство';
  };

  // Общий контент для обоих режимов (desktop и mobile)
  const modalContent = (
    <>
      {/* Pulsating Aura Effect */}
      <div
        className="absolute -inset-8 rounded-[36px] pointer-events-none animate-[ambient-pulse_5s_ease-in-out_infinite]"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.06) 40%, transparent 75%)',
          border: '1px solid rgba(59, 130, 246, 0.12)'
        }}
      />

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
        <div className={`flex flex-col items-center mb-6 justify-end transition-all duration-500 ${(step === 'password-recovery' || step === 'check-email') ? 'min-h-[80px]' : 'min-h-[140px]'}`}>
          <AnimatePresence mode="wait">
            {step === 'password-existing' ? (
              /* Avatar State */
              <motion.div
                key="avatar"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="relative mb-2 mt-2" // mt-2 чтобы увеличить отступ
              >
                {/* Rotating Gradient Border */}
                <div className="absolute -inset-[3px] rounded-full bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 animate-spin-slow opacity-70 blur-[1px]" />

                <div className="relative rounded-full z-10 bg-zinc-950 p-[2px]">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userName || "User"}
                      className="w-20 h-20 rounded-full border-2 border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)] object-cover"
                      onError={() => {
                        console.log('[AuthModalNew] Avatar failed to load, showing initials');
                        setUserAvatar(null); // Сбрасываем, чтобы показались инициалы
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
                </div>
                {/* Verified Shield Badge - Moved slightly for alignment */}
                <div className="absolute -bottom-1 -right-1 bg-zinc-950 rounded-full p-1 border border-zinc-800 z-20">
                  <ShieldCheck className="w-4 h-4 text-green-500 fill-green-500/20" />
                </div>
              </motion.div>
            ) : (step === 'check-email' || step === 'password-recovery') ? (
              /* Hide logo logic - empty placeholder or secondary UI */
              null
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
                  {step === 'password-existing' && t('auth.continueProgress')}

                  {step === 'magic-link-new' && 'Отправим ссылку для быстрой регистрации'}
                  {step === 'magic-link-existing' && 'Получите магическую ссылку для входа'}
                  {/* Убрали дубликат email - он уже показан крупно ниже */}
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
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    icon={<Mail className="w-4 h-4" />}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    error={emailError ?? undefined}
                    className={`bg-zinc-900/50 border-zinc-800 h-14 text-lg text-center placeholder:text-center ${isEmailShaking ? 'animate-shake' : ''} pr-16`}
                    rightElement={
                      <div className="flex items-center pr-1">
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
                      </div>
                    }
                  />

                  {/* Micro-hint under input */}
                  {isValidEmail && !emailError && (
                    <motion.p
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-[11px] text-center text-zinc-500 font-medium"
                    >
                      {t('auth.tapArrow')}
                    </motion.p>
                  )}
                </form>

                {/* Divider & Socials */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.2 } }}
                  className="pt-2"
                >
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-zinc-800"></div>
                    <span className="flex-shrink-0 mx-4 text-zinc-600 text-[11px] font-medium uppercase tracking-wider">{t('auth.orContinueWith')}</span>
                    <div className="flex-grow border-t border-zinc-800"></div>
                  </div>

                  <div className={cn(
                    "grid gap-3 mt-1",
                    isPasskeyAvailable ? "grid-cols-3" : "grid-cols-2"
                  )}>
                    {isPasskeyAvailable && (
                      <PasskeyLoginButton
                        onSuccess={onClose}
                        variant="inline"
                        label={getPasskeyLabel()}
                      />
                    )}
                    <Button
                      variant="secondary"
                      className="bg-zinc-900 h-11 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all"
                      onClick={handleGoogleLogin}
                    >
                      <GoogleIcon />
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={telegramLoading}
                      className="bg-zinc-900 h-11 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {telegramLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TelegramIcon />}
                      <div
                        id="telegram-login-container-new"
                        className="absolute inset-0 flex items-center justify-center pointer-events-auto z-[100] opacity-[0.01] [&>iframe]:!w-full [&>iframe]:!h-full [&>iframe]:!opacity-[0.01] [&>iframe]:!pointer-events-auto"
                        style={{ minHeight: '40px', overflow: 'hidden' }}
                      />
                    </Button>
                  </div>
                </motion.div>
              </motion.div>

            ) : step === 'password-existing' ? (
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
                    <span className="text-[11px] text-sky-400 font-medium group-hover:text-sky-300 transition-colors">
                      {t('auth.changeEmail')}
                    </span>
                  </div>
                </div>

                {/* УМНЫЙ UI: зависит от наличия пароля */}
                {userHasPassword ? (
                  /* --- ЕСТЬ ПАРОЛЬ: Показываем форму с паролем --- */
                  <>
                    <form onSubmit={handleFinalSubmit} className="space-y-4">
                      {/* Header for Password Input: Label + Forgot Link */}
                      <div className="flex justify-between items-end mb-2 px-1">
                        <label className="text-sm font-medium text-zinc-400">
                          {t('auth.password')}
                        </label>
                        <button
                          type="button"
                          onClick={handlePasswordRecovery}
                          disabled={isSubmitting}
                          className="text-[11px] text-zinc-500 hover:text-blue-400 cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                          Забыли?
                        </button>
                      </div>

                      <Input
                        ref={passwordInputRef}
                        type={showPassword ? "text" : "password"}
                        placeholder={t('auth.passwordPlaceholder')}
                        // SHOW EFFECT: If scrambling or just showing text, use displayedPassword (which syncs with password)
                        value={showPassword || isScrambling ? displayedPassword : password}
                        onChange={handlePasswordChange}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        error={passwordError ?? undefined}
                        className={`bg-zinc-900/50 border-zinc-800 h-12 text-lg shadow-inner pr-10 ${isPasswordShaking ? 'animate-shake' : ''}`}
                        autoFocus
                        rightElement={
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => {
                              const nextState = !showPassword;
                              setShowPassword(nextState);

                              if (nextState) {
                                // Trigger Matrix Effect on Open
                                scramblePassword();
                                if (webApp?.HapticFeedback) {
                                  webApp.HapticFeedback.impactOccurred('medium');
                                }
                              }
                            }}
                            className="text-zinc-500/40 hover:text-zinc-300 transition-all duration-300 focus:outline-none relative group"
                          >
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={showPassword ? 'visible' : 'hidden'}
                                initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                                transition={{ duration: 0.2, ease: "backOut" }}
                              >
                                {showPassword ? (
                                  <div className="relative">
                                    <EyeOff className="w-5 h-5 text-blue-400" />
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0 }}
                                      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 2] }}
                                      transition={{ duration: 0.6 }}
                                      className="absolute -inset-1 bg-blue-500/20 rounded-full blur-sm -z-10"
                                    />
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: [0, 1, 0] }}
                                      transition={{ duration: 0.4 }}
                                      className="absolute -top-3 -right-3 pointer-events-none"
                                    >
                                      <Wand2 className="w-4 h-4 text-blue-400/60" />
                                    </motion.div>
                                  </div>
                                ) : (
                                  <Eye className="w-5 h-5" />
                                )}
                              </motion.div>
                            </AnimatePresence>
                          </button>
                        }
                      />

                      <div className="relative mt-6">
                        <ParticleEmitter isActive={isButtonHovered && !isInputFocused} />
                        <Button
                          type="submit"
                          variant="primary"
                          fullWidth
                          disabled={isSubmitting}
                          onMouseEnter={() => setIsButtonHovered(true)}
                          onMouseLeave={() => setIsButtonHovered(false)}
                          className="
                            relative h-11 text-[15px] font-bold overflow-hidden rounded-xl
                            bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600
                            hover:from-blue-500 hover:via-indigo-500 hover:to-purple-600
                            text-white border-none
                            shadow-[0_4px_20px_rgba(37,99,235,0.3)]
                            hover:shadow-[0_6px_25px_rgba(37,99,235,0.45)]
                            transition-all duration-300 ease-out
                            active:scale-[0.98]
                            before:absolute before:inset-0
                            before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0
                            before:-translate-x-full hover:before:translate-x-full
                            before:transition-transform before:duration-700
                          "
                        >
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.signIn')}
                          </span>
                        </Button>
                      </div>
                    </form>

                    {/* Magic Link - Ghost Button (Secondary action) */}
                    <button
                      type="button"
                      onClick={() => setStep('magic-link-existing')}
                      className="
                        group/magic w-full h-10 text-[13px] font-medium rounded-lg
                        bg-transparent hover:bg-blue-500/10
                        text-blue-400 hover:text-blue-300
                        transition-all duration-200
                        flex items-center justify-center gap-2
                      "
                    >
                      <Sparkles className="w-3 h-3 opacity-70" />
                      <span>{t('auth.signInWithoutPassword') || 'Войти без пароля'}</span>
                    </button>
                  </>
                ) : (
                  /* --- НЕТ ПАРОЛЯ: ТОЛЬКО кнопка Magic Link (минимализм) --- */
                  <div className="group/magic relative">
                    <Button
                      type="button"
                      variant="primary"
                      fullWidth
                      disabled={isSubmitting} // use disabled prop instead of loading so we can custom content
                      onClick={() => handleSendMagicLink(false)}
                      className="h-14 text-[16px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-none shadow-[0_8px_30px_rgba(37,99,235,0.3)] transition-all duration-300 active:scale-[0.98] relative overflow-hidden group/btn"
                    >
                      {/* Border Beam Effect on Hover (Internal for primary button can be subtle or omitted if overkill, let's keep it simple shimmery) */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_5s_infinite]" />

                      <span className="flex items-center gap-2 relative z-10">
                        {magicLinkState === 'sending' ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> {t('auth.sendingMagicLink')}</>
                        ) : magicLinkState === 'sent' ? (
                          <><ShieldCheck className="w-5 h-5 text-green-300" /> {t('auth.magicLinkSentShort')}</>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5 text-amber-200 animate-[pulse_3s_ease-in-out_infinite]" />
                            {t('auth.signInWithoutPassword') || 'Войти без пароля'}
                          </>
                        )}
                      </span>
                    </Button>
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 opacity-0 group-hover/magic:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                      {t('auth.magicTooltip')}
                    </div>
                  </div>
                )}
              </motion.div>

            ) : (step === 'check-email' || step === 'password-recovery') ? (

              /* --- Password Recovery Screen --- */
              <motion.div
                key={step}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="relative space-y-6 text-center -mt-8"
              >
                {/* Back Button (Elegant Arrow) - Absolute Top Left */}
                <button
                  onClick={() => step === 'check-email' ? setStep('email') : setStep('password-existing')}
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
                  className="space-y-4"
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
                      onClick={handleBackToEmail}
                      className="group flex items-center gap-2 bg-zinc-900/50 border border-white/10 rounded-full py-1.5 px-5 cursor-pointer hover:bg-zinc-800 hover:border-white/20 transition-all shadow-lg"
                    >
                      <span className="text-blue-400 text-sm font-bold">{email}</span>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest group-hover:text-sky-400">
                        {t('auth.changeEmail')}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] text-zinc-500 font-medium opacity-80">
                        Ссылка будет активна 15 минут
                      </p>

                      <AnimatePresence>
                        {(showResendRecovery || (step === 'check-email' && resendCooldown === 0)) && (
                          <motion.button
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            onClick={step === 'check-email' ? () => handleSendMagicLink(false) : handlePasswordRecovery}
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

            ) : step === 'reset-password' ? (
              /* --- Reset Password Screen --- */
              <ResetPasswordScreen
                onSuccess={() => setStep('reset-success')}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
              />
            ) : step === 'reset-success' ? (
              /* --- Reset Success Screen --- */
              <motion.div
                key="reset-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-24 h-24 mx-auto bg-green-500/10 rounded-full flex items-center justify-center relative"
                >
                  <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping opacity-20" />
                  <ShieldCheck className="w-12 h-12 text-green-500" />
                </motion.div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">Пароль обновлен!</h3>
                  <p className="text-zinc-400">Теперь ваш аккаунт в безопасности</p>
                </div>

                <Button
                  fullWidth
                  variant="primary"
                  onClick={() => {
                    onClose();
                    // Redirect to training usually happens automatically or via user action
                  }}
                  className="h-12 text-base font-semibold bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(22,163,74,0.3)] mt-4"
                >
                  К обучению
                </Button>
              </motion.div>
            ) : (step === 'magic-link-new' || step === 'magic-link-existing') ? (
              /* --- Magic Link Screen --- */
              <motion.div
                key="magic-link"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                {/* Email Display */}
                <div className="flex justify-center">
                  <div
                    onClick={handleBackToEmail}
                    className="group flex items-center gap-3 bg-zinc-900/50 border border-white/5 rounded-full py-1.5 px-4 cursor-pointer hover:bg-zinc-900 hover:border-white/10 transition-all"
                  >
                    <Mail className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300 text-sm font-medium">{email}</span>
                    <span className="text-[11px] text-sky-400 font-medium group-hover:text-sky-300">
                      {t('auth.changeEmail')}
                    </span>
                  </div>
                </div>

                {/* Magical Info Card - Glass Container with Border Beam */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="relative bg-white/5 backdrop-blur-2xl border border-blue-500/10 rounded-2xl p-6 overflow-hidden group"
                >
                  {/* Border Beam Effect */}
                  <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/80 to-transparent animate-border-beam" />
                  </div>

                  {/* Inner Glow */}
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                  <div className="flex items-start gap-4 relative z-10">
                    {/* Floating Icon with Glow */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                      <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/30 to-indigo-500/20 flex items-center justify-center flex-shrink-0 animate-float border border-blue-500/30">
                        <Mail className="w-5 h-5 text-blue-400" />
                      </div>
                    </div>

                    <div className="flex-1 space-y-2">
                      <h3 className="text-base font-bold text-white">
                        {step === 'magic-link-new' ? 'Быстрая регистрация' : 'Вход без пароля'}
                      </h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        Мы отправим вам{' '}
                        <span className="text-blue-400 font-medium">безопасную ссылку</span>
                        {' '}для {step === 'magic-link-new' ? 'создания аккаунта' : 'входа'}. Просто нажмите на ссылку в письме — и{' '}
                        <span className="text-blue-400 font-medium">всё готово!</span>
                      </p>
                    </div>
                  </div>

                  {/* Bottom Glow */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
                </motion.div>

                {/* Send Button - Different text for registration */}
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => handleSendMagicLink(step === 'magic-link-new')}
                  disabled={isSubmitting}
                  className="h-14 text-[16px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-none shadow-[0_8px_30px_rgba(37,99,235,0.3)] transition-all duration-300 active:scale-[0.98] relative overflow-hidden group/btn"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_5s_infinite]" />

                  <span className="flex items-center gap-2 relative z-10">
                    {magicLinkState === 'sending' ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> {t('auth.sendingMagicLink')}</>
                    ) : magicLinkState === 'sent' ? (
                      <><ShieldCheck className="w-5 h-5 text-green-300" /> {t('auth.magicLinkSentShort')}</>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-amber-200 animate-[pulse_3s_ease-in-out_infinite]" />
                        {step === 'magic-link-new' ? 'Создать аккаунт' : (t('auth.signInWithoutPassword') || 'Войти без пароля')}
                      </>
                    )}
                  </span>
                </Button>

                {/* Back Button */}
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={handleBackToEmail}
                  className="
                    h-11 text-[13px] font-medium rounded-xl
                    bg-zinc-900/50 hover:bg-zinc-800/70
                    border border-zinc-800/50 hover:border-zinc-700/70
                    text-zinc-400 hover:text-zinc-200
                    transition-all duration-200
                    active:scale-[0.98]
                  "
                >
                  ← Назад
                </Button>
              </motion.div>
            ) : null}

          </AnimatePresence>
        </div >

        {/* Legal Footer - Shown on email/password screens */}
        {
          (step === 'email' || step === 'password-existing') && (
            <div className="mt-auto pt-6 text-center text-[10px] text-zinc-600 leading-relaxed">
              {t('auth.legalFooter')} {' '}
              <LegalLink href="/terms" label={t('auth.terms')} title={t('auth.terms')} />
              {' '}и{' '}
              <LegalLink href="/privacy" label="Политику" title="Политика конфиденциальности" />
              .
            </div>
          )
        }
      </div>
    </>
  );

  // На мобилках - Vaul drawer, на десктопе - обычная модалка с ResponsiveModal
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()} // onClose вызывается когда open становится false
      hideCloseButton
      className="max-w-[420px] bg-zinc-950 p-0 border-white/10"
      contentClassName="p-0 scrollbar-none"
      preventClose={isKeyboardOpen} // Не даем закрыть свайпом если открыта клавиатура
    >
      <div
        ref={drawerContentRef}
        className="flex flex-col"
        style={{
          maxHeight: viewportHeight && isKeyboardOpen
            ? `${viewportHeight}px`
            : undefined,
          transition: 'transform 0.25s ease-out'
        }}
      >
        <div
          className="overflow-y-auto flex-1 overscroll-contain"
          style={{
            maxHeight: viewportHeight && isKeyboardOpen
              ? `${viewportHeight - 20}px`
              : '85vh',
            touchAction: isKeyboardOpen ? 'pan-y' : 'auto'
          }}
          onTouchMove={(e) => {
            if (isKeyboardOpen) e.stopPropagation();
          }}
        >
          {modalContent}
        </div>
      </div>
    </ResponsiveModal>
  );
}

// --- Helper Component: Reset Password Screen ---
function ResetPasswordScreen({
  onSuccess,
  isSubmitting,
  setIsSubmitting
}: {
  onSuccess: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Validation State
  const requirements = [
    { id: 'app_len', label: '8+ символов', valid: newPassword.length >= 8 },
    { id: 'app_num', label: 'Цифра', valid: /\d/.test(newPassword) },
    { id: 'app_case', label: 'Aa', valid: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) },
  ];

  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isFormValid = requirements.every(r => r.valid) && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      onSuccess();
    } catch (error: any) {
      console.error('Password reset failed:', error);
      toast.error(error.message || 'Ошибка обновления пароля');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      key="reset-password-content"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pt-2"
    >
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-white">Новый пароль</h3>
        <p className="text-sm text-zinc-400">Придумайте надежный пароль для защиты аккаунта</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div className="space-y-2 text-left">
          <Input
            type="password"
            placeholder="Новый пароль"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onFocus={() => setIsFocused(true)}
            className="bg-black/20 border-white/10 text-white placeholder:text-zinc-600 focus:border-blue-500/50 h-12"
          />

          {/* Strength Indicator Line */}
          <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              initial={{ width: 0 }}
              animate={{
                width: `${(requirements.filter(r => r.valid).length / requirements.length) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Requirements Checklist */}
        <div className="flex gap-3 justify-center">
          {requirements.map(req => (
            <div
              key={req.id}
              className={cn(
                "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md border transition-all duration-300",
                req.valid
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                  : "border-transparent bg-zinc-900 text-zinc-600"
              )}
            >
              {req.label}
            </div>
          ))}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2 text-left pt-2">
          <div className={cn(
            "relative rounded-xl transition-all duration-300",
            !passwordsMatch && confirmPassword ? "animate-shake" : ""
          )}>
            <Input
              type="password"
              placeholder="Повторите пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={cn(
                "bg-black/20 text-white placeholder:text-zinc-600 h-12 transition-all duration-300",
                !passwordsMatch && confirmPassword
                  ? "border-red-500/30 focus:border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                  : passwordsMatch
                    ? "border-green-500/30 focus:border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                    : "border-white/10 focus:border-blue-500/50"
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {passwordsMatch && confirmPassword && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="w-5 h-5 text-green-500" />
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <Button
          type="submit"
          fullWidth
          disabled={!isFormValid || isSubmitting}
          className={cn(
            "h-12 text-[15px] font-bold mt-4 transition-all duration-300",
            isFormValid
              ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
              : "bg-zinc-800 text-zinc-500"
          )}
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Сохранить пароль'}
        </Button>
      </form>
    </motion.div>
  );
}

// Вспомогательный компонент для юридических ссылок
function LegalLink({ href, label, title }: { href: string; label: string; title: string }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <button className="text-zinc-600 hover:text-zinc-400 border-b border-transparent hover:border-zinc-400/50 transition-all pb-px font-medium outline-none">
            {label}
          </button>
        </DrawerTrigger>
        <DrawerContent className="h-[85vh] bg-zinc-950/95 backdrop-blur-xl border-t border-white/10">
          <DrawerHeader className="border-b border-white/5 pb-4">
            <DrawerTitle className="text-white text-center">{title}</DrawerTitle>
            <div className="flex justify-center mt-2">
              <div className="w-12 h-1 bg-white/10 rounded-full" />
            </div>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-6 text-zinc-400 text-sm leading-relaxed space-y-4">
            <p>
              В соответствии с требованиями законодательства, здесь должен быть представлен полный текст документа "{title}".
            </p>
            <p>
              Мы серьезно относимся к вашей конфиденциальности и защите данных. Вся информация хранится в зашифрованном виде.
            </p>
            <p>
              Используя сервис, вы соглашаетесь с условиями предоставления услуг и политикой обработки персональных данных.
            </p>
            <p>
              Полный текст доступен на нашем веб-сайте в разделе "Юридическая информация".
            </p>
          </div>
          <DrawerFooter className="border-t border-white/5 pt-4">
            <DrawerClose asChild>
              <Button variant="secondary" className="w-full h-12 text-base font-medium">
                Понятно
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-zinc-600 hover:text-zinc-400 border-b border-transparent hover:border-zinc-400/50 transition-all pb-px font-medium"
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </a>
  );
}
