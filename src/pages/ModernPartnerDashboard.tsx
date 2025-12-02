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
        <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!partner || partner.registration_status !== "approved") {
    return (
      <Layout>
        <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#151923] border border-[#1e293b] rounded-2xl p-8 text-center">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Ожидание одобрения</h2>
            <p className="text-slate-400">
              Ваша заявка на рассмотрении. Мы свяжемся с вами в течение 24 часов.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const statCards = [
    {
      label: "Кликов",
      value: partner.total_link_activations || 0,
      icon: TrendingUp,
      trend: null,
    },
    {
      label: "Регистраций",
      value: partner.total_keys_activated || 0,
      icon: Users,
      trend: "+12% за неделю",
    },
    {
      label: "Покупок",
      value: 0, // TODO: Получить из воронки
      icon: Sparkles,
      trend: null,
    },
    {
      label: "Комиссия",
      value: `€${partner.accumulated_commission?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      trend: null,
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0e1a] text-white">
        {/* Header */}
        <div className="border-b border-[#1e293b] bg-[#0a0e1a]/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  {partner.name}
                </h1>
                <p className="text-sm text-slate-500">{partner.channel_name}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadDashboardData()}
                disabled={loading}
                className="text-slate-400 hover:text-white hover:bg-[#151923]"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {/* Stats Grid - Минималистичные карточки */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-[#151923] border border-[#1e293b] rounded-xl p-5 hover:border-[#2d3748] transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {stat.label}
                    </span>
                    <Icon className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  {stat.trend && (
                    <div className="text-xs text-emerald-400 font-medium">
                      {stat.trend}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Tabs - Чистые, минималистичные */}
          <Tabs defaultValue="funnel" className="space-y-6">
            <TabsList className="bg-[#151923] border border-[#1e293b] p-1 h-auto">
              {partner.registration_status === "approved" && (
                <>
                  <TabsTrigger 
                    value="funnel"
                    className="data-[state=active]:bg-primary data-[state=active]:text-white text-slate-400 px-4 py-2.5 text-sm font-medium rounded-lg transition-all"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Аналитика
                  </TabsTrigger>
                  <TabsTrigger 
                    value="link-generator"
                    className="data-[state=active]:bg-primary data-[state=active]:text-white text-slate-400 px-4 py-2.5 text-sm font-medium rounded-lg transition-all"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Ссылки
                  </TabsTrigger>
                  {partner.partner_type === "revenue_share" && (
                    <TabsTrigger 
                      value="balance"
                      className="data-[state=active]:bg-primary data-[state=active]:text-white text-slate-400 px-4 py-2.5 text-sm font-medium rounded-lg transition-all"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Баланс
                    </TabsTrigger>
                  )}
                  {partner.partner_type === "autoschool" && (
                    <TabsTrigger 
                      value="students"
                      className="data-[state=active]:bg-primary data-[state=active]:text-white text-slate-400 px-4 py-2.5 text-sm font-medium rounded-lg transition-all"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Студенты
                    </TabsTrigger>
                  )}
                  <TabsTrigger 
                    value="materials"
                    className="data-[state=active]:bg-primary data-[state=active]:text-white text-slate-400 px-4 py-2.5 text-sm font-medium rounded-lg transition-all"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Материалы
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
              <div className="bg-[#151923] border border-[#1e293b] rounded-xl p-12 text-center">
                <Download className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Рекламные материалы
                </h3>
                <p className="text-slate-500">
                  Баннеры, логотипы и шаблоны скоро появятся здесь
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}

