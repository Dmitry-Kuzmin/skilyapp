import { BookOpen, SignpostBig, Languages, Video, Car, LifeBuoy, Newspaper, Sparkles, BookMarked, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import LearningMap from "./LearningMap";
import { cn } from "@/lib/utils";

const moduleResources = [
  {
    id: "dgt",
    title: "Экзамены DGT",
    description: "4000+ реальных вопросов по категориям A1, B, D с адаптивными подсказками",
    icon: Car,
    badge: "Обновление",
    path: "/dgt-tests",
  },
  {
    id: "signs",
    title: "Дорожные знаки",
    description: "Каталог знаков с примерами ситуаций и быстрым поиском",
    icon: SignpostBig,
    path: "/road-signs",
  },
  {
    id: "dictionary",
    title: "Словарь терминов",
    description: "Испанские термины ПДД с переводом и озвучкой",
    icon: Languages,
    path: "/dictionary",
  },
  {
    id: "videos",
    title: "Видеокурс",
    description: "Серия коротких разборов самых сложных тем теории",
    icon: Video,
    premium: true,
    comingSoon: true,
  },
];

const supportResources = [
  {
    id: "guide",
    title: "Справочник приложения",
    description: "Как устроены уровни, XP, награды и подписки",
    icon: BookMarked,
    action: "/help",
  },
  {
    id: "support",
    title: "Помощь и поддержка",
    description: "FAQ, инструкции и быстрый выход на поддержку",
    icon: LifeBuoy,
    action: "/help",
  },
];

const blogHighlights = [
  {
    id: "map",
    title: "Как использовать карту обучения, чтобы пройти теорию с первого раза",
    tag: "гайд",
    path: "/blog",
  },
  {
    id: "tests",
    title: "5 привычек, которые ускоряют подготовку к экзамену DGT",
    tag: "советы",
    path: "/blog",
  },
];

const ideaTiles = [
  {
    title: "Игры и дуэли",
    description: "Разминай реакцию и внимательность, когда устал от теории",
    icon: Gamepad2,
    action: "/games",
  },
  {
    title: "Банк челленджей",
    description: "Собери подборки вопросов по слабым местам и делись с друзьями",
    icon: Sparkles,
    action: "/tests/challenge-bank",
  },
];

const Learning = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 lg:py-10">
        <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
          <section className="xl:w-[78%] space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-4 py-1.5 w-fit text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span>Обучение</span>
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Карта + ресурсы</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
                Карта обучения и все материалы в одном месте
              </h1>
              <p className="text-muted-foreground text-base lg:text-lg max-w-2xl">
                Строй маршрут, подключай справочники, словари и дополнительные модули, не выходя из одной страницы.
                Карта занимает 80% экрана, а правый бар держит ссылки на всё остальное.
              </p>
            </div>

            <LearningMap variant="embedded" />
          </section>

          <aside className="xl:w-[22%] space-y-4 xl:sticky xl:top-24 h-full">
            <Card className="p-5 space-y-4 border-border/50 bg-card/80 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Материалы
                  </p>
                  <h3 className="text-lg font-semibold mt-1">Быстрый доступ</h3>
                </div>
                <Badge variant="secondary">+ новые</Badge>
              </div>

              <div className="space-y-3">
                {moduleResources.map((resource) => {
                  const isDisabled = !resource.path;
                  return (
                    <button
                      key={resource.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => resource.path && navigate(resource.path)}
                      className={cn(
                        "w-full rounded-2xl border border-border/60 bg-background/60 transition-all duration-300 px-4 py-3 text-left flex items-start gap-3",
                        isDisabled
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:border-primary/40 hover:bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                        <resource.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm leading-tight">{resource.title}</p>
                          {resource.premium && (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                              Premium
                            </Badge>
                          )}
                          {resource.badge && (
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                              {resource.badge}
                            </Badge>
                          )}
                          {resource.comingSoon && (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                              Скоро
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{resource.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5 space-y-4 border-border/50 bg-card/80 backdrop-blur">
              <div className="flex items-center gap-3">
                <LifeBuoy className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Справка
                  </p>
                  <h3 className="text-lg font-semibold">Помощь и гайды</h3>
                </div>
              </div>
              <div className="space-y-3">
                {supportResources.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3 flex items-center gap-3"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex-shrink-0">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(item.action)}>
                      Открыть
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 border-border/50 bg-card/80 backdrop-blur">
              <div className="flex items-center gap-3 mb-3">
                <Newspaper className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Блог</p>
                  <h3 className="text-lg font-semibold leading-tight">Свежие материалы</h3>
                </div>
              </div>
              <div className="space-y-3">
                {blogHighlights.map((post) => (
                  <div key={post.id} className="rounded-2xl border border-border/60 px-4 py-3 bg-background/50">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide mb-2">
                      {post.tag}
                    </Badge>
                    <p className="text-sm font-semibold leading-snug mb-3">{post.title}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-0 text-primary"
                      onClick={() => navigate(post.path)}
                    >
                      Читать
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 border-border/50 bg-gradient-to-br from-primary/5 via-card to-secondary/5 backdrop-blur space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Идеи</p>
                  <h3 className="text-lg font-semibold">Экспресс-режимы</h3>
                </div>
              </div>
              <div className="space-y-3">
                {ideaTiles.map((idea) => (
                  <div
                    key={idea.title}
                    className="rounded-2xl border border-border/60 bg-background/50 px-4 py-3 flex items-start gap-3"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                      <idea.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{idea.title}</p>
                      <p className="text-xs text-muted-foreground mb-3">{idea.description}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(idea.action)}
                      >
                        Перейти
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default Learning;
