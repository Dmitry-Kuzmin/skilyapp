import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Gift, Users, Copy, Check, Share2, Coins, TrendingUp, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { isTelegramMiniApp } from '@/lib/telegram';
import { haptics } from '@/lib/haptics';

interface ReferralData {
  referral_code: string;
  total_referrals: number;
  coins: number;
}

interface ReferredUser {
  id: string;
  first_name: string;
  username: string | null;
  coins: number;
  reward_given: boolean;
  created_at: string;
}

export default function Referrals() {
  const { profileId, user } = useUserContext();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const isTelegram = isTelegramMiniApp();

  useEffect(() => {
    if (profileId) {
      loadReferralData();
      loadReferredUsers();
    }
  }, [profileId]);

  const loadReferralData = async () => {
    if (!profileId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code, total_referrals, coins')
        .eq('id', profileId)
        .single();

      if (error) {
        console.error('[Referrals] Error loading data:', error);
        toast.error('Ошибка загрузки данных');
        return;
      }

      if (data) {
        console.log('[Referrals] Loaded referral data:', {
          hasCode: !!data.referral_code,
          code: data.referral_code,
          totalReferrals: data.total_referrals,
          coins: data.coins
        });
        setReferralData(data);
        
        // If no referral code, try to generate one
        if (!data.referral_code) {
          console.log('[Referrals] No referral code found, generating...');
          const { data: newCode, error: codeError } = await supabase.rpc('generate_referral_code');
          
          if (!codeError && newCode) {
            await supabase
              .from('profiles')
              .update({ referral_code: newCode })
              .eq('id', profileId);
            
            setReferralData({ ...data, referral_code: newCode });
            console.log('[Referrals] Generated new code:', newCode);
          }
        }
      }
    } catch (error) {
      console.error('[Referrals] Exception loading referral data:', error);
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const loadReferredUsers = async () => {
    if (!profileId) return;

    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          id,
          reward_given,
          created_at,
          referred:referred_id (
            id,
            first_name,
            username,
            coins
          )
        `)
        .eq('referrer_id', profileId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const users = data.map((ref: any) => ({
          id: ref.referred?.id,
          first_name: ref.referred?.first_name || 'Пользователь',
          username: ref.referred?.username,
          coins: ref.referred?.coins || 0,
          reward_given: ref.reward_given,
          created_at: ref.created_at,
        }));
        setReferredUsers(users);
      }
    } catch (error) {
      console.error('Error loading referred users:', error);
    }
  };

  const handleCopyCode = async () => {
    if (!referralData?.referral_code) {
      console.error('[Referrals] No referral code to copy:', referralData);
      toast.error('Код не загружен');
      return;
    }

    try {
      // Try modern clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referralData.referral_code);
        setCopied(true);
        toast.success('Код скопирован!');
        haptics.buttonPressed();
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for older browsers or localhost without HTTPS
        const textArea = document.createElement('textarea');
        textArea.value = referralData.referral_code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        textArea.remove();
        
        if (successful) {
          setCopied(true);
          toast.success('Код скопирован!');
          haptics.buttonPressed();
          setTimeout(() => setCopied(false), 2000);
        } else {
          throw new Error('execCommand failed');
        }
      }
    } catch (error) {
      console.error('[Referrals] Copy error:', error);
      // Show code in alert as last resort
      alert(`Ваш реферальный код:\n\n${referralData.referral_code}\n\nСкопируйте его вручную`);
    }
  };

  const handleShare = () => {
    if (!referralData?.referral_code) return;

    if (isTelegram && window.Telegram?.WebApp) {
      // Get bot username from env or use default
      const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'your_bot_name';
      const startParam = `ref_${referralData.referral_code}`;
      const shareUrl = `https://t.me/${botUsername}/app?startapp=${startParam}`;
      const shareText = `🎁 Присоединяйся и получи +50 монет в подарок!\n\nИспользуй мой код: ${referralData.referral_code}\n\nИли просто нажми на ссылку:`;

      (window.Telegram.WebApp as any).openTelegramLink?.(
        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
      );
      
      haptics.buttonPressed();
    } else {
      // Fallback for web
      handleCopyCode();
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="flex items-center justify-center gap-3">
            <Gift className="h-10 w-10 text-pink-500" />
            <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Пригласи друзей
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            Приглашай друзей и зарабатывай монеты вместе! +100 монет за каждого друга, который заработает 50 монет
          </p>
        </motion.div>

        {/* Referral Code Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 sm:p-8 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10 border-2 border-pink-500/30 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 blur-3xl opacity-50" />
            
            <div className="relative space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-pink-500" />
                <h2 className="text-xl font-black">Ваш реферальный код</h2>
              </div>
              
              {/* Referral Code Display */}
              <motion.div
                className="bg-white/90 dark:bg-background/90 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border-2 border-pink-500/40 shadow-xl"
                whileHover={{ scale: 1.02 }}
              >
                <div className="text-4xl sm:text-5xl font-black tracking-wider text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  {referralData?.referral_code || 'LOADING'}
                </div>
              </motion.div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleCopyCode}
                  variant="outline"
                  size="lg"
                  className="flex-1 font-bold border-2 hover:bg-pink-500/10 hover:border-pink-500/50"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-5 w-5 text-green-500" />
                      Скопировано
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-5 w-5" />
                      Копировать код
                    </>
                  )}
                </Button>
                
                {isTelegram && (
                  <Button
                    onClick={handleShare}
                    size="lg"
                    className="flex-1 font-bold bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  >
                    <Share2 className="mr-2 h-5 w-5" />
                    Поделиться
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid sm:grid-cols-2 gap-4"
        >
          <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-2 border-emerald-500/30">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-emerald-500" />
              <div>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {referralData?.total_referrals || 0}
                </div>
                <div className="text-sm text-muted-foreground font-medium">Приглашено друзей</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-2 border-amber-500/30">
            <div className="flex items-center gap-3 mb-2">
              <Coins className="h-8 w-8 text-amber-500" />
              <div>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                  {(referralData?.total_referrals || 0) * 100}
                </div>
                <div className="text-sm text-muted-foreground font-medium">Заработано монет</div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Как это работает
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">1</div>
                <p className="text-muted-foreground">Поделитесь своим кодом или ссылкой с другом</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">2</div>
                <p className="text-muted-foreground">Друг регистрируется и получает <strong className="text-green-600">+50 монет</strong> в подарок</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">3</div>
                <p className="text-muted-foreground">Когда друг заработает свои первые 50 монет, вы получите <strong className="text-pink-600">+100 монет</strong></p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Referred Users List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Ваши рефералы ({referredUsers.length})
            </h3>
            
            {referredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Пока никого не пригласили</p>
                <p className="text-sm mt-1">Поделитесь кодом с друзьями!</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {referredUsers.map((referred, index) => (
                    <motion.div
                      key={referred.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {referred.first_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold">{referred.first_name}</div>
                          {referred.username && (
                            <div className="text-xs text-muted-foreground">@{referred.username}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-bold text-muted-foreground">
                            {referred.coins} монет
                          </div>
                          {referred.reward_given ? (
                            <div className="text-xs text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Награда получена
                            </div>
                          ) : referred.coins >= 50 ? (
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                              Награда начислена
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              Осталось: {50 - referred.coins} монет
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Benefits Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              Ваши преимущества
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="text-2xl">🎁</div>
                <div>
                  <div className="font-bold">+50 монет другу</div>
                  <div className="text-xs text-muted-foreground">При регистрации</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-2xl">💰</div>
                <div>
                  <div className="font-bold">+100 монет вам</div>
                  <div className="text-xs text-muted-foreground">Когда друг заработает 50</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-2xl">♾️</div>
                <div>
                  <div className="font-bold">Без лимитов</div>
                  <div className="text-xs text-muted-foreground">Приглашай сколько угодно</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-2xl">🚀</div>
                <div>
                  <div className="font-bold">Быстрые монеты</div>
                  <div className="text-xs text-muted-foreground">Легкий способ заработать</div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Share Button - Large CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="pt-4"
        >
          <Button
            onClick={handleShare}
            size="lg"
            className="w-full h-14 text-lg font-black bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:via-purple-700 hover:to-indigo-700 text-white shadow-2xl hover:shadow-pink-500/50 transition-all relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Share2 className="mr-2 h-6 w-6 relative z-10" />
            <span className="relative z-10">Пригласить друзей</span>
          </Button>
        </motion.div>
      </div>
    </Layout>
  );
}

