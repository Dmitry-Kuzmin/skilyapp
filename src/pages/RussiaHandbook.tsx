import { useState, useMemo } from "react";
import {
    BookOpen,
    Search,
    ArrowRight,
    ChevronRight,
    BadgeCheck,
    GraduationCap,
    Sparkles,
    Info,
    ExternalLink,
    ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { russiaHandbookSections } from "@/data/russiaHandbookData";

const RussiaHandbook = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredSections = useMemo(() => {
        if (!searchTerm.trim()) return russiaHandbookSections;
        const term = searchTerm.toLowerCase();
        return russiaHandbookSections.filter(s =>
            s.title.toLowerCase().includes(term) ||
            s.description.toLowerCase().includes(term) ||
            s.number.includes(term)
        );
    }, [searchTerm]);

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-secondary/5 pb-20">
                <div className="container mx-auto px-4 py-8 lg:py-12 max-w-6xl">

                    {/* Header Section */}
                    <div className="space-y-6 mb-12">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 w-fit text-[10px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 font-bold shadow-sm">
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    <span>База знаний РФ</span>
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-black text-foreground tracking-tight">
                                    Учебник <span className="text-emerald-600 dark:text-emerald-400">ПДД</span>
                                </h1>
                                <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                                    Официальные правила дорожного движения Российской Федерации с последними изменениями от 2024 года.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/learning')}
                                    className="rounded-xl border-border/50 bg-card hover:bg-muted"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" />
                                    Назад
                                </Button>
                                <Button
                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 shadow-lg"
                                    onClick={() => window.open('http://www.consultant.ru/document/cons_doc_LAW_2709/', '_blank')}
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Официальный текст
                                </Button>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative group max-w-2xl">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
                            <Input
                                placeholder="Поиск по разделам, правилам или ключевым словам..."
                                className="h-14 pl-12 pr-4 text-lg rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Grid of Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                        {filteredSections.map((section, index) => (
                            <Card
                                key={section.id}
                                onClick={() => navigate(`/learn/russia/handbook/${section.id}`)}
                                className="group relative overflow-hidden cursor-pointer rounded-2xl border-border/40 bg-card/60 hover:bg-card hover:border-emerald-500/30 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-6"
                            >
                                {/* Background Decor */}
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />

                                <div className="relative space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xl group-hover:scale-110 transition-transform duration-500">
                                            {section.number}
                                        </div>
                                        {index < 3 && (
                                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none px-2 py-0 text-[10px] uppercase font-bold tracking-tighter">
                                                BASIC
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                            {section.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                            {section.description}
                                        </p>
                                    </div>

                                    <div className="pt-2 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                            <BookOpen className="w-3.5 h-3.5" />
                                            <span>Читать раздел</span>
                                        </div>
                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Empty State */}
                    {filteredSections.length === 0 && (
                        <div className="text-center py-20 space-y-4">
                            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                                <Search className="w-10 h-10 text-muted-foreground/30" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold">Ничего не найдено</h3>
                                <p className="text-muted-foreground max-w-xs mx-auto">
                                    Попробуйте изменить запрос или поискать в официальном документе.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setSearchTerm("")}
                                className="rounded-xl"
                            >
                                Сбросить поиск
                            </Button>
                        </div>
                    )}

                    {/* Bottom Info Card */}
                    <Card className="mt-12 overflow-hidden border-none bg-emerald-600/5 dark:bg-emerald-600/10 rounded-[2rem]">
                        <div className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                            <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0">
                                <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse" />
                                <div className="relative w-full h-full bg-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl">
                                    <Sparkles className="w-16 h-16 md:w-20 md:h-20 text-white" />
                                </div>
                            </div>
                            <div className="space-y-4 text-center md:text-left">
                                <h2 className="text-3xl font-black tracking-tight">Интерактивное обучение</h2>
                                <p className="text-muted-foreground text-lg leading-relaxed">
                                    Используйте учебник вместе с нашими <span className="font-bold text-foreground underline decoration-emerald-500/30 underline-offset-4">интерактивными тестами</span>.
                                    После каждой главы вы можете проверить свои знания в режиме реального времени.
                                </p>
                                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-xl border border-border shadow-sm">
                                        <BadgeCheck className="w-5 h-5 text-emerald-500" />
                                        <span className="text-sm font-semibold">Актуальность 2024</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-xl border border-border shadow-sm">
                                        <Info className="w-5 h-5 text-emerald-500" />
                                        <span className="text-sm font-semibold">Комментарии юристов</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </Layout>
    );
};

export default RussiaHandbook;
