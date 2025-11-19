import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-xl gradient-primary">
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {isSignUp ? "Регистрация" : "Вход в систему"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isSignUp ? "Создайте аккаунт для доступа ко всем функциям" : "Войдите, чтобы продолжить обучение"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Telegram Login */}
          <div className="space-y-2">
            <Label className="text-center block text-lg">Войти через Telegram</Label>
            <p className="text-sm text-muted-foreground text-center">
              Быстрый и безопасный способ входа
            </p>
            <div id="telegram-login-container" className="flex justify-center" />
          </div>

          {/* Google Login */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">или войдите с email</span>
            </div>
          </div>

          {/* Email Login/Signup */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full shadow-primary" size="lg" disabled={isLoading}>
              {isLoading ? (isSignUp ? "Регистрация..." : "Вход...") : (isSignUp ? "Зарегистрироваться" : "Войти")}
            </Button>
            
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline font-medium"
              >
                {isSignUp ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
