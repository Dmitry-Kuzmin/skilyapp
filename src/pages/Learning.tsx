import { useMemo } from "react";
import {
  BookOpen,
  SignpostBig,
  Languages,
  Video,
  Car,
  LifeBuoy,
  Newspaper,
  Sparkles,
  BookMarked,
  Gamepad2,
  HelpCircle,
  Zap,
  TrendingUp,
  Award,
  Users,
  Target,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import LearningMap from "./LearningMap";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePDDContext } from "@/contexts/PDDContext";

interface Resource {
  id: string;
  title: string;
  description: string;
  icon: any;
  path?: string;
  badge?: string;
  premium?: boolean;
  comingSoon?: boolean;
  gradient: string;
  iconBg: string;
}

interface SupportResource {
  id: string;
  title: string;
  description: string;
  icon: any;
  action: string;
  color: string;
  bg: string;
  isExternal?: boolean;
}

const Learning = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { selectedCountry } = usePDDContext();

  // Ресурсы для модуля обучения (Материалы)
  const moduleResources = useMemo<Resource[]>(() => {
    const commonResources: Resource[] = [
      {
        id: "signs",
        title: t('learningPage.materials.roadSigns'),
        description: t('learningPage.materials.roadSignsDesc'),
        icon: SignpostBig,
        path: "/road-signs",
        gradient: "from-orange-500/10 to-red-500/10",
        iconBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      },
      {
        id: "dictionary",
        title: t('learningPage.materials.dictionary'),
        description: t('learningPage.materials.dictionaryDesc'),
        icon: Languages,
        path: "/dictionary",
        gradient: "from-purple-500/10 to-pink-500/10",
        iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      },
      {
        id: "videos",
        title: t('learningPage.materials.videoCourse'),
        description: t('learningPage.materials.videoCourseDesc'),
        icon: Video,
        premium: true,
        comingSoon: true,
        gradient: "from-yellow-500/10 to-amber-500/10",
        iconBg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      },
    ];

    if (selectedCountry === 'russia' || language === 'ru') {
      return [
        {
          id: "handbook",
          title: t('learningPage.materials.handbook'),
          description: t('learningPage.materials.handbookDesc'),
          icon: BookOpen,
          badge: "NEW",
          path: "/learn/russia/handbook",
          gradient: "from-emerald-500/10 to-teal-500/10",
          iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
        {
          id: "pdd-tickets",
          title: "Билеты ПДД РФ",
          description: "40 официальных билетов ГИБДД (A, B, M) для подготовки к экзамену в России.",
          icon: Car,
          badge: "2024",
          path: "/tests",
          gradient: "from-blue-500/10 to-cyan-500/10",
          iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        },
        ...commonResources.filter(r => r.id !== 'videos'),
      ];
    }

    return [
      {
        id: "dgt",
        title: t('learningPage.materials.dgtExams'),
        description: t('learningPage.materials.dgtExamsDesc'),
        icon: Car,
        badge: t('learningPage.materials.updateBadge'),
        path: "/dgt-tests",
        gradient: "from-blue-500/10 to-cyan-500/10",
        iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      },
      ...commonResources,
    ];
  }, [language, selectedCountry, t]);

  // Ресурсы поддержки
  const supportResources = useMemo<SupportResource[]>(() => {
    const commonSupport: SupportResource[] = [
      {
        id: "guide",
        title: t('learningPage.support.appGuide'),
        description: t('learningPage.support.appGuideDesc'),
        icon: BookMarked,
        action: "/help",
        color: "text-indigo-600 dark:text-indigo-400",
        bg: "bg-indigo-500/10",
      },
      {
        id: "support",
        title: t('learningPage.support.helpSupport'),
        description: t('learningPage.support.helpSupportDesc'),
        icon: LifeBuoy,
        action: "/help",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
      },
    ];

    if (language === 'ru') {
      return [
        ...commonSupport,
        {
          id: "telegram",
          title: t('learningPage.support.tgChannel'),
          description: t('learningPage.support.tgChannelDesc'),
          icon: Users,
          action: "https://t.me/sdadim_es", // Пример ссылки
          color: "text-blue-500",
          bg: "bg-blue-500/10",
          isExternal: true,
        },
      ];
    }

    return commonSupport;
  }, [language, t]);

  // Хайлайты блога (можно фильтровать по языку в будущем)
  const blogHighlights = useMemo(() => {
    const highlights = [
      {
        id: "map",
        title: t('learningPage.blog.mapGuide'),
        tag: t('learningPage.blog.guides'),
        path: "/blog/kak-ispolzovat-kartu-obucheniya",
        readTime: "5 мин",
      },
      {
        id: "tests",
        title: t('learningPage.blog.habitsGuide'),
        tag: t('learningPage.blog.tips'),
        path: "/blog/5-privychek-podgotovki",
        readTime: "7 мин",
      },
    ];

    // Добавляем специфичный контент для DGT если язык не русский
    if (language !== 'ru') {
      highlights.push({
        id: "errors",
        title: t('learningPage.blog.topErrors'),
        tag: t('learningPage.blog.statistics'),
        path: "/blog/top-10-oshibok-na-ekzamene-dgt",
        readTime: "16 мин",
      });
    }

    return highlights;
  }, [language, t]);

  // Плитки идей
  const ideaTiles = useMemo(() => [
    {
      title: t('learningPage.ideas.gamesDuels'),
      description: t('learningPage.ideas.gamesDuelsDesc'),
      icon: Gamepad2,
      action: "/games",
      gradient: "from-violet-500/10 to-purple-500/10",
    },
    {
      title: t('learningPage.ideas.challengeBank'),
      description: t('learningPage.ideas.challengeBankDesc'),
      icon: Sparkles,
      action: "/tests/challenge-bank",
      gradient: "from-rose-500/10 to-pink-500/10",
    },
    {
      title: t('learningPage.ideas.sequentialTests'),
      description: t('learningPage.ideas.sequentialTestsDesc'),
      icon: Target,
      action: "/tests/sequential",
      gradient: "from-teal-500/10 to-cyan-500/10",
    },
  ], [t]);

  // Быстрые действия
  const quickActions = useMemo(() => [
    {
      title: t('learningPage.quickActions.blog'),
      description: t('learningPage.quickActions.blogDesc'),
      icon: Newspaper,
      action: "/blog",
      count: t('learningPage.blog.articles'),
    },
    {
      title: t('learningPage.quickActions.guide'),
      description: t('learningPage.quickActions.guideDesc'),
      icon: HelpCircle,
      action: "/help",
      count: t('learningPage.blog.fullGuide'),
    },
  ], [t]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 lg:py-10 max-w-[1600px]">
        <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
          {/* Основной контент - Карта обучения (80%) */}
          <section className="xl:w-[78%] space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 px-4 py-1.5 w-fit text-xs uppercase tracking-[0.2em] text-primary font-medium shadow-sm">
                <Sparkles className="w-3 h-3" />
                <span>{t('learningPage.badge')}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span>{t('learningPage.badgeSubtext')}</span>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl lg:text-5xl font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  {t('learningPage.title')}
                </h1>
                <p className="text-muted-foreground text-base lg:text-lg max-w-2xl leading-relaxed">
                  {t('learningPage.subtitle')}
                </p>
              </div>
            </div>

            <div className="relative">
              <LearningMap variant="embedded" />
            </div>
          </section>

          {/* Правый сайдбар (22%) */}
          <aside className="xl:w-[22%] space-y-4 xl:sticky xl:top-24 xl:h-[calc(100vh-8rem)] xl:overflow-y-auto xl:pb-6">
            {/* Материалы */}
            <Card className="p-5 space-y-4 border-border/50 bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                    {t('learningPage.materials.title')}
                  </p>
                  <h3 className="text-lg font-bold mt-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {t('learningPage.materials.quickAccess')}
                  </h3>
                </div>
                <Badge variant="secondary" className="animate-pulse">{t('learningPage.materials.newBadge')}</Badge>
              </div>

              <div className="space-y-2.5">
                {moduleResources.map((resource) => {
                  const isDisabled = !resource.path;
                  return (
                    <button
                      key={resource.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => resource.path && navigate(resource.path)}
                      className={cn(
                        "group w-full rounded-xl border border-border/60 bg-gradient-to-br transition-all duration-300 px-4 py-3.5 text-left flex items-start gap-3 overflow-hidden relative",
                        resource.gradient,
                        isDisabled
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:border-primary/50 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0 transition-transform group-hover:scale-110",
                        resource.iconBg
                      )}>
                        <resource.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start gap-2 flex-wrap">
                          <p className="font-bold text-sm leading-tight break-words">{resource.title}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {resource.premium && (
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wide whitespace-nowrap border-amber-500/30 text-amber-600 dark:text-amber-400">
                                Premium
                              </Badge>
                            )}
                            {resource.badge && (
                              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide whitespace-nowrap">
                                {resource.badge}
                              </Badge>
                            )}
                            {resource.comingSoon && (
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wide whitespace-nowrap">
                                {t('learningPage.materials.comingSoon')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 break-words leading-relaxed">{resource.description}</p>
                      </div>
                      {!isDisabled && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Помощь и гайды */}
            <Card className="p-5 space-y-4 border-border/50 bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                  <LifeBuoy className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                    {t('learningPage.support.title')}
                  </p>
                  <h3 className="text-lg font-bold">{t('learningPage.support.helpAndGuides')}</h3>
                </div>
              </div>
              <div className="space-y-2.5">
                {supportResources.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if ('isExternal' in item && item.isExternal) {
                        window.open(item.action, '_blank');
                      } else {
                        navigate(item.action);
                      }
                    }}
                    className="group w-full rounded-xl border border-border/60 bg-background/60 hover:bg-background/80 px-4 py-3.5 flex items-center gap-3 transition-all duration-300 hover:border-primary/40 hover:shadow-md"
                  >
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-transform group-hover:scale-110",
                      item.bg
                    )}>
                      <item.icon className={cn("w-5 h-5", item.color)} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-sm break-words">{item.title}</p>
                      <p className="text-xs text-muted-foreground break-words mt-0.5">{item.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                ))}
              </div>
            </Card>

            {/* Блог */}
            <Card className="p-5 border-border/50 bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                  <Newspaper className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">{t('learningPage.blog.title')}</p>
                  <h3 className="text-lg font-bold leading-tight">{t('learningPage.blog.freshMaterials')}</h3>
                </div>
              </div>
              <div className="space-y-3">
                {blogHighlights.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => navigate(post.path)}
                    className="group w-full rounded-xl border border-border/60 bg-background/50 hover:bg-background/70 px-4 py-3.5 text-left transition-all duration-300 hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {post.tag}
                      </Badge>
                      {post.readTime && (
                        <span className="text-[10px] text-muted-foreground">{post.readTime}</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold leading-snug mb-2 group-hover:text-primary transition-colors">{post.title}</p>
                    <div className="flex items-center gap-1 text-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {t('learningPage.blog.readMore')}
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => navigate("/blog")}
                >
                  {t('learningPage.blog.allArticles')}
                </Button>
              </div>
            </Card>

            {/* Экспресс-режимы */}
            <Card className="p-5 border-border/50 bg-gradient-to-br from-primary/10 via-card/95 to-secondary/10 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">{t('learningPage.ideas.title')}</p>
                  <h3 className="text-lg font-bold">{t('learningPage.ideas.expressModes')}</h3>
                </div>
              </div>
              <div className="space-y-2.5">
                {ideaTiles.map((idea) => (
                  <button
                    key={idea.title}
                    type="button"
                    onClick={() => navigate(idea.action)}
                    className={cn(
                      "group w-full rounded-xl border border-border/60 bg-gradient-to-br px-4 py-3.5 flex items-start gap-3 transition-all duration-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                      idea.gradient
                    )}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary flex-shrink-0 transition-transform group-hover:scale-110">
                      <idea.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm mb-1">{idea.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{idea.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </Card>

            {/* Быстрые действия */}
            <Card className="p-5 border-border/50 bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                  <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">{t('learningPage.quickActions.title')}</p>
                  <h3 className="text-lg font-bold">{t('learningPage.quickActions.additional')}</h3>
                </div>
              </div>
              <div className="space-y-2">
                {quickActions.map((action) => (
                  <button
                    key={action.title}
                    type="button"
                    onClick={() => navigate(action.action)}
                    className="group w-full rounded-xl border border-border/60 bg-background/60 hover:bg-background/80 px-4 py-3 flex items-center justify-between gap-3 transition-all duration-300 hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                        <action.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-semibold text-sm">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.count}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
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
