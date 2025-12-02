// @ts-nocheck
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, ExternalLink, Sparkles, Download, Check } from "lucide-react";
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

// Компактные Pills для соцсетей
const SOCIAL_SOURCES = [
  { id: 'instagram', name: 'Instagram', icon: '📸', gradient: 'from-pink-500 to-purple-600' },
  { id: 'telegram', name: 'Telegram', icon: '✈️', gradient: 'from-blue-500 to-cyan-400' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', gradient: 'from-black to-pink-500' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', gradient: 'from-red-500 to-red-600' },
  { id: 'whatsapp', name: 'WhatsApp', icon: '💬', gradient: 'from-green-500 to-green-600' },
  { id: 'other', name: 'Other', icon: '🌐', gradient: 'from-slate-500 to-slate-600' },
];

export function PartnerLinkGenerator({ partnerId }: Props) {
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState<string>("home");
  const [campaign, setCampaign] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("instagram");
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-fill campaign name
  const handleSourceSelect = (sourceId: string) => {
    setSelectedSource(sourceId);
    const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }).replace('.', '');
    setCampaign(`${sourceId}_${date}`);
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
        toast.success("Ссылка создана! ✨");
      }
    } catch (error: any) {
      console.error('[PartnerLinkGenerator] Error:', error);
      toast.error("Ошибка генерации ссылки");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink.full_url);
    setCopied(true);
    toast.success("Скопировано!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-[calc(100vh-120px)] w-full max-w-[1400px] mx-auto px-6">
      {/* Split View Grid */}
      <div className="grid grid-cols-[420px_1fr] gap-8 h-full">
        
        {/* LEFT: Control Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-1">
              Создать ссылку
            </h2>
            <p className="text-sm text-slate-500">
              Настройте параметры кампании
            </p>
          </div>

          {/* Controls Card */}
          <Card className="flex-1 border-white/5 bg-slate-900/50 backdrop-blur-sm">
            <div className="p-6 space-y-6">
              
              {/* Source Pills */}
              <div className="space-y-3">
                <Label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Источник трафика
                </Label>
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_SOURCES.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => handleSourceSelect(source.id)}
                      className={`
                        group relative px-3 py-1.5 rounded-full text-sm font-medium transition-all
                        ${selectedSource === source.id 
                          ? 'bg-white/10 text-white ring-1 ring-white/20' 
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300'
                        }
                      `}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{source.icon}</span>
                        <span>{source.name}</span>
                      </div>
                      {selectedSource === source.id && (
                        <motion.div
                          layoutId="activeSource"
                          className={`absolute inset-0 rounded-full bg-gradient-to-r ${source.gradient} opacity-10`}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Целевая страница
                </Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger className="h-9 bg-white/5 border-white/10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="home">Главная</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="test-essential">Тест Esencial</SelectItem>
                    <SelectItem value="test-priority">Тест Prioritario</SelectItem>
                    <SelectItem value="payment">Оплата</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campaign */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Название кампании
                </Label>
                <Input
                  placeholder="instagram_02дек"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  className="h-9 bg-white/5 border-white/10 text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && campaign.trim()) {
                      handleGenerateLink();
                    }
                  }}
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateLink}
                disabled={loading || !campaign.trim()}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-sm font-medium"
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
            </div>
          </Card>
        </motion.div>

        {/* RIGHT: Live Preview Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-center"
        >
          <AnimatePresence mode="wait">
            {generatedLink ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl"
              >
                {/* Premium Share Card */}
                <div className="relative">
                  {/* Glow */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-purple-500/30 to-primary/30 rounded-3xl blur-2xl opacity-50" />
                  
                  {/* Card */}
                  <Card className="relative border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
                    {/* Mesh Gradient Overlay */}
                    <div 
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage: `
                          radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.3) 0px, transparent 50%),
                          radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.3) 0px, transparent 50%),
                          radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.3) 0px, transparent 50%),
                          radial-gradient(at 0% 100%, rgba(168, 85, 247, 0.3) 0px, transparent 50%)
                        `
                      }}
                    />

                    <div className="relative p-8">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <Badge variant="outline" className="mb-2 font-mono text-xs">
                            {generatedLink.link_code}
                          </Badge>
                          <h3 className="text-lg font-semibold text-white">
                            {campaign}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/10 ring-1 ring-green-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className="text-xs text-green-500 font-medium">Live</span>
                        </div>
                      </div>

                      {/* Content Grid */}
                      <div className="grid grid-cols-[200px_1fr] gap-8">
                        {/* QR Code */}
                        <div className="flex flex-col items-center">
                          <div className="p-4 bg-white rounded-2xl shadow-2xl">
                            <QRCode
                              value={generatedLink.full_url}
                              size={168}
                              fgColor="#3B82F6"
                              level="H"
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-3 text-center">
                            Сканируйте камерой
                          </p>
                        </div>

                        {/* Link Info */}
                        <div className="flex flex-col justify-between">
                          {/* URL */}
                          <div className="space-y-3">
                            <Label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Партнёрская ссылка
                            </Label>
                            <div className="p-4 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10">
                              <code className="text-sm text-primary font-mono break-all select-all leading-relaxed">
                                {generatedLink.full_url}
                              </code>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3 mt-6">
                            <Button
                              onClick={handleCopy}
                              className="flex-1 h-11 bg-white/10 hover:bg-white/20 backdrop-blur-sm"
                              variant="ghost"
                            >
                              {copied ? (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Скопировано
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Скопировать
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => window.open(generatedLink.full_url, '_blank')}
                              variant="ghost"
                              className="h-11 px-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => toast.info("Скачивание QR...")}
                              variant="ghost"
                              className="h-11 px-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-2xl"
              >
                {/* Empty State - Elegant Placeholder */}
                <Card className="border-white/5 bg-slate-900/30 backdrop-blur-sm">
                  <div className="p-16 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-6">
                      <Sparkles className="h-10 w-10 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-400 mb-2">
                      Ваша ссылка появится здесь
                    </h3>
                    <p className="text-sm text-slate-600">
                      Заполните форму слева и нажмите "Создать ссылку"
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
