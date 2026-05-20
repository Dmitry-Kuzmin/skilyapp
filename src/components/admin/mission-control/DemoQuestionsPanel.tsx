import { useState, useEffect, useCallback, useRef } from "react";
import guestQuestionsRaw from "@/data/guest-questions.json";
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Cloud, Trash2, Plus, Save, RefreshCw,
    Image as ImageIcon, Check, X, GripVertical, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    CommandDialog, CommandEmpty, CommandGroup, CommandInput,
    CommandItem, CommandList,
} from "@/components/ui/command";

// ── Types ─────────────────────────────────────────────────────────────────────

type DemoAnswer = {
    id: string;
    text_es: string | null;
    text_ru: string;
    text_en: string | null;
    is_correct: boolean;
    position: number;
};

type DemoQuestion = {
    id: string;
    question_es: string;
    question_ru: string;
    question_en: string;
    image_url: string | null;
    explanation_es: string | null;
    explanation_ru: string | null;
    explanation_en: string | null;
    topics: { title_ru: string; title_es: string } | null;
    answer_options: DemoAnswer[];
    hint_es: string | null;
    hint_ru: string | null;
    hint_en: string | null;
};

type SearchResult = {
    id: string;
    question_es: string | null;
    question_ru: string | null;
    image_url: string | null;
};

// ── Persistence ───────────────────────────────────────────────────────────────

const DB_KEY = 'demo_questions';

async function loadFromDB(): Promise<DemoQuestion[] | null> {
    const supabase = await getSupabaseClient();
    const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', DB_KEY)
        .single();
    if (!data?.value) return null;
    try { return data.value as DemoQuestion[]; } catch { return null; }
}

