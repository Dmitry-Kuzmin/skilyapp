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

const RussiaHandbookArticle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [material, setMaterial] = useState<Material | null>(null);

    const section = russiaHandbookSections.find(s => s.id === id);

    useEffect(() => {
        const fetchMaterial = async () => {
            if (!id) return;
            setLoading(true);

            try {
                // Мы ищем материал, который привязан к этому разделу ПДД РФ
                // Для этого мы можем использовать title_ru или специальный тег, 
                // но пока попробуем найти по заголовку
                const { data, error } = await supabase
                    .from('materials')
                    .select('*')
                    .ilike('title_ru', `%${section?.title}%`)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    setMaterial(data as Material);
                }
            } catch (error) {
                console.error("Error fetching material:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMaterial();
    }, [id, section]);

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
            <div className="min-h-screen bg-background pb-20">
                {/* Actions Bar */}
                <div className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur-md">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/learn/russia/handbook')}
                            className="rounded-xl"
                        >
                            <ChevronLeft className="w-5 h-5 mr-1" />
                            Все разделы
                        </Button>

                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="rounded-xl">
                                <Bookmark className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-xl">
                                <Share2 className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8 lg:py-12 max-w-4xl">
                    <div className="space-y-8">
                        {/* Header */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 font-black">
                                    {section.number}
                                </div>
                                <div className="h-px flex-1 bg-border/50" />
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                                {section.title}
                            </h1>
                        </div>

                        {/* Content Area */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                                <p className="text-muted-foreground animate-pulse font-medium">Загружаем правила...</p>
                            </div>
                        ) : material ? (
                            <MaterialViewer material={material} language="ru" />
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
                        <div className="pt-12 border-t mt-20">
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex-1 space-y-1">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Следующая глава</p>
                                    <Button variant="link" className="p-0 h-auto text-xl font-bold text-foreground hover:text-emerald-600">
                                        Общие обязанности водителей
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default RussiaHandbookArticle;
