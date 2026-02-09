import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Play, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePDDContext } from "@/contexts/PDDContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FavoriteQuestion = {
    id: string; // Question ID (not record ID)
    question_ru: string;
    question_es: string;
    question_en: string;
    image_url: string | null;
    added_at: string;
    topic_title_ru: string | null;
    topic_title_es: string | null;
};

const Favorites = () => {
    const navigate = useNavigate();
    const { profileId, isAuthenticated } = useUserContext();
    const { selectedCountry, selectedCategory } = usePDDContext();
    const [questions, setQuestions] = useState<FavoriteQuestion[]>([]);
    const [loading, setLoading] = useState(true);

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

            // 1. Get ALL favorites for this user (no complex joins to avoid 400 errors)
            console.log('[Favorites] Loading bookmarks for profile:', profileId);
            const { data: relations, error: relError } = await supabase
                .from('user_challenge_questions')
                .select('question_id, created_at, updated_at')
                .eq('user_id', profileId)
                .eq('is_favorite', true)
                .order('created_at', { ascending: false });

            if (relError) {
                console.error('[Favorites] Relation error:', relError);
                throw relError;
            }

            if (!relations || relations.length === 0) {
                console.log('[Favorites] No relations found');
                setQuestions([]);
                return;
            }

            const questionIds = relations.map(r => r.question_id);
            const relationMap = new Map(relations.map(r => [r.question_id, r]));

            // 2. Load full question details with filters
            console.log('[Favorites] Loading details for', questionIds.length, 'questions with country:', dbCountry);
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

            // Apply country and category filters on the questions_new table directly
            if (dbCountry) {
                questionsQuery = questionsQuery.eq('country', dbCountry);
            }

            if (selectedCategory && selectedCountry === 'russia') {
                questionsQuery = questionsQuery.ilike('metadata->>ticket_category', `%${selectedCategory}%`);
            }

            const { data: questionsData, error: qError } = await questionsQuery;

            if (qError) {
                console.error('[Favorites] Details error:', qError);
                throw qError;
            }

            if (!questionsData || questionsData.length === 0) {
                console.log('[Favorites] No filtered questions found');
                setQuestions([]);
                return;
            }

            // 3. Map and Merge
            const mappedQuestions: FavoriteQuestion[] = questionsData.map((q: any) => {
                const relation = relationMap.get(q.id);
                return {
                    id: q.id,
                    question_ru: q.question_ru,
                    question_es: q.question_es,
                    question_en: q.question_en,
                    image_url: q.image_url,
                    added_at: relation ? (relation.updated_at || relation.created_at) : new Date().toISOString(),
                    topic_title_ru: q.topics?.title_ru || null,
                    topic_title_es: q.topics?.title_es || null,
                };
            });

            // Re-sort by added_at
            mappedQuestions.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());

            console.log('[Favorites] Mapped', mappedQuestions.length, 'questions');
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
            // Check existing record state
            const { data: existing } = await supabase
                .from('user_challenge_questions')
                .select('id, mastered, times_wrong')
                .eq('user_id', profileId)
                .eq('question_id', questionId)
                .single();

            if (!existing) return;

            // If it's an error (mastered=false or times_wrong > 0), keep record but unmark favorite.
            // If it's pure favorite (mastered=true or times_wrong=0), delete record.
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
            loadFavorites();
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
        // Navigate to a special test mode for favorites
        // We can reuse challenge bank route but with a param? 
        // Or just pass the list of IDs?
        // Current test logic might assume challenge bank.
        // Let's modify TestSession or useTestQuestions to handle 'favorites' mode.
        // For now, let's assume '/test/favorites' route which we might need to add to App.tsx
        navigate('/test/favorites');
    };

    if (!isAuthenticated) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-8 text-center">
                    <p className="text-muted-foreground mb-4">Войдите, чтобы видеть избранное</p>
                    <Button onClick={() => navigate("/login")}>Войти</Button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                            <Bookmark className="w-8 h-8 text-purple-500 fill-purple-500" />
                            Избранное
                        </h1>
                        <p className="text-muted-foreground">
                            Твоя коллекция сложных вопросов для повторения
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Назад
                    </Button>
                </div>

                {questions.length > 0 ? (
                    <>
                        <Card className="p-6 mb-8 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-2 border-purple-500/20">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold mb-1">Готов повторить?</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {questions.length} вопросов в твоей коллекции
                                    </p>
                                </div>
                                <Button onClick={handleStartPractice} size="lg" className="bg-purple-600 hover:bg-purple-700 w-full md:w-auto">
                                    <Play className="w-5 h-5 mr-2" />
                                    Тренировать Избранное
                                </Button>
                            </div>
                        </Card>

                        <div className="space-y-4">
                            {questions.map((q) => (
                                <Card key={q.id} className="p-4 hover:shadow-lg transition-all border-l-4 border-l-purple-500">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                                    Сохранено {new Date(q.added_at).toLocaleDateString()}
                                                </span>
                                                {q.topic_title_ru && (
                                                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                                                        {q.topic_title_ru}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-medium text-lg mb-2">
                                                {selectedCountry === 'russia' ? q.question_ru : q.question_es}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveFavorite(q.id)}
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12 bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
                        <Bookmark className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">В избранном пока пусто</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            Добавляйте сложные вопросы в избранное во время тестов, нажав на флажок
                        </p>
                        <Button onClick={() => navigate('/tests')}>
                            Перейти к тестам
                        </Button>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Favorites;
