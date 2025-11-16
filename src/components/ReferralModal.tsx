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
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Top Banner */}
        <div className="bg-muted/50 px-6 py-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Заработай 10+ монет
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6 -mr-2"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-muted-foreground" />
            <DialogTitle className="text-lg font-semibold">
              Пригласи друзей
            </DialogTitle>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Main Content */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                Пригласи друзей
              </h2>
              <p className="text-sm text-muted-foreground">
                и заработай монеты
              </p>
            </div>

            {/* How it works */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Как это работает:
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center mt-0.5">
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-sm">Поделись своей ссылкой</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center mt-0.5">
                    <Crown className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-sm">
                    Они регистрируются и получают <strong className="text-foreground">+50 монет</strong>
                  </p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center mt-0.5">
                    <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-sm">
                    Ты получаешь <strong className="text-foreground">+100 монет</strong> когда они заработают свои первые 50 монет
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Referral Link Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Твоя ссылка приглашения:
            </h3>
            <div className="flex gap-2">
              <Input
                value={loading ? 'Загрузка...' : referralLink}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
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
          <div className="pt-4 border-t border-border">
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

