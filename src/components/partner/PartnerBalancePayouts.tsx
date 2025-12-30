// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import { motion } from "@/components/optimized/Motion";

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

      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('balance_available, balance_hold, balance_paid, min_payout_amount, hold_period_days')
        .eq('id', partnerId)
        .single();

      if (partnerError) throw partnerError;

      if (partnerData) {
        setBalance(partnerData);
      }

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
      toast.error(`Минимальная сумма: €${balance.min_payout_amount}`);
      return;
    }

    if (amount > balance.balance_available) {
      toast.error("Недостаточно средств");
      return;
    }

    if (!payoutForm.details.trim()) {
      toast.error("Укажите реквизиты");
      return;
    }

    try {
      setLoading(true);

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

        toast.success("Запрос создан", {
          description: "Обработаем в течение 48 часов",
        });

        setShowPayoutDialog(false);
        setPayoutForm({ amount: "", method: "paypal", details: "" });
        loadBalanceData();
      }
    } catch (error: any) {
      console.error('[PartnerBalancePayouts] Request error:', error);
      toast.error("Ошибка создания запроса");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !balance) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-3 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { label: "Ожидает", icon: Clock, color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
      processing: { label: "Обработка", icon: TrendingUp, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
      completed: { label: "Выплачено", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      rejected: { label: "Отклонено", icon: XCircle, color: "bg-red-500/10 text-red-400 border-red-500/20" },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Доступно</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-emerald-400 mb-2">
                €{balance.balance_available.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-500">
                Мин. для вывода: €{balance.min_payout_amount}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">В холде</span>
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-3xl font-bold text-amber-400 mb-2">
                €{balance.balance_hold.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-500">
                Период: {balance.hold_period_days} дней
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Выплачено</span>
                <DollarSign className="h-4 w-4 text-indigo-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                €{balance.balance_paid.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-500">
                За всё время
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Payout Button */}
      <Button
        onClick={() => setShowPayoutDialog(true)}
        disabled={balance.balance_available < balance.min_payout_amount}
        className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-medium"
      >
        <Wallet className="h-4 w-4 mr-2" />
        Запросить вывод средств
      </Button>

      {balance.balance_available < balance.min_payout_amount && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-400">
            Минимум: €{balance.min_payout_amount}. Необходимо еще €{(balance.min_payout_amount - balance.balance_available).toFixed(2)}
          </p>
        </div>
      )}

      {/* History Table */}
      {payoutHistory.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
            История выплат
          </h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Сумма</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Метод</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Запрос</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {payoutHistory.map((payout) => {
                  const statusConfig = getStatusConfig(payout.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <tr key={payout.payout_id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-white">
                          €{payout.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-zinc-400 uppercase">
                          {payout.payout_method}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-zinc-500">
                          {new Date(payout.requested_at).toLocaleDateString('ru-RU')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Запрос на вывод</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Доступно: €{balance.balance_available.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Сумма (€)
              </Label>
              <Input
                type="number"
                step="0.01"
                min={balance.min_payout_amount}
                max={balance.balance_available}
                value={payoutForm.amount}
                onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                placeholder={`Минимум €${balance.min_payout_amount}`}
                className="h-12 bg-zinc-950 border-zinc-800"
              />
            </div>

            {/* Method */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Способ
              </Label>
              <Select 
                value={payoutForm.method} 
                onValueChange={(value: any) => setPayoutForm({ ...payoutForm, method: value })}
              >
                <SelectTrigger className="h-12 bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="paypal">💳 PayPal</SelectItem>
                  <SelectItem value="sepa">🏦 SEPA</SelectItem>
                  <SelectItem value="wise">💸 Wise</SelectItem>
                  <SelectItem value="usdt">₿ USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {payoutForm.method === 'sepa' ? 'IBAN' : 
                 payoutForm.method === 'usdt' ? 'Wallet' : 
                 'Email'}
              </Label>
              <Input
                value={payoutForm.details}
                onChange={(e) => setPayoutForm({ ...payoutForm, details: e.target.value })}
                placeholder={
                  payoutForm.method === 'sepa' ? 'ES1234...' :
                  payoutForm.method === 'usdt' ? '0x...' :
                  'email@example.com'
                }
                className="h-12 bg-zinc-950 border-zinc-800"
              />
            </div>

            {/* Info */}
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-sm text-indigo-400">
                💡 Выплата обрабатывается в течение 48 часов
              </p>
            </div>

            <Button
              onClick={handleRequestPayout}
              disabled={loading}
              className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-medium"
            >
              {loading ? "Отправка..." : "Запросить выплату"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
