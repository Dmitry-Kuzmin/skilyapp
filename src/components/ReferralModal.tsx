import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Copy, Check, Zap, Crown, MessageCircle, Sparkles, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface ReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReferralData {
  referral_code: string;
  total_referrals: number;
}

export function ReferralModal({ open, onOpenChange }: ReferralModalProps) {
  const { profileId } = useUserContext();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && profileId) {
      loadReferralData();
    }
  }, [open, profileId]);

  const loadReferralData = async () => {
    if (!profileId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code, total_referrals')
        .eq('id', profileId)
        .single();

      if (error) {
        console.error('[ReferralModal] Error loading data:', error);
        toast.error('Ошибка загрузки данных');
        return;
      }

      if (data) {
        // If no referral code, try to generate one
        if (!data.referral_code) {
          const { data: newCode, error: codeError } = await supabase.rpc('generate_referral_code');
          
          if (!codeError && newCode) {
            await supabase
              .from('profiles')
              .update({ referral_code: newCode })
              .eq('id', profileId);
            
            setReferralData({ ...data, referral_code: newCode });
          } else {
            setReferralData(data);
          }
        } else {
          setReferralData(data);
        }
      }
    } catch (error) {
      console.error('[ReferralModal] Exception loading referral data:', error);
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!referralData?.referral_code) {
      toast.error('Код не загружен');
      return;
    }

    const referralLink = `${window.location.origin}/join/${referralData.referral_code}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referralLink);
        setCopied(true);
        toast.success('Ссылка скопирована!');
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = referralLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        textArea.remove();
        
        if (successful) {
          setCopied(true);
          toast.success('Ссылка скопирована!');
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } catch (error) {
      console.error('[ReferralModal] Copy error:', error);
      toast.error('Не удалось скопировать');
    }
  };

  const referralLink = referralData?.referral_code 
    ? `${window.location.origin}/join/${referralData.referral_code}`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10 border-2 border-pink-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-pink-500" />
            <DialogTitle className="text-xl font-bold">
              Пригласи друзей
            </DialogTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Content */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Side - Text Content */}
            <div className="flex-1 space-y-6">
              <div>
                <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Пригласи друзей
                </h2>
                <p className="text-muted-foreground">
                  и заработай монеты
                </p>
              </div>

              {/* How it works */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Как это работает:
                </h3>
                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">Поделись своей ссылкой</p>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-start gap-3"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                      <Crown className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Они регистрируются и получают <strong className="text-green-600">+50 монет</strong>
                      </p>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-start gap-3"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-pink-600 flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Ты получаешь <strong className="text-pink-600">+100 монет</strong> когда они заработают свои первые 50 монет
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Right Side - Graphic */}
            <div className="flex-shrink-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                <Sparkles className="h-16 w-16 md:h-20 md:w-20 text-white relative z-10" />
              </motion.div>
            </div>
          </div>

          {/* Referral Link Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Твоя ссылка приглашения:
            </h3>
            <div className="flex gap-2">
              <Input
                value={loading ? 'Загрузка...' : referralLink}
                readOnly
                className="flex-1 font-mono text-sm bg-background/50"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Копировать
                  </>
                )}
              </Button>
            </div>
            {referralData && (
              <p className="text-xs text-muted-foreground text-center">
                использовано {referralData.total_referrals || 0} пользователями
              </p>
            )}
          </div>

          {/* Footer Link */}
          <div className="pt-4 border-t border-border/50">
            <Button
              variant="link"
              className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
              onClick={() => {
                onOpenChange(false);
                window.open('/referrals', '_blank');
              }}
            >
              Посмотреть условия и положения
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

