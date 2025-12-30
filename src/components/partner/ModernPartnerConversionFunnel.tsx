// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";
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
}

interface Props {
  partnerId: string;
  days?: number;
}

export function ModernPartnerConversionFunnel({ partnerId, days = 30 }: Props) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FunnelStats | null>(null);

  useEffect(() => {
    loadFunnelData();
  }, [partnerId, days]);

  const loadFunnelData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_partner_funnel_stats', {
        p_partner_id: partnerId,
        p_days: days
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error: any) {
      console.error('[FunnelStats] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-3 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const funnelSteps = [
    { label: 'Клики', value: stats.clicks, percentage: 100, color: 'bg-blue-500' },
    { label: 'Регистрации', value: stats.registrations, percentage: stats.click_to_install_rate, color: 'bg-indigo-500' },
    { label: 'Покупки', value: stats.purchases, percentage: stats.reg_to_purchase_rate, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with overall stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Воронка конверсий</h2>
          <p className="text-sm text-zinc-400">Последние {days} дней</p>
        </div>
        <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <span className="text-sm font-semibold text-emerald-400">
            {stats.overall_conversion_rate.toFixed(1)}% общая конверсия
          </span>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="space-y-6">
          {funnelSteps.map((step, index) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider w-24">
                    {step.label}
                  </span>
                  <span className="text-2xl font-bold text-white">{step.value.toLocaleString()}</span>
                </div>
                {index > 0 && (
                  <span className="text-sm text-zinc-500">
                    {step.percentage.toFixed(1)}%
                  </span>
                )}
              </div>
              
              <div className="relative h-3 bg-zinc-950 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${step.percentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                  className={`absolute top-0 left-0 h-full ${step.color}`}
                />
              </div>

              {index < funnelSteps.length - 1 && (
                <div className="flex justify-center my-3">
                  <svg className="h-4 w-4 text-zinc-700" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Финансы */}
        {stats.total_revenue > 0 && (
          <div className="mt-6 pt-6 border-t border-zinc-800 grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-zinc-950/50 rounded-xl">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Доход</p>
              <p className="text-2xl font-bold text-white">€{stats.total_revenue.toFixed(2)}</p>
            </div>
            <div className="text-center p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Комиссия</p>
              <p className="text-2xl font-bold text-emerald-400">€{stats.total_commission.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

