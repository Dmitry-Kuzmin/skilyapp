/* eslint-disable @typescript-eslint/ban-ts-comment */
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
  Music,
  Music2,
  Send,
  MessageCircle,
  Shield, 
  BarChart3, 
  Check, 
  Link as LinkIcon,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Facebook,
  Globe,
  Clock,
  Search,
  MoreHorizontal,
  MousePointer2,
  TrendingUp,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
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

// Social sources with lucide icons
const SOURCES = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-500', gradient: 'from-purple-500 to-pink-500', bg: 'bg-pink-500/20' },
  { id: 'tiktok', name: 'TikTok', icon: Music, color: 'text-cyan-400', gradient: 'from-cyan-400 to-black', bg: 'bg-cyan-500/20' },
  { id: 'twitter', name: 'Twitter', icon: Twitter, color: 'text-sky-400', gradient: 'from-sky-400 to-blue-500', bg: 'bg-sky-500/20' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-500', gradient: 'from-red-500 to-orange-500', bg: 'bg-red-500/20' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-600', gradient: 'from-blue-600 to-cyan-600', bg: 'bg-blue-500/20' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-500', gradient: 'from-blue-600 to-indigo-600', bg: 'bg-blue-500/20' },
  { id: 'other', name: 'Other', icon: Globe, color: 'text-emerald-400', gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-500/20' },
];

// Helper to get channel icon
const getChannelIcon = (channel: string) => {
  switch (channel.toLowerCase()) {
    case 'instagram': return Instagram;
    case 'telegram': return Send;
    case 'tiktok': return Music2;
    case 'youtube': return Youtube;
    case 'whatsapp': return MessageCircle;
    case 'facebook': return Facebook;
    default: return LinkIcon;
  }
};

export function PartnerLinkGenerator({ partnerId }: Props) {
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState<string>("home");
  const [campaign, setCampaign] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState(SOURCES[0]);
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);
  const [previewLink, setPreviewLink] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [linkHistory, setLinkHistory] = useState<LinkHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active'>('All');

  // Live preview - обновляется автоматически
  useEffect(() => {
    if (!campaign.trim()) {
      setPreviewLink("skilyapp.com/waiting...");
      return;
    }
    const cleanCampaign = campaign.trim().replace(/\s+/g, '-').toLowerCase();
    setPreviewLink(`skilyapp.com/${selectedSource.id}/${cleanCampaign}`);
  }, [campaign, selectedSource]);

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
        loadLinkHistory();
      }
    } catch (error: any) {
      console.error('[PartnerLinkGenerator] Error:', error);
      toast.error("Ошибка генерации ссылки");
    } finally {
      setLoading(false);
    }
  };

  // Load history on mount
  useEffect(() => {
    loadLinkHistory();
  }, [partnerId]);

  // Calculate stats
  const totalClicks = linkHistory.reduce((acc, link) => acc + link.clicks_count, 0);
  const totalRegs = linkHistory.reduce((acc, link) => acc + link.registrations_count, 0);
  const avgConv = totalClicks > 0 ? ((totalRegs / totalClicks) * 100).toFixed(1) : '0.0';

  // Filter links
  const filteredLinks = linkHistory.filter(link => {
    const matchesSearch = link.utm_campaign.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' && link.clicks_count >= 0);
    return matchesSearch && matchesStatus;
  });

  const handleCopy = async () => {
    const linkToCopy = generatedLink?.full_url || previewLink;
    await navigator.clipboard.writeText(linkToCopy);
    setCopied(true);
    toast.success("Скопировано!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!generatedLink) {
      toast.error("Сначала создайте ссылку");
      return;
    }
    
    const svg = document.querySelector('.qr-code-canvas');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx!.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-${generatedLink.link_code}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      
      toast.success("QR-код сохранён!");
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleReset = () => {
    setGeneratedLink(null);
    setCampaign("");
    setPreviewLink("skilyapp.com/waiting...");
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
              <div className="flex flex-wrap gap-1.5">
                {SOURCES.map((source) => {
                  const isActive = selectedSource.id === source.id;
                  const SourceIcon = source.icon;
                  return (
                    <button
                      key={source.id}
                      onClick={() => handleSourceSelect(source)}
                      className={`
                        group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-200 border
                        ${isActive 
                          ? 'bg-slate-800 border-slate-600 text-white shadow-lg shadow-black/20' 
                          : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800 hover:border-slate-700'}
                      `}
                    >
                      <SourceIcon size={13} className={`transition-colors ${isActive ? source.color : 'text-slate-500 group-hover:text-slate-400'}`} />
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

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleGenerate}
                disabled={loading || !campaign.trim()}
                className={`
                  w-full relative overflow-hidden group bg-gradient-to-r from-blue-500 to-violet-500 text-white font-medium py-3.5 rounded-xl transition-all duration-200
                  hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${loading ? 'scale-[0.99] opacity-90' : 'hover:scale-[1.01]'}
                `}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? 'Генерация...' : 'Generate Magic Link'}
                  {!loading && <Sparkles size={16} />}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {generatedLink && (
                <motion.button
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleReset}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800 border border-white/5 hover:border-white/10 transition-all"
                >
                  Create New Link
                </motion.button>
              )}
            </div>
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
              
              {/* Noise Texture Overlay */}
              <div 
                className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'repeat',
                  backgroundSize: '200px 200px'
                }}
              />
              
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
                    <div className="w-32 h-32 bg-white rounded-2xl p-3 shadow-xl shadow-black/20">
                      {generatedLink ? (
                        <QRCode
                          value={generatedLink.full_url}
                          size={104}
                          fgColor="#000000"
                          bgColor="#ffffff"
                          level="H"
                          className="qr-code-canvas"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center">
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
                        <div className={`font-mono text-base transition-colors truncate ${campaign ? 'text-white' : 'text-slate-700'}`}>
                          {(() => {
                            const url = generatedLink?.full_url || previewLink;
                            const cleanUrl = url.replace(/^https?:\/\//, '');
                            const parts = cleanUrl.split('/');
                            const domain = parts.slice(0, -1).join('/');
                            const code = parts[parts.length - 1];
                            
                            return (
                              <>
                                <span className="text-white/50">{domain}/</span>
                                <span className="text-white font-bold">{code}</span>
                              </>
                            );
                          })()}
                        </div>
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
                        onClick={handleDownloadQR}
                        disabled={!generatedLink}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium text-slate-300 hover:text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Links PRO - History Table */}
        {linkHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16 col-span-full"
          >
            {/* Header with Stats */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold tracking-tight text-white">Links</h2>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">PRO</span>
                </div>
                <p className="text-zinc-400 text-sm">Управляйте, отслеживайте и оптимизируйте кампании</p>
              </div>
              
              <div className="flex items-center gap-6 border-l border-zinc-800 pl-6">
                <div className="text-right">
                  <p className="text-xs text-zinc-500 uppercase font-semibold">Clicks (All)</p>
                  <p className="text-lg font-bold text-zinc-200">{totalClicks.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 uppercase font-semibold">Regs (All)</p>
                  <p className="text-lg font-bold text-zinc-200">{totalRegs}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 uppercase font-semibold">Conv.</p>
                  <p className="text-lg font-bold text-emerald-400">{avgConv}%</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Поиск по кампаниям..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                  <button 
                    onClick={() => setStatusFilter('All')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === 'All' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setStatusFilter('Active')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === 'Active' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Active
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/50">
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Campaign</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Target</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Clicks</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Regs</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Conv.</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {filteredLinks.map((link) => {
                      // Extract source from campaign name
                      const sourceName = link.utm_campaign.split('_')[0] || 'other';
                      const ChannelIconComponent = getChannelIcon(sourceName);
                      
                      return (
                        <tr 
                          key={link.link_id}
                          className="group hover:bg-zinc-800/30 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 group-hover:border-zinc-600 transition-colors">
                                <ChannelIconComponent className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors">{link.utm_campaign}</p>
                                <p className="text-xs text-zinc-500 capitalize">{sourceName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-zinc-400">{link.destination || 'Main Page'}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm text-zinc-300 font-medium">{link.clicks_count.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm text-zinc-300 font-medium">{link.registrations_count}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                              link.conversion_rate > 10 ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400'
                            }`}>
                              {link.conversion_rate}%
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-zinc-500">
                              {new Date(link.created_at).toLocaleDateString('ru-RU', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border bg-emerald-500/5 text-emerald-400 border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(link.full_url);
                                  toast.success("Скопировано!");
                                }}
                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-md"
                                title="Copy Link"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-md">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {filteredLinks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800 mb-4">
                      <Search className="w-6 h-6 text-zinc-500" />
                    </div>
                    <h3 className="text-zinc-200 font-medium mb-1">Ссылки не найдены</h3>
                    <p className="text-zinc-500 text-sm max-w-xs">Попробуйте изменить фильтры или создайте новую ссылку</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
