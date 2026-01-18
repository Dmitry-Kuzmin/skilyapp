import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search, FileText, CheckCircle2, ChevronRight, Folder, ChevronDown, AlertTriangle } from "lucide-react";
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
    serverOnline: boolean;
    questions?: any[];
}

export function MissionSidebar({ onSelectTest, onSelectQuestion, selectedTestId, selectedQuestionId, serverOnline, questions = [] }: MissionSidebarProps) {
    const [structure, setStructure] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (serverOnline) loadData();
    }, [serverOnline]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3030/api/files/tree');
            if (res.ok) {
                const data = await res.json();
                setStructure(data);
                if (data['topic-01']) {
                    setExpandedCategories(['topic-01']);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-900">

            {/* Search Trigger */}
            <div className="p-3 border-b border-zinc-800/50 bg-zinc-900/20">
                <button
                    onClick={() => setIsSearchOpen(true)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-all group shadow-sm"
                >
                    <div className="flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 opacity-50" />
                        <span className="text-xs font-medium">Search tests...</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-800">⌘K</span>
                    </div>
                </button>
            </div>

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
                                    const isSelected = selectedQuestionId === `${selectedTestId}_${q.external_id}`;
                                    const isPending = !q.is_published;
                                    const hasImageCandidate = !q.is_published && q.is_generated;

                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => onSelectQuestion(`${selectedTestId}_${q.external_id}`)}
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

                                            {/* Status Indicator */}
                                            {q.is_published ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-2 flex-shrink-0" />
                                            ) : hasImageCandidate ? (
                                                <div className="w-2 h-2 rounded-full bg-amber-500 ml-2 flex-shrink-0 animate-pulse" />
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-zinc-800 ml-2 flex-shrink-0" />
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
                                                    {test.isEnriched === false ? (
                                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600/70 group-hover:text-amber-500" />
                                                    ) : (
                                                        <FileText className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:text-blue-400" />
                                                    )}
                                                    <span className={cn("truncate", test.isEnriched === false && "text-amber-600/70 group-hover:text-amber-500")}>{test.name}</span>
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

            {/* COMMAND PALETTE (CMDK) */}
            <CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <CommandInput placeholder="Search tests (e.g. 'Topic 1')..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>

                    {/* Iterate over Categories */}
                    {Object.keys(structure).map(category => (
                        <CommandGroup key={category} heading={category}>
                            {structure[category].map((test: any) => (
                                <CommandItem
                                    key={test.id}
                                    onSelect={() => {
                                        onSelectTest(test.id);
                                        setIsSearchOpen(false);
                                        // Auto-expand category
                                        if (!expandedCategories.includes(category)) toggleCategory(category);
                                    }}
                                    className="cursor-pointer"
                                    value={test.name + " " + test.id}
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    <span>{test.name}</span>
                                    <span className="ml-auto text-xs text-zinc-500 font-mono">{test.id}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    ))}

                </CommandList>
            </CommandDialog>
        </div>
    );
}
