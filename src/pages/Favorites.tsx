import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bookmark, Play, Trash2, ArrowLeft,
    Search, Zap, Battery, BatteryMedium, BatteryLow,
    RotateCcw, BrainCircuit, Hash, AlertTriangle, Eye,
    CheckCircle2, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePDDContext } from "@/contexts/PDDContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QuestionImage } from "@/components/test/QuestionImage";
import { Motion } from "@/components/optimized/Motion";
import { AnimatePresence, motion } from "framer-motion";

// --- TYPES ---
type FavoriteQuestion = {
    id: string;
    question_ru: string;
    question_es: string;
    image_url: string | null;
    added_at: string; // created_at or updated_at from relation
    updated_at: string; // for battery calculation
    topic_title_ru: string | null;
    mastered: boolean;
    times_wrong: number;
    correct_streak: number;
    difficulty: 'easy' | 'medium' | 'hard';
    explanation_ru: string | null;
    explanation_es: string | null;
    correct_answer_ru: string | null;
    correct_answer_es: string | null;
};

// --- LOGIC HELPERS ---

// 1. Battery Calculation (Ebbinghaus Curve Logic)
const calculateBattery = (lastInteractionDate: string, streak: number): number => {
    const now = new Date().getTime();
    const last = new Date(lastInteractionDate).getTime();
    const hoursPassed = (now - last) / (1000 * 60 * 60);

    // Base decay: 100% -> 0% over 1 week (168 hours)
    // Streak multiplier: Higher streak = slower decay
    const decayFactor = 168 * (1 + (streak * 0.5));

    let charge = 100 - (hoursPassed / decayFactor * 100);

    // Limits
    if (charge < 10) charge = 10; // Red zone
    if (charge > 100) charge = 100;

    // If just added (< 1 hour), full charge
    if (hoursPassed < 1) charge = 100;

    return Math.round(charge);
};

// 2. Smart Tags Detector
const getSmartTags = (q: FavoriteQuestion) => {
    const tags = [];

    // "Kryptonite" - User fails a lot
    if (q.times_wrong >= 3 && !q.mastered) {
        tags.push({ id: 'kryptonite', label: 'Криптонит', icon: <AlertTriangle className="w-3 h-3 text-rose-500" />, color: 'rose' });
    }

    // "Numbers" - Regex detection for speed, distance, alcohol
    const text = (q.question_ru + q.question_es).toLowerCase();
    const numberRegex = /(\d+\s*(km\/h|км\/ч|m|м|%|mg|мг|kg|кг|año|год|mes|мес|dia|дней))/i;
    if (numberRegex.test(text)) {
        tags.push({ id: 'numbers', label: 'Цифры', icon: <Hash className="w-3 h-3 text-blue-400" />, color: 'blue' });
    }

    // "Trap" - Hard difficulty
    if (q.difficulty === 'hard') {
        tags.push({ id: 'trap', label: 'Ловушка', icon: <BrainCircuit className="w-3 h-3 text-purple-400" />, color: 'purple' });
    }

    return tags;
};

