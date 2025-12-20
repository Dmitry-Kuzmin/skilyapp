import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    Share2,
    Bookmark,
    MessageSquare,
    AlertTriangle,
    BookOpen,
    Loader2,
    Sparkles,
    ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { russiaHandbookSections } from "@/data/russiaHandbookData";
import { MaterialViewer, Material } from "@/components/learning-map/MaterialViewer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RussiaHandbookArticle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [material, setMaterial] = useState<Material | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    const section = russiaHandbookSections.find(s => s.id === id);
    const nextSectionId = section ? (parseInt(section.id) + 1).toString() : null;
    const nextSection = russiaHandbookSections.find(s => s.id === nextSectionId);

    useEffect(() => {
        const fetchMaterial = async () => {
            if (!id) return;
            setLoading(true);

            try {
                const { data, error } = await supabase
                    .from('materials')
                    .select('*')
                    .ilike('title_ru', `%${section?.title}%`)
                    .maybeSingle();

                if (error) throw error;
                if (data) setMaterial(data as Material);

                // Mock logic for bookmarks/completion
                const bookmarked = localStorage.getItem(`handbook_bookmark_${id}`) === 'true';
                setIsBookmarked(bookmarked);
                const completed = localStorage.getItem(`handbook_complete_${id}`) === 'true';
                setIsCompleted(completed);

            } catch (error) {
                console.error("Error fetching material:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMaterial();
        window.scrollTo(0, 0);
    }, [id, section]);

    const handleBookmark = () => {
        const newState = !isBookmarked;
        setIsBookmarked(newState);
        localStorage.setItem(`handbook_bookmark_${id}`, newState.toString());
        toast.success(newState ? "Добавлено в закладки" : "Удалено из закладок");
    };

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `ПДД РФ: ${section?.title}`,
                    text: `Изучаю правила дорожного движения: ${section?.title}`,
                    url: window.location.href,
                });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success("Ссылка скопирована");
            }
        } catch (err) {
            console.error("Error sharing:", err);
        }
    };

    const handleComplete = async () => {
        setIsCompleted(true);
        localStorage.setItem(`handbook_complete_${id}`, 'true');
        toast.success("Раздел изучен! +10 XP", { icon: "🎉" });
    };

    if (!section) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-20 text-center">
                    <h1 className="text-2xl font-bold">Раздел не найден</h1>
                    <Button onClick={() => navigate('/learn/russia/handbook')} className="mt-4">
                        Вернуться к списку
                    </Button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="min-h-screen bg-background">
                {/* Compact Sticky Header */}
                <div className="sticky top-0 md:top-16 z-40 w-full border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
                    <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
                        <div className="flex items-center min-w-0 gap-2 md:gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/learn/russia/handbook')}
                                className="h-9 px-2 hover:bg-accent rounded-lg shrink-0"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                <span className="hidden sm:inline ml-1 font-medium">Назад</span>
                            </Button>

                            <div className="h-4 w-px bg-border/60 shrink-0" />

                            <div className="flex items-center min-w-0 gap-2">
                                <div className="flex items-center justify-center min-w-[24px] h-[24px] rounded-md bg-emerald-500 text-white text-[10px] font-black shrink-0">
                                    {section.number}
                                </div>
                                <h1 className="text-sm md:text-base font-bold truncate text-foreground/90">
                                    {section.title}
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("w-9 h-9 rounded-lg transition-colors", isBookmarked && "text-emerald-500 bg-emerald-500/10")}
                                onClick={handleBookmark}
                            >
                                <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-9 h-9 rounded-lg"
                                onClick={handleShare}
                            >
                                <Share2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 pt-1 md:pt-2 pb-20 max-w-4xl">
                    <div className="space-y-4">
                        {/* Content Area */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                                <p className="text-muted-foreground animate-pulse font-medium">Загружаем правила...</p>
                            </div>
                        ) : material ? (
                            <MaterialViewer
                                material={material}
                                language="ru"
                                hideHeader={true}
                                isCompleted={isCompleted}
                                onComplete={handleComplete}
                            />
                        ) : section.content ? (
                            <MaterialViewer
                                material={{
                                    id: section.id,
                                    subtopic_id: '',
                                    title_ru: section.title,
                                    title_es: '',
                                    title_en: '',
                                    content_ru: section.content,
                                    content_es: '',
                                    content_en: '',
                                    images: section.images
                                }}
                                language="ru"
                                hideHeader={true}
                                isCompleted={isCompleted}
                                onComplete={handleComplete}
                            />
                        ) : (
                            <div className="space-y-12">
                                <Card className="p-8 md:p-12 border-none bg-muted/30 rounded-[2rem] text-center space-y-6">
                                    <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto">
                                        <BookOpen className="w-10 h-10 text-emerald-600" />
                                    </div>
                                    <div className="space-y-3">
                                        <h2 className="text-2xl font-bold">Раздел в наполнении</h2>
                                        <p className="text-muted-foreground max-w-md mx-auto text-lg leading-relaxed">
                                            Мы работаем над тем, чтобы добавить сюда самый актуальный текст правил с разбором сложных ситуаций.
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                        <Button
                                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                                            onClick={() => window.open('https://pdd.drom.ru/', '_blank')}
                                        >
                                            <MessageSquare className="w-4 h-4 mr-2" />
                                            Спросить ИИ-помощника
                                        </Button>
                                        <Button variant="outline" className="rounded-xl w-full sm:w-auto">
                                            <AlertTriangle className="w-4 h-4 mr-2" />
                                            Сообщить об ошибке
                                        </Button>
                                    </div>
                                </Card>

                                {/* Example Content Preview */}
                                <div className="space-y-6 opacity-40 grayscale pointer-events-none select-none">
                                    <div className="space-y-4">
                                        <div className="h-8 bg-muted rounded-lg w-1/3" />
                                        <div className="space-y-2">
                                            <div className="h-4 bg-muted rounded w-full" />
                                            <div className="h-4 bg-muted rounded w-full" />
                                            <div className="h-4 bg-muted rounded w-2/3" />
                                        </div>
                                    </div>
                                    <div className="aspect-video bg-muted rounded-2xl" />
                                </div>
                            </div>
                        )}

                        {/* Navigation Footer */}
                        {nextSection && (
                            <div className="pt-12 border-t mt-20">
                                <div className="flex items-center justify-between gap-6">
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Следующая глава</p>
                                        <Button
                                            variant="link"
                                            className="p-0 h-auto text-xl font-bold text-foreground hover:text-emerald-600 flex items-center gap-2 group"
                                            onClick={() => navigate(`/learn/russia/handbook/${nextSection.id}`)}
                                        >
                                            {nextSection.number}. {nextSection.title}
                                            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default RussiaHandbookArticle;
