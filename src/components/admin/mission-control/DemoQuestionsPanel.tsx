import { useState, useEffect, useCallback, useRef } from "react";
import guestQuestionsRaw from "@/data/guest-questions.json";
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Cloud, Trash2, Plus, Save, RefreshCw,
    Image as ImageIcon, Check, X, GripVertical, Loader2, Sparkles, ChevronRight
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

// ── DB helpers ────────────────────────────────────────────────────────────────

const DB_KEY = 'demo_questions';

async function loadFromDB(): Promise<DemoQuestion[] | null> {
    const sb = await getSupabaseClient();
    const { data } = await sb.from('app_config').select('value').eq('key', DB_KEY).single();
    if (!data?.value) return null;
    try { return data.value as DemoQuestion[]; } catch { return null; }
}

async function saveToDB(qs: DemoQuestion[]): Promise<void> {
    const sb = await getSupabaseClient();
    await sb.from('app_config').upsert({
        key: DB_KEY,
        value: qs as any,
        description: 'Demo/guest questions shown to non-authenticated users',
        updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
}

// ── Normalize raw JSON ────────────────────────────────────────────────────────

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
    const sb = await getSupabaseClient();
    const { data, error } = await sb
        .from('questions_new')
        .select(`id, question_es, question_ru, question_en, image_url,
            explanation_es, explanation_ru, explanation_en,
            topics ( title_ru, title_es ),
            answer_options ( id, text_ru, text_es, text_en, is_correct, position )`)
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
            .map(a => ({ id: a.id, text_es: a.text_es ?? null, text_ru: a.text_ru ?? '', text_en: a.text_en ?? null, is_correct: a.is_correct ?? false, position: a.position ?? 0 })),
        hint_es: null, hint_ru: null, hint_en: null,
    };
}

// ── AI hint generation ────────────────────────────────────────────────────────

async function generateHints(q: DemoQuestion): Promise<{ hint_es: string; hint_ru: string; hint_en: string } | null> {
    const correctAnswer = q.answer_options.find(a => a.is_correct);
    const wrongAnswers = q.answer_options.filter(a => !a.is_correct);

    const prompt = `Ты эксперт по правилам дорожного движения Испании (DGT).

Вопрос (ES): ${q.question_es}
Вопрос (RU): ${q.question_ru}

Варианты ответов (ES):
✓ ${correctAnswer?.text_es ?? ''}
${wrongAnswers.map(a => `✗ ${a.text_es}`).join('\n')}

Официальное объяснение: ${q.explanation_es ?? q.explanation_ru ?? ''}

Задача: напиши подсказку для студента — направь его мышление к правильному ответу, но НЕ называй его напрямую. 1-2 предложения.

Ответь СТРОГО в JSON без markdown:
{"hint_es":"...","hint_ru":"...","hint_en":"..."}`;

    try {
        const { data, error } = await supabase.functions.invoke('ai-chat', {
            body: {
                messages: [{ role: 'user', content: prompt }],
                country: 'spain',
                language: 'ru',
            }
        });
        if (error) throw error;
        const text: string = typeof data === 'string' ? data : (data?.content ?? data?.message ?? JSON.stringify(data));
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in response');
        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.error('[DemoPanel] Generate hints error:', e);
        return null;
    }
}

// ── Main component ────────────────────────────────────────────────────────────

