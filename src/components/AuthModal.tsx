import { useState, useEffect } from "react";
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

  useEffect(() => {
    // Only load widget when modal is open and on web platform
    if (!open || platform !== 'web') {
      console.log('[AuthModal] Skipping Telegram widget:', { open, platform });
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
  }, [login, onClose, toast, platform, open]);

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
          {/* Only show Telegram widget on web platform */}
          {platform === 'web' && (
            <>
              {/* Telegram Login */}
              <div className="space-y-2">
                <Label className="text-center block text-lg">Войти через Telegram</Label>
                <p className="text-sm text-muted-foreground text-center">
                  Быстрый и безопасный способ входа
                </p>
                <div id="telegram-login-container" className="flex justify-center" />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">или войдите с email</span>
                </div>
              </div>
            </>
          )}

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
