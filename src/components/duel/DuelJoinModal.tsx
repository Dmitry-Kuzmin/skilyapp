import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LogIn, X, Loader2, CheckCircle2, Hash, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserContext } from '@/contexts/UserContext';
import { getHumanReadableError, extractErrorFromResponse } from '@/utils/errorMessages';
import { Separator } from '@/components/ui/separator';

interface DuelJoinModalProps {
  open: boolean;
  onClose: () => void;
  onDuelJoined: (id: string, code: string) => void;
}

export function DuelJoinModal({ open, onClose, onDuelJoined }: DuelJoinModalProps) {
  const { profileId } = useUserContext();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [step, setStep] = useState<'input' | 'joining' | 'success'>('input');
  const hasAutoJoinedRef = useRef(false);

  // Reset when modal opens/closes
  useEffect(() => {
    if (open) {
      setCode('');
      setStep('input');
      setIsJoining(false);
      hasAutoJoinedRef.current = false;
    }
  }, [open]);

  const handleJoin = async () => {
    if (!code || code.length < 4 || code.length > 6) {
      toast.error('Введите код от 4 до 6 символов');
      return;
    }

    if (!profileId) {
      toast.error('Загрузка профиля...');
      return;
    }

    if (hasAutoJoinedRef.current) {
      return; // Prevent duplicate calls
    }

    hasAutoJoinedRef.current = true;
    setIsJoining(true);
    setStep('joining');

    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'join_duel',
          profile_id: profileId,
          code: code.toUpperCase(),
        },
      });

      if (error) throw error;

      setStep('success');
      
      if (data.auto_started) {
        toast.success('Дуэль начинается! 🎮');
      } else {
        toast.success('Вы присоединились! Ожидание старта...');
      }

      setTimeout(() => {
        onDuelJoined(data.duel.id, data.duel.code);
        setStep('input');
        setIsJoining(false);
        hasAutoJoinedRef.current = false;
        onClose();
      }, 1500);
    } catch (error: any) {
      const extractedError = extractErrorFromResponse(error);
      const humanError = getHumanReadableError(extractedError, 'join');
      toast.error(humanError);
      setStep('input');
      setIsJoining(false);
      hasAutoJoinedRef.current = false;
    }
  };

  // Auto-join when code is 4-6 characters
  useEffect(() => {
    if (code.length >= 4 && code.length <= 6 && !isJoining && step === 'input' && profileId && !hasAutoJoinedRef.current) {
      // Small delay to ensure user sees the complete code
      const timer = setTimeout(async () => {
        if (!code || code.length < 4 || code.length > 6) return;
        if (!profileId) {
          toast.error('Загрузка профиля...');
          return;
        }
        if (hasAutoJoinedRef.current) return;

        hasAutoJoinedRef.current = true;
        setIsJoining(true);
        setStep('joining');

        try {
          const { data, error } = await supabase.functions.invoke('duel-manager', {
            body: {
              action: 'join_duel',
              profile_id: profileId,
              code: code.toUpperCase(),
            },
          });

          if (error) throw error;

          setStep('success');
          
          if (data.auto_started) {
            toast.success('Дуэль начинается! 🎮');
          } else {
            toast.success('Вы присоединились! Ожидание старта...');
          }

          setTimeout(() => {
            onDuelJoined(data.duel.id, data.duel.code);
            setStep('input');
            setIsJoining(false);
            hasAutoJoinedRef.current = false;
            onClose();
          }, 1500);
        } catch (error: any) {
          const extractedError = extractErrorFromResponse(error);
          const humanError = getHumanReadableError(extractedError, 'join');
          toast.error(humanError);
          setStep('input');
          setIsJoining(false);
          hasAutoJoinedRef.current = false;
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [code, isJoining, step, profileId, onDuelJoined, onClose]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 border shadow-xl">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div
              key="input"
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
                      <LogIn className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-bold leading-tight">
                        Присоединиться
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Введите код от друга
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
                {/* Code Input */}
                <div className="space-y-4">
                  <div className="relative">
                    <div className="p-6 rounded-lg border-2 bg-muted/20 hover:bg-muted/30 transition-colors">
                      <Input
                        placeholder="AB12 или ABC123"
                        value={code}
                        onChange={(e) => {
                          const newCode = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                          setCode(newCode);
                          hasAutoJoinedRef.current = false; // Reset on change
                        }}
                        maxLength={6}
                        className="text-center text-3xl tracking-[0.2em] font-bold h-16 bg-background border-2 focus:border-primary"
                        autoFocus
                      />
                      <div className="text-center mt-4 space-y-2">
                        <div className="flex justify-center gap-2">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <motion.div
                              key={i}
                              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                                i < code.length
                                  ? 'bg-primary'
                                  : 'bg-muted'
                              }`}
                              animate={i < code.length ? { scale: [1, 1.2, 1] } : {}}
                              transition={{ delay: i * 0.05, duration: 0.2 }}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">{code.length < 4 ? 'Введите 4-6 символов' : `${code.length} символа`}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Tips */}
                <div className="p-4 rounded-lg border bg-muted/20">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold mb-1">Совет</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Попросите друга поделиться кодом дуэли из его экрана ожидания
                      </p>
                    </div>
                  </div>
                </div>

                {/* Auto-join indicator */}
                {code.length >= 4 && code.length <= 6 && !isJoining && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-2"
                  >
                    <p className="text-xs text-muted-foreground">
                      Присоединение...
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Footer - Keep button for manual join if auto fails */}
              <div className="px-6 py-4 border-t bg-muted/20">
                <Button
                  onClick={handleJoin}
                  disabled={isJoining || code.length < 4 || code.length > 6}
                  size="lg"
                  className="w-full h-11 text-base font-semibold"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Присоединение...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Присоединиться
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'joining' && (
            <motion.div
              key="joining"
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
              <h3 className="text-xl font-semibold mb-1">Присоединение...</h3>
              <p className="text-sm text-muted-foreground">Подключение к дуэли</p>
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
                Вы присоединились!
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
