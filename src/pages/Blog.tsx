import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Search, 
  Clock, 
  Calendar, 
  ArrowRight,
  Newspaper,
  GraduationCap,
  Lightbulb,
  ChevronRight,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Article {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  publishedAt: string;
  readTime: number;
  category: string;
  categorySlug: string;
}

const categories = [
  { id: "all", name: "Все статьи", icon: Newspaper },
  { id: "preparation", name: "Подготовка", icon: GraduationCap },
  { id: "tips", name: "Советы", icon: Lightbulb },
];

const articles: Article[] = [
  {
    slug: "kak-sdat-ekzamen-dgt-s-pervogo-raza",
    title: "Как сдать экзамен DGT с первого раза",
    description: "Полное руководство по подготовке к теоретическому экзамену DGT в Испании. Практические советы, типичные ошибки и секреты успеха.",
    excerpt: "Экзамен DGT может показаться сложным, но с правильной подготовкой вы можете сдать его с первого раза. Узнайте, как эффективно готовиться и избежать распространенных ошибок.",
    publishedAt: "2024-12-19",
    readTime: 12,
    category: "Подготовка",
    categorySlug: "preparation",
  },
  {
    slug: "top-10-oshibok-na-ekzamene-dgt",
    title: "Топ-10 ошибок на экзамене DGT",
    description: "Самые распространенные ошибки при подготовке и сдаче экзамена DGT. Узнайте, как их избежать и увеличить свои шансы на успех.",
    excerpt: "Многие кандидаты повторяют одни и те же ошибки. Мы собрали топ-10 самых частых промахов и рассказали, как их избежать.",
    publishedAt: "2024-12-19",
    readTime: 8,
    category: "Советы",
    categorySlug: "tips",
  },
];

const Blog = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Добавляем RSS feed в head
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "alternate";
    link.type = "application/rss+xml";
    link.title = "Skilyapp Blog RSS";
    link.href = "https://skilyapp.com/rss.xml";
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const filteredArticles = articles.filter(article => {
    const matchesSearch = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      activeCategory === "all" || article.categorySlug === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-105">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">Skilyapp</span>
            </Link>

            {/* Search */}
            <div className="flex-1 max-w-xl mx-4 md:mx-8">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" />
                <Input
                  placeholder="Поиск статей..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-20 bg-gray-50/80 dark:bg-gray-900/80 border-gray-200 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all duration-200"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Right Links */}
            <div className="flex items-center gap-3">
              <Link to="/" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hidden sm:block transition-colors font-medium">
                Главная
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6 lg:gap-8">
          {/* Left Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24">
              {/* Blog Title */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Блог</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Полезные статьи о подготовке к экзамену DGT
                </p>
              </div>

              {/* Categories */}
              <nav className="space-y-1">
                {categories.map((category) => {
                  const Icon = category.icon;
                  const isActive = activeCategory === category.id;
                  const count = category.id === "all" 
                    ? articles.length 
                    : articles.filter(a => a.categorySlug === category.id).length;
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3 justify-between",
                        isActive
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-500"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn(
                          "w-4 h-4 flex-shrink-0",
                          isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                        )} />
                        <span className="truncate">{category.name}</span>
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        isActive
                          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 xl:col-span-4">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Статьи не найдены
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Попробуйте изменить запрос или категорию
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Articles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredArticles.map((article, index) => (
                    <Card
                      key={article.slug}
                      className="group cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900/50 overflow-hidden"
                      onClick={() => navigate(`/blog/${article.slug}`)}
                    >
                      <div className="p-6">
                        {/* Category Badge */}
                        <div className="flex items-center gap-2 mb-3">
                          <Badge 
                            variant="secondary" 
                            className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40"
                          >
                            {article.category}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            {article.readTime} мин
                          </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-xl font-bold mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                          {article.title}
                        </h2>

                        {/* Excerpt */}
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 leading-relaxed">
                          {article.excerpt}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {new Date(article.publishedAt).toLocaleDateString("ru-RU", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400"
                          >
                            Читать
                            <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* CTA Section */}
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800/40 mt-12">
                  <div className="p-8 text-center">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                      Готовы начать подготовку?
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
                      Присоединяйтесь к тысячам студентов, которые уже готовятся к экзамену DGT с помощью Skilyapp
                    </p>
                    <Button
                      size="lg"
                      onClick={() => navigate("/tests")}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/50"
                    >
                      Начать обучение
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Blog;
