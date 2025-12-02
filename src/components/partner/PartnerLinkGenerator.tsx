// @ts-nocheck
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Download, Sparkles, Zap, Shield, BarChart3, Check, Link as LinkIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "react-qr-code";

interface Props {
  partnerId: string;
}

interface GeneratedLink {
  link_code: string;
  full_url: string;
}

// Social sources с иконками
const SOCIAL_SOURCES = [
  { id: 'instagram', name: 'Instagram', icon: '📸', color: 'from-pink-500 to-purple-600' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'from-black to-pink-500' },
  { id: 'twitter', name: 'Twitter', icon: '🐦', color: 'from-blue-400 to-blue-500' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'from-red-500 to-red-600' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'from-blue-600 to-blue-700' },
  { id: 'telegram', name: 'Telegram', icon: '✈️', color: 'from-blue-500 to-cyan-400' },
  { id: 'other', name: 'Other', icon: '🌐', color: 'from-slate-500 to-slate-600' },
];

export function PartnerLinkGenerator({ partnerId }: Props) {
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState<string>("home");
  const [campaign, setCampaign] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("instagram");
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);
  const [copied, setCopied] = useState(false);

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
        toast.success("Magic Link создан! ✨");
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

  const selectedSocial = SOCIAL_SOURCES.find(s => s.id === selectedSource);

  return (
    <div className="h-[calc(100vh-100px)] w-full max-w-[1600px] mx-auto px-6">
      <div className="grid grid-cols-[380px_1fr] gap-6 h-full">
        
        {/* LEFT: Input Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold text-white">Magic Link Gen</h1>
            </div>
            <p className="text-sm text-slate-500">
              Создавайте красивые отслеживаемые короткие ссылки за секунды
            </p>
          </div>

          {/* Controls */}
          <Card className="flex-1 border-white/5 bg-slate-900/40 backdrop-blur-sm">
            <div className="p-5 space-y-5">
              
              {/* Source */}
              <div className="space-y-2.5">
                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Источник
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {SOCIAL_SOURCES.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => handleSourceSelect(source.id)}
                      className={`
                        relative p-2.5 rounded-lg transition-all text-center
                        ${selectedSource === source.id 
                          ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                          : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }
                      `}
                    >
                      <div className="text-xl mb-1">{source.icon}</div>
                      <div className="text-[9px] font-medium">{source.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target URL (Destination) */}
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Целевая страница
                </Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Select value={destination} onValueChange={setDestination}>
                    <SelectTrigger className="h-10 pl-9 bg-white/5 border-white/10 text-sm">
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
              </div>

              {/* Campaign Name */}
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Название кампании
                </Label>
                <div className="relative">
                  <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input
                    placeholder="instagram_02дек"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    className="h-10 pl-9 bg-white/5 border-white/10 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && campaign.trim()) {
                        handleGenerateLink();
                      }
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleGenerateLink}
                  disabled={loading || !campaign.trim()}
                  className="flex-1 h-10 bg-primary hover:bg-primary/90 text-sm font-medium"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Generate Magic Link
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* RIGHT: Preview/Result */}
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
                className="w-full max-w-xl"
              >
                <Card className="border-white/5 bg-slate-900/40 backdrop-blur-sm">
                  <div className="p-10 space-y-8">
                    {/* Campaign Header */}
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Кампания
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{selectedSocial?.icon}</div>
                        <div>
                          <div className="text-sm text-slate-400">{selectedSocial?.name}</div>
                          <div className="text-xl font-semibold text-white">{campaign}</div>
                        </div>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center py-8">
                      <div className="p-6 bg-white rounded-3xl shadow-2xl mb-4">
                        <QRCode
                          value={generatedLink.full_url}
                          size={240}
                          fgColor="#3B82F6"
                          level="H"
                        />
                      </div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Сканируйте для перехода
                      </div>
                    </div>

                    {/* Short Link */}
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Короткая ссылка
                      </div>
                      <div className="p-4 rounded-xl bg-black/20 border border-white/5 mb-4">
                        <code className="text-base font-mono text-primary break-all select-all">
                          {generatedLink.full_url}
                        </code>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <Button
                          onClick={handleCopy}
                          className="flex-1 h-11 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white"
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
                              Копировать
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => toast.info("Сохранение QR...")}
                          variant="ghost"
                          className="h-11 px-5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Сохранить
                        </Button>
                      </div>
                    </div>

                    {/* Status Indicators */}
                    <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-slate-500">Live Preview</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-slate-500">Secure SSL</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-3 h-3 text-primary" />
                        <span className="text-xs text-slate-500">Analytics Ready</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-xl"
              >
                <Card className="border-white/5 bg-slate-900/30 backdrop-blur-sm">
                  <div className="p-20 text-center">
                    <div className="w-24 h-24 rounded-3xl bg-slate-800/30 flex items-center justify-center mx-auto mb-6">
                      <Sparkles className="h-12 w-12 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-400 mb-2">
                      Ваша ссылка появится здесь
                    </h3>
                    <p className="text-sm text-slate-600">
                      Выберите источник, целевую страницу и название кампании
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
