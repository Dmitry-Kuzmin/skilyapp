import { useState, useEffect } from "react";
import {
  Users,
  Key,
  Plus,
  Copy,
  CheckCircle2,
  XCircle,
  Mail,
  TrendingUp,
  Gift,
  DollarSign,
  Eye,
  Search,
  Filter,
  ExternalLink,
  User,
  Link as LinkIcon,
  FileText,
  Calendar,
  BarChart3,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MotionDiv as motion } from "@/components/optimized/Motion";
import { PageLoader } from "@/components/PageLoader";

interface Partner {
  id: string;
  name: string;
  email: string | null;
  user_id: string | null;
  partner_type: "barter" | "revenue_share";
  commission_rate: number;
  promo_code: string | null;
  discount_percent: number | null;
  status: "active" | "inactive";
  registration_status: "pending" | "approved" | "rejected";
  channel_name: string | null;
  channel_url: string | null;
  subscribers_count: number | null;
  social_links: Record<string, string> | null;
  description: string | null;
  total_keys_issued: number;
  total_keys_activated: number;
  total_link_activations: number;
  partner_code: string | null;
  accumulated_commission: number;
  total_referrals: number;
  notes: string | null;
  webhook_url: string | null;
  monthly_activation_limit: number;
  daily_activation_limit: number;
  created_at: string;
  updated_at: string;
}

interface PremiumKey {
  id: string;
  key: string;
  partner_id: string | null;
  status: "issued" | "activated" | "expired" | "revoked";
  issued_at: string;
  activated_at: string | null;
  activated_by: string | null;
  expires_at: string | null;
}

