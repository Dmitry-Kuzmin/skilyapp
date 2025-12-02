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
      {/* Premium Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex items-end gap-4 mb-3">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Генератор ссылок
          </h1>
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30">
            <span className="text-xs font-medium text-primary">PRO</span>
          </div>
        </div>
        <p className="text-slate-500 text-base">Создавайте отслеживаемые партнёрские ссылки для каждого канала</p>
      </motion.div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left Column - Form */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-5"
        >
          <Card className="border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-slate-900/90 backdrop-blur-xl shadow-2xl shadow-primary/5">
            <CardHeader className="pb-6 pt-7 px-7">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center ring-1 ring-primary/20 shadow-lg shadow-primary/10">
                  <Link2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold tracking-tight">Новая ссылка</CardTitle>
                  <CardDescription className="text-sm mt-1 text-slate-500">Заполните параметры кампании</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-7 pb-7">
              <div className="space-y-6">
                {/* Destination */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-3"
                >
                  <Label htmlFor="destination" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    Целевая страница
                    <span className="text-xs text-slate-600">•</span>
                    <span className="text-xs text-slate-500">Куда направить трафик</span>
                  </Label>
                  <Select value={destination} onValueChange={setDestination}>
                    <SelectTrigger id="destination" className="bg-slate-800/60 border-slate-700/50 h-13 hover:border-slate-600 transition-colors backdrop-blur">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900/95 border-slate-700 backdrop-blur-xl">
                      <SelectItem value="home">🏠 Главная</SelectItem>
                      <SelectItem value="premium">⭐ Premium</SelectItem>
                      <SelectItem value="test-essential">📝 Esencial</SelectItem>
                      <SelectItem value="test-priority">🎯 Prioritario</SelectItem>
                      <SelectItem value="payment">💳 Оплата</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* Campaign Name */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-3"
                >
                  <Label htmlFor="campaign" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    Название кампании
                    <span className="text-xs text-slate-600">•</span>
                    <span className="text-xs text-slate-500">Для вашей аналитики</span>
                  </Label>
                  <Input
                    id="campaign"
                    placeholder="youtube-review-02dec"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    className="bg-slate-800/60 border-slate-700/50 h-13 hover:border-slate-600 focus:border-primary/50 transition-all backdrop-blur placeholder:text-slate-600"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && campaign.trim()) {
                        handleGenerateLink();
                      }
                    }}
                  />
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                    Формат: <span className="text-slate-500 font-medium">канал-тип-дата</span>
                  </p>
                </motion.div>

                {/* Generate Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    onClick={handleGenerateLink}
                    disabled={loading || !campaign.trim()}
                    className="w-full bg-gradient-to-r from-primary via-primary to-purple-600 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 h-13 text-base font-medium relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles className="h-4 w-4" />
                        </motion.div>
                        Генерация...
                      </span>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Создать ссылку
                      </>
                    )}
                  </Button>
                </motion.div>

                <Separator className="bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

                {/* Premium Tips */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3 p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/10"
                >
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-3 rounded-full bg-primary"></div>
                    Рекомендации
                  </p>
                  <ul className="space-y-3 text-sm text-slate-400">
                    <li className="flex items-start gap-3 group">
                      <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      </div>
                      <span className="leading-relaxed">Создавайте отдельную ссылку для каждого поста</span>
                    </li>
                    <li className="flex items-start gap-3 group">
                      <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      </div>
                      <span className="leading-relaxed">Используйте понятные названия кампаний</span>
                    </li>
                    <li className="flex items-start gap-3 group">
                      <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      </div>
                      <span className="leading-relaxed">Анализируйте результаты каждой ссылки</span>
                    </li>
                  </ul>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column - Result or Preview */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-7"
        >
          <AnimatePresence mode="wait">
            {generatedLink ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-primary/5 backdrop-blur-xl shadow-2xl shadow-primary/10 relative overflow-hidden">
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10 opacity-50"></div>
                  
                  <CardHeader className="pb-6 pt-7 px-7 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center ring-1 ring-green-500/30 shadow-lg shadow-green-500/20"
                        >
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        </motion.div>
                        <div>
                          <CardTitle className="text-xl font-semibold tracking-tight">Ссылка создана</CardTitle>
                          <CardDescription className="text-sm mt-1 text-slate-500">Готова к использованию</CardDescription>
                        </div>
                      </div>
                      <Button
                        onClick={handleReset}
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
                      >
                        Создать новую
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="px-7 pb-7 space-y-6 relative">
                    {/* Link Display */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="space-y-3"
                    >
                      <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        Партнёрская ссылка
                        <div className="px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20">
                          <span className="text-xs text-green-500 font-medium">Активна</span>
                        </div>
                      </Label>
                      <div className="group relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative flex items-center gap-3 p-5 bg-slate-900/80 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                          <code className="flex-1 text-sm text-primary font-mono break-all select-all leading-relaxed">
                            {generatedLink.full_url}
                          </code>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCopyLink}
                              className="hover:bg-slate-800/80 transition-colors h-9 w-9"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleOpenLink}
                              className="hover:bg-slate-800/80 transition-colors h-9 w-9"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Metadata Grid */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm hover:border-slate-700/50 transition-colors">
                        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Код ссылки</p>
                        <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                          {generatedLink.link_code}
                        </Badge>
                      </div>
                      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm hover:border-slate-700/50 transition-colors">
                        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Кампания</p>
                        <p className="text-sm font-medium text-slate-300">{campaign}</p>
                      </div>
                    </motion.div>

                    {/* QR Code Section */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center">
                          <QrCode className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-300">QR-код</p>
                          <p className="text-xs text-slate-500 mt-0.5">Для Stories и офлайн</p>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.4, type: "spring" }}
                          className="p-5 bg-white rounded-2xl shadow-xl"
                        >
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(generatedLink.full_url)}`}
                            alt="QR Code"
                            className="w-40 h-40"
                          />
                        </motion.div>
                      </div>
                    </motion.div>

                    {/* Action Button */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="pt-2"
                    >
                      <Button
                        onClick={handleCopyLink}
                        className="w-full bg-gradient-to-r from-primary via-primary to-purple-600 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 h-13 text-base font-medium relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        <Copy className="h-4 w-4 mr-2" />
                        Скопировать ссылку
                      </Button>
                    </motion.div>
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
                <Card className="border-slate-800/30 bg-gradient-to-br from-slate-900/20 to-slate-900/40 backdrop-blur h-full flex items-center justify-center min-h-[660px] relative overflow-hidden">
                  {/* Subtle Pattern */}
                  <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(148, 163, 184) 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                  }}></div>
                  
                  <CardContent className="text-center py-16 relative">
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.05, 1],
                        opacity: [0.5, 0.8, 0.5]
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-800/30 flex items-center justify-center mx-auto mb-6 ring-1 ring-slate-700/30"
                    >
                      <Link2 className="h-10 w-10 text-slate-600" />
                    </motion.div>
                    <p className="text-slate-500 text-base leading-relaxed max-w-sm mx-auto">
                      Заполните форму слева и создайте<br />вашу первую партнёрскую ссылку
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Premium History Section */}
      {linkHistory.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">История ссылок</h2>
                <p className="text-sm text-slate-500 mt-0.5">Все созданные кампании</p>
              </div>
              <Badge variant="secondary" className="ml-2 px-3 py-1">
                {linkHistory.length}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {linkHistory.map((link, index) => (
              <motion.div
                key={link.link_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className="group border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:border-slate-700 hover:from-slate-900/70 hover:to-slate-900/50 transition-all duration-300 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/5 relative overflow-hidden">
                  {/* Subtle Hover Glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-purple-500/0 to-primary/0 group-hover:from-primary/5 group-hover:via-purple-500/5 group-hover:to-primary/5 transition-all duration-500"></div>
                  
                  <CardContent className="p-6 relative">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 border-slate-700/50">
                            {link.link_code}
                          </Badge>
                          {link.utm_campaign && (
                            <span className="text-sm font-medium text-slate-300 truncate">
                              {link.utm_campaign}
                            </span>
                          )}
                        </div>
                        <code className="text-xs text-slate-600 break-all line-clamp-1 block">
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
                        className="flex-shrink-0 hover:bg-slate-800/70 transition-colors h-9 w-9"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Premium Stats Grid */}
                    <div className="grid grid-cols-4 gap-4 mb-5">
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Клики</p>
                        <p className="text-2xl font-bold bg-gradient-to-br from-blue-400 to-blue-500 bg-clip-text text-transparent">
                          {link.clicks_count}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Регистр.</p>
                        <p className="text-2xl font-bold bg-gradient-to-br from-green-400 to-green-500 bg-clip-text text-transparent">
                          {link.registrations_count}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Покупки</p>
                        <p className="text-2xl font-bold bg-gradient-to-br from-amber-400 to-amber-500 bg-clip-text text-transparent">
                          {link.purchases_count}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">CR</p>
                        <p className="text-2xl font-bold bg-gradient-to-br from-primary to-purple-500 bg-clip-text text-transparent">
                          {link.conversion_rate}%
                        </p>
                      </div>
                    </div>

                    {/* Footer with Timestamp */}
                    <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {new Date(link.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {link.conversion_rate > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                          <span className="text-xs text-green-500 font-medium">Активна</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

