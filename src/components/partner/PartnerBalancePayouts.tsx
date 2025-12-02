// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Wallet, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  DollarSign,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";

interface BalanceData {
  balance_available: number;
  balance_hold: number;
  balance_paid: number;
  min_payout_amount: number;
  hold_period_days: number;
}

interface PayoutHistory {
  payout_id: string;
  amount: number;
  currency: string;
  payout_method: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
  rejection_reason: string | null;
}

interface Props {
  partnerId: string;
}

export function PartnerBalancePayouts({ partnerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    amount: "",
    method: "paypal" as "paypal" | "sepa" | "usdt" | "wise",
    details: "",
  });

  useEffect(() => {
    loadBalanceData();
  }, [partnerId]);

  const loadBalanceData = async () => {
    try {
      setLoading(true);

      // Загрузить баланс партнера
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('balance_available, balance_hold, balance_paid, min_payout_amount, hold_period_days')
        .eq('id', partnerId)
        .single();

      if (partnerError) throw partnerError;

      if (partnerData) {
        setBalance(partnerData);
      }

      // Загрузить историю выплат
      // @ts-ignore
      const { data: historyData, error: historyError } = await supabase
        .rpc('get_partner_payout_history', {
          p_partner_id: partnerId,
          p_limit: 20
        });

      if (historyError) throw historyError;

      if (historyData) {
        setPayoutHistory(historyData);
      }
    } catch (error: any) {
      console.error('[PartnerBalancePayouts] Error:', error);
      toast.error("Ошибка загрузки баланса");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!balance) return;

    const amount = parseFloat(payoutForm.amount);

    if (isNaN(amount) || amount < balance.min_payout_amount) {
      toast.error(`Минимальная сумма для вывода: €${balance.min_payout_amount}`);
      return;
    }

    if (amount > balance.balance_available) {
      toast.error("Недостаточно средств");
      return;
    }

    if (!payoutForm.details.trim()) {
      toast.error("Укажите реквизиты для выплаты");
      return;
    }

    try {
      setLoading(true);

      // @ts-ignore
      const { data, error } = await supabase.rpc('request_partner_payout', {
        p_partner_id: partnerId,
        p_amount: amount,
        p_payout_method: payoutForm.method,
        p_payout_details: { 
          [payoutForm.method === 'sepa' ? 'iban' : 'email']: payoutForm.details 
        }
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success("Запрос на выплату создан", {
          description: "Мы обработаем его в течение 48 часов",
        });

        setShowPayoutDialog(false);
        setPayoutForm({ amount: "", method: "paypal", details: "" });
        loadBalanceData();
      }
    } catch (error: any) {
      console.error('[PartnerBalancePayouts] Request error:', error);
      toast.error("Ошибка создания запроса", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !balance) {
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Ожидает", icon: Clock, color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
      processing: { label: "Обработка", icon: TrendingUp, color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      completed: { label: "Выплачено", icon: CheckCircle2, color: "bg-green-500/20 text-green-300 border-green-500/30" },
      rejected: { label: "Отклонено", icon: XCircle, color: "bg-red-500/20 text-red-300 border-red-500/30" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Баланс */}
      <Card className="bg-slate-900/80 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Баланс и выплаты
          </CardTitle>
          <CardDescription>
            Управление вашими доходами от партнерской программы
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Карточки баланса */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
            >
              <Card className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-400">Доступно к выводу</p>
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  </div>
                  <p className="text-3xl font-black text-green-400">
                    €{balance.balance_available.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Минимум для вывода: €{balance.min_payout_amount}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-400">В холде</p>
                    <Clock className="h-5 w-5 text-amber-400" />
                  </div>
                  <p className="text-3xl font-black text-amber-400">
                    €{balance.balance_hold.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Период заморозки: {balance.hold_period_days} дней
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-400">Всего выплачено</p>
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-3xl font-black text-primary">
                    €{balance.balance_paid.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    За всё время
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Кнопка вывода */}
          <Button
            onClick={() => setShowPayoutDialog(true)}
            disabled={balance.balance_available < balance.min_payout_amount}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Wallet className="h-5 w-5 mr-2" />
            Запросить вывод средств
          </Button>

          {balance.balance_available < balance.min_payout_amount && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">
                Минимальная сумма для вывода: €{balance.min_payout_amount}. 
                Необходимо еще €{(balance.min_payout_amount - balance.balance_available).toFixed(2)}.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* История выплат */}
      <Card className="bg-slate-900/80 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">История выплат</CardTitle>
          <CardDescription>
            {payoutHistory.length} запросов
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payoutHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Запросов на выплату пока нет</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payoutHistory.map((payout) => (
                <div
                  key={payout.payout_id}
                  className="p-4 rounded-lg border border-slate-800 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-bold text-lg">
                          €{payout.amount.toFixed(2)}
                        </p>
                        {getStatusBadge(payout.status)}
                        <Badge variant="outline" className="text-xs">
                          {payout.payout_method.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400">
                        Запрос: {new Date(payout.requested_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {payout.completed_at && (
                        <p className="text-sm text-green-400 mt-1">
                          Выплачено: {new Date(payout.completed_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                      {payout.rejection_reason && (
                        <p className="text-sm text-red-400 mt-1">
                          Причина отклонения: {payout.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог запроса выплаты */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle>Запрос на вывод средств</DialogTitle>
            <DialogDescription>
              Доступно: €{balance.balance_available.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Сумма */}
            <div className="space-y-2">
              <Label htmlFor="amount">Сумма к выводу (€)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={balance.min_payout_amount}
                max={balance.balance_available}
                value={payoutForm.amount}
                onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                placeholder={`Минимум €${balance.min_payout_amount}`}
                className="bg-slate-800/50 border-slate-700"
              />
            </div>

            {/* Метод */}
            <div className="space-y-2">
              <Label htmlFor="method">Способ выплаты</Label>
              <Select 
                value={payoutForm.method} 
                onValueChange={(value: any) => setPayoutForm({ ...payoutForm, method: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="paypal">💳 PayPal (быстро, 2% комиссия)</SelectItem>
                  <SelectItem value="sepa">🏦 SEPA (3-5 дней, без комиссии)</SelectItem>
                  <SelectItem value="wise">💸 Wise (1-2 дня, 1% комиссия)</SelectItem>
                  <SelectItem value="usdt">₿ USDT (крипта, для опытных)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Реквизиты */}
            <div className="space-y-2">
              <Label htmlFor="details">
                {payoutForm.method === 'sepa' ? 'IBAN' : 
                 payoutForm.method === 'usdt' ? 'Wallet Address' : 
                 'Email'}
              </Label>
              <Input
                id="details"
                value={payoutForm.details}
                onChange={(e) => setPayoutForm({ ...payoutForm, details: e.target.value })}
                placeholder={
                  payoutForm.method === 'sepa' ? 'ES1234567890...' :
                  payoutForm.method === 'usdt' ? '0x...' :
                  'your@email.com'
                }
                className="bg-slate-800/50 border-slate-700"
              />
            </div>

            {/* Информация */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-sm text-blue-300">
                💡 Выплата будет обработана в течение <strong>48 часов</strong> после проверки администратором.
              </p>
            </div>

            <Button
              onClick={handleRequestPayout}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? "Отправка..." : "Запросить выплату"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

