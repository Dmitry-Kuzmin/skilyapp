import { useState, useEffect } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { useModalRoute } from "@/hooks/useModalRoute";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, BookOpen, TrendingUp, Sparkles, Trophy, Zap, Info, HelpCircle } from "lucide-react";
import { getTermProgressStats, TermProgress } from "@/lib/termProgress";
import { useUserContext } from "@/contexts/UserContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TermProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermProgressModal({ open, onOpenChange }: TermProgressModalProps) {
  const { profileId } = useUserContext();
  const route = useModalRoute('term-progress');
  const isOpen = open || route.isOpen;
  const handleOpenChange = (state: boolean) => {
    if (onOpenChange) onOpenChange(state);
    if (state) {
      route.openModal();
    } else {
      route.closeModal();
    }
  };
  const [loading, setLoading] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);
  const [stats, setStats] = useState({
    studied: 0,
    inProgress: 0,
    notStarted: 0,
    total: 0,
    progress: [] as TermProgress[],
  });

  useEffect(() => {
    if (isOpen && profileId) {
      const timer = setTimeout(() => {
        loadStats();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, profileId]);

  const loadStats = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const data = await getTermProgressStats(profileId);
      setStats(data);
    } catch (error) {
      console.error('Error loading term progress stats:', error);
      setStats({
        studied: 0,
        inProgress: 0,
        notStarted: 0,
        total: 0,
        progress: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const overallProgress = stats.total > 0 
    ? Math.round((stats.studied / stats.total) * 100) 
    : 0;

  const recentProgress = stats.progress
    .filter(p => p.times_practiced > 0)
    .slice(0, 8);

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="Прогресс изучения терминов"
      className="max-w-3xl max-h-[85vh] overflow-hidden p-0 bg-gradient-to-br from-background via-background to-primary/5 border-2 border-primary/20 shadow-2xl"
      showTitleBar={false}
      loading={loading}
      skeletonVariant="default"
      modalRouteKey="term-progress"
    >
        <div className="overflow-y-auto max-h-[85vh] p-6 space-y-6">
        <div className="space-y-3 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="flex items-center justify-center w-12 h-12 rounded-xl gradient-primary shadow-primary"
              >
                <Trophy className="w-6 h-6 text-primary-foreground" />
              </motion.div>
              <div className="flex-1">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Прогресс изучения терминов
              </h2>
              <p className="text-base mt-1 text-muted-foreground">
                  Отслеживайте свой прогресс в изучении испанских терминов
              </p>
              </div>
            </div>
            
            <Collapsible open={showExplanation} onOpenChange={setShowExplanation}>
              <CollapsibleTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      Как считается статистика?
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: showExplanation ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Info className="w-4 h-4 text-primary" />
                  </motion.div>
                </motion.button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 p-4 rounded-lg bg-muted/50 border border-border/50 space-y-3"
                >
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-success">Изучено:</span>
                        <p className="text-muted-foreground">
                          Термин считается изученным, если вы правильно ответили на него <strong>3 раза</strong> в играх (Race, Четыре варианта и др.).
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-primary">В процессе:</span>
                        <p className="text-muted-foreground">
                          Термины, на которые вы ответили правильно <strong>1-2 раза</strong>. Продолжайте практиковаться!
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-muted-foreground">Не начато:</span>
                        <p className="text-muted-foreground">
                          Термины, которые вы еще не встречали в играх.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        <strong>Важно:</strong> Прогресс обновляется только в играх, связанных с терминами (Race, Четыре варианта). 
                        Каждый правильный ответ увеличивает счетчик на 1, неправильный ответ уменьшает уровень мастерства на 5%.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </CollapsibleContent>
            </Collapsible>
            </div>

        {stats.total > 0 ? (
            <div className="space-y-6">
            {/* Общая статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Всего изучено</p>
                <div className="text-3xl font-black text-primary">{stats.studied}</div>
                <p className="text-xs text-muted-foreground">
                  {overallProgress}% от {stats.total} терминов
                </p>
              </Card>
              <Card className="p-4 space-y-2">
                <p className="text-sm text-muted-foreground">В процессе</p>
                <div className="text-3xl font-black text-amber-500">{stats.inProgress}</div>
                <p className="text-xs text-muted-foreground">
                  Продолжайте практиковаться!
                </p>
                  </Card>
              <Card className="p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Не начато</p>
                <div className="text-3xl font-black text-muted-foreground">{stats.notStarted}</div>
                <p className="text-xs text-muted-foreground">
                  Готовы к первому прохождению
                </p>
                  </Card>
                        </div>

            {/* Прогресс-бар */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Общий прогресс</span>
                <span className="font-semibold text-primary">{overallProgress}%</span>
                    </div>
              <Progress value={overallProgress} className="h-3" />
              </div>

            {/* Недавний прогресс */}
            <div className="space-y-4">
                      <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Недавние успехи
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Последние 8 терминов с прогрессом
                      </span>
                  </div>

              {recentProgress.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <AnimatePresence>
                      {recentProgress.map((term, index) => (
                        <motion.div
                          key={term.term_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                        <Card className="p-4 space-y-2 border-border/60 bg-card/90">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-base">
                              {term.term}
                                </div>
                            <Badge variant="outline" className="bg-primary/5">
                              {term.mastery_level}%
                            </Badge>
                                </div>
                          <div className="text-sm text-muted-foreground">
                            Уровень: {term.mastery_level >= 66 ? 'Изучено' : term.mastery_level >= 33 ? 'В процессе' : 'Начато'}
                                    </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Sparkles className="w-3 h-3 text-primary" />
                            Ответы: {term.times_practiced}
                            {term.times_practiced < 3 && (
                              <div className="text-primary">
                                Осталось {3 - term.times_practiced} до изучения
                                  </div>
                                )}
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Еще нет недавнего прогресса. Начните с игр Race или «Четыре варианта».
                </div>
              )}
            </div>

              {/* Дополнительная статистика */}
              {stats.progress.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                  className="pt-4 border-t border-border/50"
                >
                  <Card className="p-4 bg-muted/30 border-border/50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Всего терминов:</span>
                        <span className="ml-2 font-bold">{stats.total}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">С прогрессом:</span>
                        <span className="ml-2 font-bold">{stats.studied + stats.inProgress}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Средний уровень:</span>
                        <span className="ml-2 font-bold">
                          {stats.progress.filter(p => p.times_practiced > 0).length > 0
                            ? Math.round(
                                stats.progress
                                  .filter(p => p.times_practiced > 0)
                                  .reduce((acc, p) => acc + p.mastery_level, 0) /
                                stats.progress.filter(p => p.times_practiced > 0).length
                              )
                            : 0}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Почти изучено:</span>
                        <span className="ml-2 font-bold text-primary">
                          {stats.progress.filter(p => p.times_practiced === 2).length}
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Загрузка данных...
          </div>
          )}
        </div>
    </UnifiedModal>
  );
}

