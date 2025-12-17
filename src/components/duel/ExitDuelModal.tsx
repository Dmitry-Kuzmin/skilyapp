import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HeartCrack, Trophy, Coins, TrendingDown } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ExitDuelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duelId: string;
  onSurrender: () => void;
}

export function ExitDuelModal({
  open,
  onOpenChange,
  duelId,
  onSurrender
}: ExitDuelModalProps) {
  const { profileId } = useUserContext();
  const [isSurrendering, setIsSurrendering] = useState(false);
  const [betAmount, setBetAmount] = useState<number>(0);

  // Загружаем информацию о ставке
  useEffect(() => {
    if (!duelId || !open) return;

    const fetchBetInfo = async () => {
      try {
        console.log('[ExitDuelModal] Fetching bet info for duel:', duelId);
        const { data, error } = await supabase
          .from('duels')
          .select('bet_amount')
          .eq('id', duelId)
          .single();

        if (error) {
          console.error('[ExitDuelModal] Error fetching bet info:', error);
          return;
        }

        console.log('[ExitDuelModal] Bet info loaded:', data);
        setBetAmount(data?.bet_amount || 0);
      } catch (error) {
        console.error('[ExitDuelModal] Exception fetching bet info:', error);
      }
    };

    fetchBetInfo();
  }, [duelId, open]);

  const handleSurrender = async () => {
    if (!profileId || !duelId) {
      console.error('[ExitDuelModal] Missing required data:', {
        hasProfileId: !!profileId,
        hasDuelId: !!duelId
      });
      toast.error('Недостаточно данных для выхода из дуэли');
      return;
    }

    setIsSurrendering(true);
    try {
      console.log('[ExitDuelModal] Calling surrender action:', {
        duel_id: duelId,
        profile_id: profileId
      });

      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'surrender',
          duel_id: duelId,
          profile_id: profileId
        }
      });

      if (error) {
        console.error('[ExitDuelModal] Error surrendering:', error);
        console.error('[ExitDuelModal] Error details:', {
          message: error.message,
          context: error.context,
          status: error.status,
          name: error.name
        });
        
        // Пытаемся получить детали ошибки из ответа
        let errorMessage = 'Ошибка при выходе из дуэли';
        let errorDetails = 'Попробуйте еще раз или обновите страницу';
        
        try {
          // Supabase FunctionsHttpError может содержать response в context
          if (error.context) {
            // Пытаемся получить response из context
            const response = error.context as any;
            if (response?.json) {
              const errorData = await response.json();
              console.error('[ExitDuelModal] Error data from response:', errorData);
              if (errorData?.error) {
                errorMessage = errorData.error;
              }
              if (errorData?.details) {
                errorDetails = errorData.details;
              }
            } else if (response?.text) {
              const errorText = await response.text();
              console.error('[ExitDuelModal] Error text from response:', errorText);
              try {
                const errorData = JSON.parse(errorText);
                if (errorData?.error) {
                  errorMessage = errorData.error;
                }
                if (errorData?.details) {
                  errorDetails = errorData.details;
                }
              } catch (e) {
                // Если не JSON, используем текст как есть
                errorMessage = errorText || errorMessage;
              }
            }
          }
          
          // Если не удалось извлечь из context, пробуем message
          if (errorMessage === 'Ошибка при выходе из дуэли' && error.message) {
            errorMessage = error.message;
          }
        } catch (e) {
          console.error('[ExitDuelModal] Error parsing error response:', e);
        }
        
        toast.error(errorMessage, {
          duration: 5000,
          description: errorDetails
        });
        setIsSurrendering(false);
        return;
      }

      console.log('[ExitDuelModal] Surrender response:', data);

      // Проверяем успешный ответ
      if (data?.success || data?.surrendered) {
        toast.info('Вы сдались. Соперник получает победу.');
        onSurrender();
        onOpenChange(false);
      } else {
        console.warn('[ExitDuelModal] Unexpected response format:', data);
        toast.error('Неожиданный ответ от сервера');
        setIsSurrendering(false);
      }
    } catch (error) {
      console.error('[ExitDuelModal] Exception surrendering:', error);
      toast.error('Ошибка при выходе из дуэли', {
        description: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
      setIsSurrendering(false);
    }
  };

  const handleStay = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-[30px] border-t border-white/10",
          "bg-zinc-950/90 backdrop-blur-md",
          "p-0 pb-safe",
          "max-h-[85vh]",
          "overflow-hidden",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
        )}
        hideCloseButton
        onOpenChange={onOpenChange}
      >
              <div className="relative flex flex-col h-full">
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-12 h-1 bg-white/20 rounded-full" />
                </div>

                {/* Header Icon */}
                <div className="flex justify-center pt-4 pb-6">
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 200, 
                      damping: 15,
                      delay: 0.1 
                    }}
                    className="relative"
                  >
                    <HeartCrack 
                      className="w-16 h-16 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full bg-red-500/20 blur-xl"
                      animate={{
                        opacity: [0.5, 0.8, 0.5],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </motion.div>
                </div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center px-6 pb-2"
                >
                  <h2 className="text-xl font-bold text-white mb-2">
                    Покинуть битву?
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Это действие необратимо. Вам будет засчитано техническое поражение.
                  </p>
                </motion.div>

                {/* Impact Cards */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="px-6 py-6"
                >
                  <div className="grid grid-cols-3 gap-3">
                    {/* Победа врагу */}
                    <div className="flex flex-col items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <Trophy className="w-5 h-5 text-red-500" />
                      <span className="text-xs font-semibold text-zinc-300 text-center leading-tight">
                        Победа врагу
                      </span>
                    </div>

                    {/* Потеря монет */}
                    {betAmount > 0 ? (
                      <div className="flex flex-col items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <Coins className="w-5 h-5 text-red-500" />
                        <span className="text-xs font-semibold text-zinc-300 text-center leading-tight">
                          -{betAmount} монет
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl opacity-50">
                        <Coins className="w-5 h-5 text-red-500/50" />
                        <span className="text-xs font-semibold text-zinc-400 text-center leading-tight">
                          Нет ставки
                        </span>
                      </div>
                    )}

                    {/* Потеря рейтинга */}
                    <div className="flex flex-col items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <TrendingDown className="w-5 h-5 text-red-500" />
                      <span className="text-xs font-semibold text-zinc-300 text-center leading-tight">
                        Потеря рейтинга
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="px-6 pb-6 pt-2 space-y-3"
                >
                  {/* Primary: Stay Button */}
                  <Button
                    onClick={handleStay}
                    disabled={isSurrendering}
                    className={cn(
                      "w-full h-12",
                      "bg-white text-black",
                      "font-semibold",
                      "hover:bg-white/90",
                      "active:scale-[0.98]",
                      "transition-all duration-200",
                      "shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                    )}
                  >
                    Остаться в бою
                  </Button>

                  {/* Destructive: Surrender Button */}
                  <Button
                    onClick={handleSurrender}
                    disabled={isSurrendering}
                    variant="outline"
                    className={cn(
                      "w-full h-12",
                      "bg-transparent",
                      "border-2 border-red-500/50",
                      "text-red-500",
                      "font-semibold",
                      "hover:bg-red-500/10",
                      "hover:border-red-500",
                      "active:scale-[0.98]",
                      "transition-all duration-200"
                    )}
                  >
                    {isSurrendering ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                        Выход...
                      </span>
                    ) : (
                      'Сдаться (Поражение)'
                    )}
                  </Button>
                </motion.div>
              </div>
      </SheetContent>
    </Sheet>
  );
}

