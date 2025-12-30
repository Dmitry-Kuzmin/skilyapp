// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDown, MousePointerClick, Download, UserPlus, ShoppingCart, TrendingUp } from "lucide-react";
import { motion } from "@/components/optimized/Motion";

interface FunnelStats {
  clicks: number;
  installs: number;
  registrations: number;
  purchases: number;
  click_to_install_rate: number;
  install_to_reg_rate: number;
  reg_to_purchase_rate: number;
  overall_conversion_rate: number;
  total_revenue: number;
  total_commission: number;
  avg_commission_per_purchase: number;
}

interface FunnelDayData {
  date: string;
  clicks: number;
  installs: number;
  registrations: number;
  purchases: number;
  revenue: number;
}

interface Props {
  partnerId: string;
  days?: number;
}

export function PartnerConversionFunnel({ partnerId, days = 30 }: Props) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FunnelStats | null>(null);
  const [dailyData, setDailyData] = useState<FunnelDayData[]>([]);

  useEffect(() => {
    loadFunnelData();
  }, [partnerId, days]);

  const loadFunnelData = async () => {
    try {
      setLoading(true);

      // Получить агрегированную статистику
      const { data: funnelStats, error: statsError } = await supabase
        .rpc('get_partner_funnel_stats', {
          p_partner_id: partnerId,
          p_days: days
        });

      if (statsError) throw statsError;

      if (funnelStats && funnelStats.length > 0) {
        setStats(funnelStats[0]);
      }

      // Получить данные по дням для графика
      const { data: dailyStats, error: dailyError } = await supabase
        .rpc('get_partner_funnel_by_day', {
          p_partner_id: partnerId,
          p_days: days
        });

      if (dailyError) throw dailyError;

      if (dailyStats) {
        setDailyData(dailyStats);
      }
    } catch (error: any) {
      console.error('[PartnerConversionFunnel] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <Card className="bg-slate-900/80 border-slate-800">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const funnelSteps = [
    {
      icon: MousePointerClick,
      label: 'Клики',
      value: stats.clicks,
      percentage: 100,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
    },
    {
      icon: Download,
      label: 'Установки',
      value: stats.installs,
      percentage: stats.click_to_install_rate,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
      conversionLabel: `${stats.click_to_install_rate}% из кликов`,
    },
    {
      icon: UserPlus,
      label: 'Регистрации',
      value: stats.registrations,
      percentage: stats.install_to_reg_rate,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      conversionLabel: `${stats.install_to_reg_rate}% из установок`,
    },
    {
      icon: ShoppingCart,
      label: 'Покупки',
      value: stats.purchases,
      percentage: stats.reg_to_purchase_rate,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-500/30',
      conversionLabel: `${stats.reg_to_purchase_rate}% из регистраций`,
      highlight: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Главная воронка */}
      <Card className="bg-slate-900/80 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Воронка конверсий
          </CardTitle>
          <CardDescription>
            Последние {days} дней · Общая конверсия: {stats.overall_conversion_rate}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {funnelSteps.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === funnelSteps.length - 1;

              return (
                <div key={step.label}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative p-4 rounded-lg border ${step.bgColor} ${step.borderColor} ${
                      step.highlight ? 'ring-2 ring-primary/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${step.bgColor}`}>
                          <Icon className={`h-5 w-5 ${step.color}`} />
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">{step.label}</p>
                          <p className={`text-2xl font-black ${step.color}`}>
                            {step.value.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        {step.conversionLabel && (
                          <p className="text-xs text-slate-400 mb-1">{step.conversionLabel}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${step.percentage}%` }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                              className={`h-full ${step.bgColor.replace('/20', '')}`}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-300">
                            {step.percentage}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {step.highlight && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Доход:</span>
                          <span className="font-bold text-green-400">
                            €{stats.total_revenue.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-slate-400">Ваша комиссия:</span>
                          <span className="font-bold text-primary">
                            €{stats.total_commission.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {!isLast && (
                    <div className="flex justify-center py-2">
                      <ArrowDown className="h-5 w-5 text-slate-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Дополнительная статистика */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <p className="text-xs text-slate-400 mb-1">Средняя комиссия на покупку</p>
                <p className="text-xl font-black text-primary">
                  €{stats.avg_commission_per_purchase.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <p className="text-xs text-slate-400 mb-1">Общая конверсия (клик → покупка)</p>
                <p className="text-xl font-black text-amber-400">
                  {stats.overall_conversion_rate}%
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* График по дням (упрощенная версия) */}
      {dailyData.length > 0 && (
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Динамика по дням</CardTitle>
            <CardDescription>Последние {Math.min(dailyData.length, 7)} дней</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dailyData.slice(0, 7).map((day, index) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                >
                  <span className="text-sm text-slate-400">
                    {new Date(day.date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <span className="text-slate-500">Клики:</span>
                      <span className="ml-2 font-medium text-blue-400">{day.clicks}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500">Рег:</span>
                      <span className="ml-2 font-medium text-green-400">{day.registrations}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500">Покупки:</span>
                      <span className="ml-2 font-medium text-amber-400">{day.purchases}</span>
                    </div>
                    {day.revenue > 0 && (
                      <div className="text-right">
                        <span className="text-slate-500">Доход:</span>
                        <span className="ml-2 font-bold text-primary">€{day.revenue.toFixed(0)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