export function AdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [keys, setKeys] = useState<PremiumKey[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showIssueKeysDialog, setShowIssueKeysDialog] = useState(false);
  const [showPartnerDetailsDialog, setShowPartnerDetailsDialog] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "barter" | "revenue_share">("all");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    partner_type: "barter" as "barter" | "revenue_share",
    commission_rate: 30,
    promo_code: "",
    discount_percent: 20,
    notes: "",
  });

  const [issueKeysData, setIssueKeysData] = useState({
    quantity: 5,
    expires_months: 6,
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error: any) {
      toast.error("Ошибка загрузки партнеров", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePartner = async (partnerId: string) => {
    try {
      const { error } = await supabase
        .from("partners")
        .update({
          registration_status: "approved",
          status: "active",
        })
        .eq("id", partnerId);

      if (error) throw error;

      toast.success("Партнер одобрен");
      fetchPartners();
    } catch (error: any) {
      toast.error("Ошибка одобрения партнера", {
        description: error.message,
      });
    }
  };

  const handleRejectPartner = async (partnerId: string) => {
    try {
      const { error } = await supabase
        .from("partners")
        .update({
          registration_status: "rejected",
          status: "inactive",
        })
        .eq("id", partnerId);

      if (error) throw error;

      toast.success("Партнер отклонен");
      fetchPartners();
    } catch (error: any) {
      toast.error("Ошибка отклонения партнера", {
        description: error.message,
      });
    }
  };

  const handleViewPartnerDetails = (partner: Partner) => {
    setSelectedPartner(partner);
    setShowPartnerDetailsDialog(true);
    fetchPartnerKeys(partner.id);
  };

  // Фильтрация партнеров
  const filteredPartners = partners.filter((partner) => {
    const matchesSearch =
      partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.channel_name?.toLowerCase().includes(searchQuery.toLowerCase());

    // Учитываем случаи, когда registration_status может быть null/undefined (старые партнеры)
    const partnerStatus = partner.registration_status || null;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && (partnerStatus === "pending" || partnerStatus === null)) ||
      (statusFilter === "approved" && partnerStatus === "approved") ||
      (statusFilter === "rejected" && partnerStatus === "rejected");

    const matchesType = typeFilter === "all" || partner.partner_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Статистика
  const stats = {
    total: partners.length,
    pending: partners.filter((p) => p.registration_status === "pending" || !p.registration_status).length,
    approved: partners.filter((p) => p.registration_status === "approved").length,
    rejected: partners.filter((p) => p.registration_status === "rejected").length,
    totalKeysIssued: partners.reduce((sum, p) => sum + p.total_keys_issued, 0),
    totalKeysActivated: partners.reduce((sum, p) => sum + p.total_keys_activated, 0),
    totalLinkActivations: partners.reduce((sum, p) => sum + (p.total_link_activations || 0), 0),
    activationRate:
      partners.reduce((sum, p) => sum + p.total_keys_issued, 0) > 0
        ? Math.round(
          (partners.reduce((sum, p) => sum + p.total_keys_activated, 0) /
            partners.reduce((sum, p) => sum + p.total_keys_issued, 0)) *
          100
        )
        : 0,
  };

  const fetchPartnerKeys = async (partnerId: string) => {
    try {
      const { data, error } = await supabase
        .from("premium_keys")
        .select("*")
        .eq("partner_id", partnerId)
        .order("issued_at", { ascending: false });

      if (error) throw error;
      setKeys(data || []);
    } catch (error: any) {
      toast.error("Ошибка загрузки ключей", {
        description: error.message,
      });
    }
  };

  const handleCreatePartner = async () => {
    try {
      const { data, error } = await supabase
        .from("partners")
        .insert({
          name: formData.name,
          email: formData.email || null,
          partner_type: formData.partner_type,
          commission_rate: formData.commission_rate / 100,
          promo_code: formData.promo_code || null,
          discount_percent: formData.discount_percent || null,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Партнер создан");
      setShowCreateDialog(false);
      setFormData({
        name: "",
        email: "",
        partner_type: "barter",
        commission_rate: 30,
        promo_code: "",
        discount_percent: 20,
        notes: "",
      });
      fetchPartners();
    } catch (error: any) {
      toast.error("Ошибка создания партнера", {
        description: error.message,
      });
    }
  };

  const handleIssueKeys = async () => {
    if (!selectedPartner) return;

    try {
      const { data, error } = await supabase.functions.invoke("issue-premium-keys", {
        body: {
          partner_id: selectedPartner.id,
          quantity: issueKeysData.quantity,
          expires_months: issueKeysData.expires_months,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Выдано ${data.quantity} ключей`, {
          description: "Ключи скопированы в буфер обмена",
        });

        // Copy keys to clipboard
        const keysText = data.keys.join("\n");
        await navigator.clipboard.writeText(keysText);

        setShowIssueKeysDialog(false);
        fetchPartners();
        fetchPartnerKeys(selectedPartner.id);
      } else {
        throw new Error(data.error || "Failed to issue keys");
      }
    } catch (error: any) {
      toast.error("Ошибка выдачи ключей", {
        description: error.message,
      });
    }
  };

  const handleCopyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success("Ключ скопирован");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleViewKeys = (partner: Partner) => {
    setSelectedPartner(partner);
    fetchPartnerKeys(partner.id);
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Партнерская программа</h1>
          <p className="text-muted-foreground mt-1">
            Управление партнерами и выдача ключей Premium Forever
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить партнера
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создать партнера</DialogTitle>
              <DialogDescription>
                Добавьте нового партнера для бартера или revenue share
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Имя партнера</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Имя блогера/канала"
                />
              </div>
              <div>
                <Label>Email (для будущих выплат)</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label>Тип партнера</Label>
                <Select
                  value={formData.partner_type}
                  onValueChange={(value: "barter" | "revenue_share") =>
                    setFormData({ ...formData, partner_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="barter">Бартер (бесплатные ключи)</SelectItem>
                    <SelectItem value="revenue_share">Revenue Share (для будущего)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.partner_type === "revenue_share" && (
                <>
                  <div>
                    <Label>Комиссия (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.commission_rate}
                      onChange={(e) =>
                        setFormData({ ...formData, commission_rate: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Промокод</Label>
                    <Input
                      value={formData.promo_code}
                      onChange={(e) => setFormData({ ...formData, promo_code: e.target.value })}
                      placeholder="MIGUEL20"
                    />
                  </div>
                  <div>
                    <Label>Скидка для пользователей (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discount_percent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_percent: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </>
              )}
              <div>
                <Label>Заметки</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Дополнительная информация о партнере"
                  rows={3}
                />
              </div>
              <Button onClick={handleCreatePartner} className="w-full">
                Создать партнера
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего партнеров</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.approved} одобрено, {stats.pending} на модерации
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активаций по ссылкам</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLinkActivations || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalKeysIssued} ключей выдано
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Конверсия</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activationRate}%</div>
            <p className="text-xs text-muted-foreground">Активация ключей</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">На модерации</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Требуют одобрения</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени, email, каналу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="pending">На модерации</SelectItem>
                  <SelectItem value="approved">Одобрено</SelectItem>
                  <SelectItem value="rejected">Отклонено</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="barter">Бартер</SelectItem>
                  <SelectItem value="revenue_share">Revenue Share</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partners List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPartners.map((partner) => (
          <Card key={partner.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{partner.name}</CardTitle>
                <div className="flex gap-1">
                  <Badge
                    variant={
                      partner.registration_status === "approved"
                        ? "default"
                        : partner.registration_status === "pending" || !partner.registration_status
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {partner.registration_status === "pending" || !partner.registration_status
                      ? "На модерации"
                      : partner.registration_status === "approved"
                        ? "Одобрено"
                        : "Отклонено"}
                  </Badge>
                  <Badge variant={partner.status === "active" ? "default" : "outline"}>
                    {partner.status}
                  </Badge>
                </div>
              </div>
              <CardDescription>
                {partner.partner_type === "barter" ? (
                  <span className="flex items-center gap-1">
                    <Gift className="h-3 w-3" />
                    Бартер
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Revenue Share
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {partner.channel_name && (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground truncate">{partner.channel_name}</span>
                  </div>
                )}
                {partner.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground truncate">{partner.email}</span>
                  </div>
                )}
                {partner.partner_code && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Активаций по ссылке:</span>
                    <span className="font-medium text-primary">{partner.total_link_activations || 0}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Ключей выдано:</span>
                  <span className="font-medium">{partner.total_keys_issued}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Активировано:</span>
                  <span className="font-medium text-green-600">
                    {partner.total_keys_activated}
                  </span>
                </div>
                {partner.partner_code && (
                  <div className="mt-2 p-2 bg-slate-100 rounded text-xs">
                    <div className="flex items-center gap-1 mb-1">
                      <LinkIcon className="h-3 w-3" />
                      <span className="font-medium">Партнерская ссылка:</span>
                    </div>
                    <code className="text-xs break-all">
                      {window.location.origin}/partner/{partner.partner_code}
                    </code>
                  </div>
                )}
                {partner.partner_type === "revenue_share" && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Комиссия:</span>
                    <span className="font-medium">
                      €{partner.accumulated_commission.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {(partner.registration_status === "pending" || !partner.registration_status) && (
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleApprovePartner(partner.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Одобрить
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRejectPartner(partner.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Отклонить
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewPartnerDetails(partner)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Детали
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedPartner(partner);
                      setShowIssueKeysDialog(true);
                    }}
                    disabled={partner.registration_status !== "approved" && partner.registration_status !== null}
                  >
                    <Key className="h-4 w-4 mr-1" />
                    Ключи
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPartners.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              Партнеры не найдены
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issue Keys Dialog */}
      <Dialog open={showIssueKeysDialog} onOpenChange={setShowIssueKeysDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выдать ключи партнеру</DialogTitle>
            <DialogDescription>
              {selectedPartner?.name} - {issueKeysData.quantity} ключей
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Количество ключей</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={issueKeysData.quantity}
                onChange={(e) =>
                  setIssueKeysData({ ...issueKeysData, quantity: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div>
              <Label>Срок действия (месяцев)</Label>
              <Input
                type="number"
                min="0"
                max="24"
                value={issueKeysData.expires_months}
                onChange={(e) =>
                  setIssueKeysData({
                    ...issueKeysData,
                    expires_months: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                0 = бессрочно
              </p>
            </div>
            <Button onClick={handleIssueKeys} className="w-full">
              Выдать ключи
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Partner Details Dialog */}
      <Dialog open={showPartnerDetailsDialog} onOpenChange={setShowPartnerDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Детали партнера: {selectedPartner?.name}</DialogTitle>
            <DialogDescription>Полная информация об анкете партнера</DialogDescription>
          </DialogHeader>
          {selectedPartner && (
            <div className="space-y-6">
              {/* Status Section */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <Badge
                  variant={
                    selectedPartner.registration_status === "approved"
                      ? "default"
                      : selectedPartner.registration_status === "pending" || !selectedPartner.registration_status
                        ? "secondary"
                        : "destructive"
                  }
                  className="text-sm"
                >
                  {selectedPartner.registration_status === "pending" || !selectedPartner.registration_status
                    ? "На модерации"
                    : selectedPartner.registration_status === "approved"
                      ? "Одобрено"
                      : "Отклонено"}
                </Badge>
                <Badge variant={selectedPartner.status === "active" ? "default" : "outline"}>
                  {selectedPartner.status}
                </Badge>
                <Badge>
                  {selectedPartner.partner_type === "barter" ? "Бартер" : "Revenue Share"}
                </Badge>
                {(selectedPartner.registration_status === "pending" || !selectedPartner.registration_status) && (
                  <div className="ml-auto flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        handleApprovePartner(selectedPartner.id);
                        setShowPartnerDetailsDialog(false);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Одобрить
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        handleRejectPartner(selectedPartner.id);
                        setShowPartnerDetailsDialog(false);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Отклонить
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Personal Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Личная информация
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Имя</Label>
                      <p className="font-medium">{selectedPartner.name}</p>
                    </div>
                    {selectedPartner.email && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="font-medium flex items-center gap-2">
                          {selectedPartner.email}
                          <a
                            href={`mailto:${selectedPartner.email}`}
                            className="text-primary hover:underline"
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        </p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-muted-foreground">Дата регистрации</Label>
                      <p className="font-medium">
                        {new Date(selectedPartner.created_at).toLocaleDateString("ru-RU", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Channel Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <LinkIcon className="h-5 w-5" />
                      Информация о канале
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedPartner.channel_name && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Название канала</Label>
                        <p className="font-medium">{selectedPartner.channel_name}</p>
                      </div>
                    )}
                    {selectedPartner.channel_url && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Ссылка на канал</Label>
                        <p className="font-medium">
                          <a
                            href={selectedPartner.channel_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            {selectedPartner.channel_url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                      </div>
                    )}
                    {selectedPartner.subscribers_count !== null && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Подписчиков</Label>
                        <p className="font-medium">
                          {selectedPartner.subscribers_count.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Social Links */}
              {selectedPartner.social_links &&
                Object.keys(selectedPartner.social_links).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Социальные сети
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(selectedPartner.social_links).map(([platform, link]) => (
                          <div key={platform} className="flex items-center gap-2">
                            <span className="text-sm font-medium capitalize">{platform}:</span>
                            <a
                              href={link.startsWith("http") ? link : `https://${link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm flex items-center gap-1"
                            >
                              {link}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Description */}
              {selectedPartner.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Описание
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedPartner.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Статистика
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Ключей выдано</Label>
                      <p className="text-2xl font-bold">{selectedPartner.total_keys_issued}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Активировано</Label>
                      <p className="text-2xl font-bold text-green-600">
                        {selectedPartner.total_keys_activated}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Конверсия</Label>
                      <p className="text-2xl font-bold">
                        {selectedPartner.total_keys_issued > 0
                          ? Math.round(
                            (selectedPartner.total_keys_activated /
                              selectedPartner.total_keys_issued) *
                            100
                          )
                          : 0}
                        %
                      </p>
                    </div>
                    {selectedPartner.partner_type === "revenue_share" && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Комиссия</Label>
                        <p className="text-2xl font-bold">
                          €{selectedPartner.accumulated_commission.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Keys List */}
              {keys.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Выданные ключи</CardTitle>
                    <CardDescription>
                      Всего: {keys.length} | Активировано:{" "}
                      {keys.filter((k) => k.status === "activated").length}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {keys.map((key) => (
                        <div
                          key={key.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
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
                                <span className="text-xs text-muted-foreground">
                                  Активирован: {new Date(key.activated_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyKey(key.key)}
                          >
                            {copiedKey === key.key ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Admin Notes */}
              {selectedPartner.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Заметки администратора</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedPartner.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

