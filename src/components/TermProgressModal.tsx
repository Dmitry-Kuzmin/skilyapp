import { useState, useEffect } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
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
    if (open && profileId) {
      // Добавляем небольшую задержку, чтобы избежать частых запросов
      const timer = setTimeout(() => {
        loadStats();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, profileId]);

  const loadStats = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const data = await getTermProgressStats(profileId);
      setStats(data);
    } catch (error) {
      console.error('Error loading term progress stats:', error);
      // Устанавливаем пустые данные при ошибке
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
      open={open}
      onOpenChange={onOpenChange}
      title="Прогресс изучения терминов"
      className="max-w-3xl max-h-[85vh] overflow-hidden p-0 bg-gradient-to-br from-background via-background to-primary/5 border-2 border-primary/20 shadow-2xl"
      showTitleBar={false}
      loading={loading}
      skeletonVariant="default"
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
          
          {/* Объяснение логики */}
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

        <div className="space-y-6">
              {/* Общая статистика с анимацией */}
              <div className="grid grid-cols-3 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="p-5 text-center border-success/30 bg-gradient-to-br from-success/10 to-success/5 hover:shadow-success/20 transition-all duration-300 hover:scale-105 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-success/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="flex items-center justify-center mb-3"
                      >
                        <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-success" />
                        </div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-3xl font-bold text-success mb-1"
                      >
                        {stats.studied}
                      </motion.div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Изучено
                      </div>
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="p-5 text-center border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 hover:shadow-primary/20 transition-all duration-300 hover:scale-105 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                        className="flex items-center justify-center mb-3"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <Clock className="w-6 h-6 text-primary" />
                        </div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-3xl font-bold text-primary mb-1"
                      >
                        {stats.inProgress}
                      </motion.div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        В процессе
                      </div>
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="p-5 text-center border-muted/30 bg-gradient-to-br from-muted/10 to-muted/5 hover:shadow-muted/20 transition-all duration-300 hover:scale-105 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                        className="flex items-center justify-center mb-3"
                      >
                        <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-muted-foreground" />
                        </div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-3xl font-bold text-muted-foreground mb-1"
                      >
                        {stats.notStarted}
                      </motion.div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Не начато
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </div>

              {/* Общий прогресс с анимацией */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="p-6 gradient-card border-primary/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <span className="text-base font-semibold">Общий прогресс</span>
                      </div>
                      <motion.span
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, type: "spring" }}
                        className="text-2xl font-bold text-primary"
                      >
                        {overallProgress}%
                      </motion.span>
                    </div>
                    <div className="relative">
                      <Progress 
                        value={overallProgress} 
                        className="h-3 bg-muted/50"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${overallProgress}%` }}
                        transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                        className="absolute top-0 left-0 h-3 bg-gradient-to-r from-primary via-secondary to-primary rounded-full"
                        style={{
                          backgroundSize: "200% 100%",
                          animation: "shimmer 2s infinite linear",
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="text-muted-foreground">
                        {stats.studied} из {stats.total} терминов изучено
                      </span>
                      <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary">
                        <Zap className="w-3 h-3 mr-1" />
                        {stats.total - stats.studied} осталось
                      </Badge>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Список терминов */}
              {recentProgress.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <span className="text-base font-semibold">Активные термины</span>
                    <Badge variant="outline" className="ml-auto">
                      {recentProgress.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2 scrollbar-hide">
                    <AnimatePresence>
                      {recentProgress.map((term, index) => (
                        <motion.div
                          key={term.term_id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card 
                            className={`p-4 border transition-all duration-300 hover:shadow-lg ${
                              term.is_studied 
                                ? 'border-success/40 bg-gradient-to-r from-success/10 to-success/5' 
                                : term.times_practiced > 0
                                ? 'border-primary/40 bg-gradient-to-r from-primary/10 to-primary/5'
                                : 'border-border bg-card'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-base mb-1 truncate">
                                  {term.term_es}
                                </div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {term.term_ru}
                                </div>
                                {term.times_practiced > 0 && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 max-w-[120px]">
                                      <Progress 
                                        value={term.mastery_level} 
                                        className="h-1.5 bg-muted/50"
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {term.mastery_level}%
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                {term.is_studied ? (
                                  <Badge className="bg-success text-success-foreground border-success shadow-success/20">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Изучено
                                  </Badge>
                                ) : term.times_practiced > 0 ? (
                                  <Badge className="bg-primary text-primary-foreground border-primary shadow-primary/20">
                                    {term.times_practiced}/3
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">
                                    Не начато
                                  </Badge>
                                )}
                                {term.times_practiced > 0 && term.times_practiced < 3 && (
                                  <div className="text-xs text-muted-foreground">
                                    {3 - term.times_practiced} до изучения
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {recentProgress.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-2">
                    Начните играть в игры, чтобы отслеживать прогресс!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Игры: Race, Четыре варианта
                  </p>
                </motion.div>
              )}

              {/* Дополнительная статистика */}
              {stats.progress.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

