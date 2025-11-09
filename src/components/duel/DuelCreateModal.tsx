import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Swords, X, Loader2, CheckCircle2, Hash, TrendingUp, Zap, Sparkles, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserContext } from '@/contexts/UserContext';
import { getHumanReadableError, extractErrorFromResponse } from '@/utils/errorMessages';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';

interface DuelCreateModalProps {
  open: boolean;
  onClose: () => void;
  onDuelCreated: (id: string, code: string) => void;
}

export function DuelCreateModal({ open, onClose, onDuelCreated }: DuelCreateModalProps) {
  const { profileId } = useUserContext();
  const [isCreating, setIsCreating] = useState(false);
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState('mix');
  const [step, setStep] = useState<'config' | 'creating' | 'success'>('config');
  const [createdDuelCode, setCreatedDuelCode] = useState<string | null>(null);
  const [createdDuelId, setCreatedDuelId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!profileId) {
      toast.error('Загрузка профиля...');
      return;
    }

    setIsCreating(true);
    setStep('creating');

    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'create_duel',
          profile_id: profileId,
          num_questions: numQuestions,
          difficulty: difficulty,
        },
      });

      if (error) throw error;

      setCreatedDuelCode(data.duel.code);
      setCreatedDuelId(data.duel.id);
      setStep('success');
      
      // Auto-copy code to clipboard
      try {
        await navigator.clipboard.writeText(data.duel.code);
        setCopied(true);
        toast.success('Дуэль создана! Код скопирован в буфер обмена 🎮');
        setTimeout(() => setCopied(false), 3000);
      } catch (error) {
      toast.success('Дуэль создана! 🎮');
      }
      
        setIsCreating(false);
    } catch (error: any) {
      const extractedError = extractErrorFromResponse(error);
      const humanError = getHumanReadableError(extractedError, 'create');
      toast.error(humanError);
      setStep('config');
      setIsCreating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!createdDuelCode) return;
    
    try {
      await navigator.clipboard.writeText(createdDuelCode);
      setCopied(true);
      toast.success('Код скопирован!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Не удалось скопировать код');
    }
  };

  const handleGoToLobby = () => {
    if (createdDuelId && createdDuelCode) {
      onDuelCreated(createdDuelId, createdDuelCode);
      setStep('config');
      setCreatedDuelCode(null);
      setCreatedDuelId(null);
      onClose();
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('config');
      setCreatedDuelCode(null);
      setCreatedDuelId(null);
      setCopied(false);
      setIsCreating(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 border-2 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-background"
            >
              {/* Header */}
              <DialogHeader className="px-6 pt-6 pb-5 border-b bg-gradient-to-b from-background to-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-blue-500/10 flex items-center justify-center border border-primary/20">
                      <Swords className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-bold leading-tight">
                        Создать дуэль
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Настройте параметры битвы
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-9 w-9 rounded-xl hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              {/* Content */}
              <div className="px-6 py-6 space-y-6 bg-background">
                {/* Number of Questions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold flex items-center gap-2.5">
                      <Hash className="h-4 w-4 text-primary" />
                      Количество вопросов
                    </Label>
                    <div className="flex items-baseline gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
                      <span className="text-3xl font-bold text-primary">{numQuestions}</span>
                      <span className="text-xs text-muted-foreground font-medium">вопросов</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    <Slider
                      value={[numQuestions]}
                      onValueChange={(value) => setNumQuestions(value[0])}
                      min={5}
                      max={30}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground px-1 font-medium">
                      <span>5</span>
                      <span>10</span>
                      <span>15</span>
                      <span>20</span>
                      <span>25</span>
                      <span>30</span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-border/60" />

                {/* Difficulty */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2.5">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Сложность
                  </Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger className="h-12 w-full rounded-xl border-2 hover:border-primary/50 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="easy">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                          <span>Легкая</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                          <span>Средняя</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="hard">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          <span>Сложная</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="mix">
                        <div className="flex items-center gap-2.5">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span>Смешанная</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="bg-border/60" />

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border-2 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200/50 dark:border-blue-800/30 hover:border-blue-300 dark:hover:border-blue-700/50 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/20 dark:bg-blue-500/30 flex items-center justify-center border border-blue-500/30">
                        <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">Скорость</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Бонус до +40%
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl border-2 bg-gradient-to-br from-amber-50 to-orange-100/50 dark:from-amber-950/20 dark:to-orange-900/10 border-amber-200/50 dark:border-amber-800/30 hover:border-amber-300 dark:hover:border-amber-700/50 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 dark:bg-amber-500/30 flex items-center justify-center border border-amber-500/30">
                        <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">Комбо</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Бонус до +20%
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-5 border-t bg-gradient-to-b from-muted/30 to-background">
                <Button
                  onClick={handleCreate}
                  disabled={isCreating}
                  size="lg"
                  className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Создание...
                    </>
                  ) : (
                    <>
                      <Swords className="mr-2 h-5 w-5" />
                  Создать дуэль
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'creating' && (
            <motion.div
              key="creating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background p-12 text-center rounded-3xl"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto mb-5 rounded-full border-4 border-primary border-t-transparent"
              />
              <h3 className="text-xl font-semibold mb-2">Создание дуэли...</h3>
              <p className="text-sm text-muted-foreground">Подготовка к битве</p>
            </motion.div>
          )}

          {step === 'success' && createdDuelCode && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background"
            >
              {/* Header */}
              <DialogHeader className="px-6 pt-6 pb-5 border-b bg-gradient-to-b from-background to-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center border border-emerald-500/20">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-bold leading-tight">
                        Дуэль создана!
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Поделитесь кодом с другом
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleGoToLobby}
                    className="h-9 w-9 rounded-xl hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              {/* Content */}
              <div className="px-6 py-6 space-y-6 bg-background">
                <div className="text-center space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground">Код дуэли</p>
                  <button
                    onClick={handleCopyCode}
                    className="group relative inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border-2 border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                  >
                    <span className="font-mono text-4xl font-black tracking-wider text-emerald-600 dark:text-emerald-400 select-all">
                      {createdDuelCode}
                    </span>
                    <div className="flex-shrink-0">
                      {copied ? (
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 flex items-center justify-center transition-colors">
                          <Copy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      )}
                    </div>
                    {copied && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-emerald-600 text-white text-xs font-medium rounded-md whitespace-nowrap">
                        Скопировано!
                      </div>
                    )}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {copied ? 'Код скопирован в буфер обмена' : 'Нажмите на код, чтобы скопировать'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground mb-1">Ожидание соперника</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Поделитесь кодом с другом. Дуэль начнется автоматически, когда он присоединится.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleGoToLobby}
                  size="lg"
                  className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                  Перейти в лобби
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
