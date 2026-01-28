import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search, FileText, CheckCircle2, ChevronRight, Folder, ChevronDown, AlertTriangle, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface MissionSidebarProps {
    onSelectTest: (id: string) => void;
    onSelectQuestion: (id: string) => void;
    selectedTestId: string | null;
    selectedQuestionId: string | null;
    selectedCountry: 'spain' | 'russia';
    serverOnline: boolean;
    questions?: any[];
    generatingQuestionId?: string | null;
    isSearchOpen: boolean;
    onSearchOpenChange: (open: boolean) => void;
}

export function MissionSidebar({
    onSelectTest,
    onSelectQuestion,
    selectedTestId,
    selectedQuestionId,
    selectedCountry,
    serverOnline,
    questions = [],
    generatingQuestionId,
    isSearchOpen,
    onSearchOpenChange
}: MissionSidebarProps) {
    const [structure, setStructure] = useState<any>({});
    const [loading, setLoading] = useState(false);

    // АРХИТЕКТУРА: Restore expanded state from localStorage
    const [expandedCategories, setExpandedCategories] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('mission-control-expanded-categories');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!searchQuery || searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            try {
                const res = await fetch(`http://localhost:3030/api/search?q=${encodeURIComponent(searchQuery)}&country=${selectedCountry}`);
                if (res.ok) {
                    setSearchResults(await res.json());
                }
            } catch (e) { console.error(e); }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedCountry]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                onSearchOpenChange(!isSearchOpen);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isSearchOpen, onSearchOpenChange]);

    useEffect(() => {
        if (serverOnline) loadData();
    }, [serverOnline, selectedCountry]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Parallel load: File Tree + Real DB Status
            const [treeRes, dbStatus] = await Promise.all([
                fetch(`http://localhost:3030/api/files/tree?country=${selectedCountry}`),
                fetchDeployedStatusFromDB(selectedCountry)
            ]);

            if (treeRes.ok) {
                const data = await treeRes.json();
                setStructure(data);

                // Merge DB status into tree data
                if (dbStatus && dbStatus.size > 0) {
                    Object.keys(data).forEach(cat => {
                        data[cat] = data[cat].map((test: any) => ({
                            ...test,
                            // Trust DB status if server says false, or fallback to server
                            deployed: dbStatus.has(test.id) || test.deployed
                        }));
                    });
                    setStructure({ ...data }); // Force update
                }

                // АРХИТЕКТУРА: Only auto-expand if no saved state exists
                const keys = Object.keys(data);
                if (keys.length > 0 && expandedCategories.length === 0) {
                    const firstKey = keys[0];
                    setExpandedCategories([firstKey]);
                    localStorage.setItem('mission-control-expanded-categories', JSON.stringify([firstKey]));
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // NEW: Direct DB check because local server might be out of sync
    const fetchDeployedStatusFromDB = async (country: string): Promise<Set<string>> => {
        try {
            const { supabase } = await import("@/integrations/supabase/client");
            const ids = new Set<string>();

            if (country === 'russia') {
                const { data } = await supabase
                    .from('pdd_russia_questions')
                    .select('ticket_number'); // Removed distinct, not needed for set
                if (data) {
                    data.forEach((r: any) => {
                        if (r.ticket_number) ids.add(`ticket-${String(r.ticket_number).padStart(2, '0')}`);
                    });
                }
            } else {
                const { data } = await supabase
                    .from('tests')
                    .select('test_number, topics(number)');
                if (data) {
                    data.forEach((r: any) => {
                        const topicNum = r.topics?.number;
                        if (typeof topicNum === 'number' && r.test_number) {
                            ids.add(`topic-${String(topicNum).padStart(2, '0')}_test-${String(r.test_number).padStart(3, '0')}`);
                        }
                    });
                }
            }
            return ids;
        } catch (e) {
            console.warn("Failed to fetch deployed status directly", e);
            return new Set();
        }
    };

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => {
            const updated = prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat];
            // АРХИТЕКТУРА: Persist to localStorage
            localStorage.setItem('mission-control-expanded-categories', JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] border-r border-white/5">

            {/* Active Test & Questions List */}
            <div className="flex-1 flex flex-col min-h-0">
                {selectedTestId ? (
                    <>
                        {/* Selected Test Header */}
                        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/40 backdrop-blur-sm sticky top-0 z-10">
                            <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-4 h-4 text-indigo-400" />
                                <h3 className="font-semibold text-sm text-zinc-100 truncate">
                                    {Object.values(structure).flat().find((t: any) => t.id === selectedTestId)?.name || selectedTestId}
                                </h3>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                                <span>{questions.length} items</span>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="h-4 pl-1 pr-1.5 text-[9px] border-emerald-500/20 text-emerald-500 bg-emerald-500/5 gap-1">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                        {questions.filter(q => q.is_published).length}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Questions List */}
                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-0.5">
                                {questions.map((q, idx) => {
                                    const extId = q.external_id || q.id;
                                    const fullId = extId.startsWith(selectedTestId) ? extId : `${selectedTestId}_${extId}`;
                                    const isSelected = selectedQuestionId === fullId;
                                    const isPending = !q.is_published;
                                    const hasImageCandidate = !q.is_published && q.is_generated;

                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => onSelectQuestion(fullId)}
                                            className={cn(
                                                "flex items-start w-full p-2 rounded-lg transition-all text-left border border-transparent group relative overflow-hidden",
                                                isSelected
                                                    ? "bg-indigo-500/10 border-indigo-500/20 text-white"
                                                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                                            )}
                                        >
                                            <span className={cn(
                                                "font-mono text-[10px] mr-3 mt-0.5 w-6 flex-shrink-0 transition-opacity",
                                                isSelected ? "text-indigo-400 opacity-100" : "opacity-30 group-hover:opacity-50"
                                            )}>
                                                {(idx + 1).toString().padStart(2, '0')}
                                            </span>

                                            <div className="flex-1 min-w-0 z-10 py-0.5">
                                                <div className="text-xs font-medium leading-relaxed break-words whitespace-pre-wrap opacity-90">
                                                    {q.question_ru || "Нет текста..."}
                                                </div>
                                            </div>

                                            {(q.is_published || q.is_generated) ? (
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full ml-auto flex-shrink-0 mr-2",
                                                    q.is_published ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                                )} />
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-zinc-800 ml-auto mr-2 flex-shrink-0" />
                                            )}

                                            {generatingQuestionId === fullId && (
                                                <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin absolute right-2" />
                                            )}

                                            {isSelected && (
                                                <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </>
                ) : (
                    /* Folder Structure / Test Explorer */
                    <ScrollArea className="flex-1">
                        <div className="p-2">
                            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-2 mb-2 mt-2">
                                Explorer
                            </div>
                            {Object.keys(structure).sort().map(category => (
                                <div key={category} className="mb-1">
                                    <button
                                        onClick={() => toggleCategory(category)}
                                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-md transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Folder className="w-3.5 h-3.5 text-zinc-600" />
                                            {category}
                                        </div>
                                        <ChevronDown className={cn("w-3 h-3 transition-transform", !expandedCategories.includes(category) && "-rotate-90")} />
                                    </button>

                                    {expandedCategories.includes(category) && (
                                        <div className="mt-1 ml-2 pl-2 border-l border-zinc-800/50 space-y-0.5">
                                            {structure[category].map((test: any) => (
                                                <button
                                                    key={test.id}
                                                    onClick={() => onSelectTest(test.id)}
                                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-md transition-all text-left group"
                                                >
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        {test.deployed ? (
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                        ) : !test.isEnriched ? (
                                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600/70 shrink-0 group-hover:text-amber-500" />
                                                        ) : test.generated ? (
                                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                        ) : (
                                                            <FileText className="w-3.5 h-3.5 opacity-50 shrink-0 group-hover:opacity-100 group-hover:text-blue-400" />
                                                        )}

                                                        <span className={cn(
                                                            "truncate",
                                                            !test.isEnriched && "text-amber-600/70 group-hover:text-amber-500",
                                                            test.deployed && "text-emerald-500/90"
                                                        )}>
                                                            {test.name}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </div>

            {/* COMMAND PALETTE (Global Search) */}
            <CommandDialog open={isSearchOpen} onOpenChange={onSearchOpenChange} shouldFilter={false}>
                <CommandInput
                    placeholder="Search API (Try Spanish for max results)..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>

                    {searchResults.length > 0 && (
                        <CommandGroup heading={`Found ${searchResults.length} matches`}>
                            {searchResults.map((res: any) => (
                                <CommandItem
                                    key={`${res.testId}-${res.id}`}
                                    onSelect={() => {
                                        onSelectTest(res.testId);
                                        // Wait a tick for state to propagate if needed
                                        setTimeout(() => onSelectQuestion(`${res.testId}_${res.id}`), 100);
                                        onSearchOpenChange(false);
                                    }}
                                    className="group cursor-pointer flex items-start gap-3 p-2 rounded-xl border border-transparent transition-all mb-1 data-[selected=true]:bg-zinc-800 data-[selected=true]:border-zinc-700/50 hover:bg-zinc-900/50"
                                    value={`${res.testId}-${res.id}`}
                                >
                                    {/* Image Thumbnail */}
                                    <div className="flex-shrink-0 w-20 h-14 bg-zinc-950 rounded-lg overflow-hidden border border-white/5 relative group-data-[selected=true]:border-white/20 transition-colors">
                                        <img
                                            src={`http://localhost:3030${res.imageUrl}`}
                                            alt="Preview"
                                            className="w-full h-full object-cover opacity-60 group-aria-selected:opacity-100 transition-opacity duration-500"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                                        />
                                        <div className="hidden absolute inset-0 flex items-center justify-center bg-zinc-900">
                                            <ImageIcon className="w-5 h-5 text-zinc-700" />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 flex flex-col gap-1.5 py-0.5">
                                        <div className="flex items-center gap-2 justify-between w-full">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[9px] px-1.5 h-5 bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)] font-mono tracking-wide">
                                                    {res.testId.replace('topic-', 'T-').replace('_test-', ' / ')}
                                                </Badge>
                                                <span className="text-[9px] text-zinc-600 font-mono">#{res.id.substring(0, 6)}</span>
                                            </div>

                                            {res.locationCount > 1 && (
                                                <Badge variant="secondary" className="text-[9px] px-1.5 h-4 bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                    +{res.locationCount - 1} copies
                                                </Badge>
                                            )}
                                        </div>

                                        <p className="text-[13px] font-medium text-zinc-300 line-clamp-2 leading-snug group-aria-selected:text-white transition-colors">
                                            {res.question_ru || "..."}
                                        </p>

                                        {res.question_es && (
                                            <p className="text-[11px] text-zinc-500 line-clamp-1 italic">
                                                {res.question_es}
                                            </p>
                                        )}
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-zinc-700 group-aria-selected:text-zinc-500 self-center transition-colors" />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                </CommandList>
            </CommandDialog>
        </div>
    );
}
