import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, Target, Zap, Swords, CheckCircle, ArrowRight, Sparkles, Gift, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

interface UserStats {
  first_name: string;
  username: string | null;
  referral_code: string;
  xp: number;
  coins: number;
  total_referrals: number;
  // Duel stats
  duel_wins?: number;
  duel_total?: number;
  // Test stats
  tests_passed?: number;
  signs_learned?: number;
}

export default function InviteLanding() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, profileId } = useUserContext();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (code) {
      loadUserStats();
    }
  }, [code]);

  const loadUserStats = async () => {
    if (!code) return;

    try {
      // Load user profile by referral code
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, username, referral_code, xp, coins, total_referrals')
        .eq('referral_code', code.toUpperCase())
        .single();

      if (profileError || !profile) {
        console.error('[InviteLanding] Profile not found:', profileError);
        toast.error('Неверная реферальная ссылка');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      // Load duel stats
      const { data: duelStats } = await supabase
        .from('duel_stats')
        .select('total_duels, wins')
        .eq('user_id', profile.id)
        .single();

      // Load test completion stats
      const { count: testsCount } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_completed', true);

      // Load learned signs count
      const { count: signsCount } = await supabase
        .from('user_sign_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .gte('mastery_level', 3); // Считаем выученными с mastery >= 3

      setUserStats({
        ...profile,
        duel_wins: duelStats?.wins || 0,
        duel_total: duelStats?.total_duels || 0,
        tests_passed: testsCount || 0,
        signs_learned: signsCount || 0,
      });
    } catch (error) {
      console.error('[InviteLanding] Error loading stats:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!code) return;

    setAccepting(true);
    
    // Haptics with fallback
    try {
      haptics?.buttonPressed?.();
    } catch (e) {
      console.log('[InviteLanding] Haptics not available');
    }

    // If already authenticated, check if already used a referral
    if (isAuthenticated && profileId) {
      // Check if user already has a referrer
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('id', profileId)
        .single();
      
      if (profile?.referred_by) {
        toast.error('Вы уже использовали реферальный код!');
        setAccepting(false);
        setTimeout(() => navigate('/'), 1500);
        return;
      }
      
      // User is logged in but hasn't used a referral - apply it now
      const { data: referralResult, error: referralError } = await supabase.rpc('create_referral', {
        p_referrer_code: code.toUpperCase(),
        p_referred_id: profileId
      });
      
      if (referralError) {
        console.error('[InviteLanding] Referral error:', referralError);
        toast.error('Ошибка применения реферального кода');
        setAccepting(false);
        return;
      }
      
      if (referralResult && referralResult.length > 0) {
        const result = referralResult[0];
        if (result.success) {
          toast.success(`🎉 Вы получили +${result.referred_bonus} монет!`);
          setTimeout(() => navigate('/'), 2000);
        } else {
          toast.error(result.message || 'Ошибка применения кода');
          setAccepting(false);
        }
      } else {
        toast.error('Не удалось применить реферальный код');
        setAccepting(false);
      }
      return;
    }

    // Store referral code for new user registration
    sessionStorage.setItem('referral_code', code.toUpperCase());
    console.log('[InviteLanding] Referral code stored, redirecting to home');
    toast.success('Регистрируйтесь и получите +50 монет! 🎁', { duration: 5000 });
    
    // Small delay for animation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Redirect to main page where user will be prompted to register
    console.log('[InviteLanding] Navigating to home page');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-indigo-50 dark:from-pink-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка...</p>
        </Card>
      </div>
    );
  }

  if (!userStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-indigo-50 dark:from-pink-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="text-destructive">Пользователь не найден</p>
        </Card>
      </div>
    );
  }

  const userName = userStats.first_name || userStats.username || 'Пользователь';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-indigo-50 dark:from-pink-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 25, repeat: Infinity, delay: 5 }}
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full blur-3xl"
        />
      </div>

      <div className="relative container max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <motion.div
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gradient-to-br from-pink-500 via-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl"
          >
            <div className="text-5xl sm:text-6xl">🚗</div>
          </motion.div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-pink-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {userName} приглашает тебя<br />учить ПДД!
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Присоединяйся к тысячам учеников, которые уже сдали экзамен
          </p>
        </motion.div>

        {/* User Stats Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="p-6 sm:p-8 bg-white/80 dark:bg-background/80 backdrop-blur-xl border-2 border-pink-500/30 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-pink-500 to-blue-600 flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black">{userName}</h2>
                {userStats.username && (
                  <p className="text-muted-foreground">@{userStats.username}</p>
                )}
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="text-lg font-bold text-muted-foreground mb-3">{userName} уже:</div>
              
              <div className="grid sm:grid-cols-2 gap-3">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30"
                >
                  <CheckCircle className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                      {userStats.tests_passed}
                    </div>
                    <div className="text-sm text-muted-foreground">Прошел тестов</div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-pink-500/10 border border-blue-500/30"
                >
                  <Zap className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                      {userStats.xp.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Набрал XP</div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30"
                >
                  <Target className="h-8 w-8 text-amber-500" />
                  <div>
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                      {userStats.signs_learned}
                    </div>
                    <div className="text-sm text-muted-foreground">Выучил знаков</div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30"
                >
                  <Swords className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-black text-green-600 dark:text-green-400">
                      {userStats.duel_wins}
                    </div>
                    <div className="text-sm text-muted-foreground">Выиграл дуэлей</div>
                  </div>
                </motion.div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center py-6 px-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-pink-500/20 border-2 border-amber-500/40"
            >
              <p className="text-xl sm:text-2xl font-black mb-2">
                Думаешь, ты лучше? Проверь! 😏
              </p>
              <p className="text-muted-foreground">Соревнуйся с {userName} в дуэлях!</p>
            </motion.div>
          </Card>
        </motion.div>

        {/* Bonus Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card className="p-6 sm:p-8 bg-gradient-to-br from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-2 border-amber-500/40 relative overflow-hidden">
            {/* Animated sparkles */}
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 20, repeat: Infinity }}
              className="absolute top-4 right-4 text-amber-500"
            >
              <Sparkles className="h-8 w-8" />
            </motion.div>

            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Gift className="h-8 w-8 text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl sm:text-3xl font-black mb-2 text-amber-700 dark:text-amber-300">
                  Бонус при регистрации
                </h3>
                <div className="space-y-2 text-foreground/80">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <p className="font-bold">+50 монет тебе в подарок</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-pink-500" />
                    <p className="font-bold">+100 монет для {userName} когда ты заработаешь 50</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <p className="font-bold">Доступ ко всем играм и тестам</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid sm:grid-cols-3 gap-4 mb-8"
        >
          <Card className="p-6 text-center bg-white/60 dark:bg-background/60 backdrop-blur-sm">
            <div className="text-4xl mb-2">🎮</div>
            <div className="font-black text-lg mb-1">Игры</div>
            <div className="text-sm text-muted-foreground">Дуэли, гонки, викторины</div>
          </Card>

          <Card className="p-6 text-center bg-white/60 dark:bg-background/60 backdrop-blur-sm">
            <div className="text-4xl mb-2">📚</div>
            <div className="font-black text-lg mb-1">Обучение</div>
            <div className="text-sm text-muted-foreground">Знаки, правила, теория</div>
          </Card>

          <Card className="p-6 text-center bg-white/60 dark:bg-background/60 backdrop-blur-sm">
            <div className="text-4xl mb-2">🏆</div>
            <div className="font-black text-lg mb-1">Достижения</div>
            <div className="text-sm text-muted-foreground">Рейтинг и прогресс</div>
          </Card>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <Button
            onClick={handleJoin}
            disabled={accepting}
            size="lg"
            className="w-full h-16 text-xl font-black bg-gradient-to-r from-pink-500 via-blue-600 to-indigo-600 hover:from-pink-600 hover:via-blue-700 hover:to-indigo-700 text-white shadow-2xl hover:shadow-pink-500/50 transition-all relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            {accepting ? (
              <>
                <div className="animate-spin h-6 w-6 border-4 border-white border-t-transparent rounded-full mr-3" />
                <span className="relative z-10">Присоединяюсь...</span>
              </>
            ) : (
              <>
                <Gift className="mr-3 h-7 w-7 relative z-10" />
                <span className="relative z-10">Присоединиться и получить +50 монет</span>
                <ArrowRight className="ml-3 h-7 w-7 relative z-10" />
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Уже есть аккаунт? <button onClick={() => navigate('/')} className="text-primary hover:underline font-bold">Войти</button>
          </p>
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="flex items-center justify-center gap-6 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span><strong>{userStats.total_referrals}</strong> друзей присоединились</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span><strong>{userStats.duel_total}</strong> дуэлей сыграно</span>
            </div>
          </div>
        </motion.div>

        {/* Footer note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Присоединяясь через эту ссылку, ты получишь +50 монет в подарок и поможешь другу получить +100 монет
          </p>
        </motion.div>
      </div>
    </div>
  );
}

