// @ts-nocheck
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Copy, 
  Download, 
  Sparkles, 
  Zap, 
  Shield, 
  BarChart3, 
  Check, 
  Link as LinkIcon,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Facebook,
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "react-qr-code";

interface Props {
  partnerId: string;
}

interface GeneratedLink {
  link_code: string;
  full_url: string;
}

// Social sources with lucide icons
const SOURCES = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-500', gradient: 'from-purple-500 to-pink-500', bg: 'bg-pink-500/20' },
  { id: 'tiktok', name: 'TikTok', icon: Zap, color: 'text-cyan-400', gradient: 'from-cyan-400 to-black', bg: 'bg-cyan-500/20' },
  { id: 'twitter', name: 'Twitter', icon: Twitter, color: 'text-sky-400', gradient: 'from-sky-400 to-blue-500', bg: 'bg-sky-500/20' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-500', gradient: 'from-red-500 to-orange-500', bg: 'bg-red-500/20' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-600', gradient: 'from-blue-600 to-cyan-600', bg: 'bg-blue-500/20' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-500', gradient: 'from-blue-600 to-indigo-600', bg: 'bg-blue-500/20' },
  { id: 'other', name: 'Other', icon: Globe, color: 'text-emerald-400', gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-500/20' },
];

export function PartnerLinkGenerator({ partnerId }: Props) {
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState<string>("home");
  const [campaign, setCampaign] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState(SOURCES[0]);
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);
  const [previewLink, setPreviewLink] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Live preview - обновляется автоматически
  useEffect(() => {
    if (!campaign.trim()) {
      setPreviewLink("skilyapp.com/waiting...");
      return;
    }
    const cleanCampaign = campaign.trim().replace(/\s+/g, '-').toLowerCase();
    setPreviewLink(`skilyapp.com/${selectedSource.id}/${cleanCampaign}`);
  }, [campaign, selectedSource]);

  const handleSourceSelect = (source: typeof SOURCES[0]) => {
    setSelectedSource(source);
    if (!campaign) {
      const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }).replace('.', '');
      setCampaign(`${source.id}_${date}`);
    }
  };

  const handleGenerate = async () => {
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
    const linkToCopy = generatedLink?.full_url || previewLink;
    await navigator.clipboard.writeText(linkToCopy);
    setCopied(true);
    toast.success("Скопировано!");
    setTimeout(() => setCopied(false), 2000);
  };

  const currentSource = selectedSource;
  const Icon = currentSource.icon;

  return (
    <div className="min-h-[calc(100vh-100px)] bg-[#0A0A0B] text-slate-300 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Ambient Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 z-10">
        
        {/* LEFT COLUMN: CONTROLS */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <header className="mb-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles size={16} className="text-white" />
              </div>
              <h1 className="text-xl font-medium text-white tracking-tight">Magic Link Gen</h1>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Создавайте красивые отслеживаемые короткие ссылки за секунды
            </p>
          </header>

          <div className="space-y-6">
            {/* Source Selector */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Источник</label>
              <div className="flex flex-wrap gap-2">
                {SOURCES.map((source) => {
                  const isActive = selectedSource.id === source.id;
                  const SourceIcon = source.icon;
                  return (
                    <button
                      key={source.id}
                      onClick={() => handleSourceSelect(source)}
                      className={`
                        group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 border
                        ${isActive 
                          ? 'bg-slate-800 border-slate-600 text-white shadow-lg shadow-black/20' 
                          : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800 hover:border-slate-700'}
                      `}
                    >
                      <SourceIcon size={14} className={`transition-colors ${isActive ? source.color : 'text-slate-500 group-hover:text-slate-400'}`} />
                      <span>{source.name}</span>
                      {isActive && (
                        <span className={`absolute inset-0 rounded-lg bg-gradient-to-r ${source.gradient} opacity-10`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Целевая страница</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon size={14} className="text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <Select value={destination} onValueChange={setDestination}>
                    <SelectTrigger className="w-full bg-slate-900/50 border border-white/10 rounded-xl h-12 pl-9 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 hover:border-white/20">
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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Название кампании</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Zap size={14} className="text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <Input
                    type="text"
                    placeholder="instagram_02дек"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-9 pr-4 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-white/20"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && campaign.trim()) {
                        handleGenerate();
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Action */}
            <button
              onClick={handleGenerate}
              disabled={loading || !campaign.trim()}
              className={`
                w-full relative overflow-hidden group bg-white text-black font-medium py-3.5 rounded-xl transition-all duration-200
                hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]
                disabled:opacity-50 disabled:cursor-not-allowed
                ${loading ? 'scale-[0.99] opacity-90' : 'hover:scale-[1.01]'}
              `}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? 'Генерация...' : 'Generate Magic Link'}
                {!loading && <Sparkles size={16} className="text-indigo-600" />}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW CARD */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="relative w-full aspect-[1.58/1] perspective-1000 group">
            {/* Card Glow Background */}
            <div 
              className={`absolute -inset-4 rounded-[2rem] bg-gradient-to-br ${currentSource.gradient} opacity-20 blur-2xl transition-all duration-500 group-hover:opacity-30`}
            />

            {/* The Card */}
            <div className="relative h-full w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#111114]">
              {/* Mesh Gradient Background */}
              <div className="absolute inset-0 bg-slate-900">
                <div className={`absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br ${currentSource.gradient} opacity-20 blur-[100px] rounded-full mix-blend-screen transform translate-x-1/3 -translate-y-1/3 transition-all duration-700`} />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 blur-[80px] rounded-full mix-blend-screen transform -translate-x-1/3 translate-y-1/3" />
              </div>
              
              {/* Card Content Grid */}
              <div className="relative h-full z-10 grid grid-cols-12 p-8">
                
                {/* Left Side: QR & Branding */}
                <div className="col-span-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${currentSource.bg} border border-white/5 flex items-center justify-center`}>
                      <Icon size={16} className={currentSource.color} />
                    </div>
                    <span className="text-sm font-medium text-slate-300">{currentSource.name}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="w-32 h-32 bg-white rounded-xl p-2 shadow-xl shadow-black/20">
                      {generatedLink ? (
                        <QRCode
                          value={generatedLink.full_url}
                          size={112}
                          fgColor="#000000"
                          bgColor="#ffffff"
                          level="H"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center">
                          <Sparkles className="text-slate-300" size={32} />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold pl-1">
                      Scan to Visit
                    </p>
                  </div>
                </div>

                {/* Right Side: Link Info */}
                <div className="col-span-7 flex flex-col justify-between items-end text-right pl-4">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Campaign</div>
                    <div className="text-2xl font-semibold text-white tracking-tight break-all line-clamp-2">
                      {campaign || <span className="text-slate-700">Untitled Campaign</span>}
                    </div>
                  </div>

                  <div className="w-full space-y-4">
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Short Link</div>
                      <div className="flex items-center justify-end gap-3 group/link">
                        <span className={`font-mono text-lg transition-colors ${campaign ? 'text-indigo-300' : 'text-slate-700'}`}>
                          {generatedLink?.full_url || previewLink}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                      <button 
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium text-slate-300 hover:text-white transition-all active:scale-95"
                      >
                        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button 
                        onClick={() => toast.info("Сохранение QR...")}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium text-slate-300 hover:text-white transition-all active:scale-95"
                      >
                        <Download size={14} />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Status Indicators */}
          <div className="mt-8 flex justify-center gap-6 opacity-40">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              Live Preview
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
              Secure SSL
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
              Analytics Ready
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
