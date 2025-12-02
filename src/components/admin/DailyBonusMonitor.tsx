import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp, Shield, Users, AlertTriangle, Trophy, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

interface DailyPulse {
  claims_today: number;
  users_with_freeze: number;
  avg_streak: number;
  max_streak: number;
  active_this_week: number;
  at_risk_users: number;
  total_active_users: number;
}

export const DailyBonusMonitor = () => {
  const [pulse, setPulse] = useState<DailyPulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPulse();
    
    // ✅ ОПТИМИЗАЦИЯ: НЕ обновляем автоматически
    // Только при заходе в админку (экономия запросов)
  }, []);

  const loadPulse = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_daily_pulse')
        .select('*')
        .single();

      if (error) {
        console.error('[DailyBonusMonitor] Error:', error);
        setError(error.message);
        return;
      }

      setPulse(data as DailyPulse);
      setError(null);
    } catch (err) {
      console.error('[DailyBonusMonitor] Error:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Daily Bonus Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-5 h-5" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!pulse) return null;

  const metrics = [
    {
      label: 'Claims Today',
      value: pulse.claims_today,
      icon: Flame,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      trend: pulse.claims_today > 0 ? 'up' : 'neutral'
    },
    {
      label: 'Active Users',
      value: pulse.total_active_users,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      trend: 'neutral'
    },
    {
      label: 'Avg Streak',
      value: pulse.avg_streak ? pulse.avg_streak.toFixed(1) : '0',
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      trend: parseFloat(pulse.avg_streak?.toString() || '0') >= 7 ? 'up' : 'neutral'
    },
    {
      label: 'Max Streak',
      value: pulse.max_streak,
      icon: Trophy,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      trend: pulse.max_streak >= 30 ? 'up' : 'neutral'
    },
    {
      label: 'With Freeze',
      value: pulse.users_with_freeze,
      icon: Shield,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      trend: 'neutral'
    },
    {
      label: 'At Risk',
      value: pulse.at_risk_users,
      icon: AlertTriangle,
      color: pulse.at_risk_users > 0 ? 'text-red-500' : 'text-slate-400',
      bgColor: pulse.at_risk_users > 0 ? 'bg-red-500/10' : 'bg-slate-500/10',
      trend: pulse.at_risk_users > 0 ? 'down' : 'neutral'
    }
  ];

  // Health score
  const healthScore = Math.min(100, Math.round(
    (pulse.claims_today / Math.max(pulse.total_active_users, 1)) * 100
  ));

  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-yellow-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Flame className="w-5 h-5 text-orange-500" />
            </motion.div>
            <CardTitle>Daily Bonus System</CardTitle>
          </div>
          
          <Badge 
            variant="outline" 
            className={`${getHealthColor(healthScore)} border-current`}
          >
            Health: {healthScore}%
          </Badge>
        </div>
        <CardDescription>
          Мониторинг ежедневных бонусов в реальном времени
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {metrics.map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className={`p-3 rounded-lg border ${metric.bgColor} transition-all hover:scale-105`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${metric.color}`} />
                    <span className="text-xs text-muted-foreground">{metric.label}</span>
                  </div>
                  <div className="text-2xl font-bold">{metric.value}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Engagement Rate */}
          <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-500/5 to-purple-500/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Engagement</span>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">
              {pulse.total_active_users > 0 
                ? Math.round((pulse.active_this_week / pulse.total_active_users) * 100)
                : 0}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {pulse.active_this_week} активных за неделю
            </div>
          </div>

          {/* Average Streak Health */}
          <div className="p-4 rounded-lg border bg-gradient-to-br from-green-500/5 to-emerald-500/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Streak Health</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold">
              {pulse.avg_streak ? pulse.avg_streak.toFixed(1) : '0'} дней
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Средняя серия пользователей
            </div>
          </div>

          {/* Protection Rate */}
          <div className="p-4 rounded-lg border bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Protection</span>
              <Shield className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="text-2xl font-bold">
              {pulse.total_active_users > 0
                ? Math.round((pulse.users_with_freeze / pulse.total_active_users) * 100)
                : 0}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {pulse.users_with_freeze} с защитой streak
            </div>
          </div>
        </div>

        {/* Alerts */}
        {pulse.at_risk_users > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 p-4 rounded-lg border border-red-500/20 bg-red-500/5"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <div className="font-semibold text-red-500">
                  {pulse.at_risk_users} пользователей в зоне риска
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Streak ≥3, но не получали бонус вчера. Рассмотрите отправку напоминаний.
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Legend Streak Highlight */}
        {pulse.max_streak >= 30 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 p-4 rounded-lg border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-orange-500/5"
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <div>
                <div className="font-semibold text-yellow-600 dark:text-yellow-400">
                  🏆 Легендарный streak: {pulse.max_streak} дней!
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Кто-то показывает отличные результаты! Может стоит наградить? 😉
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Last Updated */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Обновляется только при заходе (экономия запросов)</span>
            <button
              onClick={loadPulse}
              className="hover:text-foreground transition-colors flex items-center gap-1"
              disabled={loading}
            >
              🔄 Обновить вручную
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

