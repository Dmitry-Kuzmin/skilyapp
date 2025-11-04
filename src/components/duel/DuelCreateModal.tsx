import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Swords, X, Loader2, CheckCircle2, Hash, TrendingUp, Zap, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserContext } from '@/contexts/UserContext';
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

      setStep('success');
      toast.success('Дуэль создана! 🎮');
      
      setTimeout(() => {
        onDuelCreated(data.duel.id, data.duel.code);
        setStep('config');
        setIsCreating(false);
        onClose();
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка создания дуэли');
      setStep('config');
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 border shadow-xl">
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
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
                      <Swords className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-bold leading-tight">
                        Создать дуэль
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Настройте параметры битвы
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              {/* Content */}
              <div className="px-6 py-6 space-y-6">
                {/* Number of Questions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      Количество вопросов
                    </Label>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">{numQuestions}</span>
                      <span className="text-sm text-muted-foreground">вопросов</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Slider
                      value={[numQuestions]}
                      onValueChange={(value) => setNumQuestions(value[0])}
                      min={5}
                      max={30}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground px-1">
                      <span>5</span>
                      <span>10</span>
                      <span>15</span>
                      <span>20</span>
                      <span>25</span>
                      <span>30</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Difficulty */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Сложность
                  </Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span>Легкая</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          <span>Средняя</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="hard">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span>Сложная</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="mix">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-muted-foreground" />
                          <span>Смешанная</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm font-semibold">Скорость</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Бонус до +40%
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-md bg-purple-500/10 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-sm font-semibold">Комбо</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Бонус до +20%
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t bg-muted/20">
                <Button
                  onClick={handleCreate}
                  disabled={isCreating}
                  size="lg"
                  className="w-full h-11 text-base font-semibold"
                >
                  <Swords className="mr-2 h-4 w-4" />
                  Создать дуэль
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
              className="bg-background p-12 text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-primary border-t-transparent"
              />
              <h3 className="text-xl font-semibold mb-1">Создание дуэли...</h3>
              <p className="text-sm text-muted-foreground">Подготовка к битве</p>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background p-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center"
              >
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </motion.div>
              <motion.h3
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-xl font-semibold mb-1"
              >
                Дуэль создана!
              </motion.h3>
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-muted-foreground"
              >
                Переход в лобби...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
