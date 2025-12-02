// @ts-nocheck
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, ExternalLink, Link as LinkIcon, QrCode, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  partnerId: string;
}

interface GeneratedLink {
  link_code: string;
  full_url: string;
}

export function PartnerLinkGenerator({ partnerId }: Props) {
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState<string>("premium");
  const [campaign, setCampaign] = useState<string>("");
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);

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

  return (
    <Card className="bg-slate-900/80 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-primary" />
          Генератор партнерских ссылок
        </CardTitle>
        <CardDescription>
          Создайте персонализированную ссылку для каждого канала или кампании
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AnimatePresence mode="wait">
          {!generatedLink ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Destination */}
              <div className="space-y-2">
                <Label htmlFor="destination">Куда вести пользователя?</Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger id="destination" className="bg-slate-800/50 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="home">🏠 Главная страница</SelectItem>
                    <SelectItem value="premium">⭐ Страница Premium</SelectItem>
                    <SelectItem value="test-essential">📝 Тест Esencial</SelectItem>
                    <SelectItem value="test-priority">🎯 Тест Prioritario</SelectItem>
                    <SelectItem value="payment">💳 Страница оплаты (для разогретых)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Выберите, на какую страницу попадет пользователь по ссылке
                </p>
              </div>

              {/* Campaign Name */}
              <div className="space-y-2">
                <Label htmlFor="campaign">Название кампании (для вашей аналитики)</Label>
                <Input
                  id="campaign"
                  placeholder="youtube-review-20dec, telegram-post, story-1"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  className="bg-slate-800/50 border-slate-700"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleGenerateLink();
                    }
                  }}
                />
                <p className="text-xs text-slate-500">
                  Используйте понятные названия: источник-тип-дата (например, "youtube-review-20dec")
                </p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateLink}
                disabled={loading || !campaign.trim()}
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {loading ? 'Генерация...' : 'Сгенерировать ссылку'}
              </Button>

              {/* Tips */}
              <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-slate-300 mb-2">💡 Совет:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Создавайте отдельную ссылку для каждого поста/видео</li>
                    <li>• Используйте говорящие названия кампаний</li>
                    <li>• Отслеживайте конверсию каждой ссылки в статистике</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Generated Link Display */}
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Ваша партнерская ссылка готова! 🎉</Label>
                <div className="flex items-center gap-2 p-4 bg-slate-800/50 rounded-lg border-2 border-primary/30">
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
              </div>

              {/* Link Details */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-800/30 border-slate-700">
                  <CardContent className="p-3">
                    <p className="text-xs text-slate-400 mb-1">Код ссылки</p>
                    <p className="text-sm font-mono text-slate-300">{generatedLink.link_code}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/30 border-slate-700">
                  <CardContent className="p-3">
                    <p className="text-xs text-slate-400 mb-1">Кампания</p>
                    <p className="text-sm font-medium text-slate-300">{campaign}</p>
                  </CardContent>
                </Card>
              </div>

              {/* QR Code */}
              <div className="space-y-2">
                <Label className="text-sm text-slate-300 flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  QR-код для быстрого доступа
                </Label>
                <div className="flex justify-center p-4 bg-white rounded-lg border border-slate-700">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatedLink.full_url)}`}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-xs text-slate-400 text-center">
                  Используйте QR-код в сторис, постах или офлайн-материалах
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleCopyLink}
                  variant="default"
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Скопировать ссылку
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1 border-slate-700 hover:bg-slate-800"
                >
                  Создать еще
                </Button>
              </div>

              {/* Instructions */}
              <Card className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border-green-500/20">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-slate-300 mb-2">✅ Что дальше?</p>
                  <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                    <li>Скопируйте ссылку или QR-код</li>
                    <li>Поделитесь в своих социальных сетях</li>
                    <li>При регистрации по ссылке пользователь получит Premium на 30 дней</li>
                    <li>Отслеживайте статистику в разделе "Воронка конверсий"</li>
                  </ol>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

