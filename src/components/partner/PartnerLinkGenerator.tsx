// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, ExternalLink, Sparkles, TrendingUp, Clock, CheckCircle2, Zap, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "react-qr-code";

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

// Quick Actions для соцсетей
const SOCIAL_PRESETS = [
  { id: 'instagram', name: 'Instagram', icon: '📸', color: 'from-pink-500 to-purple-600', prefix: 'instagram' },
  { id: 'telegram', name: 'Telegram', icon: '✈️', color: 'from-blue-500 to-cyan-500', prefix: 'telegram' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'from-black to-pink-500', prefix: 'tiktok' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'from-red-500 to-red-600', prefix: 'youtube' },
  { id: 'whatsapp', name: 'WhatsApp', icon: '💬', color: 'from-green-500 to-green-600', prefix: 'whatsapp' },
  { id: 'facebook', name: 'Facebook', icon: '👥', color: 'from-blue-600 to-blue-700', prefix: 'facebook' },
];

export function PartnerLinkGenerator({ partnerId }: Props) {
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState<string>("home");
  const [campaign, setCampaign] = useState<string>("");
  const [selectedSocial, setSelectedSocial] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);
  const [linkHistory, setLinkHistory] = useState<LinkHistory[]>([]);

  const loadLinkHistory = async () => {
    try {
      const { data, error } = await supabase.rpc('get_partner_links_with_stats', {
        p_partner_id: partnerId,
        p_limit: 5
      });

      if (error) throw error;

      if (data) {
        setLinkHistory(data);
      }
    } catch (error: any) {
      console.error('[PartnerLinkGenerator] Load history error:', error);
    }
  };

  // Quick Action для соцсетей
  const handleSocialPreset = (socialId: string) => {
    const preset = SOCIAL_PRESETS.find(p => p.id === socialId);
    if (preset) {
      const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }).replace('.', '');
      setCampaign(`${preset.prefix}_${date}`);
      setSelectedSocial(socialId);
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
        toast.success("Magic Link создан! ✨");
        
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
    setSelectedSocial(null);
  };

  // Загрузить историю ссылок при монтировании
  useEffect(() => {
    loadLinkHistory();
  }, [partnerId]);

  return (
    <div className="w-full relative px-6" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Clean Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-3xl font-semibold text-white mb-2">
          Генератор партнёрских ссылок
        </h1>
        <p className="text-slate-500">Создавайте отслеживаемые ссылки для каждого канала</p>
      </motion.div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="p-8 space-y-7">
              {/* Destination */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-300">
                  Целевая страница
                </Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 h-12 hover:border-slate-600 focus:border-primary/40 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="home">🏠 Главная</SelectItem>
                    <SelectItem value="premium">⭐ Premium</SelectItem>
                    <SelectItem value="test-essential">📝 Тест Esencial</SelectItem>
                    <SelectItem value="test-priority">🎯 Тест Prioritario</SelectItem>
                    <SelectItem value="payment">💳 Оплата</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Social Quick Actions */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-300">
                  Быстрый выбор источника
                </Label>
                <div className="grid grid-cols-6 gap-2.5">
                  {SOCIAL_PRESETS.map((social) => (
                    <button
                      key={social.id}
                      onClick={() => handleSocialPreset(social.id)}
                      className={`relative p-3 rounded-xl border transition-all ${
                        selectedSocial === social.id
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-slate-800/50 bg-slate-800/30 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-1.5">{social.icon}</div>
                        <p className="text-[10px] font-medium text-slate-400">
                          {social.name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Campaign Name */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-300">
                  Название кампании
                </Label>
                <Input
                  placeholder="instagram_02дек"
                  value={campaign}
                  onChange={(e) => {
                    setCampaign(e.target.value);
                    setSelectedSocial(null);
                  }}
                  className="bg-slate-800/50 border-slate-700/50 h-12 hover:border-slate-600 focus:border-primary/40 transition-colors placeholder:text-slate-600"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && campaign.trim()) {
                      handleGenerateLink();
                    }
                  }}
                />
                <p className="text-xs text-slate-500">
                  Формат: источник_дата (например, youtube_02дек)
                </p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateLink}
                disabled={loading || !campaign.trim()}
                className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="h-4 w-4" />
                    </motion.div>
                    Создаю...
                  </span>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Создать ссылку
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Result Card */}
        <AnimatePresence mode="wait">
          {generatedLink && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-8">
                  {/* Success Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Ссылка создана</h3>
                        <p className="text-sm text-slate-500">Готова к использованию</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleReset}
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white"
                    >
                      Создать новую
                    </Button>
                  </div>

                  {/* Main Content Grid */}
                  <div className="grid md:grid-cols-[200px_1fr] gap-8 mb-6">
                    {/* QR Code */}
                    <div className="flex flex-col items-center">
                      <div className="p-4 bg-white rounded-2xl shadow-lg">
                        <QRCode
                          value={generatedLink.full_url}
                          size={168}
                          fgColor="#3B82F6"
                          level="H"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-3 text-center">
                        QR для Stories и офлайн
                      </p>
                    </div>

                    {/* Link Info */}
                    <div className="space-y-5">
                      {/* Link */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium text-slate-400">Партнёрская ссылка</Label>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span className="text-xs text-green-500">Активна</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                          <code className="flex-1 text-sm text-primary font-mono break-all select-all">
                            {generatedLink.full_url}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyLink}
                            className="hover:bg-slate-700/50 flex-shrink-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800/50">
                          <p className="text-xs text-slate-500 mb-1.5">Код ссылки</p>
                          <Badge variant="outline" className="font-mono text-xs">
                            {generatedLink.link_code}
                          </Badge>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800/50">
                          <p className="text-xs text-slate-500 mb-1.5">Кампания</p>
                          <p className="text-sm font-medium text-slate-300 truncate">{campaign}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <Button
                          onClick={handleCopyLink}
                          className="flex-1 h-11 bg-primary hover:bg-primary/90"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Скопировать ссылку
                        </Button>
                        <Button
                          onClick={handleOpenLink}
                          variant="outline"
                          className="h-11 px-5 border-slate-700/50 hover:bg-slate-800/50"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recent Links */}
      {linkHistory.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-white">Недавние ссылки</h2>
            </div>
            <Badge variant="secondary" className="text-xs">
              {linkHistory.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {linkHistory.map((link) => (
              <Card
                key={link.link_id}
                className="border-slate-800/50 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-6">
                    {/* Link Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline" className="font-mono text-xs">
                          {link.link_code}
                        </Badge>
                        {link.utm_campaign && (
                          <span className="text-sm font-medium text-slate-300 truncate">
                            {link.utm_campaign}
                          </span>
                        )}
                      </div>
                      <code className="text-xs text-slate-600 truncate block">
                        {link.full_url}
                      </code>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6">
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-0.5">Клики</p>
                        <p className="text-base font-semibold text-slate-300">{link.clicks_count}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-0.5">Регистр.</p>
                        <p className="text-base font-semibold text-slate-300">{link.registrations_count}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-0.5">CR</p>
                        <p className="text-base font-semibold text-primary">{link.conversion_rate}%</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          {new Date(link.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        {link.clicks_count > 0 && (
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span className="text-xs text-green-500">Live</span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(link.full_url);
                          toast.success("Скопировано!");
                        }}
                        className="hover:bg-slate-800/50"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
