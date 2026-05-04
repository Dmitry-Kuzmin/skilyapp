import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bookmark, Play, Trash2, ArrowLeft,
    Search, Battery, BatteryLow,
    RotateCcw, Archive, Hash, AlertTriangle,
    CheckCircle2, Flame, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePDDContext } from "@/contexts/PDDContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QuestionImage } from "@/components/test/QuestionImage";
import { motion, AnimatePresence } from "framer-motion";

// --- TYPES ---
type FavoriteQuestion = {
    id: string;
    question_ru: string;
    question_es: string;
    image_url: string | null;
    added_at: string;
    updated_at: string;
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

type FavoritesGymLabels = {
    tags: {
        kryptonite: string;
        numbers: string;
        trap: string;
    };
    batteryCharge: string;
    correctAnswer: string;
    answerNotFound: string;
    conciseExplanation: string;
    tapToFlipBack: string;
};

// --- LOGIC HELPERS ---

const calculateBattery = (lastInteractionDate: string, streak: number): number => {
    const now = new Date().getTime();
    const last = new Date(lastInteractionDate).getTime();
    const hoursPassed = (now - last) / (1000 * 60 * 60);
    const decayFactor = 168 * (1 + (streak * 0.5));
    let charge = 100 - (hoursPassed / decayFactor * 100);
    if (charge < 10) charge = 10;
    if (charge > 100) charge = 100;
    if (hoursPassed < 1) charge = 100;
    return Math.round(charge);
};

const getSmartTags = (q: FavoriteQuestion, labels: FavoritesGymLabels["tags"]) => {
    const tags = [];
    if (q.times_wrong >= 3 && !q.mastered) {
        tags.push({ id: 'kryptonite', label: labels.kryptonite, icon: <Flame className="w-3 h-3" />, color: 'rose' });
    }
    const text = (q.question_ru + q.question_es).toLowerCase();
    const numberRegex = /(\d+\s*(km\/h|км\/ч|m|м|%|mg|мг|kg|кг|año|год|mes|мес|dia|дней))/i;
    if (numberRegex.test(text)) {
        tags.push({ id: 'numbers', label: labels.numbers, icon: <Hash className="w-3 h-3" />, color: 'blue' });
    }
    if (q.difficulty === 'hard') {
        tags.push({ id: 'trap', label: labels.trap, icon: <AlertTriangle className="w-3 h-3" />, color: 'purple' });
    }
    return tags;
};

// --- MAIN PAGE ---

const Favorites = () => {
    const navigate = useNavigate();
    const { profileId, isAuthenticated } = useUserContext();
    const { selectedCountry } = usePDDContext();
    const { t } = useLanguage();
    const [questions, setQuestions] = useState<FavoriteQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<'all' | 'battery_low' | 'kryptonite' | 'numbers'>('all');

    const labels: FavoritesGymLabels = {
        tags: {
            kryptonite: t("favoritesGym.tags.kryptonite"),
            numbers: t("favoritesGym.tags.numbers"),
            trap: t("favoritesGym.tags.trap"),
        },
        batteryCharge: t("favoritesGym.batteryCharge"),
        correctAnswer: t("favoritesGym.correctAnswer"),
        answerNotFound: t("favoritesGym.answerNotFound"),
        conciseExplanation: t("favoritesGym.conciseExplanation"),
        tapToFlipBack: t("favoritesGym.tapToFlipBack"),
    };

    useEffect(() => {
        if (isAuthenticated && profileId) loadFavorites();
    }, [isAuthenticated, profileId, selectedCountry]);

    const dbCountry = selectedCountry === 'russia' ? 'ru' : selectedCountry === 'spain' ? 'es' : selectedCountry;

    const loadFavorites = async () => {
        if (!profileId) return;
        setLoading(true);
        try {
            const { data: relations, error: relError } = await supabase
                .from('user_challenge_questions')
                .select('question_id, created_at, updated_at, mastered, times_wrong, correct_streak')
                .eq('user_id', profileId)
                .eq('is_favorite', true)
                .order('updated_at', { ascending: false });

            if (relError) throw relError;
            if (!relations?.length) { setQuestions([]); return; }

            const parsedRelations: any[] = relations || [];
            const relationMap = new Map(parsedRelations.map((r: any) => [r.question_id, r]));
            const questionIds = parsedRelations.map((r: any) => r.question_id);
            let mappedData: FavoriteQuestion[] = [];

            if (selectedCountry === 'russia') {
                const { data: russiaQuestions, error: qError } = await supabase
                    .from('pdd_russia_questions').select('*').in('id', questionIds);
                if (qError) throw qError;
                if (russiaQuestions?.length) {
                    const { data: russiaAnswers } = await supabase
                        .from('pdd_russia_answers').select('*').in('question_id', russiaQuestions.map((q: any) => q.id));
                    mappedData = russiaQuestions.map((q: any) => {
                        const rel = relationMap.get(q.id);
                        const answers = ((russiaAnswers as any[]) || []).filter((a: any) => a.question_id === q.id);
                        const correctOption = answers.find((a: any) => a.is_correct);
                        const difficulty: 'easy' | 'medium' | 'hard' =
                            q.difficulty === 'hard' || (rel?.times_wrong || 0) > 2 ? 'hard' :
                            q.difficulty === 'easy' ? 'easy' : 'medium';
                        return {
                            id: q.id, question_ru: q.question_text || q.text || '', question_es: '',
                            image_url: q.image_url, added_at: rel?.created_at,
                            updated_at: rel?.updated_at || rel?.created_at,
                            topic_title_ru: q.topics?.[0] ?? null, mastered: rel?.mastered || false,
                            times_wrong: rel?.times_wrong || 0, correct_streak: rel?.correct_streak || 0,
                            difficulty, explanation_ru: q.explanation || null, explanation_es: null,
                            correct_answer_ru: correctOption?.answer_text || correctOption?.text || null,
                            correct_answer_es: null,
                        };
                    });
                }
            } else {
                let query = supabase.from('questions_new').select(`
                    id, question_ru, question_es, image_url, metadata, country, explanation_ru, explanation_es,
                    topics(title_ru, title_es), answer_options(text_ru, text_es, is_correct)
                `).in('id', questionIds);
                if (dbCountry) query = query.eq('country', dbCountry);
                const { data: questionsData, error: qError } = await query;
                if (qError) throw qError;
                mappedData = (questionsData || []).map((q: any) => {
                    const rel = relationMap.get(q.id);
                    const correctOption = q.answer_options?.find((o: any) => o.is_correct);
                    const difficulty: 'easy' | 'medium' | 'hard' =
                        q.metadata?.difficulty === 'hard' || (rel?.times_wrong || 0) > 2 ? 'hard' :
                        q.metadata?.difficulty === 'easy' ? 'easy' : 'medium';
                    return {
                        id: q.id, question_ru: q.question_ru, question_es: q.question_es,
                        image_url: q.image_url, added_at: rel?.created_at,
                        updated_at: rel?.updated_at || rel?.created_at,
                        topic_title_ru: q.topics?.title_ru, mastered: rel?.mastered || false,
                        times_wrong: rel?.times_wrong || 0, correct_streak: rel?.correct_streak || 0,
                        difficulty, explanation_ru: q.explanation_ru, explanation_es: q.explanation_es,
                        correct_answer_ru: correctOption?.text_ru, correct_answer_es: correctOption?.text_es,
                    };
                });
            }

            mappedData.sort((a, b) =>
                calculateBattery(a.updated_at, a.correct_streak) - calculateBattery(b.updated_at, b.correct_streak)
            );
            setQuestions(mappedData);
        } catch (error) {
            console.error('Error loading Favorites:', error);
            toast.error(t("favoritesGym.toasts.loadError"));
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFavorite = async (questionId: string) => {
        if (!profileId) return;
        const { error } = await (supabase as any)
            .from('user_challenge_questions')
            .update({ is_favorite: false })
            .eq('user_id', profileId)
            .eq('question_id', questionId);
        if (!error) {
            setQuestions(prev => prev.filter(q => q.id !== questionId));
            toast.success(t("favoritesGym.toasts.removed"));
        }
    };

    const filteredQuestions = useMemo(() => {
        let result = questions;
        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            result = result.filter(q =>
                q.question_ru.toLowerCase().includes(lower) ||
                q.question_es.toLowerCase().includes(lower)
            );
        }
        if (activeFilter === 'battery_low') {
            result = result.filter(q => calculateBattery(q.updated_at, q.correct_streak) < 50);
        } else if (activeFilter === 'kryptonite') {
            result = result.filter(q => getSmartTags(q, labels.tags).some(t => t.id === 'kryptonite'));
        } else if (activeFilter === 'numbers') {
            result = result.filter(q => getSmartTags(q, labels.tags).some(t => t.id === 'numbers'));
        }
        return result;
    }, [questions, searchQuery, activeFilter, labels.tags]);

    const lowBatteryCount = useMemo(() =>
        questions.filter(q => calculateBattery(q.updated_at, q.correct_streak) < 50).length,
    [questions]);

    const kryptoniteCount = useMemo(() =>
        questions.filter(q => getSmartTags(q, labels.tags).some(t => t.id === 'kryptonite')).length,
    [questions, labels.tags]);

    const numbersCount = useMemo(() =>
        questions.filter(q => getSmartTags(q, labels.tags).some(t => t.id === 'numbers')).length,
    [questions, labels.tags]);

    if (!isAuthenticated) return null;

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8 max-w-[1370px] min-h-screen pb-28">

                {/* HEADER */}
                <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-6 mb-8">
                    {/* Left: back button + icon + title */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <button
                            onClick={() => navigate(-1)}
                            aria-label={t("common.back")}
                            className="group shrink-0 h-10 w-10 rounded-full bg-muted/40 hover:bg-muted border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all hover:-translate-x-0.5 active:scale-95"
                        >
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                        </button>

                        <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                            <Archive className="text-white" style={{ width: 24, height: 24 }} />
                        </div>

                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight leading-none truncate">
                                {t("favoritesGym.title")}
                            </h1>
                            <p className="hidden sm:block text-xs text-muted-foreground mt-1.5 font-medium truncate">
                                {t("favoritesGym.subtitle")}
                            </p>
                        </div>
                    </div>

                    {/* Right: stats + CTA */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="hidden sm:flex items-center gap-2">
                            <StatPill
                                value={questions.length}
                                label={t("favoritesGym.totalCards")}
                                icon={<Bookmark className="w-3.5 h-3.5" />}
                            />
                            <StatPill
                                value={lowBatteryCount}
                                label={t("favoritesGym.requireCharge")}
                                icon={<BatteryLow className="w-3.5 h-3.5" />}
                                alert={lowBatteryCount > 0}
                            />
                        </div>
                        <Button
                            size="lg"
                            onClick={() => navigate('/test/favorites')}
                            className="hidden md:flex h-11 pl-4 pr-5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/30 items-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 border-0"
                        >
                            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                                <Play className="w-3 h-3 fill-current ml-0.5" />
                            </div>
                            <div className="text-left">
                                <div className="text-[9px] font-bold opacity-75 uppercase tracking-widest leading-none">{t("favoritesGym.trainingLabel")}</div>
                                <div className="text-sm font-black leading-tight">{t("favoritesGym.chargeMemory")}</div>
                            </div>
                        </Button>
                    </div>
                </div>

                {/* Mobile-only stats row (under header) */}
                <div className="sm:hidden flex items-center gap-2 mb-6">
                    <StatPill
                        value={questions.length}
                        label={t("favoritesGym.totalCards")}
                        icon={<Bookmark className="w-3.5 h-3.5" />}
                    />
                    <StatPill
                        value={lowBatteryCount}
                        label={t("favoritesGym.requireCharge")}
                        icon={<BatteryLow className="w-3.5 h-3.5" />}
                        alert={lowBatteryCount > 0}
                    />
                </div>

                {/* FILTERS & SEARCH */}
                <div className="sticky top-16 z-30 mb-8">
                    <div className="bg-background/80 backdrop-blur-xl border border-border/60 rounded-2xl p-2 shadow-sm">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    placeholder={t("favoritesGym.searchPlaceholder")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-muted/40 border-transparent pl-10 h-10 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/30 text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                                <FilterChip active={activeFilter === 'all'} onClick={() => setActiveFilter('all')}
                                    icon={<Bookmark className="w-3 h-3" />} label={t("favoritesGym.filters.all")} />
                                <FilterChip active={activeFilter === 'battery_low'} onClick={() => setActiveFilter('battery_low')}
                                    icon={<BatteryLow className="w-3 h-3" />} label={t("favoritesGym.filters.lowBattery")}
                                    count={lowBatteryCount} alert={lowBatteryCount > 0} color="rose" />
                                <FilterChip active={activeFilter === 'kryptonite'} onClick={() => setActiveFilter('kryptonite')}
                                    icon={<Flame className="w-3 h-3" />} label={t("favoritesGym.filters.kryptonite")}
                                    count={kryptoniteCount} color="orange" />
                                <FilterChip active={activeFilter === 'numbers'} onClick={() => setActiveFilter('numbers')}
                                    icon={<Hash className="w-3 h-3" />} label={t("favoritesGym.filters.numbers")}
                                    count={numbersCount} color="blue" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* GRID */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-[460px] bg-muted/40 rounded-[2rem] animate-pulse border border-border/40" />
                        ))}
                    </div>
                ) : filteredQuestions.length > 0 ? (
                    <AnimatePresence mode="popLayout">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filteredQuestions.map((q, i) => (
                                <motion.div
                                    key={q.id}
                                    layout
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: i * 0.04, duration: 0.25 }}
                                >
                                    <Flashcard
                                        question={q}
                                        country={selectedCountry || 'spain'}
                                        onRemove={handleRemoveFavorite}
                                        labels={labels}
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </AnimatePresence>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-24 text-center"
                    >
                        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Search className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">{t("favoritesGym.empty.title")}</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">{t("favoritesGym.empty.description")}</p>
                        {(activeFilter !== 'all' || searchQuery) && (
                            <Button variant="link" onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
                                className="mt-3 text-primary text-sm">
                                {t("favoritesGym.empty.resetFilters")}
                            </Button>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Mobile FAB */}
            <div className="md:hidden fixed bottom-24 right-5 z-40">
                <Button
                    size="icon"
                    onClick={() => navigate('/test/favorites')}
                    className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-2xl shadow-violet-500/40 border-0"
                >
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                </Button>
            </div>
        </Layout>
    );
};

// --- SUB-COMPONENTS ---

const StatPill = ({ value, label, icon, alert }: { value: number; label: string; icon: React.ReactNode; alert?: boolean }) => (
    <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm",
        alert ? "bg-rose-500/5 border-rose-500/20" : "bg-muted/50 border-border/50"
    )}>
        <span className={cn("text-muted-foreground", alert && "text-rose-400")}>{icon}</span>
        <div>
            <div className={cn("text-xl font-black leading-none", alert ? "text-rose-500" : "text-foreground")}>{value}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5 whitespace-nowrap">{label}</div>
        </div>
    </div>
);

