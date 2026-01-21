import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
    Save,
    Sparkles,
    Languages,
    Check,
    Cloud,
    Loader2,
    FileJson,
    Database
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MarkdownText } from "./MarkdownText";

interface MissionEditorProps {
    questionId: string;
    testId?: string | null;
    country?: 'spain' | 'russia';
    serverOnline?: boolean;
}

type Lang = 'ru' | 'es' | 'en';

export function MissionEditor({ questionId, testId, country = 'spain', serverOnline }: MissionEditorProps) {
    const [isEditingExplanation, setIsEditingExplanation] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState<any>(null);
    const [lang, setLang] = useState<Lang>(country === 'russia' ? 'ru' : 'ru'); // Default to ru anyway

    useEffect(() => {
        if (questionId) loadQuestionData();
    }, [questionId, country]);

    const loadQuestionData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3030/api/db/question/${questionId}?country=${country}`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const { question, source, table, sourceFile } = await res.json();

            console.log('[MissionEditor] Loaded:', { question, source, table, sourceFile });

            if (question) {
                const correctAnswer = question.answers?.find((a: any) => a.is_correct) ||
                    question.answer_options?.find((a: any) => a.is_correct);

                const wrongAnswers = question.answers?.filter((a: any) => !a.is_correct) ||
                    question.answer_options?.filter((a: any) => !a.is_correct) || [];

                setData({
                    _source: source || (table ? 'db' : 'unknown'),
                    _sourceFile: sourceFile,
                    id: question.external_id || question.id,
                    question_ru: question.question?.ru || "",
                    answer_correct_ru: correctAnswer?.text?.ru || "",
                    answer_wrong_1_ru: wrongAnswers[0]?.text?.ru || "",
                    answer_wrong_2_ru: wrongAnswers[1]?.text?.ru || "",
                    explanation_ru: question.explanation?.ru || "",
                    question_es: question.question?.es || "",
                    answer_correct_es: correctAnswer?.text?.es || "",
                    answer_wrong_1_es: wrongAnswers[0]?.text?.es || "",
                    answer_wrong_2_es: wrongAnswers[1]?.text?.es || "",
                    explanation_es: question.explanation?.es || "",
                    question_en: question.question?.en || "",
                    answer_correct_en: correctAnswer?.text?.en || "",
                    answer_wrong_1_en: wrongAnswers[0]?.text?.en || "",
                    answer_wrong_2_en: wrongAnswers[1]?.text?.en || "",
                    explanation_en: question.explanation?.en || "",
                });
            }
        } catch (e) {
            console.error("[MissionEditor] Error loading question:", e);
            toast.error("Ошибка загрузки данных вопроса");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const answer_options = [
                {
                    text: { ru: data.answer_correct_ru, es: data.answer_correct_es, en: data.answer_correct_en },
                    is_correct: true
                },
                {
                    text: { ru: data.answer_wrong_1_ru, es: data.answer_wrong_1_es, en: data.answer_wrong_1_en },
                    is_correct: false
                },
                {
                    text: { ru: data.answer_wrong_2_ru, es: data.answer_wrong_2_es, en: data.answer_wrong_2_en },
                    is_correct: false
                }
            ];

            const res = await fetch('http://localhost:3030/api/db/update-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: data.id,
                    testId,
                    country,
                    question_ru: data.question_ru,
                    question_es: data.question_es,
                    question_en: data.question_en,
                    explanation_ru: data.explanation_ru,
                    explanation_es: data.explanation_es,
                    explanation_en: data.explanation_en,
                    answer_options
                })
            });

            if (res.ok) {
                toast.success("✅ Сохранено в облаке");
            } else {
                throw new Error("Update failed");
            }
        } catch (e) {
            toast.error("Ошибка сохранения");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="flex flex-col h-full bg-[#09090b] border-l border-white/10">

            {/* MINIMALIST HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    <Languages size={14} />
                    <span className="uppercase tracking-wider">Translation Mode</span>
                </div>

                {/* Source Indicator */}
                {/* Source Indicator */}
                <button
                    onClick={() => {
                        if (data._sourceFile) {
                            fetch('http://localhost:3030/api/open-file', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    path: data._sourceFile,
                                    id: data.id
                                })
                            });
                            toast.success("Opening file in editor...");
                        }
                    }}
                    className={cn(
                        "px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border transition-all duration-300 flex items-center gap-1.5",
                        data._source === 'db'
                            ? "bg-slate-900/50 border-cyan-500/30 text-cyan-400 cursor-default shadow-[0_0_10px_rgba(34,211,238,0.1)]"
                            : "bg-amber-950/20 border-amber-500/30 text-amber-500 hover:text-amber-300 hover:bg-amber-900/40 hover:border-amber-400/60 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer group"
                    )}
                    title={data._sourceFile || "Supabase DB"}
                    disabled={!data._sourceFile}
                >
                    {data._source === 'db' ? <Database size={12} className="opacity-70" /> : <FileJson size={12} className="group-hover:text-amber-300 transition-colors" />}
                    {data._source === 'db' ? 'Supabase DB' : 'JSON File'}
                </button>

                {/* Language Pills */}
                <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 gap-1">
                    {(['ru', 'es', 'en'] as Lang[]).map((l) => (
                        <button
                            key={l}
                            onClick={() => setLang(l)}
                            className={cn(
                                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                lang === l
                                    ? "bg-blue-600 text-white shadow-lg"
                                    : "text-gray-500 hover:text-white"
                            )}
                        >
                            {l.toUpperCase()}
                        </button>
                    ))}
                </div>

                <Button
                    size="sm"
                    className="h-8 bg-blue-600 hover:bg-blue-700"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? <Cloud className="w-3.5 h-3.5 animate-bounce" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                    {saving ? "Сохранение..." : "Save"}
                </Button>
            </div>

            {/* CONTENT SCROLL ZONE */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar">

                {/* QUESTION BLOCK (No labels, just large text) */}
                <div className="group relative">
                    <Textarea
                        value={data[`question_${lang}`] || ""}
                        onChange={(e) => setData({ ...data, [`question_${lang}`]: e.target.value })}
                        className="w-full bg-transparent text-lg md:text-xl font-medium text-white leading-relaxed resize-none focus:outline-none focus:ring-0 placeholder-gray-700 border-none p-0"
                        rows={4}
                        placeholder="Введите текст вопроса..."
                    />
                    {/* Edit pencil on hover */}
                    <span className="absolute -left-5 top-2 opacity-0 group-hover:opacity-100 text-gray-600 transition-opacity">✎</span>
                </div>

                {/* ANSWERS COMPACT LIST */}
                <div className="space-y-3">
                    {/* Correct Answer */}
                    <div className="relative group flex items-center gap-3 p-4 rounded-xl border-2 bg-green-500/5 border-green-500/40 transition-all">
                        <div className="h-5 w-5 rounded-full flex items-center justify-center bg-green-500 border-2 border-green-500 shrink-0">
                            <Check size={12} className="text-black" />
                        </div>
                        <Input
                            value={data[`answer_correct_${lang}`] || ""}
                            onChange={(e) => setData({ ...data, [`answer_correct_${lang}`]: e.target.value })}
                            className="flex-1 bg-transparent text-sm text-white border-none p-0 focus:ring-0 h-auto"
                            placeholder="Правильный ответ..."
                        />
                    </div>

                    {/* Wrong Answer 1 */}
                    <div className="relative group flex items-center gap-3 p-4 rounded-xl border bg-white/5 border-transparent hover:border-white/20 transition-all">
                        <div className="h-5 w-5 rounded-full border-2 border-gray-600 shrink-0" />
                        <Input
                            value={data[`answer_wrong_1_${lang}`] || ""}
                            onChange={(e) => setData({ ...data, [`answer_wrong_1_${lang}`]: e.target.value })}
                            className="flex-1 bg-transparent text-sm text-gray-300 border-none p-0 focus:ring-0 h-auto"
                            placeholder="Неправильный ответ 1..."
                        />
                    </div>

                    {/* Wrong Answer 2 */}
                    <div className="relative group flex items-center gap-3 p-4 rounded-xl border bg-white/5 border-transparent hover:border-white/20 transition-all">
                        <div className="h-5 w-5 rounded-full border-2 border-gray-600 shrink-0" />
                        <Input
                            value={data[`answer_wrong_2_${lang}`] || ""}
                            onChange={(e) => setData({ ...data, [`answer_wrong_2_${lang}`]: e.target.value })}
                            className="flex-1 bg-transparent text-sm text-gray-300 border-none p-0 focus:ring-0 h-auto"
                            placeholder="Неправильный ответ 2..."
                        />
                    </div>
                </div>

                {/* EXPLANATION BLOCK */}
                <div className="pt-6 border-t border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-500 tracking-wider uppercase">Explanation</span>
                        <div className="flex items-center gap-3">
                            <button
                                className={cn(
                                    "text-xs transition-colors flex items-center gap-1",
                                    isEditingExplanation ? "text-blue-400 hover:text-blue-300" : "text-gray-500 hover:text-gray-300"
                                )}
                                onClick={() => setIsEditingExplanation(!isEditingExplanation)}
                            >
                                {isEditingExplanation ? "👀 Preview" : "✎ Edit"}
                            </button>
                            <button
                                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                onClick={() => toast.info("AI Rewriter подключается...")}
                            >
                                <Sparkles size={12} />
                                AI Rewrite
                            </button>
                        </div>
                    </div>

                    <div
                        className={cn(
                            "bg-white/5 rounded-xl border border-white/5 transition-all",
                            isEditingExplanation ? "p-4 ring-1 ring-blue-500/50 bg-white/10" : "p-4 hover:bg-white/10 cursor-pointer"
                        )}
                        onClick={() => !isEditingExplanation && setIsEditingExplanation(true)}
                    >
                        {isEditingExplanation ? (
                            <Textarea
                                value={data[`explanation_${lang}`] || ""}
                                onChange={(e) => setData({ ...data, [`explanation_${lang}`]: e.target.value })}
                                className="w-full bg-transparent text-sm text-gray-300 leading-relaxed focus:outline-none resize-none border-none p-0 min-h-[150px]"
                                rows={6}
                                placeholder="Объясните, почему этот ответ правильный..."
                                autoFocus
                                onBlur={() => setIsEditingExplanation(false)}
                            />
                        ) : (
                            <MarkdownText
                                text={data[`explanation_${lang}`] || ""}
                                className="w-full text-sm text-gray-400 leading-relaxed pointer-events-none"
                            />
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