const Favorites = () => {
    const navigate = useNavigate();
    const { profileId, isAuthenticated } = useUserContext();
    const { selectedCountry } = usePDDContext();
    const [questions, setQuestions] = useState<FavoriteQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Filter State
    const [activeFilter, setActiveFilter] = useState<'all' | 'battery_low' | 'kryptonite' | 'numbers'>('all');

    useEffect(() => {
        if (isAuthenticated && profileId) {
            loadFavorites();
        }
    }, [isAuthenticated, profileId, selectedCountry]);

    const dbCountry = selectedCountry === 'russia' ? 'ru' : selectedCountry === 'spain' ? 'es' : selectedCountry;

    const loadFavorites = async () => {
        if (!profileId) return;
        setLoading(true);

        try {
            // 1. Get Relations
            const { data: relations, error: relError } = await supabase
                .from('user_challenge_questions')
                .select('question_id, created_at, updated_at, mastered, times_wrong, correct_streak')
                .eq('user_id', profileId)
                .eq('is_favorite', true)
                .order('updated_at', { ascending: false });

            if (relError) throw relError;
            if (!relations?.length) {
                setQuestions([]);
                return;
            }

            const relationMap = new Map(relations.map(r => [r.question_id, r]));
            const questionIds = relations.map(r => r.question_id);

            // 2. Load Questions with Answers and Explanations
            let query = supabase
                .from('questions_new')
                .select(`
                    id, question_ru, question_es, image_url, metadata, country, explanation_ru, explanation_es,
                    topics(title_ru, title_es),
                    answer_options(text_ru, text_es, is_correct)
                `)
                .in('id', questionIds);

            if (dbCountry) query = query.eq('country', dbCountry);

            const { data: questionsData, error: qError } = await query;
            if (qError) throw qError;

            // 3. Map Data
            const mapped: FavoriteQuestion[] = (questionsData || []).map((q: any) => {
                const rel = relationMap.get(q.id);
                const correctOption = q.answer_options?.find((o: any) => o.is_correct);

                let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
                if (q.metadata?.difficulty === 'hard' || (rel?.times_wrong || 0) > 2) difficulty = 'hard';
                else if (q.metadata?.difficulty === 'easy') difficulty = 'easy';

                return {
                    id: q.id,
                    question_ru: q.question_ru,
                    question_es: q.question_es,
                    image_url: q.image_url,
                    added_at: rel?.created_at,
                    updated_at: rel?.updated_at || rel?.created_at,
                    topic_title_ru: q.topics?.title_ru,
                    mastered: rel?.mastered || false,
                    times_wrong: rel?.times_wrong || 0,
                    correct_streak: rel?.correct_streak || 0,
                    difficulty,
                    explanation_ru: q.explanation_ru,
                    explanation_es: q.explanation_es,
                    correct_answer_ru: correctOption?.text_ru,
                    correct_answer_es: correctOption?.text_es
                };
            });

            // Sort by Battery Charge (Lowest charge first)
            mapped.sort((a, b) => {
                const battA = calculateBattery(a.updated_at, a.correct_streak);
                const battB = calculateBattery(b.updated_at, b.correct_streak);
                return battA - battB;
            });

            setQuestions(mapped);

        } catch (error) {
            console.error('Error loading Favorites:', error);
            toast.error("Не удалось загрузить данные");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFavorite = async (questionId: string) => {
        if (!profileId) return;
        const { error } = await supabase
            .from('user_challenge_questions')
            .update({ is_favorite: false })
            .eq('user_id', profileId)
            .eq('question_id', questionId);

        if (!error) {
            setQuestions(prev => prev.filter(q => q.id !== questionId));
            toast.success("Удалено из коллекции");
        }
    };

    // Filter Logic
    const filteredQuestions = useMemo(() => {
        let result = questions;

        // Search
        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            result = result.filter(q =>
                q.question_ru.toLowerCase().includes(lower) ||
                q.question_es.toLowerCase().includes(lower)
            );
        }

        // Bubbles
        if (activeFilter === 'battery_low') {
            result = result.filter(q => calculateBattery(q.updated_at, q.correct_streak) < 50);
        } else if (activeFilter === 'kryptonite') {
            result = result.filter(q => getSmartTags(q).some(t => t.id === 'kryptonite'));
        } else if (activeFilter === 'numbers') {
            result = result.filter(q => getSmartTags(q).some(t => t.id === 'numbers'));
        }

        return result;
    }, [questions, searchQuery, activeFilter]);

    // Derived Stats
    const lowBatteryCount = questions.filter(q => calculateBattery(q.updated_at, q.correct_streak) < 50).length;

    if (!isAuthenticated) return null; // Or redirect

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8 max-w-7xl min-h-screen pb-24">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div className="space-y-1">
                        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-400 -ml-2 hover:text-white">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Назад
                        </Button>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                            <BrainCircuit className="w-10 h-10 text-indigo-500" />
                            Тренажерный Зал
                        </h1>
                        <p className="text-slate-400 max-w-md">
                            Умная система повторений. Тренируй только то, что мозг начинает забывать.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <div className="text-2xl font-black text-white">{questions.length}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Всего карт</div>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10 hidden md:block" />
                        <div className="text-right">
                            <div className={cn("text-2xl font-black", lowBatteryCount > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {lowBatteryCount}
                            </div>
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Требуют заряда</div>
                        </div>
                    </div>
                </div>

                {/* FILTERS & SEARCH */}
                <div className="sticky top-20 z-30 bg-slate-950/80 backdrop-blur-xl border border-white/5 rounded-2xl p-2 mb-8 shadow-2xl">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                placeholder="Найти вопрос..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-white/5 border-transparent pl-10 h-10 rounded-xl focus:bg-white/10 transition-all text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <FilterBubble
                                active={activeFilter === 'all'}
                                onClick={() => setActiveFilter('all')}
                                icon={<Bookmark className="w-3.5 h-3.5" />}
                                label="Все"
                            />
                            <FilterBubble
                                active={activeFilter === 'battery_low'}
                                onClick={() => setActiveFilter('battery_low')}
                                icon={<BatteryLow className="w-3.5 h-3.5" />}
                                label="Слабый заряд"
                                count={lowBatteryCount}
                                alert={lowBatteryCount > 0}
                            />
                            <FilterBubble
                                active={activeFilter === 'kryptonite'}
                                onClick={() => setActiveFilter('kryptonite')}
                                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                                label="Криптонит"
                            />
                            <FilterBubble
                                active={activeFilter === 'numbers'}
                                onClick={() => setActiveFilter('numbers')}
                                icon={<Hash className="w-3.5 h-3.5" />}
                                label="Цифры"
                            />
                        </div>
                    </div>
                </div>

                {/* GRID AREA */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="aspect-[4/5] bg-slate-900/50 rounded-3xl animate-pulse border border-white/5" />
                        ))}
                    </div>
                ) : filteredQuestions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredQuestions.map((q, i) => (
                            <Flashcard
                                key={q.id}
                                question={q}
                                index={i}
                                country={selectedCountry || 'spain'}
                                onRemove={handleRemoveFavorite}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-8 h-8 text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Пусто</h3>
                        <p className="text-slate-500 max-w-xs mx-auto">
                            Попробуйте изменить фильтры или добавьте новые вопросы в избранное
                        </p>
                        {(activeFilter !== 'all' || searchQuery) && (
                            <Button
                                variant="link"
                                onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
                                className="mt-4 text-indigo-400"
                            >
                                Сбросить фильтры
                            </Button>
                        )}
                    </div>
                )}

                {/* FAB: ACTION BUTTON */}
                <Motion
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    className="fixed bottom-6 right-6 z-40"
                >
                    <Button
                        size="lg"
                        onClick={() => navigate('/test/favorites')}
                        className="h-16 pl-6 pr-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/40 border border-white/10 flex items-center gap-4 transition-transform hover:scale-105 active:scale-95"
                    >
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                        </div>
                        <div className="text-left">
                            <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Тренировка</div>
                            <div className="text-base font-black">Зарядить Память</div>
                        </div>
                    </Button>
                </Motion>

            </div>
        </Layout>
    );
};