export function DemoQuestionsPanel() {
    const [questions, setQuestions] = useState<DemoQuestion[]>((guestQuestionsRaw as any[]).map(normalizeRaw));
    const [dbLoading, setDbLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [addingId, setAddingId] = useState<string | null>(null);
    const [hintDraft, setHintDraft] = useState({ es: '', ru: '', en: '' });
    const [hintSaved, setHintSaved] = useState(false);
    const dragIdx = useRef<number | null>(null);

    const selectedQ = questions.find(q => q.id === selectedId) ?? null;
    const selectedIdx = questions.findIndex(q => q.id === selectedId);

    // Load from DB on mount
    useEffect(() => {
        loadFromDB().then(dbData => {
            const initial = dbData ?? (guestQuestionsRaw as any[]).map(normalizeRaw);
            setQuestions(initial);
            setSelectedId(initial[0]?.id ?? null);
            setDbLoading(false);
        });
    }, []);

    // Sync hint draft
    useEffect(() => {
        if (!selectedQ) return;
        setHintDraft({ es: selectedQ.hint_es ?? '', ru: selectedQ.hint_ru ?? '', en: selectedQ.hint_en ?? '' });
        setHintSaved(false);
    }, [selectedId]);

    // Supabase search
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const sb = await getSupabaseClient();
                const { data } = await sb
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
        toast.success('Сохранено — гости увидят сразу');
    }, [selectedId, hintDraft, questions]);

    const handleGenerate = useCallback(async () => {
        if (!selectedQ) return;
        setGenerating(true);
        const hints = await generateHints(selectedQ);
        if (hints) {
            setHintDraft({ es: hints.hint_es, ru: hints.hint_ru, en: hints.hint_en });
            toast.success('Подсказки сгенерированы — проверь и сохрани');
        } else {
            toast.error('Не удалось сгенерировать подсказки');
        }
        setGenerating(false);
    }, [selectedQ]);

    const removeQuestion = useCallback((id: string) => {
        setQuestions(prev => {
            const updated = prev.filter(q => q.id !== id);
            if (selectedId === id) setSelectedId(updated[0]?.id ?? null);
            return updated;
        });
    }, [selectedId]);

    const addQuestion = useCallback(async (id: string) => {
        if (questions.some(q => q.id === id)) { toast.warning('Уже в демо'); setSearchOpen(false); return; }
        if (questions.length >= 30) { toast.error('Максимум 30 вопросов'); return; }
        setAddingId(id);
        const q = await fetchQuestion(id);
        setAddingId(null);
        if (!q) { toast.error('Не удалось загрузить вопрос'); return; }
        setQuestions(prev => [...prev, q]);
        setSelectedId(id);
        setSearchOpen(false);
        setSearchQuery('');
        toast.success('Вопрос добавлен');
    }, [questions]);

    const resetToOriginal = useCallback(async () => {
        const original = (guestQuestionsRaw as any[]).map(normalizeRaw);
        setQuestions(original);
        setSelectedId(original[0]?.id ?? null);
        setSaving(true);
        await saveToDB(original);
        setSaving(false);
        toast.success('Восстановлен оригинальный список');
    }, []);

    const publishAll = useCallback(async () => {
        setSaving(true);
        await saveToDB(questions);
        setSaving(false);
        toast.success('Опубликовано — гости увидят сразу');
    }, [questions]);

    const handleDragStart = (idx: number) => { dragIdx.current = idx; };
    const handleDrop = (idx: number) => {
        if (dragIdx.current === null || dragIdx.current === idx) return;
        setQuestions(prev => {
            const updated = [...prev];
            const [moved] = updated.splice(dragIdx.current!, 1);
            updated.splice(idx, 0, moved);
            return updated;
        });
        dragIdx.current = null;
    };

    if (dbLoading) {
        return (
            <div className="flex-1 flex items-center justify-center gap-3 text-zinc-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-mono">Loading demo config...</span>
            </div>
        );
    }

    return (
        <div className="flex h-full overflow-hidden">

            {/* ── COL 1: Question List (narrow) ─────────────────────────── */}
            <div className="w-64 border-r border-white/5 flex flex-col bg-[#050505] shrink-0">
                <div className="px-3 py-2.5 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Demo</span>
                        <Badge variant="outline" className="text-[9px] h-4 border-indigo-500/30 text-indigo-400 bg-indigo-500/5">
                            {questions.length}/30
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-zinc-600 hover:text-zinc-300" onClick={resetToOriginal} title="Сброс">
                            <RefreshCw className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-indigo-400 hover:text-indigo-300" onClick={() => setSearchOpen(true)} title="Добавить">
                            <Plus className="w-3 h-3" />
                        </Button>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-1.5 space-y-0.5">
                        {questions.map((q, idx) => (
                            <div
                                key={q.id}
                                draggable
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => handleDrop(idx)}
                                onClick={() => setSelectedId(q.id)}
                                className={cn(
                                    "flex items-start w-full p-2 rounded-lg transition-all text-left border border-transparent group relative cursor-pointer",
                                    selectedId === q.id
                                        ? "bg-indigo-500/10 border-indigo-500/20 text-white"
                                        : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                                )}
                            >
                                <GripVertical className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0 opacity-20 group-hover:opacity-40 cursor-grab" />
                                <span className={cn("font-mono text-[10px] mr-1.5 mt-0.5 w-4 flex-shrink-0", selectedId === q.id ? "text-indigo-400" : "opacity-30")}>
                                    {(idx + 1).toString().padStart(2, '0')}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[11px] leading-relaxed line-clamp-2">{q.question_ru || q.question_es || '...'}</div>
                                    <div className="flex gap-1 mt-0.5">
                                        {q.hint_es && <span className="text-[8px] text-emerald-500/60 font-mono">ES</span>}
                                        {q.hint_ru && <span className="text-[8px] text-emerald-500/60 font-mono">RU</span>}
                                        {q.hint_en && <span className="text-[8px] text-emerald-500/60 font-mono">EN</span>}
                                    </div>
                                </div>
                                <button onClick={e => { e.stopPropagation(); removeQuestion(q.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-700 hover:text-rose-400 ml-1 flex-shrink-0">
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="p-2 border-t border-zinc-800">
                    <Button
                        className="w-full h-7 text-[11px] gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 disabled:opacity-50"
                        variant="ghost" disabled={saving} onClick={publishAll}
                    >
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
                        {saving ? 'Сохраняю...' : 'Опубликовать'}
                    </Button>
                </div>
            </div>

            {/* ── COL 2: Image + Question (like MissionImageControl + MissionEditor) ── */}
            <div className="flex-1 border-r border-white/5 flex flex-col bg-[#050505] min-w-0 overflow-hidden">
                {selectedQ ? (
                    <>
                        {/* Nav */}
                        <div className="px-4 py-2 border-b border-zinc-800/60 flex items-center justify-between shrink-0">
                            <span className="text-[10px] font-mono text-zinc-600">{selectedIdx + 1} / {questions.length}</span>
                            <div className="flex gap-1">
                                <button className="px-2 py-0.5 text-zinc-600 hover:text-white disabled:opacity-20 text-base" disabled={selectedIdx <= 0}
                                    onClick={() => setSelectedId(questions[selectedIdx - 1]?.id)}>‹</button>
                                <button className="px-2 py-0.5 text-zinc-600 hover:text-white disabled:opacity-20 text-base" disabled={selectedIdx >= questions.length - 1}
                                    onClick={() => setSelectedId(questions[selectedIdx + 1]?.id)}>›</button>
                            </div>
                        </div>

                        {/* Image — compact, like in MissionImageControl */}
                        <div className="h-[42%] bg-black/60 border-b border-zinc-800/50 relative shrink-0 min-h-[140px] max-h-[320px]">
                            {selectedQ.image_url ? (
                                <img src={selectedQ.image_url} alt=""
                                    className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-zinc-800" />
                                </div>
                            )}
                            {selectedQ.topics && (
                                <div className="absolute bottom-2 left-3 text-[9px] font-mono text-zinc-600 uppercase tracking-wide bg-black/60 px-1.5 py-0.5 rounded">
                                    {selectedQ.topics.title_ru}
                                </div>
                            )}
                        </div>

                        {/* Question + Answers — like MissionEditor */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                            {/* Question text */}
                            <p className="text-base font-medium text-white leading-relaxed">
                                {selectedQ.question_ru}
                            </p>

                            {/* Answer options */}
                            <div className="space-y-2.5">
                                {selectedQ.answer_options.sort((a, b) => a.position - b.position).map(a => (
                                    <div key={a.id} className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                                        a.is_correct
                                            ? "bg-green-500/5 border-green-500/40"
                                            : "bg-white/5 border-transparent"
                                    )}>
                                        <div className={cn(
                                            "h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center",
                                            a.is_correct ? "bg-green-500 border-green-500" : "border-zinc-600"
                                        )}>
                                            {a.is_correct && <Check className="w-3 h-3 text-black" />}
                                        </div>
                                        <span className={cn("text-sm", a.is_correct ? "text-white" : "text-zinc-400")}>
                                            {a.text_ru}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Explanation */}
                            {(selectedQ.explanation_ru || selectedQ.explanation_es) && (
                                <div className="pt-4 border-t border-white/5">
                                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Explanation</div>
                                    <div className="bg-white/5 rounded-xl border border-white/5 p-4">
                                        <p className="text-sm text-zinc-400 leading-relaxed">
                                            {selectedQ.explanation_ru || selectedQ.explanation_es}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-700 text-sm">Выберите вопрос</div>
                )}
            </div>

            {/* ── COL 3: Hints Editor ───────────────────────────────────── */}
            <div className="w-80 flex flex-col bg-[#09090b] shrink-0">
                <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Подсказки (Hints)</span>
                    <Button
                        size="sm" variant="ghost"
                        className="h-6 px-2 text-[10px] gap-1.5 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 disabled:opacity-40"
                        onClick={handleGenerate} disabled={generating || !selectedQ}
                    >
                        {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {generating ? 'Генерирую...' : 'Генерировать'}
                    </Button>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                        {selectedQ ? (
                            <>
                                <p className="text-[10px] text-zinc-600 leading-relaxed">
                                    Подсказка направляет студента к ответу, не называя его напрямую.
                                </p>

                                {(['es', 'ru', 'en'] as const).map(lang => (
                                    <div key={lang}>
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <span className="text-xs">{lang === 'es' ? '🇪🇸' : lang === 'ru' ? '🇷🇺' : '🇬🇧'}</span>
                                            <span className="text-[10px] font-mono text-zinc-500 uppercase">
                                                {lang === 'es' ? 'Español' : lang === 'ru' ? 'Русский' : 'English'}
                                            </span>
                                            {hintDraft[lang] && <Check className="w-3 h-3 text-emerald-500 ml-auto" />}
                                        </div>
                                        <Textarea
                                            value={hintDraft[lang]}
                                            onChange={e => setHintDraft(prev => ({ ...prev, [lang]: e.target.value }))}
                                            placeholder={lang === 'es' ? 'Pista...' : lang === 'ru' ? 'Подсказка...' : 'Hint...'}
                                            className="bg-zinc-900/50 border-zinc-800 text-zinc-300 text-[12px] resize-none min-h-[72px] focus:border-indigo-500/50"
                                            rows={3}
                                        />
                                    </div>
                                ))}

                                <Button
                                    onClick={saveHints} disabled={saving}
                                    className={cn(
                                        "w-full gap-2 transition-all",
                                        hintSaved
                                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                            : "bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border-indigo-500/20"
                                    )}
                                    variant="ghost"
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : hintSaved ? <Check className="w-3.5 h-3.5" />
                                            : <Save className="w-3.5 h-3.5" />}
                                    {hintSaved ? 'Сохранено!' : saving ? 'Сохраняю...' : 'Сохранить подсказки'}
                                </Button>
                            </>
                        ) : (
                            <div className="text-zinc-700 text-xs text-center py-8">Выберите вопрос слева</div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* ── Search dialog ─────────────────────────────────────────── */}
            <CommandDialog open={searchOpen} onOpenChange={o => { setSearchOpen(o); if (!o) setSearchQuery(''); }} shouldFilter={false}>
                <CommandInput placeholder="Поиск вопроса (ES или RU)..." value={searchQuery} onValueChange={setSearchQuery} />
                <CommandList>
                    {searchLoading && (
                        <div className="flex items-center justify-center py-6 gap-2 text-zinc-500 text-xs">
                            <Loader2 className="w-4 h-4 animate-spin" /> Поиск...
                        </div>
                    )}
                    {!searchLoading && searchQuery.length > 1 && searchResults.length === 0 && <CommandEmpty>Ничего не найдено</CommandEmpty>}
                    {searchResults.length > 0 && (
                        <CommandGroup heading={`${searchResults.length} результатов`}>
                            {searchResults.map(r => {
                                const alreadyAdded = questions.some(q => q.id === r.id);
                                return (
                                    <CommandItem key={r.id} onSelect={() => !alreadyAdded && addQuestion(r.id)} className="flex items-start gap-3 p-2 cursor-pointer" value={r.id}>
                                        <div className="w-16 h-11 rounded-lg overflow-hidden bg-zinc-900 border border-white/5 flex-shrink-0">
                                            {r.image_url
                                                ? <img src={r.image_url} alt="" className="w-full h-full object-cover opacity-70" />
                                                : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-zinc-700" /></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-zinc-200 line-clamp-2">{r.question_ru ?? '...'}</p>
                                            <p className="text-[11px] text-zinc-500 italic mt-0.5 line-clamp-1">{r.question_es ?? ''}</p>
                                        </div>
                                        {alreadyAdded
                                            ? <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-500 flex-shrink-0">В демо</Badge>
                                            : addingId === r.id
                                                ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400 flex-shrink-0" />
                                                : <Plus className="w-4 h-4 text-zinc-600 flex-shrink-0" />}
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
