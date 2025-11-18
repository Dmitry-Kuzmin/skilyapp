import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { BookOpen, Clock, ArrowRight, Calendar } from "lucide-react";
import { motion } from "framer-motion";

interface Article {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  publishedAt: string;
  readTime: number;
  image?: string;
  category: string;
}

const articles: Article[] = [
  {
    slug: "kak-sdat-ekzamen-dgt-s-pervogo-raza",
    title: "Как сдать экзамен DGT с первого раза",
    description: "Полное руководство по подготовке к теоретическому экзамену DGT в Испании. Практические советы, типичные ошибки и секреты успеха.",
    excerpt: "Экзамен DGT может показаться сложным, но с правильной подготовкой вы можете сдать его с первого раза. Узнайте, как эффективно готовиться и избежать распространенных ошибок.",
    publishedAt: "2024-12-19",
    readTime: 12,
    category: "Подготовка",
  },
  {
    slug: "top-10-oshibok-na-ekzamene-dgt",
    title: "Топ-10 ошибок на экзамене DGT",
    description: "Самые распространенные ошибки при подготовке и сдаче экзамена DGT. Узнайте, как их избежать и увеличить свои шансы на успех.",
    excerpt: "Многие кандидаты повторяют одни и те же ошибки. Мы собрали топ-10 самых частых промахов и рассказали, как их избежать.",
    publishedAt: "2024-12-19",
    readTime: 8,
    category: "Советы",
  },
];

const Blog = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Блог Skilyapp
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Полезные статьи о подготовке к экзамену DGT, советы от экспертов и истории успеха наших студентов
          </p>
        </motion.div>

        {/* Articles Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {articles.map((article, index) => (
            <motion.div
              key={article.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card
                className="h-full cursor-pointer hover:shadow-lg transition-all duration-300 group border-2 hover:border-primary/50"
                onClick={() => navigate(`/blog/${article.slug}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {article.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {article.readTime} мин
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {article.title}
                  </h2>

                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {article.excerpt}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(article.publishedAt).toLocaleDateString("ru-RU", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="group-hover:text-primary"
                    >
                      Читать
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <Card className="bg-gradient-to-br from-primary/10 via-card to-secondary/10 border-2 border-primary/20">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">
                Готовы начать подготовку?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Присоединяйтесь к тысячам студентов, которые уже готовятся к экзамену DGT с помощью Skilyapp
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/tests")}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              >
                Начать обучение
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Blog;

