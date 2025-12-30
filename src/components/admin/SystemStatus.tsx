import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertCircle, Loader2, Database, Wifi, Server, Activity, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface SystemStatusProps {
  onStatusChange?: (status: SystemHealthStatus) => void;
}

export interface SystemHealthStatus {
  supabase: 'online' | 'offline' | 'degraded' | 'checking';
  network: 'online' | 'offline';
  database: 'healthy' | 'slow' | 'error' | 'checking';
  latency: number | null;
  lastChecked: Date | null;
  errors: string[];
}

export function SystemStatus({ onStatusChange }: SystemStatusProps) {
  const [status, setStatus] = useState<SystemHealthStatus>({
    supabase: 'checking',
    network: navigator.onLine ? 'online' : 'offline',
    database: 'checking',
    latency: null,
    lastChecked: null,
    errors: [],
  });

  const checkSupabaseHealth = async (): Promise<{ status: 'online' | 'offline' | 'degraded'; latency: number; error?: string }> => {
    const startTime = performance.now();
    try {
      const { data, error } = await Promise.race([
        supabase.from('topics').select('id', { count: 'exact', head: true }),
        new Promise<{ error: Error }>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]) as any;

      const latency = Math.round(performance.now() - startTime);

      if (error) {
        return { status: 'offline', latency, error: error.message };
      }

      if (latency > 2000) {
        return { status: 'degraded', latency };
      }

      return { status: 'online', latency };
    } catch (error: any) {
      const latency = Math.round(performance.now() - startTime);
      return { status: 'offline', latency, error: error.message || 'Connection failed' };
    }
  };

  const checkDatabaseHealth = async (): Promise<'healthy' | 'slow' | 'error'> => {
    try {
      const startTime = performance.now();
      const { error } = await Promise.race([
        supabase.rpc('has_role', { _user_id: '00000000-0000-0000-0000-000000000000', _role: 'admin' }),
        new Promise<{ error: Error }>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ]) as any;

      const latency = performance.now() - startTime;

      if (error && error.code !== 'PGRST116') {
        return 'error';
      }

      if (latency > 1000) {
        return 'slow';
      }

      return 'healthy';
    } catch {
      return 'error';
    }
  };

  useEffect(() => {
    const checkHealth = async () => {
      const errors: string[] = [];
      
      // Check network
      const networkStatus = navigator.onLine ? 'online' : 'offline';
      if (!navigator.onLine) {
        errors.push('Нет подключения к интернету');
      }

      // Check Supabase
      const supabaseHealth = await checkSupabaseHealth();
      if (supabaseHealth.error) {
        errors.push(`Supabase: ${supabaseHealth.error}`);
      }

      // Check Database
      const dbHealth = await checkDatabaseHealth();
      if (dbHealth === 'error') {
        errors.push('База данных недоступна');
      } else if (dbHealth === 'slow') {
        errors.push('База данных работает медленно');
      }

      const newStatus: SystemHealthStatus = {
        supabase: supabaseHealth.status,
        network: networkStatus,
        database: dbHealth,
        latency: supabaseHealth.latency,
        lastChecked: new Date(),
        errors,
      };

      setStatus(newStatus);
      onStatusChange?.(newStatus);
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    // Listen to network status
    const handleOnline = () => setStatus(prev => ({ ...prev, network: 'online' }));
    const handleOffline = () => setStatus(prev => ({ ...prev, network: 'offline' }));
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onStatusChange]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'offline':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'degraded':
      case 'slow':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      online: { variant: 'default' as const, className: 'bg-emerald-500' },
      healthy: { variant: 'default' as const, className: 'bg-emerald-500' },
      offline: { variant: 'destructive' as const, className: 'bg-red-500' },
      error: { variant: 'destructive' as const, className: 'bg-red-500' },
      degraded: { variant: 'secondary' as const, className: 'bg-yellow-500' },
      slow: { variant: 'secondary' as const, className: 'bg-yellow-500' },
      checking: { variant: 'outline' as const, className: '' },
    };

    const config = variants[status as keyof typeof variants] || variants.checking;
    const labels = {
      online: 'Онлайн',
      offline: 'Оффлайн',
      degraded: 'Деградирован',
      healthy: 'Здоров',
      slow: 'Медленно',
      error: 'Ошибка',
      checking: 'Проверка...',
    };

    return (
      <Badge variant={config.variant} className={cn(config.className, "text-white")}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const overallHealth = 
    status.supabase === 'offline' || status.database === 'error' || status.network === 'offline'
      ? 'critical'
      : status.supabase === 'degraded' || status.database === 'slow'
      ? 'warning'
      : 'healthy';

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Состояние системы
          </CardTitle>
          <Badge
            variant={overallHealth === 'healthy' ? 'default' : overallHealth === 'warning' ? 'secondary' : 'destructive'}
            className={cn(
              overallHealth === 'healthy' && 'bg-emerald-500',
              overallHealth === 'warning' && 'bg-yellow-500',
              overallHealth === 'critical' && 'bg-red-500',
              'text-white'
            )}
          >
            {overallHealth === 'healthy' ? 'Здорово' : overallHealth === 'warning' ? 'Предупреждение' : 'Критично'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Supabase Status */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            {getStatusIcon(status.supabase)}
            <span className="text-sm font-medium">Supabase</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(status.supabase)}
            {status.latency && (
              <span className="text-xs text-muted-foreground">
                {status.latency}ms
              </span>
            )}
          </div>
        </div>

        {/* Network Status */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            {getStatusIcon(status.network)}
            <span className="text-sm font-medium">Сеть</span>
          </div>
          {getStatusBadge(status.network)}
        </div>

        {/* Database Status */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            {getStatusIcon(status.database)}
            <span className="text-sm font-medium">База данных</span>
          </div>
          {getStatusBadge(status.database)}
        </div>

        {/* Errors */}
        <AnimatePresence>
          {status.errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1"
            >
              {status.errors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                >
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-red-700 dark:text-red-300">{error}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last Checked */}
        {status.lastChecked && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Clock className="h-3 w-3" />
            <span>
              Обновлено: {status.lastChecked.toLocaleTimeString('ru-RU')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

