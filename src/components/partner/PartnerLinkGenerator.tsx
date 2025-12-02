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
    <div className="w-full" style={{ maxWidth: '1370px', margin: '0 auto' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Генератор ссылок</h1>
        <p className="text-slate-400">Создавайте отслеживаемые партнёрские ссылки для каждого канала</p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Form */}
        <div className="col-span-5">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Новая ссылка</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Заполните параметры</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-5">
                {/* Destination */}
                <div className="space-y-2">
                  <Label htmlFor="destination" className="text-sm font-medium text-slate-300">
                    Целевая страница
                  </Label>
                  <Select value={destination} onValueChange={setDestination}>
                    <SelectTrigger id="destination" className="bg-slate-800/50 border-slate-700 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="home">🏠 Главная</SelectItem>
                      <SelectItem value="premium">⭐ Premium</SelectItem>
                      <SelectItem value="test-essential">📝 Esencial</SelectItem>
                      <SelectItem value="test-priority">🎯 Prioritario</SelectItem>
                      <SelectItem value="payment">💳 Оплата</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Campaign Name */}
                <div className="space-y-2">
                  <Label htmlFor="campaign" className="text-sm font-medium text-slate-300">
                    Название кампании
                  </Label>
                  <Input
                    id="campaign"
                    placeholder="youtube-review-02dec"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 h-12"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && campaign.trim()) {
                        handleGenerateLink();
                      }
                    }}
                  />
                  <p className="text-xs text-slate-500">
                    Используйте формат: <span className="text-slate-400 font-medium">канал-тип-дата</span>
                  </p>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateLink}
                  disabled={loading || !campaign.trim()}
                  className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-opacity h-12 text-base font-medium"
                >
                  {loading ? (
                    <>Генерация...</>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Создать ссылку
                    </>
                  )}
                </Button>

                <Separator className="bg-slate-800" />

                {/* Tips */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Рекомендации</p>
                  <ul className="space-y-2 text-sm text-slate-500">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Создавайте новую ссылку для каждого поста</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Используйте понятные названия кампаний</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Анализируйте результаты каждой ссылки</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Result or Preview */}
        <div className="col-span-7">
          <AnimatePresence mode="wait">
            {generatedLink ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
                  <CardHeader className="border-b border-primary/20 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Ссылка создана</CardTitle>
                          <CardDescription className="text-xs mt-0.5">Готова к использованию</CardDescription>
                        </div>
                      </div>
                      <Button
                        onClick={handleReset}
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-300"
                      >
                        Создать новую
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* Link Display */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-slate-300">Партнёрская ссылка</Label>
                      <div className="flex items-center gap-2 p-4 bg-slate-900/80 rounded-xl border border-slate-700/50">
                        <code className="flex-1 text-sm text-primary font-mono break-all select-all">
                          {generatedLink.full_url}
                        </code>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyLink}
                            className="hover:bg-slate-800"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleOpenLink}
                            className="hover:bg-slate-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                        <p className="text-xs text-slate-500 mb-1">Код ссылки</p>
                        <Badge variant="outline" className="font-mono text-xs">
                          {generatedLink.link_code}
                        </Badge>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                        <p className="text-xs text-slate-500 mb-1">Кампания</p>
                        <p className="text-sm font-medium text-slate-300">{campaign}</p>
                      </div>
                    </div>

                    {/* QR Code Section */}
                    <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <QrCode className="h-4 w-4 text-slate-400" />
                          <p className="text-sm font-medium text-slate-300">QR-код</p>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="p-4 bg-white rounded-xl shadow-lg">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(generatedLink.full_url)}`}
                            alt="QR Code"
                            className="w-40 h-40"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 text-center mt-3">
                        Сохраните для использования в Stories или офлайн-материалах
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleCopyLink}
                        className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 h-11"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Скопировать ссылку
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <Card className="border-slate-800/50 bg-slate-900/30 h-full flex items-center justify-center min-h-[600px]">
                  <CardContent className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                      <Link2 className="h-8 w-8 text-slate-600" />
                    </div>
                    <p className="text-slate-500 text-sm">
                      Заполните форму слева и создайте<br />вашу первую партнёрскую ссылку
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* History Section - Full Width Below */}
      {linkHistory.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">История ссылок</h2>
              <Badge variant="secondary" className="ml-2">
                {linkHistory.length}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {linkHistory.map((link) => (
              <Card
                key={link.link_id}
                className="border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50 transition-all duration-200"
              >
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline" className="text-xs font-mono">
                          {link.link_code}
                        </Badge>
                        {link.utm_campaign && (
                          <span className="text-sm font-medium text-slate-300 truncate">
                            {link.utm_campaign}
                          </span>
                        )}
                      </div>
                      <code className="text-xs text-slate-500 break-all line-clamp-1 block">
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

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Клики</p>
                      <p className="text-xl font-bold text-blue-400">{link.clicks_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Регистр.</p>
                      <p className="text-xl font-bold text-green-400">{link.registrations_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Покупки</p>
                      <p className="text-xl font-bold text-amber-400">{link.purchases_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">CR</p>
                      <p className="text-xl font-bold text-primary">{link.conversion_rate}%</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
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