async function saveToDB(qs: DemoQuestion[]): Promise<void> {
    const supabase = await getSupabaseClient();
    await supabase.from('app_config').upsert({
        key: DB_KEY,
        value: qs as any,
        description: 'Demo/guest questions shown to non-authenticated users',
        updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
}

// ── Normalize raw JSON → DemoQuestion ─────────────────────────────────────────

function normalizeRaw(q: any): DemoQuestion {
    return {
        id: q.id,
        question_es: q.question_es ?? '',
        question_ru: q.question_ru ?? '',
        question_en: q.question_en ?? '',
        image_url: q.image_url ?? null,
        explanation_es: q.explanation_es ?? null,
        explanation_ru: q.explanation_ru ?? null,
        explanation_en: q.explanation_en ?? null,
        topics: q.topics ?? null,
        answer_options: (q.answer_options ?? []).map((a: any) => ({
            id: a.id,
            text_es: a.text_es ?? null,
            text_ru: a.text_ru ?? '',
            text_en: a.text_en ?? null,
            is_correct: a.is_correct ?? false,
            position: a.position ?? 0,
        })),
        hint_es: q.hint_es ?? null,
        hint_ru: q.hint_ru ?? null,
        hint_en: q.hint_en ?? null,
    };
}

// ── Fetch full question from Supabase ─────────────────────────────────────────

async function fetchQuestion(id: string): Promise<DemoQuestion | null> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
        .from('questions_new')
        .select(`
            id, question_es, question_ru, question_en, image_url,
            explanation_es, explanation_ru, explanation_en,
            topics ( title_ru, title_es ),
            answer_options ( id, text_ru, text_es, text_en, is_correct, position )
        `)
        .eq('id', id)
        .single();

    if (error || !data) return null;
    const d = data as any;
    return {
        id: d.id,
        question_es: d.question_es ?? '',
        question_ru: d.question_ru ?? '',
        question_en: d.question_en ?? '',
        image_url: d.image_url ?? null,
        explanation_es: d.explanation_es ?? null,
        explanation_ru: d.explanation_ru ?? null,
        explanation_en: d.explanation_en ?? null,
        topics: d.topics ? { title_ru: d.topics.title_ru, title_es: d.topics.title_es } : null,
        answer_options: ((d.answer_options as any[]) ?? [])
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map(a => ({
                id: a.id, text_es: a.text_es ?? null, text_ru: a.text_ru ?? '',
                text_en: a.text_en ?? null, is_correct: a.is_correct ?? false, position: a.position ?? 0,
            })),
        hint_es: null,
        hint_ru: null,
        hint_en: null,
    };
}

// ── Main component ────────────────────────────────────────────────────────────

export function DemoQuestionsPanel() {
    const [questions, setQuestions] = useState<DemoQuestion[]>((guestQuestionsRaw as any[]).map(normalizeRaw));
    const [dbLoading, setDbLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [addingId, setAddingId] = useState<string | null>(null);
    const [hintDraft, setHintDraft] = useState({ es: '', ru: '', en: '' });
    const [hintSaved, setHintSaved] = useState(false);
    const dragIdx = useRef<number | null>(null);

    // Load from DB on mount
    useEffect(() => {
        loadFromDB().then(dbData => {
            const initial = dbData ?? (guestQuestionsRaw as any[]).map(normalizeRaw);
            setQuestions(initial);
            setSelectedId(initial[0]?.id ?? null);
            setDbLoading(false);
        });
    }, []);

    const selectedQ = questions.find(q => q.id === selectedId) ?? null;

    // Sync hint draft when selected question changes
    useEffect(() => {
        if (!selectedQ) return;
        setHintDraft({
            es: selectedQ.hint_es ?? '',
            ru: selectedQ.hint_ru ?? '',
            en: selectedQ.hint_en ?? '',
        });
        setHintSaved(false);
    }, [selectedId]);

    // Supabase search
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const supabase = await getSupabaseClient();
                const { data } = await supabase
                    .from('questions_new')
                    .select('id, question_es, question_ru, image_url')
                    .eq('country', 'es')
                    .or(`question_es.ilike.%${searchQuery}%,question_ru.ilike.%${searchQuery}%`)
                    .limit(12);
                setSearchResults((data ?? []) as SearchResult[]);
            } catch (e) { console.error(e); }
            finally { setSearchLoading(false); }
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const saveHints = useCallback(async () => {
        setSaving(true);
        const updated = questions.map(q =>
            q.id === selectedId
                ? { ...q, hint_es: hintDraft.es || null, hint_ru: hintDraft.ru || null, hint_en: hintDraft.en || null }
                : q
        );
        setQuestions(updated);
        await saveToDB(updated);
        setSaving(false);
        setHintSaved(true);
        setTimeout(() => setHintSaved(false), 1500);
        toast.success('Сохранено в облако — гости увидят сразу');
    }, [selectedId, hintDraft, questions]);

    const removeQuestion = useCallback((id: string) => {
        setQuestions(prev => {
            const updated = prev.filter(q => q.id !== id);
            saveToDB(updated);
            if (selectedId === id) setSelectedId(updated[0]?.id ?? null);
            return updated;
        });
        toast.success('Вопрос удалён из демо');
    }, [selectedId]);

    const addQuestion = useCallback(async (id: string) => {
        if (questions.some(q => q.id === id)) {
            toast.warning('Этот вопрос уже в демо');
            setSearchOpen(false);
            return;
        }
        if (questions.length >= 30) {
            toast.error('Максимум 30 вопросов в демо');
            return;
        }
        setAddingId(id);
        const q = await fetchQuestion(id);
        setAddingId(null);
        if (!q) { toast.error('Не удалось загрузить вопрос'); return; }
        setQuestions(prev => {
            const updated = [...prev, q];
            saveToDB(updated);
            return updated;
        });
        setSelectedId(id);
        setSearchOpen(false);
        setSearchQuery('');
        toast.success('Вопрос добавлен в демо');
    }, [questions]);

    const resetToOriginal = useCallback(async () => {
        const original = (guestQuestionsRaw as any[]).map(normalizeRaw);
        setQuestions(original);
        setSelectedId(original[0]?.id ?? null);
        setSaving(true);
        await saveToDB(original);
        setSaving(false);
        toast.success('Восстановлен оригинальный список и опубликован');
    }, []);

    // Drag-and-drop reorder
    const handleDragStart = (idx: number) => { dragIdx.current = idx; };
    const handleDrop = (idx: number) => {
        if (dragIdx.current === null || dragIdx.current === idx) return;
        setQuestions(prev => {
            const updated = [...prev];
            const [moved] = updated.splice(dragIdx.current!, 1);
            updated.splice(idx, 0, moved);
            saveToDB(updated);
            return updated;
        });
        dragIdx.current = null;
    };

    return (
        <div className="flex h-full overflow-hidden">
            {/* ── LEFT: Question List ──────────────────────────────────────── */}
            <div className="w-72 border-r border-white/5 flex flex-col bg-[#050505]">
                {/* Header */}
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/40">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Demo Questions</span>
                        <Badge variant="outline" className="text-[10px] h-5 border-indigo-500/30 text-indigo-400 bg-indigo-500/5">
                            {questions.length}/30
                        </Badge>
                    </div>
                    <div className="flex gap-1.5">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 h-7 text-[11px] gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20"
                            onClick={() => setSearchOpen(true)}
                        >
                            <Plus className="w-3 h-3" />
                            Добавить
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-zinc-600 hover:text-zinc-300"
                            onClick={resetToOriginal}
                            title="Сбросить к оригиналу"
                        >
                            <RefreshCw className="w-3 h-3" />
                        </Button>
                    </div>
                </div>

                {/* List */}
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-0.5">
                        {questions.map((q, idx) => (
                            <div
                                key={q.id}
                                draggable
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDrop(idx)}
                                onClick={() => setSelectedId(q.id)}
                                className={cn(
                                    "flex items-start w-full p-2 rounded-lg transition-all text-left border border-transparent group relative cursor-pointer",
                                    selectedId === q.id
                                        ? "bg-indigo-500/10 border-indigo-500/20 text-white"
                                        : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                                )}
                            >
                                <GripVertical className="w-3 h-3 mr-1.5 mt-0.5 flex-shrink-0 opacity-20 group-hover:opacity-50 cursor-grab" />
                                <span className={cn(
                                    "font-mono text-[10px] mr-2 mt-0.5 w-5 flex-shrink-0",
                                    selectedId === q.id ? "text-indigo-400" : "opacity-30 group-hover:opacity-50"
                                )}>
                                    {(idx + 1).toString().padStart(2, '0')}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[11px] font-medium leading-relaxed line-clamp-2 opacity-90">
                                        {q.question_ru || q.question_es || '...'}
                                    </div>
                                    <div className="flex gap-1 mt-1">
                                        {q.hint_es && <span className="text-[9px] text-emerald-500/70 font-mono">ES</span>}
                                        {q.hint_ru && <span className="text-[9px] text-emerald-500/70 font-mono">RU</span>}
                                        {q.hint_en && <span className="text-[9px] text-emerald-500/70 font-mono">EN</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeQuestion(q.id); }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-0.5 rounded text-zinc-600 hover:text-rose-400"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                {/* Publish */}
                <div className="p-3 border-t border-zinc-800">
                    <Button
                        className="w-full h-8 text-xs gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 disabled:opacity-50"
                        variant="ghost"
                        disabled={saving || dbLoading}
                        onClick={async () => {
                            setSaving(true);
                            await saveToDB(questions);
                            setSaving(false);
                            toast.success('Опубликовано — гости увидят новые вопросы сразу');
                        }}
                    >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                        {saving ? 'Сохраняю...' : 'Опубликовать изменения'}
                    </Button>
                </div>
            </div>

            {/* ── RIGHT: Editor ────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col bg-[#09090b] overflow-hidden">
                {selectedQ ? (
                    <>
                        {/* Question header */}
                        <div className="px-6 py-4 border-b border-white/5">
                            <div className="flex items-start gap-4">
                                {/* Image */}
                                <div className="w-32 h-24 rounded-xl overflow-hidden border border-white/10 flex-shrink-0 bg-zinc-900">
                                    {selectedQ.image_url ? (
                                        <img
                                            src={selectedQ.image_url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-6 h-6 text-zinc-700" />
                                        </div>
                                    )}
                                </div>

                                {/* Texts */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-mono text-zinc-600 mb-1">
                                        {selectedQ.topics?.title_ru ?? selectedQ.topics?.title_es ?? '—'}
                                    </div>
                                    <p className="text-sm text-zinc-200 font-medium leading-relaxed mb-1">
                                        {selectedQ.question_ru}
                                    </p>
                                    <p className="text-xs text-zinc-500 italic leading-relaxed">
                                        {selectedQ.question_es}
                                    </p>
                                    <div className="mt-2 space-y-0.5">
                                        {selectedQ.answer_options
                                            .sort((a, b) => a.position - b.position)
                                            .map(a => (
                                                <div key={a.id} className={cn(
                                                    "text-[11px] flex items-center gap-1.5",
                                                    a.is_correct ? "text-emerald-400" : "text-zinc-600"
                                                )}>
                                                    <span>{a.is_correct ? '✓' : '·'}</span>
                                                    <span>{a.text_ru}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hints editor */}
                        <ScrollArea className="flex-1">
                            <div className="px-6 py-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Подсказки (Hints)</h3>
                                    <span className="text-[10px] text-zinc-600">Не раскрывают правильный ответ — только направляют мышление</span>
                                </div>

                                {(['es', 'ru', 'en'] as const).map(lang => (
                                    <div key={lang}>
                                        <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1.5 flex items-center gap-2">
                                            <span>{lang === 'es' ? '🇪🇸' : lang === 'ru' ? '🇷🇺' : '🇬🇧'}</span>
                                            {lang === 'es' ? 'Español' : lang === 'ru' ? 'Русский' : 'English'}
                                            {hintDraft[lang] && <Check className="w-3 h-3 text-emerald-500" />}
                                        </div>
                                        <Textarea
                                            value={hintDraft[lang]}
                                            onChange={e => setHintDraft(prev => ({ ...prev, [lang]: e.target.value }))}
                                            placeholder={
                                                lang === 'es' ? 'Pista para el estudiante...'
                                                    : lang === 'ru' ? 'Подсказка для ученика...'
                                                        : 'Hint for the student...'
                                            }
                                            className="bg-zinc-900/50 border-zinc-800 text-zinc-300 text-[13px] resize-none min-h-[80px] focus:border-indigo-500/50"
                                            rows={3}
                                        />
                                    </div>
                                ))}

                                <Button
                                    onClick={saveHints}
                                    className={cn(
                                        "gap-2 transition-all",
                                        hintSaved
                                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                            : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border-indigo-500/20"
                                    )}
                                    variant="ghost"
                                >
                                    {hintSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                                    {hintSaved ? 'Сохранено!' : 'Сохранить подсказки'}
                                </Button>

                                {/* Explanation preview */}
                                {(selectedQ.explanation_ru || selectedQ.explanation_es) && (
                                    <div className="mt-4 p-3 rounded-lg bg-zinc-900/50 border border-white/5">
                                        <div className="text-[10px] font-mono text-zinc-600 uppercase mb-1">Официальное объяснение (из БД)</div>
                                        <p className="text-xs text-zinc-500 leading-relaxed">{selectedQ.explanation_ru || selectedQ.explanation_es}</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-700 text-sm">
                        Выберите вопрос слева
                    </div>
                )}
            </div>

            {/* ── Search dialog ─────────────────────────────────────────────── */}
            <CommandDialog open={searchOpen} onOpenChange={(o) => { setSearchOpen(o); if (!o) setSearchQuery(''); }} shouldFilter={false}>
                <CommandInput
                    placeholder="Поиск по тексту вопроса (ES или RU)..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                />
                <CommandList>
                    {searchLoading && (
                        <div className="flex items-center justify-center py-6 gap-2 text-zinc-500 text-xs">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Поиск...
                        </div>
                    )}
                    {!searchLoading && searchQuery.length > 1 && searchResults.length === 0 && (
                        <CommandEmpty>Ничего не найдено</CommandEmpty>
                    )}
                    {searchResults.length > 0 && (
                        <CommandGroup heading={`${searchResults.length} результатов`}>
                            {searchResults.map(r => {
                                const alreadyAdded = questions.some(q => q.id === r.id);
                                return (
                                    <CommandItem
                                        key={r.id}
                                        onSelect={() => !alreadyAdded && addQuestion(r.id)}
                                        className="flex items-start gap-3 p-2 cursor-pointer"
                                        value={r.id}
                                    >
                                        <div className="w-16 h-11 rounded-lg overflow-hidden bg-zinc-900 border border-white/5 flex-shrink-0">
                                            {r.image_url ? (
                                                <img src={r.image_url} alt="" className="w-full h-full object-cover opacity-70" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ImageIcon className="w-4 h-4 text-zinc-700" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-zinc-200 line-clamp-2">{r.question_ru ?? '...'}</p>
                                            <p className="text-[11px] text-zinc-500 italic mt-0.5 line-clamp-1">{r.question_es ?? ''}</p>
                                        </div>
                                        {alreadyAdded ? (
                                            <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-500 flex-shrink-0">
                                                В демо
                                            </Badge>
                                        ) : addingId === r.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400 flex-shrink-0" />
                                        ) : (
                                            <Plus className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                                        )}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    )}
                </CommandList>
            </CommandDialog>
        </div>
    );
}
