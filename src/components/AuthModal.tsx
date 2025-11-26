import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserContext } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Crown } from "lucide-react";

const authSchema = z.object({
  email: z.string().email({ message: "Неверный формат email" }).max(255),
  password: z.string().min(6, { message: "Пароль должен быть минимум 6 символов" })
});

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { login, platform } = useUserContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  // UnifiedModal сам синхронизирует с URL через modalRouteKey
  const handleOpenChange = (state: boolean) => {
    if (!state && onClose) {
      onClose();
    }
  };

  useEffect(() => {
    // Only load widget when modal is open
    if (!open) {
      return;
    }

    console.log('[AuthModal] Loading Telegram widget...');
    
    // Define global callback FIRST before loading script
    (window as any).onTelegramAuth = async (user: any) => {
      console.log('[AuthModal] Telegram auth callback triggered:', user);
      
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
        
        // Redirect to home page (learning map) after successful login
        setTimeout(() => {
          navigate('/');
        }, 300);
      } catch (error) {
        console.error('[AuthModal] Telegram login error:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось войти через Telegram",
          variant: "destructive"
        });
      }
    };

    // Wait for DOM to be ready
    setTimeout(() => {
      const container = document.getElementById('telegram-login-container');
      if (!container) {
        console.error('[AuthModal] Telegram container not found!');
        return;
      }

      // Clear any existing content
      container.innerHTML = '';
      
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.setAttribute('data-telegram-login', 'sdadimtutbot');
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');

      container.appendChild(script);
      console.log('[AuthModal] Telegram widget script appended');
    }, 100);

    return () => {
      console.log('[AuthModal] Cleaning up Telegram widget');
      delete (window as any).onTelegramAuth;
      const container = document.getElementById('telegram-login-container');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [login, onClose, toast, open]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate input
      const validated = authSchema.parse({ email, password });

      if (isSignUp) {
        // Sign up
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
          setIsLoading(false);
          return;
        }

        toast({
          title: "Регистрация успешна",
          description: "Добро пожаловать!",
        });

        onClose();
        
        // Redirect to home page (learning map) after successful signup
        setTimeout(() => {
          navigate('/');
        }, 300);
      } else {
        // Sign in
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
          setIsLoading(false);
          return;
        }

        toast({
          title: "Вход выполнен",
          description: "Добро пожаловать!",
        });

        onClose();
        
        // Redirect to home page (learning map) after successful login
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
        console.error('Auth error:', error);
        toast({
          title: "Ошибка",
          description: "Произошла ошибка. Попробуйте снова.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <UnifiedModal
      open={open}
      onOpenChange={handleOpenChange}
      title={isSignUp ? "Регистрация" : "Вход в систему"}
      showTitleBar={false}
      className="sm:max-w-md !bg-[#050d21] !text-white !border !border-white/5 shadow-[0_30px_80px_rgba(5,13,33,0.85)]"
      contentClassName="px-6 py-6 sm:px-8 sm:py-8"
      modalRouteKey="auth"
    >
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-indigo-500/20 via-transparent to-transparent shadow-[0_10px_30px_rgba(79,70,229,0.45)]">
            <Crown className="w-7 h-7 text-indigo-200" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white">
              {isSignUp ? "Регистрация" : "Вход в систему"}
            </h2>
            <p className="text-sm text-slate-400">
              {isSignUp ? "Создайте аккаунт для доступа ко всем функциям" : "Войдите, чтобы продолжить обучение"}
            </p>
          </div>
        </div>

          {/* Telegram Login */}
          <div className="space-y-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-sm">
            <Label className="text-center block text-sm tracking-[0.35em] uppercase text-indigo-200">Войти через Telegram</Label>
            <p className="text-sm text-slate-400 text-center">
              Быстрый и безопасный способ входа
            </p>
            <div id="telegram-login-container" className="flex justify-center" />
          </div>

          {/* Google Login */}
          <Button
            type="button"
            variant="outline"
            className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={async () => {
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
                console.error('Google OAuth error:', error);
                toast({
                  title: "Ошибка",
                  description: error.message || "Не удалось войти через Google",
                  variant: "destructive"
                });
              }
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] text-slate-500">
              <span className="px-3 bg-[#050d21]">или войдите с email</span>
            </div>
          </div>

          {/* Email Login/Signup */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-slate-300">
                Пароль
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500/60"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_20px_40px_rgba(79,70,229,0.5)]"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (isSignUp ? "Регистрация..." : "Вход...") : (isSignUp ? "Зарегистрироваться" : "Войти")}
            </Button>
            
            <div className="text-center text-sm text-slate-400">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-indigo-300 hover:text-white font-medium transition-colors"
              >
                {isSignUp ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
              </button>
            </div>
          </form>
      </div>
    </UnifiedModal>
  );
}
