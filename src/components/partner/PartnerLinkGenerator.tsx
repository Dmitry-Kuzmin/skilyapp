// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, ExternalLink, Link2, QrCode, Sparkles, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";

interface Props {
  partnerId: string;
}

interface GeneratedLink {
  link_code: string;
  full_url: string;
}

interface LinkHistory {
  link_id: string;
  link_code: string;
  full_url: string;
  destination: string;
  utm_campaign: string;
  clicks_count: number;
  registrations_count: number;
  purchases_count: number;
  conversion_rate: number;
  created_at: string;
}

export function PartnerLinkGenerator({ partnerId }: Props) {
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState<string>("home"); // Default = home/landing
  const [campaign, setCampaign] = useState<string>("");
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);
  const [linkHistory, setLinkHistory] = useState<LinkHistory[]>([]);

  const loadLinkHistory = async () => {
    try {
      const { data, error } = await supabase.rpc('get_partner_links_with_stats', {
        p_partner_id: partnerId,
        p_limit: 10
      });

      if (error) throw error;

      if (data) {
        setLinkHistory(data);
      }
    } catch (error: any) {
      console.error('[PartnerLinkGenerator] Load history error:', error);
    }
  };

  const handleGenerateLink = async () => {
    if (!campaign.trim()) {
      toast.error("Введите название кампании");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('generate_partner_link', {
        p_partner_id: partnerId,
        p_destination: destination,
        p_utm_campaign: campaign.trim(),
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const link = data[0];
        setGeneratedLink({
          link_code: link.link_code,
          full_url: link.full_url,
        });
        toast.success("Ссылка сгенерирована!");
        
        // Обновить историю ссылок
        loadLinkHistory();
      }
    } catch (error: any) {
      console.error('[PartnerLinkGenerator] Error:', error);
      toast.error("Ошибка генерации ссылки", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;

    await navigator.clipboard.writeText(generatedLink.full_url);
    toast.success("Ссылка скопирована!");
  };

  const handleOpenLink = () => {
    if (!generatedLink) return;
    window.open(generatedLink.full_url, '_blank');
  };

  const handleReset = () => {
    setGeneratedLink(null);
    setCampaign("");
  };

  // Загрузить историю ссылок при монтировании
  useEffect(() => {
    loadLinkHistory();
  }, [partnerId]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Генератор */}
      <AnimatePresence mode="wait">
        {!generatedLink ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Заголовок */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 mb-3">
                <Link2 className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Создайте партнерскую ссылку</h2>
              <p className="text-slate-400 text-sm max-w-lg mx-auto">
                Отдельная ссылка для каждого канала — отдельная статистика
              </p>
            </div>

            {/* Форма */}
            <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur">
              <CardContent className="p-6 space-y-5">
                {/* Destination */}
                <div className="space-y-2">
                  <Label htmlFor="destination" className="text-sm font-medium">
                    Целевая страница
                  </Label>
                  <Select value={destination} onValueChange={setDestination}>
                    <SelectTrigger id="destination" className="bg-slate-800/50 border-slate-700 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="home">🏠 Главная — рекомендовано</SelectItem>
                      <SelectItem value="premium">⭐ Premium</SelectItem>
                      <SelectItem value="test-essential">📝 Тест Esencial</SelectItem>
                      <SelectItem value="test-priority">🎯 Тест Prioritario</SelectItem>
                      <SelectItem value="payment">💳 Оплата</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Campaign Name */}
                <div className="space-y-2">
                  <Label htmlFor="campaign" className="text-sm font-medium">
                    Название кампании
                  </Label>
                  <Input
                    id="campaign"
                    placeholder="youtube-review-02dec"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 h-11"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleGenerateLink();
                      }
                    }}
                  />
                  <p className="text-xs text-slate-500">
                    Формат: <span className="text-slate-400">источник-тип-дата</span>
                  </p>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateLink}
                  disabled={loading || !campaign.trim()}
                  className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 h-11"
                  size="lg"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {loading ? 'Создаю...' : 'Создать ссылку'}
                </Button>
              </CardContent>
            </Card>

            {/* Tips - убрал лишнее, оставил суть */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-300">Совет</p>
                <p className="text-xs text-slate-400">
                  Создавайте отдельную ссылку для каждого поста. Статистика покажет, какой контент работает лучше.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Success Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 mb-2">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold">Ссылка готова!</h3>
            </div>

            {/* Link Display */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 p-4 bg-slate-900/80 rounded-xl border border-slate-700">
                  <code className="flex-1 text-sm text-primary font-mono break-all">
                    {generatedLink.full_url}
                  </code>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyLink}
                      className="hover:bg-primary/20"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleOpenLink}
                      className="hover:bg-primary/20"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Код</p>
                    <Badge variant="outline" className="font-mono">
                      {generatedLink.link_code}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Кампания</p>
                    <p className="text-sm font-medium">{campaign}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QR Code - compactный */}
            <details className="group">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <QrCode className="h-5 w-5 text-slate-400" />
                    <span className="text-sm font-medium">QR-код</span>
                  </div>
                  <span className="text-xs text-slate-500">Развернуть</span>
                </div>
              </summary>
              <div className="mt-3 p-6 rounded-xl border border-slate-800 bg-slate-900/50">
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-xl">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(generatedLink.full_url)}`}
                      alt="QR Code"
                      className="w-44 h-44"
                    />
                  </div>
                </div>
              </div>
            </details>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleCopyLink}
                className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 h-11"
              >
                <Copy className="h-4 w-4 mr-2" />
                Скопировать
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1 border-slate-700 hover:bg-slate-800 h-11"
              >
                Создать ещё
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* История созданных ссылок */}
      {linkHistory.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Ваши ссылки</h3>
            </div>
            <Badge variant="secondary" className="text-xs">
              {linkHistory.length}
            </Badge>
          </div>

          <div className="space-y-2">
            {linkHistory.map((link) => (
              <Card
                key={link.link_id}
                className="border-slate-800/50 bg-slate-900/30 hover:bg-slate-900/50 transition-all duration-200 hover:border-slate-700"
              >
                <CardContent className="p-5">
                  {/* Заголовок */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs font-mono">
                          {link.link_code}
                        </Badge>
                        {link.utm_campaign && (
                          <span className="text-sm font-medium text-slate-300">
                            {link.utm_campaign}
                          </span>
                        )}
                      </div>
                      <code className="text-xs text-slate-500 break-all block">
                        {link.full_url}
                      </code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(link.full_url);
                        toast.success("Скопировано!");
                      }}
                      className="flex-shrink-0 hover:bg-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Статистика - современная */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Клики</p>
                      <p className="text-lg font-bold text-blue-400">{link.clicks_count}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Регистрации</p>
                      <p className="text-lg font-bold text-green-400">{link.registrations_count}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Покупки</p>
                      <p className="text-lg font-bold text-amber-400">{link.purchases_count}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">CR</p>
                      <p className="text-lg font-bold text-primary">{link.conversion_rate}%</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <Separator className="my-3 bg-slate-800" />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {new Date(link.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

