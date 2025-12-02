// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

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
      <div className="bg-[#151923] border border-[#1e293b] rounded-xl p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-3 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const funnelSteps = [
    { label: 'Клики', value: stats.clicks, percentage: 100 },
    { label: 'Регистрации', value: stats.registrations, percentage: stats.click_to_install_rate },
    { label: 'Покупки', value: stats.purchases, percentage: stats.reg_to_purchase_rate, highlight: true },
  ];

  return (
    <div className="space-y-6">
      {/* Воронка */}
      <div className="bg-[#151923] border border-[#1e293b] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Воронка конверсий</h3>
            <p className="text-sm text-slate-500 mt-1">Последние {days} дней</p>
          </div>
          <div className="px-3 py-1.5 bg-primary/10 rounded-lg">
            <span className="text-sm font-medium text-primary">
              {stats.overall_conversion_rate}% конверсия
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {funnelSteps.map((step, index) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-400">{step.label}</span>
                  <span className="text-2xl font-bold text-white">{step.value.toLocaleString()}</span>
                </div>
                {index > 0 && (
                  <span className="text-sm text-slate-500">
                    {step.percentage}% от предыдущего
                  </span>
                )}
              </div>
              
              <div className="relative h-2 bg-[#0a0e1a] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${step.percentage}%` }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                  className={`absolute top-0 left-0 h-full ${
                    step.highlight ? 'bg-primary' : 'bg-slate-700'
                  }`}
                />
              </div>

              {index < funnelSteps.length - 1 && (
                <div className="flex justify-center my-2">
                  <svg className="h-4 w-4 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Финансы */}
        {stats.total_revenue > 0 && (
          <div className="mt-6 pt-6 border-t border-[#1e293b] grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Доход</p>
              <p className="text-xl font-bold text-white">€{stats.total_revenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Комиссия</p>
              <p className="text-xl font-bold text-primary">€{stats.total_commission.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

