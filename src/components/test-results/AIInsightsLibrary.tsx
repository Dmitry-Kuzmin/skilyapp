import React, { useState, useMemo } from 'react';
import { useAnalysisHistoryStore, AnalysisRecord } from '@/stores/useAnalysisHistoryStore';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import {
    BookOpen,
    Search,
    X,
    ChevronRight,
    Folder,
    Sparkles,
    BrainCircuit,
    Lightbulb,
    ArrowRight,
    GraduationCap,
    Clock,
    Crown,
    Zap,
    LayoutGrid,
    Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TopicGroup {
    topic: string;
    records: AnalysisRecord[];
}

// 🎨 PREMIUM AESTHETICS CONSTANTS
const THEME_GRADIENTS = [
    { bg: "from-blue-600/20 to-indigo-600/20", border: "group-hover:border-indigo-500/50", text: "text-indigo-400", glow: "group-hover:shadow-indigo-500/20" },
    { bg: "from-emerald-600/20 to-teal-600/20", border: "group-hover:border-emerald-500/50", text: "text-emerald-400", glow: "group-hover:shadow-emerald-500/20" },
    { bg: "from-amber-600/20 to-orange-600/20", border: "group-hover:border-amber-500/50", text: "text-amber-400", glow: "group-hover:shadow-amber-500/20" },
    { bg: "from-rose-600/20 to-pink-600/20", border: "group-hover:border-rose-500/50", text: "text-rose-400", glow: "group-hover:shadow-rose-500/20" },
    { bg: "from-violet-600/20 to-fuchsia-600/20", border: "group-hover:border-violet-500/50", text: "text-violet-400", glow: "group-hover:shadow-violet-500/20" },
];

const ClockIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

export const AIInsightsLibrary = ({ isPremium }: { isPremium: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<TopicGroup | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const analyses = useAnalysisHistoryStore((state) => state.analyses);

    // 🧠 Grouping Logic
    const topics = useMemo(() => {
        const groups: Record<string, AnalysisRecord[]> = {};
        const records = Object.values(analyses);

        records.forEach(record => {
            const tags = record.diagnosis.tags && record.diagnosis.tags.length > 0
                ? record.diagnosis.tags
                : ["Общее"];

            tags.forEach(tag => {
                if (!groups[tag]) groups[tag] = [];
                if (!groups[tag].find(r => r.id === record.id)) {
                    groups[tag].push(record);
                }
            });
        });

        return Object.entries(groups)
            .map(([topic, records]) => ({ topic, records }))
            .sort((a, b) => b.records.length - a.records.length);
    }, [analyses]);

    // Filter topics
    const filteredTopics = useMemo(() => {
        if (!searchQuery) return topics;
        return topics.filter(t => t.topic.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [topics, searchQuery]);

    const totalInsights = Object.values(analyses).length;

    return (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerTrigger asChild>
                <button
                    className="group relative flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#0F1115] border border-white/5 hover:border-indigo-500/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-black/20 overflow-hidden w-full sm:w-auto justify-between sm:justify-start"
                >
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute -right-4 -top-8 w-24 h-24 bg-indigo-500/20 blur-3xl rounded-full group-hover:bg-indigo-400/30 transition-all duration-500" />

                    <div className="relative flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                            <div className="relative h-9 w-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                                <BookOpen className="w-4 h-4 text-white" />
                            </div>
                        </div>

                        <div className="text-left">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                                    {isPremium ? 'AI Library' : 'Free Preview'}
                                </span>
                                {totalInsights > 0 && <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-[9px] font-bold text-indigo-300">{totalInsights}</span>}
                            </div>
                            <div className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors">Мои Инсайты</div>
                        </div>
                    </div>

                    <div className="relative sm:hidden">
                        <ChevronRight className="w-5 h-5 text-white/20" />
                    </div>
                </button>
            </DrawerTrigger>

            <DrawerContent className="h-[95vh] bg-[#050505] border-t border-white/10 outline-none">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />

                <div className="h-full flex flex-col max-w-4xl mx-auto w-full relative z-10">
                    {/* Header Section */}
                    <div className="shrink-0 px-6 pt-8 pb-6">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-fuchsia-600 p-[1px] shadow-2xl shadow-indigo-500/20">
                                    <div className="h-full w-full rounded-2xl bg-black/40 backdrop-blur-xl flex items-center justify-center">
                                        <Sparkles className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                        AI Insights
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/60 border border-white/5 uppercase tracking-wider">
                                            Beta
                                        </span>
                                    </h2>
                                    <p className="text-sm text-slate-400 font-medium">Персональный учебник твоих ошибок</p>
                                </div>
                            </div>

                            <DrawerClose asChild>
                                <button className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white/50 hover:text-white transition-all hover:rotate-90">
                                    <X className="w-6 h-6" />
                                </button>
                            </DrawerClose>
                        </div>

                        {/* Search Bar with Glassmorphism */}
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-xl opacity-20 group-hover:opacity-40 blur transition duration-500" />
                            <div className="relative bg-black/50 backdrop-blur-md rounded-xl border border-white/10 flex items-center px-4 py-3">
                                <Search className="w-5 h-5 text-indigo-400 mr-3" />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Поиск по темам, правилам и ошибкам..."
                                    className="bg-transparent border-none outline-none text-white placeholder:text-slate-500 text-sm w-full font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Premium Upsell Banner - High Impact */}
                    {!isPremium && (
                        <div className="px-6 mb-4">
                            <div className="relative overflow-hidden rounded-2xl p-[1px] group cursor-pointer">
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 animate-shimmer" />
                                <div className="relative bg-black/90 rounded-2xl px-5 py-4 flex items-center justify-between overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent" />

                                    <div className="relative z-10 flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                                            <Crown className="w-5 h-5 text-white fill-white/20" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-base">Unlock Full Potential</h3>
                                            <p className="text-xs text-amber-200/80">Безлимитный доступ ко всем инсайтам и разборам</p>
                                        </div>
                                    </div>

                                    <button className="relative z-10 px-4 py-2 rounded-lg bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-amber-50 transition-colors">
                                        Upgrade
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content Area */}
                    <ScrollArea className="flex-1 px-6 pb-8">
                        {selectedTopic ? (
                            /* TOPIC VIEW (Detailed) */
                            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300 fade-in">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedTopic(null)}
                                        className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5 rotate-180" />
                                    </button>
                                    <h3 className="text-2xl font-bold text-white capitalize">{selectedTopic.topic}</h3>
                                    <span className="ml-auto text-xs font-mono text-slate-500">
                                        ID: {selectedTopic.records[0].diagnosis.tags?.[0] || 'GEN'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {selectedTopic.records.map((record, idx) => (
                                        <div
                                            key={record.id}
                                            className="group relative bg-[#0A0A0B] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10"
                                            style={{ animationDelay: `${idx * 100}ms` }}
                                        >
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={cn(
                                                            "w-2 h-2 rounded-full",
                                                            record.diagnosis.severity === 'high' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" :
                                                                record.diagnosis.severity === 'medium' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" :
                                                                    "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                                                        )} />
                                                        <h4 className="font-bold text-white text-base leading-tight">
                                                            {record.diagnosis.diagnosisTitle}
                                                        </h4>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-1 rounded">
                                                    {new Date(record.timestamp).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <div className="bg-white/5 rounded-xl p-4 mb-4 border-l-2 border-indigo-500/50">
                                                <p className="text-sm text-slate-300 leading-relaxed">
                                                    {record.diagnosis.diagnosis}
                                                </p>
                                            </div>

                                            {record.diagnosis.mnemonic && (
                                                <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-900/20 to-transparent p-3 rounded-lg border border-indigo-500/20">
                                                    <Lightbulb className="w-5 h-5 text-yellow-400 shrink-0" />
                                                    <p className="text-xs font-medium text-indigo-200 italic">
                                                        "{record.diagnosis.mnemonic}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* GRID VIEW (Folders) */
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-300">
                                {filteredTopics.length > 0 ? (
                                    filteredTopics.map((item, index) => {
                                        const theme = THEME_GRADIENTS[index % THEME_GRADIENTS.length];

                                        return (
                                            <div
                                                key={item.topic}
                                                onClick={() => setSelectedTopic(item)}
                                                className={cn(
                                                    "group relative aspect-[1.1/1] cursor-pointer rounded-3xl border border-white/5 bg-[#0F1115] overflow-hidden transition-all duration-300",
                                                    theme.border,
                                                    theme.glow,
                                                    "hover:translate-y-[-4px]"
                                                )}
                                            >
                                                {/* Ambient Background */}
                                                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", theme.bg)} />

                                                {/* Big Background Icon */}
                                                <Folder className={cn(
                                                    "absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.03] group-hover:opacity-10 transition-all duration-500 rotate-[-10deg] group-hover:rotate-0",
                                                    theme.text
                                                )} />

                                                <div className="absolute inset-0 p-5 flex flex-col justify-between">
                                                    {/* Top Row: Icon + Badge */}
                                                    <div className="flex justify-between items-start">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-300",
                                                            theme.text
                                                        )}>
                                                            <Folder className="w-5 h-5" />
                                                        </div>
                                                        <div className="text-[10px] font-bold text-white/20 font-mono">
                                                            #{String(index + 1).padStart(2, '0')}
                                                        </div>
                                                    </div>

                                                    {/* Bottom Row: Text Info */}
                                                    <div>
                                                        <h3 className="font-bold text-white text-lg leading-tight mb-1 line-clamp-2">
                                                            {item.topic}
                                                        </h3>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                                                                <div className={cn("h-full w-1/2 rounded-full bg-current opacity-50", theme.text)} />
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                {item.records.length} шт
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-full py-20 flex flex-col items-center text-center">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20" />
                                            <BrainCircuit className="w-16 h-16 text-slate-700 relative z-10" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mt-6">Библиотека пуста</h3>
                                        <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
                                            Проходи тесты и используй "Smart Analysis", чтобы наполнить свой учебник знаниями.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DrawerContent>
        </Drawer>
    );
};
