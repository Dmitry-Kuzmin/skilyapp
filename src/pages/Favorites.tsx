import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bookmark, Play, Trash2, ArrowLeft, Filter,
    ArrowUpDown, LayoutGrid, List, Search,
    Trophy, Zap, BarChart3, Info, CheckCircle2,
    Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePDDContext } from "@/contexts/PDDContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QuestionImage } from "@/components/test/QuestionImage";
import { Motion } from "@/components/optimized/Motion";

type FavoriteQuestion = {
    id: string; // Question ID
    question_ru: string;
    question_es: string;
    question_en: string;
    image_url: string | null;
    added_at: string;
    topic_title_ru: string | null;
    topic_title_es: string | null;
    mastered: boolean;
    times_wrong: number;
    correct_streak: number;
    difficulty: 'easy' | 'medium' | 'hard';
};

const Favorites = () => {
    const navigate = useNavigate();
    const { profileId, isAuthenticated } = useUserContext();
    const { selectedCountry, selectedCategory } = usePDDContext();
    const [questions, setQuestions] = useState<FavoriteQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<'newest' | 'topic' | 'difficulty'>('newest');
    const [filterBy, setFilterBy] = useState<'all' | 'errors' | 'mastered'>('all');

    useEffect(() => {
        if (isAuthenticated && profileId) {
            loadFavorites();
        }
    }, [isAuthenticated, profileId, selectedCountry, selectedCategory]);

    const dbCountry = selectedCountry === 'russia' ? 'ru' : selectedCountry === 'spain' ? 'es' : selectedCountry;

    const loadFavorites = async () => {
        if (!profileId) return;

        try {
            setLoading(true);

            // 1. Get ALL favorites for this user
            const { data: relations, error: relError } = await supabase
                .from('user_challenge_questions')
                .select('question_id, created_at, updated_at, mastered, times_wrong, correct_streak')
                .eq('user_id', profileId)
                .eq('is_favorite', true)
                .order('created_at', { ascending: false });

            if (relError) throw relError;

            if (!relations || relations.length === 0) {
                setQuestions([]);
                return;
            }

            const questionIds = relations.map(r => r.question_id);
            const relationMap = new Map(relations.map(r => [r.question_id, r]));

            // 2. Load full question details
            let questionsQuery = supabase
                .from('questions_new')
                .select(`
                    id, 
                    question_ru, 
                    question_es, 
                    question_en, 
                    image_url, 
                    metadata,
                    country,
                    topics(title_ru, title_es)
                `)
                .in('id', questionIds);

            if (dbCountry) {
                questionsQuery = questionsQuery.eq('country', dbCountry);
            }

            if (selectedCategory && selectedCountry === 'russia') {
                questionsQuery = questionsQuery.ilike('metadata->>ticket_category', `%${selectedCategory}%`);
            }

            const { data: questionsData, error: qError } = await questionsQuery;

            if (qError) throw qError;

            // 3. Map and Merge
            const mappedQuestions: FavoriteQuestion[] = (questionsData || []).map((q: any) => {
                const relation = relationMap.get(q.id);
                const metadata = q.metadata || {};

                // Determine difficulty: from metadata or based on user performance
                let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
                if (metadata.difficulty === 'hard' || (relation?.times_wrong || 0) > 2) {
                    difficulty = 'hard';
                } else if (metadata.difficulty === 'easy' || (relation?.mastered && (relation?.times_wrong || 0) === 0)) {
                    difficulty = 'easy';
                }

                return {
                    id: q.id,
                    question_ru: q.question_ru,
                    question_es: q.question_es,
                    question_en: q.question_en,
                    image_url: q.image_url,
                    added_at: relation ? (relation.updated_at || relation.created_at) : new Date().toISOString(),
                    topic_title_ru: q.topics?.title_ru || null,
                    topic_title_es: q.topics?.title_es || null,
                    mastered: relation?.mastered || false,
                    times_wrong: relation?.times_wrong || 0,
                    correct_streak: relation?.correct_streak || 0,
                    difficulty
                };
            });

            setQuestions(mappedQuestions);

        } catch (error) {
            console.error('Error loading Favorites:', error);
            toast.error("Не удалось загрузить избранное");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFavorite = async (questionId: string) => {
        if (!profileId) return;

        try {
            const { data: existing } = await supabase
                .from('user_challenge_questions')
                .select('id, mastered, times_wrong')
                .eq('user_id', profileId)
                .eq('question_id', questionId)
                .single();

            if (!existing) return;

            const isError = !existing.mastered || existing.times_wrong > 0;

            if (isError) {
                const { error } = await supabase
                    .from('user_challenge_questions')
                    .update({ is_favorite: false })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('user_challenge_questions')
                    .delete()
                    .eq('id', existing.id);
                if (error) throw error;
            }

            toast.success("Удалено из избранного");
            setQuestions(prev => prev.filter(q => q.id !== questionId));
        } catch (error) {
            console.error('Error removing favorite:', error);
            toast.error("Не удалось удалить из избранного");
        }
    };

    const handleStartPractice = () => {
        if (questions.length === 0) {
            toast.error("Нет вопросов в избранном");
            return;
        }
        navigate('/test/favorites');
    };

    // Filtering and Sorting
    const filteredQuestions = useMemo(() => {
        let result = [...questions];

        // Search
        if (searchQuery) {
            const lowQuery = searchQuery.toLowerCase();
            result = result.filter(q =>
                (q.question_ru?.toLowerCase().includes(lowQuery)) ||
                (q.question_es?.toLowerCase().includes(lowQuery)) ||
                (q.topic_title_ru?.toLowerCase().includes(lowQuery))
            );
        }

        // Filter
        if (filterBy === 'errors') {
            result = result.filter(q => !q.mastered);
        } else if (filterBy === 'mastered') {
            result = result.filter(q => q.mastered);
        }

        // Sort
        result.sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
            } else if (sortBy === 'difficulty') {
                const order = { hard: 0, medium: 1, easy: 2 };
                return order[a.difficulty] - order[b.difficulty];
            } else if (sortBy === 'topic') {
                return (a.topic_title_ru || "").localeCompare(b.topic_title_ru || "");
            }
            return 0;
        });

        return result;
    }, [questions, searchQuery, sortBy, filterBy]);

    // Analytics
    const stats = useMemo(() => {
        return {
            total: questions.length,
            mastered: questions.filter(q => q.mastered).length,
            hard: questions.filter(q => q.difficulty === 'hard').length
        };
    }, [questions]);

    if (!isAuthenticated) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-8 text-center min-h-[60vh] flex flex-col items-center justify-center">
                    <Motion
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <Bookmark className="w-10 h-10 text-purple-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-4">Войдите в аккаунт</h2>
                        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                            Авторизуйтесь, чтобы ваши избранные вопросы сохранялись и были доступны на всех устройствах
                        </p>
                        <Button
                            size="lg"
                            onClick={() => navigate("/login")}
                            className="bg-indigo-600 hover:bg-indigo-700 px-8 rounded-xl shadow-lg shadow-indigo-500/20"
                        >
                            Войти в Skily
                        </Button>
                    </Motion>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8 max-w-7xl">

                {/* HEADER SECTION */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <Motion
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-2"
                    >
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(-1)}
                            className="text-muted-foreground hover:text-white -ml-2 mb-2"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Назад
                        </Button>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                                <Bookmark className="w-6 h-6 text-indigo-400 fill-indigo-400/20" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tight text-white">Моя Коллекция</h1>
                                <p className="text-slate-400 font-medium">Ваш персональный банк знаний для подготовки</p>
                            </div>
                        </div>
                    </Motion>

                    <Motion
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                    >
                        <div className="flex flex-col items-end mr-4 hidden sm:flex">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Эффективность</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold text-emerald-400">{stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0}%</span>
                                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000"
                                        style={{ width: `${stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleStartPractice}
                            disabled={questions.length === 0}
                            size="lg"
                            className={cn(
                                "h-14 px-8 rounded-2xl font-bold transition-all duration-300 relative overflow-hidden group",
                                questions.length > 0
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/30"
                                    : "bg-slate-800 text-slate-500"
                            )}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 via-transparent to-indigo-400/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            <Play className={cn("w-5 h-5 mr-3 group-hover:scale-125 transition-transform", questions.length > 0 && "animate-pulse")} />
                            Тренировать Избранное
                        </Button>
                    </Motion>
                </div>

                {/* ANALYTICS CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <AnalyticsCard
                        label="Всего в коллекции"
                        value={stats.total}
                        icon={<Bookmark className="w-5 h-5" />}
                        color="indigo"
                    />
                    <AnalyticsCard
                        label="Выучено (Mastered)"
                        value={stats.mastered}
                        icon={<Trophy className="w-5 h-5" />}
                        color="emerald"
                    />
                    <AnalyticsCard
                        label="Сложные вопросы"
                        value={stats.hard}
                        icon={<Zap className="w-5 h-5" />}
                        color="rose"
                    />
                    <AnalyticsCard
                        label="Разделов"
                        value={new Set(questions.map(q => q.topic_title_ru)).size}
                        icon={<BarChart3 className="w-5 h-5" />}
                        color="amber"
                    />
                </div>

                {/* TOOLBAR */}
                <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-3xl p-4 mb-8 flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full lg:max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <Input
                            placeholder="Поиск по вопросам или темам..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 h-12 bg-white/5 border-white/10 rounded-2xl focus-visible:ring-indigo-500 focus-visible:bg-white/10 transition-all text-sm"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="flex bg-slate-800/80 p-1 rounded-xl border border-white/5">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('grid')}
                                className={cn("rounded-lg h-9 px-3", viewMode === 'grid' ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-600" : "text-slate-400")}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('list')}
                                className={cn("rounded-lg h-9 px-3", viewMode === 'list' ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-600" : "text-slate-400")}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>

                        <Separator vertical className="h-8 bg-white/10 hidden sm:block" />

                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-1 lg:flex-none">
                            <FilterButton
                                active={filterBy === 'all'}
                                onClick={() => setFilterBy('all')}
                                label="Все"
                            />
                            <FilterButton
                                active={filterBy === 'errors'}
                                onClick={() => setFilterBy('errors')}
                                label="Ошибки"
                            />
                            <FilterButton
                                active={filterBy === 'mastered'}
                                onClick={() => setFilterBy('mastered')}
                                label="Mastered"
                            />
                        </div>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="h-11 bg-slate-800/80 border-white/10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        >
                            <option value="newest">Сначала новые</option>
                            <option value="difficulty">По сложности</option>
                            <option value="topic">По темам</option>
                        </select>
                    </div>
                </div>

                {/* CONTENT AREA */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="aspect-[4/5] bg-slate-900/50 rounded-3xl animate-pulse border border-white/5" />
                        ))}
                    </div>
                ) : filteredQuestions.length > 0 ? (
                    <div className={cn(
                        viewMode === 'grid'
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                            : "space-y-4"
                    )}>
                        {filteredQuestions.map((q, idx) => (
                            <QuestionCard
                                key={q.id}
                                question={q}
                                index={idx}
                                viewMode={viewMode}
                                country={selectedCountry}
                                onRemove={handleRemoveFavorite}
                            />
                        ))}
                    </div>
                ) : (
                    <Motion
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-24 bg-white/5 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-white/10"
                    >
                        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                            <Bookmark className="w-10 h-10 text-slate-500 opacity-30" />
                            <Search className="w-6 h-6 text-indigo-500 absolute bottom-3 right-3" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Ничего не найдено</h3>
                        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                            {searchQuery || filterBy !== 'all'
                                ? "Попробуйте изменить параметры поиска или фильтры"
                                : "Добавляйте сложные вопросы в избранное во время тестов, чтобы они появились здесь"}
                        </p>
                        {(searchQuery || filterBy !== 'all') ? (
                            <Button
                                variant="outline"
                                onClick={() => { setSearchQuery(""); setFilterBy("all"); }}
                                className="rounded-xl"
                            >
                                Сбросить всё
                            </Button>
                        ) : (
                            <Button onClick={() => navigate('/tests')} className="rounded-xl px-8 bg-indigo-600 hover:bg-indigo-700">
                                Перейти к тестам
                            </Button>
                        )}
                    </Motion>
                )}
            </div>
        </Layout>
    );
};

// HELPER COMPONENTS
const AnalyticsCard = ({ label, value, icon, color }: { label: string, value: number, icon: any, color: 'indigo' | 'emerald' | 'rose' | 'amber' }) => {
    const colors = {
        indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        amber: "bg-amber-500/10 text-amber-400 border-amber-500/20"
    };

    return (
        <Motion
            whileHover={{ y: -5 }}
            className={cn("p-4 rounded-3xl border backdrop-blur-md bg-slate-900/40 transition-all", colors[color])}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                    {icon}
                </div>
                <span className="text-2xl font-black">{value}</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 line-clamp-1">{label}</p>
        </Motion>
    );
};

const FilterButton = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
    <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className={cn(
            "rounded-xl h-10 px-5 text-xs font-bold transition-all",
            active
                ? "bg-white text-slate-950 shadow-lg"
                : "text-slate-400 hover:bg-white/5"
        )}
    >
        {label}
    </Button>
);

const QuestionCard = ({ question, index, viewMode, country, onRemove }: { question: FavoriteQuestion, index: number, viewMode: 'grid' | 'list', country: string, onRemove: (id: string) => void }) => {
    const isGrid = viewMode === 'grid';
    const navigate = useNavigate();

    // Haptic if supported
    const handleAction = () => {
        if ('vibrate' in navigator) navigator.vibrate(10);
    };

    return (
        <Motion
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: isGrid ? -8 : 0, scale: isGrid ? 1.02 : 1 }}
            className={cn(
                "group relative bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden transition-all duration-300 isolate",
                isGrid ? "flex flex-col h-full shadow-lg hover:shadow-indigo-500/10" : "flex flex-row p-4 gap-4 items-center"
            )}
        >
            {/* BACKGROUND GLOW */}
            <div className={cn(
                "absolute -z-10 w-32 h-32 blur-[60px] opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity",
                question.mastered ? "bg-emerald-500 -top-6 -right-6" : "bg-indigo-500 -bottom-6 -left-6"
            )} />

            {/* IMAGE SECTION */}
            <div className={cn(
                "relative shrink-0 overflow-hidden",
                isGrid ? "aspect-[16/10] w-full" : "w-32 h-24 rounded-2xl"
            )}>
                <QuestionImage
                    imageUrl={question.image_url}
                    className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700 ease-out group-hover:scale-110"
                />

                {/* STATUS BADGES OVER IMAGE */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-[10]">
                    {question.mastered ? (
                        <div className="flex items-center gap-1.5 bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-900/40 border border-white/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Освоено
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-900/40 border border-white/20">
                            <Zap className="w-3 h-3" />
                            Изучить
                        </div>
                    )}
                </div>

                {/* DIFFICULTY INDICATOR */}
                <div className="absolute bottom-3 left-3 z-[10]">
                    <div className={cn(
                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10 shadow-lg",
                        question.difficulty === 'hard' ? "bg-rose-500/80 text-white" :
                            question.difficulty === 'medium' ? "bg-amber-500/80 text-white" :
                                "bg-emerald-500/80 text-white"
                    )}>
                        {question.difficulty === 'hard' ? 'Сложный' : question.difficulty === 'medium' ? 'Средний' : 'Легкий'}
                    </div>
                </div>

                {/* OVERLAY ON HOVER */}
                {isGrid && (
                    <div className="absolute inset-0 bg-indigo-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm z-[11]">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleAction}
                            className="bg-white text-slate-900 hover:bg-white/90 rounded-xl font-bold translate-y-4 group-hover:translate-y-0 transition-transform duration-300"
                        >
                            Открыть вопрос
                        </Button>
                    </div>
                )}
            </div>

            {/* CONTENT SECTION */}
            <div className={cn(
                "flex flex-col flex-1",
                isGrid ? "p-6" : "justify-between py-1"
            )}>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        {question.topic_title_ru && (
                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-indigo-400 truncate max-w-[150px]">
                                {question.topic_title_ru}
                            </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold ml-auto shrink-0 uppercase">
                            <Clock className="w-3 h-3" />
                            {new Date(question.added_at).toLocaleDateString()}
                        </span>
                    </div>
                    <p className={cn(
                        "font-bold leading-relaxed text-slate-100 dark:text-slate-100",
                        isGrid ? "text-base line-clamp-3 mb-4" : "text-sm line-clamp-2"
                    )}>
                        {country === 'russia' ? question.question_ru : question.question_es}
                    </p>
                </div>

                {/* FOOTER ACTIONS */}
                <div className={cn(
                    "flex items-center justify-between mt-auto border-t border-white/5",
                    isGrid ? "pt-4" : "mt-2 pt-0 border-none"
                )}>
                    {!isGrid ? (
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Прогресс</span>
                                <div className="flex gap-1">
                                    {[...Array(3)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-4 h-1 rounded-full transition-all duration-500",
                                                i < question.correct_streak ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-slate-800"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "w-2.5 h-2.5 rounded-full shadow-[0_0_8px]",
                                question.mastered ? "bg-emerald-500 shadow-emerald-500/50" : "bg-indigo-500 shadow-indigo-500/50"
                            )} />
                            <span className="text-[11px] font-bold text-slate-400 capitalize">
                                {question.correct_streak >= 3 ? "Полностью освоен" :
                                    question.correct_streak === 2 ? "Почти выучен" :
                                        question.correct_streak === 1 ? "В процессе" :
                                            `${question.times_wrong} ошибок`}
                            </span>
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAction();
                            onRemove(question.id);
                        }}
                        className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl w-10 h-10 group/btn transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 className="w-5 h-5 group-hover/btn:scale-110 group-hover/btn:rotate-6 transition-all" />
                    </Button>
                </div>
            </div>

            {/* CLICKABLE AREA */}
            <div className="absolute inset-0 cursor-pointer z-[9]" />
        </Motion>
    );
};

const Separator = ({ vertical, className }: { vertical?: boolean, className?: string }) => (
    <div className={cn(vertical ? "w-[1px]" : "h-[1px]", "bg-border", className)} />
);

export default Favorites;

