import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  Zap,
  Download,
  DollarSign,
  Users,
  RefreshCw,
  TrendingUp,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserContext } from "@/contexts/UserContext";
import Layout from "@/components/Layout";
import { ModernPartnerConversionFunnel } from "@/components/partner/ModernPartnerConversionFunnel";
import { PartnerLinkGenerator } from "@/components/partner/PartnerLinkGenerator";
import { PartnerBalancePayouts } from "@/components/partner/PartnerBalancePayouts";
import { AutoschoolStudentsProgress } from "@/components/partner/AutoschoolStudentsProgress";
import { PartnerHandbook } from "@/components/partner/PartnerHandbook";

interface PartnerData {
  id: string;
  name: string;
  email: string;
  channel_name: string;
  channel_url: string;
  partner_type: "barter" | "revenue_share" | "autoschool";
  status: "active" | "inactive";
  registration_status: "pending" | "approved" | "rejected";
  total_keys_issued: number;
  total_keys_activated: number;
  total_link_activations: number;
  partner_code: string | null;
  accumulated_commission: number;
  balance_available?: number;
  balance_hold?: number;
  created_at: string;
}

export default function ModernPartnerDashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, supabaseUser } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [funnelStats, setFunnelStats] = useState<{
    clicks: number;
    registrations: number;
    purchases: number;
    total_commission: number;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/partners");
      return;
    }
    
    loadDashboardData();
    
    const interval = setInterval(() => {
      if (isAuthenticated && supabaseUser && document.visibilityState === 'visible') {
        loadDashboardData();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated, supabaseUser]);

  const loadDashboardData = async () => {
    if (!supabaseUser) return;

    setLoading(true);
    
    try {
      const { data: partnerData, error: partnerError } = await supabase
        .from("partners")
        .select("*")
        .eq("user_id", supabaseUser.id)
        .single();

      if (partnerError) {
        if (partnerError.code === "PGRST116") {
          navigate("/partners");
          return;
        }
        throw partnerError;
      }

      if (partnerData) {
        setPartner(partnerData);
        
        // Загружаем реальные данные из воронки конверсий
        const { data: stats, error: statsError } = await supabase.rpc('get_partner_funnel_stats', {
          p_partner_id: partnerData.id,
          p_days: 30
        });
        
        if (!statsError && stats && stats.length > 0) {
          setFunnelStats({
            clicks: Number(stats[0].clicks) || 0,
            registrations: Number(stats[0].registrations) || 0,
            purchases: Number(stats[0].purchases) || 0,
            total_commission: Number(stats[0].total_commission) || 0,
          });
        }
      } else {
        navigate("/partners");
      }
    } catch (error: any) {
      console.error('[ModernPartnerDashboard] Error:', error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  // Партнер считается одобренным, если:
  // 1. registration_status === "approved" ИЛИ
  // 2. есть partner_code (код генерируется только для одобренных партнеров)
  // 3. registration_status === null или undefined (старые партнеры без явного статуса, но с кодом)
  const isApproved = partner && (
    partner.registration_status === "approved" || 
    (partner.partner_code && partner.partner_code.trim() !== "") ||
    (partner.registration_status === null && partner.partner_code)
  );

  if (!partner || !isApproved) {
    return (
      <Layout>
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <Sparkles className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Ожидание одобрения</h2>
            <p className="text-zinc-400 text-sm">
              Ваша заявка на рассмотрении. Мы свяжемся с вами в течение 24 часов.
            </p>
            {import.meta.env.DEV && partner && (
              <div className="mt-4 p-3 bg-zinc-800 rounded text-xs text-zinc-400 text-left">
                <p>Debug: status={String(partner.registration_status)}, code={partner.partner_code || 'null'}</p>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // Используем реальные данные из воронки, если они загружены
  const statCards = [
    {
      label: "Кликов",
      value: funnelStats?.clicks ?? partner.total_link_activations ?? 0,
      icon: TrendingUp,
      trend: null,
    },
    {
      label: "Регистраций",
      value: funnelStats?.registrations ?? 0,
      icon: Users,
      trend: null,
    },
    {
      label: "Покупок",
      value: funnelStats?.purchases ?? 0,
      icon: Sparkles,
      trend: null,
    },
    {
      label: "Комиссия",
      value: `€${(funnelStats?.total_commission ?? partner.accumulated_commission ?? 0).toFixed(2)}`,
      icon: DollarSign,
      trend: null,
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-zinc-950 text-white">
        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold tracking-tight text-white">
                    {partner.name}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
                    PRO
                  </span>
                </div>
                <p className="text-sm text-zinc-500 mt-1">{partner.channel_name}</p>
              </div>
              <button
                onClick={() => loadDashboardData()}
                disabled={loading}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      {stat.label}
                    </span>
                    <div className="p-1.5 rounded-md bg-zinc-800">
                      <Icon className="h-4 w-4 text-zinc-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {stat.value}
                  </div>
                  {stat.trend && (
                    <div className="text-xs text-emerald-500 font-medium mt-1">
                      {stat.trend}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="funnel" className="space-y-6">
            <TabsList className="bg-zinc-900 border border-zinc-800 p-1 h-auto">
              {/* Показываем табы если партнер одобрен (по той же логике, что и доступ к дашборду) */}
              {isApproved && (
                <>
                  <TabsTrigger 
                    value="funnel"
                    className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 px-3 py-2 text-sm font-medium rounded-md transition-all"
                  >
                    <BarChart3 className="h-4 w-4 mr-1.5" />
                    Аналитика
                  </TabsTrigger>
                  <TabsTrigger 
                    value="link-generator"
                    className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 px-3 py-2 text-sm font-medium rounded-md transition-all"
                  >
                    <Zap className="h-4 w-4 mr-1.5" />
                    Ссылки
                  </TabsTrigger>
                  {partner.partner_type === "revenue_share" && (
                    <TabsTrigger 
                      value="balance"
                      className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 px-3 py-2 text-sm font-medium rounded-md transition-all"
                    >
                      <DollarSign className="h-4 w-4 mr-1.5" />
                      Баланс
                    </TabsTrigger>
                  )}
                  {partner.partner_type === "autoschool" && (
                    <TabsTrigger 
                      value="students"
                      className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 px-3 py-2 text-sm font-medium rounded-md transition-all"
                    >
                      <Users className="h-4 w-4 mr-1.5" />
                      Студенты
                    </TabsTrigger>
                  )}
                  <TabsTrigger 
                    value="materials"
                    className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 px-3 py-2 text-sm font-medium rounded-md transition-all"
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Материалы
                  </TabsTrigger>
                  <TabsTrigger 
                    value="handbook"
                    className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 px-3 py-2 text-sm font-medium rounded-md transition-all"
                  >
                    <BookOpen className="h-4 w-4 mr-1.5" />
                    Справочник
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="funnel" className="mt-6">
              <ModernPartnerConversionFunnel partnerId={partner.id} days={30} />
            </TabsContent>

            <TabsContent value="link-generator" className="mt-6">
              <PartnerLinkGenerator partnerId={partner.id} />
            </TabsContent>

            {partner.partner_type === "revenue_share" && (
              <TabsContent value="balance" className="mt-6">
                <PartnerBalancePayouts partnerId={partner.id} />
              </TabsContent>
            )}

            {partner.partner_type === "autoschool" && (
              <TabsContent value="students" className="mt-6">
                <AutoschoolStudentsProgress partnerId={partner.id} />
              </TabsContent>
            )}

            <TabsContent value="materials" className="mt-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-16 text-center">
                <div className="p-4 rounded-full bg-zinc-800 border border-zinc-700 inline-flex mb-4">
                  <Download className="h-8 w-8 text-zinc-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Рекламные материалы
                </h3>
                <p className="text-zinc-500 text-sm">
                  Баннеры, логотипы и шаблоны скоро появятся здесь
                </p>
              </div>
            </TabsContent>

            <TabsContent value="handbook" className="mt-6">
              {partner && <PartnerHandbook partnerType={partner.partner_type} />}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}

