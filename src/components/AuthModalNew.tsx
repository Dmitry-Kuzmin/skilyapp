import { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
import { ScanFace, ArrowRight, ShieldCheck, Loader2, Mail } from 'lucide-react';
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

// Schema будет использовать переводы через context
const createAuthSchema = (t: (key: string) => string) => z.object({
  email: z.string().email({ message: t('auth.errors.invalidEmail') }).max(255),
  password: z.string().min(6, { message: t('auth.errors.minPassword') })
});

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

// Fallback avatar если у пользователя нет аватара
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces";

export function AuthModalNew({ open, onClose }: AuthModalProps) {
  // --- State ---
  const [step, setStep] = useState<'email' | 'password-existing' | 'magic-link-new' | 'magic-link-existing' | 'check-email'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

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

            const displayName = [profile.first_name, profile.last_name]
              .filter(Boolean)
              .join(' ') || profile.username || email.split('@')[0];

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

        // КЛЮЧЕВАЯ ЛОГИКА: Проверяем есть ли пароль
        if (authCheck.hasPassword) {
          // У пользователя ЕСТЬ пароль → показываем форму с паролем
          console.log('[AuthModalNew] User has password, showing password form');
          setStep('password-existing');
        } else {
          // У пользователя НЕТ пароля (Magic Link user) → сразу Magic Link
          console.log('[AuthModalNew] User has NO password, going to magic-link');
          setStep('magic-link-existing');
        }
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

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

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
          toast({
            title: t('auth.errors.validationError'),
            description: t('auth.errors.invalidCredentials'),
            variant: "destructive"
          });
        } else {
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
      setStep('check-email');
      setIsSubmitting(false);

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
            ) : step === 'check-email' ? (
              /* Email Check State - No Logo, только иконка письма будет ниже */
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

                <p className="text-sm text-zinc-500 mt-2 font-medium">
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

                <form onSubmit={handleFinalSubmit} className="space-y-4">
                  <Input
                    ref={passwordInputRef}
                    type="password"
                    label={t('auth.password')}
                    placeholder={t('auth.passwordPlaceholder')}
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
                    {t('auth.signIn')}
                  </Button>
                </form>

                {/* Alternatives */}
                <div className="space-y-3 text-center">
                  {step === 'password-existing' && (
                    <>
                      <Button
                        variant="ghost"
                        fullWidth
                        onClick={() => setStep('magic-link-existing')}
                        className="text-sm font-medium h-11"
                      >
                        ✨ Войти через почту (без пароля)
                      </Button>
                      <p className="text-[11px] text-zinc-600">
                        {t('auth.alternativeLogin')}
                      </p>
                    </>
                  )}
                </div>
              </motion.div>

            ) : step === 'magic-link-new' || step === 'magic-link-existing' ? (
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

                {/* Info Card */}
                <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white mb-1">
                        {step === 'magic-link-new' ? 'Быстрая регистрация' : 'Вход без пароля'}
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Мы отправим вам безопасную ссылку для {step === 'magic-link-new' ? 'создания аккаунта' : 'входа'}. Просто нажмите на ссылку в письме — и всё готово!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Send Button */}
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => handleSendMagicLink(step === 'magic-link-new')}
                  loading={isSubmitting}
                  className="h-12 text-[15px] font-semibold"
                >
                  Отправить ссылку на {email.split('@')[0]}@...
                </Button>

                {/* Back Button */}
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={handleBackToEmail}
                  className="text-sm"
                >
                  ← Назад
                </Button>
              </motion.div>

            ) : step === 'check-email' ? (
              /* --- Check Email Screen --- */
              <motion.div
                key="check-email"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6 text-center"
              >
                {/* Icon Animation */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring" }}
                  className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.3)]"
                >
                  <Mail className="w-10 h-10 text-white" />
                </motion.div>

                {/* Success Message */}
                <div className="space-y-3">
                  <p className="text-zinc-300 leading-relaxed">
                    Письмо отправлено на<br />
                    <span className="text-white font-semibold">{email}</span>
                  </p>
                  <p className="text-sm text-zinc-500">
                    Ссылка действительна 60 минут
                  </p>
                </div>

                {/* Resend Button */}
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleResendMagicLink}
                  disabled={resendCooldown > 0}
                  className="h-12"
                >
                  {resendCooldown > 0
                    ? `Отправить снова (${resendCooldown}с)`
                    : 'Отправить письмо снова'
                  }
                </Button>

                {/* Back to email */}
                <button
                  onClick={() => setStep('email')}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  ← Изменить email
                </button>
              </motion.div>

            ) : null}

          </AnimatePresence>
        </div>

        {/* Legal Footer */}
        <div className="mt-8 text-center text-xs text-zinc-600">
          {t('auth.legalFooter')}{' '}
          <Link
            to="/terms"
            className="underline underline-offset-4 hover:text-blue-400 transition-colors"
          >
            {t('auth.terms')}
          </Link>
          {' '}и{' '}
          <Link
            to="/privacy"
            className="underline underline-offset-4 hover:text-blue-400 transition-colors"
          >
            {t('auth.privacy')}
          </Link>
          .
        </div>

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
          onTouchStart={(e) => {
            if (isKeyboardOpen) e.stopPropagation();
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

