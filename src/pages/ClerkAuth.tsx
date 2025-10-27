import { SignIn, SignUp, useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { syncClerkUserToSupabase } from '@/lib/clerk';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ClerkAuth() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const syncUser = async () => {
      if (isLoaded && user) {
        await syncClerkUserToSupabase(user, supabase);
        navigate('/');
      }
    };
    syncUser();
  }, [user, isLoaded, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Добро пожаловать
          </h1>
          <p className="text-muted-foreground">
            Войдите или создайте аккаунт для продолжения
          </p>
        </div>

        <Card className="gradient-card border-primary/30 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="relative p-6">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Вход</TabsTrigger>
                <TabsTrigger value="signup">Регистрация</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <SignIn 
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-none bg-transparent",
                    }
                  }}
                  routing="path"
                  path="/clerk-auth"
                />
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <SignUp 
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-none bg-transparent",
                    }
                  }}
                  routing="path"
                  path="/clerk-auth"
                />
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </div>
    </div>
  );
}
