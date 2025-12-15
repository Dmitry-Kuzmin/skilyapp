import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UnifiedModal } from '@/components/ui/unified-modal';
import { useModalRoute } from '@/hooks/useModalRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Copy, Check, Zap, Crown, MessageCircle, Sparkles, X, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const route = useModalRoute('referral');
  const isOpen = open || route.isOpen;
  const handleOpenChange = (state: boolean) => {
    if (onOpenChange) onOpenChange(state);
    if (state) {
      route.openModal();
    } else {
      route.closeModal();
    }
  };
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && profileId) {
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
        toast.error(t('referral.loadError'));
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
      toast.error(t('referral.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!referralData?.referral_code) {
      toast.error(t('referral.codeNotLoaded'));
      return;
    }

    const referralLink = `${window.location.origin}/join/${referralData.referral_code}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referralLink);
        setCopied(true);
        toast.success(t('referral.linkCopied'));
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
          toast.success(t('referral.linkCopied'));
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } catch (error) {
      console.error('[ReferralModal] Copy error:', error);
      toast.error(t('referral.copyFailed'));
    }
  };

  const referralLink = referralData?.referral_code 
    ? `${window.location.origin}/join/${referralData.referral_code}`
    : '';

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      title={t('referral.title')}
      showTitleBar={false}
      className="max-w-lg p-0 overflow-hidden"
      loading={loading && !referralData}
      skeletonVariant="default"
      modalRouteKey="referral"
    >
        <div className="px-6 pt-6 pb-6 space-y-6">
          {/* Main Content */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-1 text-foreground">
                {t('referral.title')}
              </h2>
              <p className="text-sm text-foreground/70">
                {t('referral.subtitle')}
              </p>
            </div>

            {/* How it works */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('referral.howItWorks')}
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center mt-0.5">
                    <Zap className="h-3.5 w-3.5 text-foreground/70" />
                  </div>
                  <p className="text-sm text-foreground">{t('referral.step1')}</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center mt-0.5">
                    <Crown className="h-3.5 w-3.5 text-foreground/70" />
                  </div>
                  <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t('referral.step2') }} />
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center mt-0.5">
                    <MessageCircle className="h-3.5 w-3.5 text-foreground/70" />
                  </div>
                  <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t('referral.step3') }} />
                </div>
              </div>
            </div>
          </div>

          {/* Referral Link Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {t('referral.yourLink')}
              </h3>
              {referralData && (
                <span className="text-sm text-foreground/70" dangerouslySetInnerHTML={{ __html: t('referral.usedBy', { count: referralData.total_referrals || 0 }) }} />
              )}
            </div>
            <div className="flex gap-2 items-center bg-muted/50 rounded-lg p-3 border border-border">
              <LinkIcon className="h-4 w-4 text-foreground/60 shrink-0" />
              <span className="flex-1 font-mono text-sm text-foreground truncate">
                {loading ? t('referral.loading') : referralLink}
              </span>
              <Button
                onClick={handleCopyLink}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full border border-border/60 bg-background/90 transition-all",
                  copied
                    ? "text-emerald-600 border-emerald-400/80 bg-emerald-50 dark:bg-emerald-500/10"
                    : "text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/10"
                )}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Footer Link */}
          <div className="pt-4 border-t border-border">
            <Button
              variant="link"
              className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
              onClick={() => {
                onOpenChange(false);
                navigate('/help#rewards-referral');
              }}
            >
              {t('referral.viewTerms')}
            </Button>
          </div>
        </div>
    </UnifiedModal>
  );
}

