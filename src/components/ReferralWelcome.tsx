import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Gift, Coins, Sparkles, User, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

interface ReferralWelcomeProps {
  referralCode: string;
  onAccept: () => void;
  onDecline: () => void;
}

interface ReferrerInfo {
  first_name: string;
  username: string | null;
  total_referrals: number;
}

export function ReferralWelcome({ referralCode, onAccept, onDecline }: ReferralWelcomeProps) {
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    loadReferrerInfo();
  }, [referralCode]);

  const loadReferrerInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, username, total_referrals')
        .eq('referral_code', referralCode.toUpperCase())
        .single();

      if (error) {
        console.error('[ReferralWelcome] Error loading referrer:', error);
        toast.error('Неверный реферальный код');
        setTimeout(onDecline, 2000);
        return;
      }

      if (data) {
        setReferrerInfo(data);
      }
    } catch (error) {
      console.error('[ReferralWelcome] Exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    haptics.buttonPressed();
    
    // Small delay for animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onAccept();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка информации...</p>
        </Card>
      </div>
    );
  }

  if (!referrerInfo) {
    return null;
  }

  const referrerName = referrerInfo.first_name || referrerInfo.username || 'Пользователь';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gradient-to-br from-pink-500/20 via-blue-500/20 to-indigo-500/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="relative p-8 bg-white/95 dark:bg-background/95 backdrop-blur-xl border-2 border-pink-500/30 shadow-2xl overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-blue-500/10 to-indigo-500/10 animate-pulse" />
            
            {/* Close button */}
            <button
              onClick={onDecline}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors z-10"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            <div className="relative space-y-6">
              {/* Gift icon */}
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  repeatDelay: 1 
                }}
                className="w-20 h-20 mx-auto bg-gradient-to-br from-pink-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-xl"
              >
                <Gift className="h-10 w-10 text-white" />
              </motion.div>

              {/* Title */}
              <div className="text-center space-y-2">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-pink-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent"
                >
                  Вас пригласил друг!
                </motion.h2>
              </div>

              {/* Referrer info */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-pink-500/10 to-blue-500/10 border border-pink-500/30"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                  {referrerName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="font-black text-lg">{referrerName}</div>
                  {referrerInfo.username && (
                    <div className="text-sm text-muted-foreground">@{referrerInfo.username}</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Пригласил уже {referrerInfo.total_referrals} {referrerInfo.total_referrals === 1 ? 'друга' : 'друзей'}
                  </div>
                </div>
              </motion.div>

              {/* Bonus info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-2 border-amber-500/40">
                  <Coins className="h-8 w-8 text-amber-500" />
                  <div>
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400">+50 монет</div>
                    <div className="text-xs text-muted-foreground">Бонус при регистрации</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                  <div className="flex items-start gap-2 text-sm">
                    <Sparkles className="h-5 w-5 text-pink-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-muted-foreground">
                      <p>Заработайте свои первые <strong className="text-foreground">50 монет</strong></p>
                      <p className="text-xs">И <strong className="text-pink-600">{referrerName}</strong> получит дополнительно <strong className="text-foreground">+100 монет</strong>!</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3 pt-2"
              >
                <Button
                  onClick={handleAccept}
                  disabled={accepting}
                  size="lg"
                  className="w-full h-14 text-lg font-black bg-gradient-to-r from-pink-500 via-blue-600 to-indigo-600 hover:from-pink-600 hover:via-blue-700 hover:to-indigo-700 text-white shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  {accepting ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full mr-2" />
                      <span className="relative z-10">Принимаю...</span>
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-6 w-6 relative z-10" />
                      <span className="relative z-10">Принять приглашение</span>
                    </>
                  )}
                </Button>

                <Button
                  onClick={onDecline}
                  disabled={accepting}
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Пропустить
                </Button>
              </motion.div>

              {/* Info note */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xs text-center text-muted-foreground"
              >
                Нажимая "Принять приглашение", вы соглашаетесь участвовать в реферальной программе
              </motion.p>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