const FilterChip = ({ active, onClick, icon, label, count, alert, color }: {
    active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
    count?: number; alert?: boolean; color?: 'rose' | 'orange' | 'blue';
}) => {
    const colorMap = {
        rose: { chip: 'bg-rose-500/10 border-rose-500/20 text-rose-500', count: 'bg-rose-500/15 text-rose-500' },
        orange: { chip: 'bg-orange-500/10 border-orange-500/20 text-orange-500', count: 'bg-orange-500/15 text-orange-500' },
        blue: { chip: 'bg-blue-500/10 border-blue-500/20 text-blue-500', count: 'bg-blue-500/15 text-blue-500' },
    };
    const themed = color ? colorMap[color] : null;

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold transition-all whitespace-nowrap border select-none",
                active
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : themed && count
                        ? `${themed.chip} hover:opacity-80`
                        : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground"
            )}
        >
            {icon}
            {label}
            {count !== undefined && count > 0 && (
                <span className={cn(
                    "px-1.5 py-0.5 rounded-md text-[10px] font-black min-w-[18px] text-center",
                    active ? "bg-white/20 text-white" : themed ? themed.count : "bg-background text-muted-foreground"
                )}>
                    {count}
                </span>
            )}
        </button>
    );
};

const Flashcard = ({ question, country, onRemove, labels }: {
    question: FavoriteQuestion; country: string; onRemove: (id: string) => void; labels: FavoritesGymLabels;
}) => {
    const [isFlipped, setIsFlipped] = useState(false);

    const battery = calculateBattery(question.updated_at, question.correct_streak);
    const tags = getSmartTags(question, labels.tags);
    const isRus = country === 'russia';
    const text = isRus ? question.question_ru : question.question_es;
    const answer = isRus ? question.correct_answer_ru : question.correct_answer_es;
    const explanation = isRus ? question.explanation_ru : question.explanation_es;

    const batteryColor = battery > 70 ? 'bg-emerald-500' : battery > 40 ? 'bg-amber-400' : 'bg-rose-500';
    const batteryTextColor = battery > 70 ? 'text-emerald-500' : battery > 40 ? 'text-amber-500' : 'text-rose-500';

    return (
        <div
            className="group relative h-[460px] w-full cursor-pointer select-none"
            style={{ perspective: '1200px' }}
            onClick={() => setIsFlipped(f => !f)}
        >
            {/* Trash — fixed overlay */}
            <div className="absolute top-3.5 right-3.5 z-50 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                <button
                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-background/90 backdrop-blur-sm border border-border/60 text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/5 shadow-lg transition-all active:scale-90"
                    onClick={(e) => { e.stopPropagation(); onRemove(question.id); }}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            <motion.div
                className="w-full h-full relative"
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* ===== FRONT ===== */}
                <div
                    className="absolute inset-0 w-full h-full bg-card border border-border/50 rounded-[2rem] overflow-hidden flex flex-col shadow-sm hover:shadow-md hover:shadow-primary/5 transition-shadow"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                    {/* Image */}
                    <div className="relative h-44 shrink-0 bg-muted overflow-hidden">
                        <QuestionImage
                            imageUrl={question.image_url}
                            country={isRus ? 'russia' : 'spain'}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                                {tags.map(tag => (
                                    <span key={tag.id} className={cn(
                                        "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-md border border-white/10",
                                        tag.color === 'rose' && "bg-rose-500/80 text-white",
                                        tag.color === 'blue' && "bg-blue-500/80 text-white",
                                        tag.color === 'purple' && "bg-purple-500/80 text-white",
                                    )}>
                                        {tag.icon} {tag.label}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Flip hint */}
                        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-bold text-white/70">Ver respuesta</span>
                            <div className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                <RotateCcw className="w-3.5 h-3.5 text-white/80" />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1 gap-3 overflow-hidden">
                        <p className="flex-1 text-sm font-semibold text-card-foreground leading-relaxed line-clamp-5">
                            {text}
                        </p>

                        {/* Battery */}
                        <div className="pt-3 border-t border-border/40 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    <Battery className={cn("w-3 h-3", batteryTextColor)} />
                                    {labels.batteryCharge}
                                </span>
                                <span className={cn("text-[11px] font-black tabular-nums", batteryTextColor)}>{battery}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${battery}%` }}
                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                    className={cn("h-full rounded-full", batteryColor)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== BACK ===== */}
                <div
                    className="absolute inset-0 w-full h-full bg-card border border-border/50 rounded-[2rem] overflow-hidden flex flex-col shadow-sm"
                    style={{
                        transform: 'rotateY(180deg)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                    }}
                >
                    {/* Hero answer block — vivid emerald gradient */}
                    <div className="relative shrink-0 px-6 pt-6 pb-5 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-emerald-500/10">
                        <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                {labels.correctAnswer}
                            </span>
                        </div>
                        <p className="text-base md:text-[17px] font-black text-foreground leading-snug">
                            {answer || labels.answerNotFound}
                        </p>
                    </div>

                    {/* Explanation — main content area */}
                    {explanation ? (
                        <div className="flex-1 flex flex-col overflow-hidden px-6 py-4 min-h-0">
                            <div className="flex items-center gap-1.5 mb-2.5 shrink-0">
                                <TrendingUp className="w-3 h-3 text-primary" />
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                                    {labels.conciseExplanation}
                                </span>
                            </div>
                            <div
                                className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1"
                                style={{ scrollbarWidth: 'thin' }}
                                onClick={e => e.stopPropagation()}
                                onWheel={e => e.stopPropagation()}
                            >
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {explanation}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1" />
                    )}

                    {/* Flip back button */}
                    <div className="shrink-0 px-5 pb-5 pt-2">
                        <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/50 hover:bg-muted border border-border/40 transition-colors">
                            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-bold text-muted-foreground">{labels.tapToFlipBack}</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Favorites;
