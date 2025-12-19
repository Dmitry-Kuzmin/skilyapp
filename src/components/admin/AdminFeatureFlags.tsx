import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Settings, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface AppConfig {
  key: string;
  value: boolean | string | { enabled: boolean };
  description: string | null;
  updated_at: string;
}

export function AdminFeatureFlags() {
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Доступ запрещен", {
        description: "Необходима авторизация",
      });
      setIsAdmin(false);
      setAuthLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (error || !data) {
      toast.error("Доступ запрещен", {
        description: "Требуются права администратора",
      });
      setIsAdmin(false);
      setAuthLoading(false);
      return;
    }

    setIsAdmin(true);
    setAuthLoading(false);
  };

  const { data: flags, isLoading } = useQuery({
    queryKey: ['app-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .order('key');
      
      if (error) throw error;
      return data as AppConfig[];
    },
    enabled: isAdmin,
  });

  const toggleFlag = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      // Используем RPC функцию для обновления флагов (обходит RLS через SECURITY DEFINER)
      const { error } = await supabase.rpc('update_app_config', {
        config_key: key,
        config_value: value as any, // JSONB принимает boolean напрямую
      });
      
      if (error) {
        console.error('[AdminFeatureFlags] RPC error:', error);
        throw new Error(error.message || 'Failed to update flag');
      }
    },
    onSuccess: (_, variables) => {
      // Инвалидируем кэш React Query
      queryClient.invalidateQueries({ queryKey: ['app-config'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flag'] });
      
      // Broadcast событие для мгновенного обновления на всех вкладках
      const event = new CustomEvent('feature-flag-updated', {
        detail: { key: variables.key, value: variables.value }
      });
      window.dispatchEvent(event);
      
      // Также используем localStorage для синхронизации между вкладками
      localStorage.setItem(`feature-flag-${variables.key}`, JSON.stringify({
        value: variables.value,
        timestamp: Date.now()
      }));
      
      toast.success(
        variables.value ? 'Флаг включен' : 'Флаг выключен',
        {
          description: `Feature flag "${variables.key}" обновлен. Изменения применятся на всех вкладках в течение 1-2 секунд.`,
        }
      );
    },
    onError: (error: any) => {
      toast.error('Ошибка обновления флага', {
        description: error.message,
      });
    },
  });

  const getFlagValue = (flag: AppConfig): boolean => {
    if (typeof flag.value === 'boolean') {
      return flag.value;
    }
    if (typeof flag.value === 'object' && 'enabled' in flag.value) {
      return flag.value.enabled === true;
    }
    if (typeof flag.value === 'string') {
      return flag.value === 'true';
    }
    return true;
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Доступ запрещен</h1>
        <p className="text-muted-foreground">Требуются права администратора</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Feature Flags</h1>
        </div>
        <p className="text-muted-foreground">
          Управление функциональностью приложения. Изменения применяются мгновенно без пересборки.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {flags?.map((flag) => {
            const isEnabled = getFlagValue(flag);
            return (
              <Card key={flag.key}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {flag.key}
                        {isEnabled ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-gray-400" />
                        )}
                      </CardTitle>
                      {flag.description && (
                        <CardDescription className="mt-1">
                          {flag.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Label htmlFor={flag.key} className="cursor-pointer">
                        {isEnabled ? 'Включено' : 'Выключено'}
                      </Label>
                      <Switch
                        id={flag.key}
                        checked={isEnabled}
                        onCheckedChange={(checked) => {
                          toggleFlag.mutate({ key: flag.key, value: checked });
                        }}
                        disabled={toggleFlag.isPending}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Обновлено: {new Date(flag.updated_at).toLocaleString('ru-RU')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="w-5 h-5" />
            Важно
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-700 dark:text-yellow-300">
          <p className="mb-2">
            <strong>Сценарий использования:</strong>
          </p>
          <p className="mb-2">
            Если функция "Дуэли" кладет базу данных:
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Выключите флаг "duels_enabled"</li>
            <li>Дуэли исчезнут из приложения за 5 секунд</li>
            <li>Остальной функционал продолжит работать</li>
            <li>Исправьте проблему и включите флаг обратно</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

