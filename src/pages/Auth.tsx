import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserContext } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { Crown } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useUserContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Load Telegram Widget Script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', 'sdadimtutbot');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-onauth', 'onTelegramAuth');
    script.setAttribute('data-request-access', 'write');

    const container = document.getElementById('telegram-login-container');
    if (container && !container.hasChildNodes()) {
      container.appendChild(script);
    }

    // Global callback for Telegram auth
    (window as any).onTelegramAuth = (user: any) => {
      login({
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

      navigate("/");
    };

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [login, navigate, toast]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate authentication
    setTimeout(() => {
      login({
        id: Date.now(),
        first_name: email.split('@')[0],
        username: email.split('@')[0],
      });

      toast({
        title: "Вход выполнен",
        description: "Добро пожаловать!",
      });

      setIsLoading(false);
      navigate("/");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
      <Card className="w-full max-w-md p-8 space-y-8 gradient-card">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-xl gradient-primary">
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Sdadim
          </h1>
          <p className="text-muted-foreground">Войдите, чтобы продолжить обучение</p>
        </div>

        {/* Telegram Login */}
        <div className="space-y-4">
          <div className="text-center">
            <Label className="text-lg">Войти через Telegram</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Быстрый и безопасный способ входа
            </p>
          </div>
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

        {/* Email Login */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
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
            />
          </div>
          <Button type="submit" className="w-full shadow-primary" size="lg" disabled={isLoading}>
            {isLoading ? "Вход..." : "Войти"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <Button variant="link" className="p-0 h-auto font-semibold">
            Зарегистрироваться
          </Button>
        </p>
      </Card>
    </div>
  );
};

export default Auth;