// --- COMPONENTS ---

const FilterBubble = ({ active, onClick, icon, label, count, alert }: any) => (
    <button
        onClick={onClick}
        className={cn(
            "flex items-center gap-2 px-4 h-9 rounded-xl text-xs font-bold transition-all whitespace-nowrap border select-none",
            active
                ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20"
                : "bg-slate-900/50 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-slate-200"
        )}
    >
        {icon}
        {label}
        {count !== undefined && (
            <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[9px] min-w-[18px] text-center ml-1",
                active ? "bg-white/20 text-white" : "bg-slate-800 text-slate-500",
                alert && !active && "bg-rose-500/20 text-rose-500"
            )}>
                {count}
            </span>
        )}
    </button>
);

const Flashcard = ({ question, index, country, onRemove }: { question: FavoriteQuestion, index: number, country: string, onRemove: (id: string) => void }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    // Logic
    const battery = calculateBattery(question.updated_at, question.correct_streak);
    const tags = getSmartTags(question);
    const isRus = country === 'russia';
    const text = isRus ? question.question_ru : question.question_es;
    const answer = isRus ? question.correct_answer_ru : question.correct_answer_es;
    const explanation = isRus ? question.explanation_ru : question.explanation_es;

    // Battery Color
    const batteryColor = battery > 70 ? 'bg-emerald-500' : battery > 40 ? 'bg-amber-500' : 'bg-rose-500';

    return (
        <div
            className="group relative h-[450px] w-full cursor-pointer perspective-1000"
            onClick={() => setIsFlipped(!isFlipped)}
            style={{ perspective: '1000px' }}
        >
            <motion.div
                className="w-full h-full relative preserve-3d transition-all duration-500 origin-center"
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* --- FRONT SIDE --- */}
                <div
                    className="absolute inset-0 backface-hidden w-full h-full bg-slate-900 border border-white/10 rounded-[2rem] overflow-hidden flex flex-col shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 transition-shadow"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >

                    {/* Image Header */}
                    <div className="relative h-48 shrink-0 bg-slate-950">
                        <QuestionImage imageUrl={question.image_url} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                        {/* Smart Tags */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                            {tags.map(tag => (
                                <div key={tag.id} className={cn("px-2 py-1 rounded-lg backdrop-blur-md bg-slate-900/60 border border-white/10 flex items-center gap-1.5 text-[10px] font-bold text-white shadow-sm")}>
                                    {tag.icon} {tag.label}
                                </div>
                            ))}
                        </div>

                        {/* Flip Hint */}
                        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <RotateCcw className="w-4 h-4 text-white/70" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                        <p className="text-sm md:text-base font-bold text-slate-100 line-clamp-5 leading-relaxed">
                            {text}
                        </p>

                        <div className="mt-auto pt-4 border-t border-white/5 space-y-3">
                            {/* Battery Indicator */}
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                <span className="flex items-center gap-1.5">
                                    <Battery className={cn("w-3 h-3", battery > 40 ? "text-emerald-500" : "text-rose-500")} />
                                    Заряд памяти
                                </span>
                                <span className={cn(
                                    battery > 70 ? "text-emerald-400" : battery > 40 ? "text-amber-400" : "text-rose-400"
                                )}>{battery}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${battery}%` }}
                                    className={cn("h-full shadow-[0_0_10px_currentColor]", batteryColor)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- BACK SIDE (ANSWER) --- */}
                <div
                    className="absolute inset-0 backface-hidden w-full h-full bg-slate-800 border border-white/10 rounded-[2rem] overflow-hidden flex flex-col p-6 shadow-xl rotate-y-180"
                    style={{
                        transform: "rotateY(180deg)",
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden'
                    }}
                >
                    <div className="absolute top-3 right-3 z-10">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 rounded-full"
                            onClick={(e) => { e.stopPropagation(); onRemove(question.id); }}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center relative z-0">
                        {/* Correct Icon */}
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 ring-1 ring-emerald-500/20">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        </div>

                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-3 opacity-80">
                            Правильный ответ
                        </h4>

                        <div className="bg-slate-900/50 rounded-2xl p-4 w-full border border-white/5 mb-6">
                            <p className="text-sm font-bold text-white leading-relaxed">
                                {answer || "Ответ не найден"}
                            </p>
                        </div>

                        {explanation && (
                            <div className="w-full text-left bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Суть кратко</span>
                                </div>
                                <p className="text-xs text-slate-300 line-clamp-4 leading-relaxed opacity-90">
                                    {explanation}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-4 flex justify-center border-t border-white/5">
                        <div className="text-[10px] text-slate-500 font-medium flex items-center gap-2">
                            <RotateCcw className="w-3 h-3" />
                            Нажми, чтобы перевернуть
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Favorites;
