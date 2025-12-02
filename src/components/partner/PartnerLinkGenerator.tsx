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
    <div className="w-full relative" style={{ maxWidth: '1370px', margin: '0 auto' }}>
      {/* Aurora Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]"
        />
      </div>

      {/* Premium Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Magic Link Generator
          </h1>
          <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/30 to-purple-500/30 border border-primary/40 backdrop-blur-sm">
            <span className="text-xs font-semibold text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              PRO
            </span>
          </div>
        </div>
        <p className="text-slate-400 text-lg">Создавайте умные ссылки за секунды</p>
      </motion.div>

      {/* Central Widget */}
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Input Section - Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-white/10 bg-slate-900/40 backdrop-blur-2xl shadow-2xl shadow-primary/10 relative overflow-hidden">
            {/* Gradient Border Effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/20 via-transparent to-purple-500/20 p-[1px]">
              <div className="h-full w-full rounded-xl bg-slate-900/90"></div>
            </div>

            <CardContent className="relative p-8 space-y-8">
              {/* Destination */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-white">
                  Куда ведём трафик?
                </Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger className="bg-slate-800/60 border-white/10 h-14 text-base hover:border-primary/30 focus:border-primary/50 transition-all backdrop-blur">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900/95 border-white/10 backdrop-blur-xl">
                    <SelectItem value="home">🏠 Главная страница</SelectItem>
                    <SelectItem value="premium">⭐ Premium подписка</SelectItem>
                    <SelectItem value="test-essential">📝 Тест Esencial</SelectItem>
                    <SelectItem value="test-priority">🎯 Тест Prioritario</SelectItem>
                    <SelectItem value="payment">💳 Страница оплаты</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Social Quick Actions */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-white flex items-center gap-2">
                  Источник трафика
                  <Zap className="h-4 w-4 text-primary" />
                </Label>
                <div className="grid grid-cols-6 gap-3">
                  {SOCIAL_PRESETS.map((social) => (
                    <motion.button
                      key={social.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSocialPreset(social.id)}
                      className={`relative group p-4 rounded-2xl bg-slate-800/60 border backdrop-blur transition-all ${
                        selectedSocial === social.id
                          ? 'border-primary/50 shadow-lg shadow-primary/20'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Gradient on hover */}
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${social.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                      
                      <div className="relative text-center">
                        <div className="text-3xl mb-2">{social.icon}</div>
                        <p className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                          {social.name}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Campaign Name */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-white flex items-center gap-2">
                  Название кампании
                  <span className="text-xs font-normal text-slate-500">(для аналитики)</span>
                </Label>
                <Input
                  placeholder="instagram_02dec или введите своё"
                  value={campaign}
                  onChange={(e) => {
                    setCampaign(e.target.value);
                    setSelectedSocial(null);
                  }}
                  className="bg-slate-800/60 border-white/10 h-14 text-base hover:border-primary/30 focus:border-primary/50 transition-all backdrop-blur placeholder:text-slate-600"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && campaign.trim()) {
                      handleGenerateLink();
                    }
                  }}
                />
              </div>

              {/* Generate Button - Hero Style */}
              <Button
                onClick={handleGenerateLink}
                disabled={loading || !campaign.trim()}
                className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-primary to-purple-600 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                
                {loading ? (
                  <span className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="h-5 w-5" />
                    </motion.div>
                    Генерация Magic Link...
                  </span>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Создать Magic Link ✨
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Result Card - Premium Share Card */}
        <AnimatePresence mode="wait">
          {generatedLink && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="relative group"
            >
              {/* Glow Effect Background */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-3xl blur-2xl opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              
              {/* Main Premium Card */}
              <Card className="relative border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
                {/* Top Gradient Bar */}
                <div className="h-1 bg-gradient-to-r from-primary via-purple-500 to-primary"></div>
                
                <CardContent className="p-10">
                  {/* Success Header */}
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                    className="flex items-center justify-center mb-8"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500/30 rounded-full blur-xl animate-pulse"></div>
                      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center ring-2 ring-green-500/40">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      </div>
                    </div>
                  </motion.div>

                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-2">Magic Link создан! 🎉</h3>
                    <p className="text-slate-400">Готов к использованию</p>
                  </div>

                  {/* Share Card - Main Container */}
                  <div className="grid md:grid-cols-[1fr,2fr] gap-8 mb-8">
                    {/* Left: Premium QR Code */}
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-col items-center"
                    >
                      <div className="relative">
                        {/* QR Glow */}
                        <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl"></div>
                        <div className="relative p-6 bg-white rounded-3xl shadow-2xl">
                          <QRCode
                            value={generatedLink.full_url}
                            size={180}
                            fgColor="#3B82F6"
                            level="H"
                            style={{ borderRadius: '12px' }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-4 text-center">
                        Сканируйте для быстрого доступа
                      </p>
                    </motion.div>

                    {/* Right: Link Info & Actions */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-6"
                    >
                      {/* Link Display */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                            Ваша ссылка
                          </Label>
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs text-green-500 font-medium">Активна</span>
                          </div>
                        </div>
                        
                        <div className="relative group/link">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-500 rounded-2xl opacity-20 group-hover/link:opacity-40 blur transition duration-300"></div>
                          <div className="relative flex items-center gap-3 p-4 bg-slate-800/60 rounded-2xl border border-white/10 backdrop-blur">
                            <code className="flex-1 text-sm text-primary font-mono break-all select-all">
                              {generatedLink.full_url}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCopyLink}
                              className="hover:bg-slate-700/80 flex-shrink-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5">
                          <p className="text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Код</p>
                          <Badge variant="outline" className="font-mono">
                            {generatedLink.link_code}
                          </Badge>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5">
                          <p className="text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Кампания</p>
                          <p className="text-sm font-medium text-slate-200 truncate">{campaign}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-2">
                        <Button
                          onClick={handleCopyLink}
                          className="flex-1 h-12 bg-gradient-to-r from-primary to-purple-600 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 relative overflow-hidden group"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                          <Copy className="h-4 w-4 mr-2" />
                          Скопировать
                        </Button>
                        <Button
                          onClick={handleOpenLink}
                          variant="outline"
                          className="h-12 px-6 border-white/10 hover:bg-slate-800/80 backdrop-blur"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={handleReset}
                          variant="outline"
                          className="h-12 px-6 border-white/10 hover:bg-slate-800/80 backdrop-blur"
                        >
                          Создать новую
                        </Button>
                      </div>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recent Links - Premium History */}
      {linkHistory.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Недавние ссылки</h2>
                  <p className="text-sm text-slate-500 mt-0.5">С мини-статистикой</p>
                </div>
              </div>
              <Badge variant="secondary" className="px-3 py-1">
                {linkHistory.length}
              </Badge>
            </div>

            <div className="space-y-3">
              {linkHistory.map((link, index) => (
                <motion.div
                  key={link.link_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card className="border-white/10 bg-slate-900/40 backdrop-blur-xl hover:bg-slate-900/60 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-6">
                        {/* Left: Link Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
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

                        {/* Center: Mini Stats */}
                        <div className="flex gap-6">
                          <div className="text-center">
                            <p className="text-xs text-slate-500 mb-1">Клики</p>
                            <p className="text-lg font-bold text-blue-400">{link.clicks_count}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-slate-500 mb-1">Регистр.</p>
                            <p className="text-lg font-bold text-green-400">{link.registrations_count}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-slate-500 mb-1">CR</p>
                            <p className="text-lg font-bold text-primary">{link.conversion_rate}%</p>
                          </div>
                        </div>

                        {/* Right: Copy Button & Time */}
                        <div className="flex items-center gap-4">
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
                              <div className="flex items-center justify-end gap-1.5 mt-1 px-2 py-0.5 rounded bg-green-500/10">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
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
                            className="hover:bg-slate-800/70"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
