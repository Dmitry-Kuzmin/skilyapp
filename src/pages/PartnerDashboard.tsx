import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Key,
  TrendingUp,
  Users,
  Gift,
  DollarSign,
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Copy,
  Sparkles,
  RefreshCw,
  Link as LinkIcon,
  QrCode,
  BarChart3,
  Zap,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserContext } from "@/contexts/UserContext";
import Layout from "@/components/Layout";
import { PartnerConversionFunnel } from "@/components/partner/PartnerConversionFunnel";
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

interface PremiumKey {
  key: string;
  status: string;
  issued_at: string;
  activated_at: string | null;
}

interface MarketingMaterial {
  id: string;
  name: string;
  type: string;
  file_url: string | null;
  description: string | null;
  usage_instructions: string | null;
}

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, supabaseUser } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [keys, setKeys] = useState<PremiumKey[]>([]);
  const [materials, setMaterials] = useState<MarketingMaterial[]>([]);
  const [stats, setStats] = useState({
    total_keys_issued: 0,
    total_keys_activated: 0,
    activation_rate: 0,
    accumulated_commission: 0,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/partners");
      return;
    }
    
    // ОПТИМИЗАЦИЯ: Загружаем данные только один раз при монтировании
    // Автообновление отключено для улучшения производительности
    // Пользователь может обновить данные вручную кнопкой "Обновить"
    loadDashboardData();
    
    // ОПТИМИЗАЦИЯ: Автообновление только если пользователь активно использует страницу
    // Увеличено до 60 секунд для снижения нагрузки
    const interval = setInterval(() => {
      if (isAuthenticated && supabaseUser && document.visibilityState === 'visible') {
        // Обновляем только если страница видима
        loadDashboardData();
      }
    }, 60000); // 60 секунд вместо 30

    return () => clearInterval(interval);
  }, [isAuthenticated, supabaseUser]);

  const loadDashboardData = async () => {
    if (!supabaseUser) return;

    setLoading(true);
    const startTime = performance.now();
    
    try {
      // ОПТИМИЗАЦИЯ: Используем Promise.race для таймаута RPC запроса (3 секунды)
      // Если RPC медленная, сразу используем прямые запросы
      const rpcPromise = supabase.rpc("get_partner_dashboard", {
        p_user_id: supabaseUser.id,
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("RPC timeout after 3 seconds")), 3000);
      });
      
      let rpcData: any = null;
      let rpcError: any = null;

      try {
        const rpcResult = await Promise.race([
          rpcPromise,
          timeoutPromise,
        ]) as any;
        rpcData = rpcResult.data;
        rpcError = rpcResult.error;
      } catch (e: any) {
        // Если это таймаут, создаем специальную ошибку
        if (e.message?.includes("timeout")) {
          if (import.meta.env.DEV) {
            console.warn('[PartnerDashboard] RPC timeout after 3s, using direct queries');
          }
          rpcError = { code: 'TIMEOUT', message: 'RPC timeout after 3 seconds' };
        } else {
          rpcError = e;
        }
      }

      // If RPC function works, use it
      if (!rpcError && rpcData && rpcData.length > 0 && rpcData[0].partner_data) {
        const { partner_data, keys_data, stats: rpcStats } = rpcData[0];
        
        // Convert JSONB to object - handle both JSONB and plain object
        let partnerObj: any;
        if (typeof partner_data === 'string') {
          partnerObj = JSON.parse(partner_data);
        } else {
          partnerObj = partner_data;
        }
        
        // Extract total_link_activations from stats if not in partner_data
        const totalLinkActivations = partnerObj.total_link_activations ?? rpcStats?.total_link_activations ?? 0;
        
        // ОПТИМИЗАЦИЯ: Логи только в dev режиме
        if (import.meta.env.DEV) {
          console.log('[PartnerDashboard] Partner data loaded:', {
            code: partnerObj.partner_code,
            status: partnerObj.registration_status,
            linkActivations: totalLinkActivations,
          });
        }
        
        // Set partner with all fields including total_link_activations
        setPartner({
          ...partnerObj,
          total_link_activations: totalLinkActivations,
        });
        setKeys((keys_data as any[]) || []);
        setStats({
          total_keys_issued: rpcStats?.total_keys_issued || 0,
          total_keys_activated: rpcStats?.total_keys_activated || 0,
          activation_rate: rpcStats?.activation_rate || 0,
          accumulated_commission: rpcStats?.accumulated_commission || 0,
        });

        // ОПТИМИЗАЦИЯ: Загружаем материалы параллельно, не блокируя основной рендер
        if (partnerObj.registration_status === "approved") {
          // Загружаем материалы асинхронно, не блокируя основной UI
          supabase
            .from("marketing_materials")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .then(({ data: materialsData, error: materialsError }) => {
              if (!materialsError && materialsData) {
                setMaterials(materialsData);
              }
            })
            .catch((error) => {
              if (import.meta.env.DEV) {
                console.error('[PartnerDashboard] Error loading materials:', error);
              }
            });
        }
        return;
      }

      // Fallback: Use direct queries if RPC function doesn't exist, fails, or times out
      if (rpcError && (
        rpcError.code === "42883" || 
        rpcError.code === "TIMEOUT" ||
        rpcError.message?.includes("does not exist") ||
        rpcError.message?.includes("timeout") ||
        rpcError.message?.includes("aborted")
      )) {
        if (import.meta.env.DEV) {
          console.log("[PartnerDashboard] RPC failed or timed out, using direct queries");
        }
        
        // ОПТИМИЗАЦИЯ: Получаем только необходимые поля партнера (не все колонки)
        const { data: partnerData, error: partnerError } = await supabase
          .from("partners")
          .select("id, name, email, channel_name, channel_url, partner_type, status, registration_status, total_keys_issued, total_keys_activated, total_link_activations, partner_code, accumulated_commission, created_at")
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
          
          // ОПТИМИЗАЦИЯ: Получаем только последние 50 ключей (не все)
          const { data: keysData, error: keysError } = await supabase
            .from("premium_keys")
            .select("key, status, issued_at, activated_at")
            .eq("partner_id", partnerData.id)
            .order("issued_at", { ascending: false })
            .limit(50);

          if (!keysError && keysData) {
            setKeys(keysData);
          }

          // Calculate stats
          const activationRate =
            partnerData.total_keys_issued > 0
              ? Math.round((partnerData.total_keys_activated / partnerData.total_keys_issued) * 100)
              : 0;

          // ОПТИМИЗАЦИЯ: Получаем статистику активаций по ссылкам, если есть partner_code
          let linkStats = {
            total_link_activations: partnerData.total_link_activations || 0,
            monthly_link_activations: 0,
            daily_link_activations: 0,
          };
          
          if (partnerData.partner_code) {
            try {
              // Быстрый запрос для статистики (с таймаутом через Promise.race)
              const statsPromise = supabase
                .from("partner_link_activations")
                .select("activated_at")
                .eq("partner_id", partnerData.id);
              
              const statsTimeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Stats timeout")), 2000);
              });
              
              const { data: linkActivationsData } = await Promise.race([
                statsPromise,
                statsTimeoutPromise,
              ]) as any;
              
              if (linkActivationsData) {
                const now = new Date();
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                
                linkStats = {
                  total_link_activations: linkActivationsData.length,
                  monthly_link_activations: linkActivationsData.filter(
                    (a) => new Date(a.activated_at) >= monthStart
                  ).length,
                  daily_link_activations: linkActivationsData.filter(
                    (a) => new Date(a.activated_at) >= dayStart
                  ).length,
                };
              }
            } catch (e) {
              // Игнорируем ошибки статистики, используем значения из partners
              if (import.meta.env.DEV) {
                console.warn('[PartnerDashboard] Error loading link stats:', e);
              }
            }
          }

          setStats({
            total_keys_issued: partnerData.total_keys_issued || 0,
            total_keys_activated: partnerData.total_keys_activated || 0,
            activation_rate: activationRate,
            accumulated_commission: partnerData.accumulated_commission || 0,
            total_link_activations: linkStats.total_link_activations,
            monthly_link_activations: linkStats.monthly_link_activations,
            daily_link_activations: linkStats.daily_link_activations,
          });

          // ОПТИМИЗАЦИЯ: Загружаем материалы параллельно, не блокируя основной рендер
          if (partnerData.registration_status === "approved") {
            supabase
              .from("marketing_materials")
              .select("*")
              .eq("is_active", true)
              .order("created_at", { ascending: false })
              .then(({ data: materialsData, error: materialsError }) => {
                if (!materialsError && materialsData) {
                  setMaterials(materialsData);
                }
              })
              .catch((error) => {
                if (import.meta.env.DEV) {
                  console.error('[PartnerDashboard] Error loading materials:', error);
                }
              });
          }
        } else {
          navigate("/partners");
          return;
        }
      } else if (rpcError) {
        // Other RPC errors
        if (rpcError.code === "PGRST116" || rpcError.message.includes("no rows found")) {
          navigate("/partners");
          return;
        }
        throw rpcError;
      } else {
        // No data returned
        navigate("/partners");
        return;
      }
    } catch (error: any) {
      const loadTime = performance.now() - startTime;
      console.error(`[PartnerDashboard] Error after ${loadTime.toFixed(2)}ms:`, error);
      toast.error("Ошибка загрузки данных", {
        description: error.message || "Попробуйте обновить страницу",
      });
    } finally {
      const loadTime = performance.now() - startTime;
      if (import.meta.env.DEV) {
        console.log(`[PartnerDashboard] Load completed in ${loadTime.toFixed(2)}ms`);
      }
      setLoading(false);
    }
  };

  const handleDownloadMaterial = async (materialId: string, materialName: string) => {
    try {
      // Track download
      const { data: partnerData } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", supabaseUser?.id)
        .single();

      if (partnerData) {
        await supabase.from("partner_materials_access").upsert({
          partner_id: partnerData.id,
          material_id: materialId,
          download_count: 1,
        });
      }

      toast.success("Материал скачан", {
        description: materialName,
      });
    } catch (error) {
      console.error("[PartnerDashboard] Download error:", error);
    }
  };

  const handleCopyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    toast.success("Ключ скопирован");
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!partner) {
    return null;
  }

  const getStatusBadge = () => {
    if (partner.registration_status === "pending") {
      return (
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
          <Clock className="h-3 w-3 mr-1" />
          На модерации
        </Badge>
      );
    }
    if (partner.registration_status === "approved") {
      return (
        <Badge variant="default" className="bg-green-500/20 text-green-300 border-green-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Одобрено
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Отклонено
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#0f172a] text-white py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between flex-wrap gap-4"
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-black mb-2">Партнерский кабинет</h1>
              <p className="text-slate-400">{partner.channel_name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDashboardData()}
                disabled={loading}
                className="bg-slate-900/80 border-slate-800"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
              {getStatusBadge()}
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {partner.partner_code ? (
              <Card className="bg-slate-900/80 border-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Активаций по ссылке</p>
                      <p className="text-2xl font-black text-primary">{partner.total_link_activations ?? 0}</p>
                    </div>
                    <LinkIcon className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-900/80 border-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Ключей выдано</p>
                      <p className="text-2xl font-black">{stats.total_keys_issued}</p>
                    </div>
                    <Key className="h-8 w-8 text-indigo-400" />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-slate-900/80 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Активировано</p>
                    <p className="text-2xl font-black text-green-400">
                      {partner.partner_code ? (partner.total_link_activations ?? 0) : stats.total_keys_activated}
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Процент активации</p>
                    <p className="text-2xl font-black text-indigo-400">{stats.activation_rate}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-indigo-400" />
                </div>
              </CardContent>
            </Card>

            {partner.partner_type === "revenue_share" && (
              <Card className="bg-slate-900/80 border-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Накоплено комиссии</p>
                      <p className="text-2xl font-black text-amber-400">
                        €{stats.accumulated_commission.toFixed(2)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-amber-400" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tabs */}
          <Tabs 
            defaultValue="funnel" 
            className="space-y-4"
            key={partner.partner_code || "no-code"}
          >
            <TabsList className="bg-slate-900/80 border-slate-800 flex-wrap">
              {partner.registration_status === "approved" && (
                <>
                  <TabsTrigger value="funnel">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Воронка конверсий
                  </TabsTrigger>
                  <TabsTrigger value="link-generator">
                    <Zap className="h-4 w-4 mr-2" />
                    Генератор ссылок
                  </TabsTrigger>
                  {partner.partner_type === "revenue_share" && (
                    <TabsTrigger value="balance">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Баланс
                    </TabsTrigger>
                  )}
                  {partner.partner_type === "autoschool" && (
                    <TabsTrigger value="students">
                      <Users className="h-4 w-4 mr-2" />
                      Мои Студенты
                    </TabsTrigger>
                  )}
                </>
              )}
              {partner.registration_status === "approved" && partner.partner_code && (
                <TabsTrigger value="link">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Партнерская ссылка
                </TabsTrigger>
              )}
              {/* Показываем вкладку "Мои ключи" только если нет partner_code (старая система) */}
              {!partner.partner_code && (
                <TabsTrigger value="keys">
                  <Key className="h-4 w-4 mr-2" />
                  Мои ключи
                </TabsTrigger>
              )}
              {partner.registration_status === "approved" && (
                <TabsTrigger value="materials">
                  <Download className="h-4 w-4 mr-2" />
                  Рекламные материалы
                </TabsTrigger>
              )}
              <TabsTrigger value="handbook">
                <BookOpen className="h-4 w-4 mr-2" />
                Справочник
              </TabsTrigger>
            </TabsList>

            {/* Conversion Funnel Tab - NEW! */}
            {partner.registration_status === "approved" && (
              <TabsContent value="funnel">
                <PartnerConversionFunnel partnerId={partner.id} days={30} />
              </TabsContent>
            )}

            {/* Link Generator Tab - NEW! */}
            {partner.registration_status === "approved" && (
              <TabsContent value="link-generator">
                <PartnerLinkGenerator partnerId={partner.id} />
              </TabsContent>
            )}

            {/* Balance & Payouts Tab - NEW! */}
            {partner.registration_status === "approved" && partner.partner_type === "revenue_share" && (
              <TabsContent value="balance">
                <PartnerBalancePayouts partnerId={partner.id} />
              </TabsContent>
            )}

            {/* Autoschool Students Tab - NEW! */}
            {partner.registration_status === "approved" && partner.partner_type === "autoschool" && (
              <TabsContent value="students">
                <AutoschoolStudentsProgress partnerId={partner.id} />
              </TabsContent>
            )}

            {/* Partner Link Tab */}
            {partner.registration_status === "approved" && partner.partner_code && (
              <TabsContent value="link" className="space-y-4">
                <Card className="bg-slate-900/80 border-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5 text-primary" />
                      Партнерская ссылка
                    </CardTitle>
                    <CardDescription>
                      Поделитесь этой ссылкой со своей аудиторией. При регистрации по ссылке пользователь автоматически получит Premium на 30 дней!
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Link Display */}
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-300">Ваша партнерская ссылка:</Label>
                      <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <code className="flex-1 text-sm text-primary font-mono break-all">
                          {`${window.location.origin}/partner/${partner.partner_code}`}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/partner/${partner.partner_code}`);
                            toast.success("Ссылка скопирована!");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-300">QR-код для быстрого доступа:</Label>
                      <div className="flex justify-center p-4 bg-white rounded-lg border border-slate-700">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/partner/${partner.partner_code}`)}`}
                          alt="QR Code"
                          className="w-48 h-48"
                        />
                      </div>
                      <p className="text-xs text-slate-400 text-center">
                        Отсканируйте QR-код, чтобы открыть партнерскую ссылку
                      </p>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <p className="text-xs text-slate-400 mb-1">Всего активаций</p>
                          <p className="text-2xl font-black text-primary">
                            {partner.total_link_activations || 0}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <p className="text-xs text-slate-400 mb-1">Лимит в месяц</p>
                          <p className="text-2xl font-black text-amber-400">
                            50
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Instructions */}
                    <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Как использовать партнерскую ссылку
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-slate-300">
                        <p><strong>1.</strong> Скопируйте ссылку или QR-код</p>
                        <p><strong>2.</strong> Поделитесь в своих социальных сетях, блоге или канале</p>
                        <p><strong>3.</strong> При регистрации по вашей ссылке пользователь автоматически получит Premium на 30 дней</p>
                        <p><strong>4.</strong> Вы можете отслеживать количество активаций в статистике выше</p>
                        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <p className="text-xs text-amber-300">
                            ⚠️ <strong>Важно:</strong> Один пользователь может активировать Premium только один раз от каждого партнера. Это защищает от злоупотреблений.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Keys Tab - показываем только если нет partner_code (старая система) */}
            {!partner.partner_code && (
              <TabsContent value="keys" className="space-y-4">
              {partner.registration_status !== "approved" ? (
                <Card className="bg-slate-900/80 border-slate-800">
                  <CardContent className="p-8 text-center">
                    <Clock className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Ожидайте одобрения</h3>
                    <p className="text-slate-400">
                      После одобрения заявки вы получите доступ к ключам и рекламным материалам
                    </p>
                  </CardContent>
                </Card>
              ) : keys.length === 0 ? (
                <Card className="bg-slate-900/80 border-slate-800">
                  <CardContent className="p-8 text-center">
                    <Key className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Ключей пока нет</h3>
                    <p className="text-slate-400">
                      Обратитесь к администратору для получения ключей
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Instructions Card */}
                  <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-indigo-400" />
                        Как раздавать ключи пользователям
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-300">
                          <strong>Шаг 1:</strong> Скопируйте ключ, который хотите раздать
                        </p>
                        <p className="text-slate-300">
                          <strong>Шаг 2:</strong> Отправьте ключ пользователю в Telegram, комментариях или через другие каналы
                        </p>
                        <p className="text-slate-300">
                          <strong>Шаг 3:</strong> Пользователь должен:
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-1 text-slate-400">
                          <li>Открыть приложение Skilyapp</li>
                          <li>Перейти в Профиль (иконка пользователя)</li>
                          <li>Найти раздел "Premium"</li>
                          <li>Нажать "Активировать ключ"</li>
                          <li>Ввести полученный ключ</li>
                        </ul>
                      </div>
                      <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <p className="text-xs text-slate-400 mb-2">Пример сообщения для пользователя:</p>
                        <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                          <p className="text-sm text-slate-300">
                            🎁 Поздравляю! Ты выиграл Premium Forever ключ для Skilyapp!
                          </p>
                          <p className="text-sm text-slate-300 mt-2">
                            Чтобы активировать:
                          </p>
                          <ol className="list-decimal list-inside text-sm text-slate-400 mt-1 space-y-1 ml-2">
                            <li>Открой приложение Skilyapp</li>
                            <li>Перейди в Профиль → Premium</li>
                            <li>Нажми "Активировать ключ"</li>
                            <li>Введи ключ: <span className="font-mono text-indigo-400">PREMIUM-XXXX-XXXX-XXXX</span></li>
                          </ol>
                          <p className="text-sm text-slate-300 mt-2">
                            После активации ты получишь пожизненный доступ ко всем функциям приложения! 🚀
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => {
                            const template = `🎁 Поздравляю! Ты выиграл Premium Forever ключ для Skilyapp!

Чтобы активировать:
1. Открой приложение Skilyapp
2. Перейди в Профиль → Premium
3. Нажми "Активировать ключ"
4. Введи полученный ключ

После активации ты получишь пожизненный доступ ко всем функциям приложения! 🚀`;
                            navigator.clipboard.writeText(template);
                            toast.success("Шаблон сообщения скопирован");
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Скопировать шаблон сообщения
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Keys List */}
                  <Card className="bg-slate-900/80 border-slate-800">
                    <CardHeader>
                      <CardTitle>Мои ключи</CardTitle>
                      <CardDescription>
                        Всего: {keys.length} | Активировано: {keys.filter((k) => k.status === "activated").length}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {keys.map((key, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border border-slate-800 rounded-lg hover:bg-slate-800/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="font-mono text-sm">{key.key}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant={
                                    key.status === "activated"
                                      ? "default"
                                      : key.status === "expired"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {key.status === "issued"
                                    ? "Выдан"
                                    : key.status === "activated"
                                    ? "Активирован"
                                    : key.status === "expired"
                                    ? "Истек"
                                    : "Отозван"}
                                </Badge>
                                {key.activated_at && (
                                  <span className="text-xs text-slate-400">
                                    Активирован: {new Date(key.activated_at).toLocaleDateString()}
                                  </span>
                                )}
                                {key.status === "issued" && (
                                  <span className="text-xs text-amber-400">
                                    Готов к раздаче
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyKey(key.key)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
              </TabsContent>
            )}

            {/* Handbook Tab */}
            <TabsContent value="handbook" className="space-y-4">
              {partner && <PartnerHandbook partnerType={partner.partner_type} />}
            </TabsContent>

            {/* Materials Tab */}
            {partner.registration_status === "approved" && (
              <TabsContent value="materials" className="space-y-4">
                {materials.length === 0 ? (
                  <Card className="bg-slate-900/80 border-slate-800">
                    <CardContent className="p-8 text-center">
                      <Download className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">Материалы пока не добавлены</h3>
                      <p className="text-slate-400">Рекламные материалы появятся здесь</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {materials.map((material) => (
                      <Card key={material.id} className="bg-slate-900/80 border-slate-800">
                        <CardHeader>
                          <div className="flex items-center gap-2 mb-2">
                            {material.type === "logo" && <ImageIcon className="h-5 w-5 text-indigo-400" />}
                            {material.type === "banner" && <ImageIcon className="h-5 w-5 text-blue-400" />}
                            {material.type === "text" && <FileText className="h-5 w-5 text-green-400" />}
                            {material.type === "video" && <Video className="h-5 w-5 text-red-400" />}
                            <CardTitle className="text-lg">{material.name}</CardTitle>
                          </div>
                          <CardDescription className="line-clamp-2">
                            {material.description || "Без описания"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {material.usage_instructions && (
                            <p className="text-xs text-slate-400">{material.usage_instructions}</p>
                          )}
                          <div className="flex gap-2">
                            {material.file_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                  window.open(material.file_url!, "_blank");
                                  handleDownloadMaterial(material.id, material.name);
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Скачать
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (material.file_url) {
                                  navigator.clipboard.writeText(material.file_url);
                                  toast.success("Ссылка скопирована");
                                }
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}

