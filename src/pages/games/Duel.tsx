import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Swords, Users, Trophy, LogIn, Sparkles, Zap, Target, TrendingUp } from 'lucide-react';
import { DuelLobby } from '@/components/duel/DuelLobby';
import { DuelCreateModal } from '@/components/duel/DuelCreateModal';
import { DuelJoinModal } from '@/components/duel/DuelJoinModal';
import { DuelBattleFullscreen } from '@/components/duel/DuelBattleFullscreen';
import { DuelResult } from '@/components/duel/DuelResult';
import { DuelWaitingReplay } from '@/components/duel/DuelWaitingReplay';
import { AuthModal } from '@/components/AuthModal';
import { useUserContext } from '@/contexts/UserContext';
import { Card } from '@/components/ui/card';
import { isTelegramMiniApp } from '@/lib/telegram';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

type GameMode = 'menu' | 'create' | 'join' | 'battle' | 'result';

export default function Duel() {
  const { isAuthenticated, profileId, user, supabaseUser } = useUserContext();
  const [mode, setMode] = useState<GameMode>('menu');
  const [duelId, setDuelId] = useState<string | null>(null);
  const [duelCode, setDuelCode] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isBattleHidden, setIsBattleHidden] = useState(false);
  const [hiddenDuelState, setHiddenDuelState] = useState<{
    myScore: number;
    totalQuestions: number;
  } | null>(null);
  const isTelegramUser = isTelegramMiniApp();
  
  // Check if we're waiting for profile to load
  const isLoadingProfile = (user || supabaseUser) && !profileId;

  const handleDuelCreated = (id: string, code: string) => {
    setDuelId(id);
    setDuelCode(code);
    setMode('create');
  };

  const handleDuelJoined = async (id: string, code: string) => {
    console.log('[Duel] Player joined duel:', id);
    setDuelId(id);
    setDuelCode(code);
    
    // Check if duel is already active (auto-started)
    const { data } = await supabase
      .from('duels')
      .select('status')
      .eq('id', id)
      .maybeSingle();
    
    if (data?.status === 'active') {
      console.log('[Duel] Duel already active, going straight to battle!');
      handleDuelStarted();
    } else {
      console.log('[Duel] Going to lobby to wait for start');
      setMode('create');
    }
  };

  const handleDuelStarted = () => {
    console.log('[Duel] ⚡ DUEL STARTED! Switching to battle mode. DuelId:', duelId);
    
    // Reset hidden state when starting new battle
    setIsBattleHidden(false);
    
    // Immediate state change
    setMode('battle');
    
    // Multiple retries for Telegram reliability
    const retries = [50, 150, 300];
    retries.forEach((delay, index) => {
      setTimeout(() => {
        console.log(`[Duel] Battle mode retry #${index + 1}`);
        setMode('battle');
      }, delay);
    });
  };
  
  // Handle widget expand - restore battle mode when widget is expanded
  // When widget is expanded, we need to restore battle mode
  // The widget is displayed via portal, so we need a way to restore battle
  // We'll use a ref or event listener to detect widget expansion
  // Actually, simpler: add a callback that restores battle mode
  const handleWidgetExpand = () => {
    if (duelId && isBattleHidden) {
      setIsBattleHidden(false);
      setMode('battle');
    }
  };

  const handleDuelFinished = () => {
    setMode('result');
  };

  const handleBackToMenu = () => {
    setMode('menu');
    setDuelId(null);
    setDuelCode(null);
    setIsBattleHidden(false);
  };

  // Check if user needs to login
  const handleActionClick = (action: () => void) => {
    // For non-Telegram users, require authentication first
    if (!isAuthenticated && !isTelegramUser) {
      setShowAuthModal(true);
      return;
    }
    
    // If we have a user but profileId is still loading, just execute the action
    // The profileId will be checked inside DuelLobby/DuelJoin when they try to invoke the function
    action();
  };

  // Fullscreen modes - no Layout/Footer
  // But if hidden, show menu with widget overlay
  if (mode === 'battle' && duelId && !isBattleHidden) {
    return (
      <DuelBattleFullscreen
        duelId={duelId}
        onExit={handleBackToMenu}
        onDuelFinished={handleDuelFinished}
        onHide={() => {
          // When game is hidden, switch to menu mode but keep duelId for widget
          // We need to store the duel state for the widget
          // Load current scores to show in widget
          (async () => {
            if (duelId && profileId) {
              const { data: players } = await supabase
                .from('duel_players')
                .select('score')
                .eq('duel_id', duelId)
                .eq('user_id', profileId)
                .single();
              
              const { data: duel } = await supabase
                .from('duels')
                .select('num_questions')
                .eq('id', duelId)
                .single();
              
              if (players && duel) {
                setHiddenDuelState({
                  myScore: players.score || 0,
                  totalQuestions: duel.num_questions || 10
                });
              }
            }
          })();
          setIsBattleHidden(true);
          setMode('menu');
        }}
        onWidgetExpand={handleWidgetExpand}
      />
    );
  }

  // Lobby also fullscreen without footer
  if (mode === 'create' && duelCode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center p-4">
        <DuelLobby
          duelId={duelId}
          duelCode={duelCode}
          onDuelCreated={handleDuelCreated}
          onDuelStarted={handleDuelStarted}
          onCancel={handleBackToMenu}
        />
      </div>
    );
  }

  return (
    <Layout>
      {/* Render widget when battle is hidden */}
      {isBattleHidden && duelId && hiddenDuelState && (
        <DuelWaitingReplay
          duelId={duelId}
          myScore={hiddenDuelState.myScore}
          totalQuestions={hiddenDuelState.totalQuestions}
          onDuelFinished={handleDuelFinished}
          initialHidden={true}
          onExpand={() => {
            // When widget expands, restore battle mode
            setIsBattleHidden(false);
            setMode('battle');
            setHiddenDuelState(null);
          }}
          onHide={(hidden) => {
            // Track hidden state
            if (!hidden) {
              setIsBattleHidden(false);
              setMode('battle');
            }
          }}
        />
      )}
      
      <div className="container mx-auto px-4 py-6">
      {isLoadingProfile && (
        <Card className="max-w-2xl mx-auto p-12 text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
            <Swords className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Загрузка профиля...</h2>
            <p className="text-muted-foreground">Пожалуйста, подождите</p>
          </div>
        </Card>
      )}

      {!isLoadingProfile && !isAuthenticated && !isTelegramUser && (
        <Card className="max-w-2xl mx-auto p-12 text-center space-y-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <LogIn className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Войдите, чтобы играть
            </h2>
            <p className="text-muted-foreground text-lg">
              Для участия в дуэлях необходимо авторизоваться
            </p>
          </div>
          <Button size="lg" onClick={() => setShowAuthModal(true)} className="px-8">
            <LogIn className="mr-2 h-5 w-5" />
            Войти
          </Button>
        </Card>
      )}

      {!isLoadingProfile && (isAuthenticated || isTelegramUser) && mode === 'menu' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-4 pb-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-24 h-24 mx-auto bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/30"
            >
              <Swords className="h-12 w-12 text-white" />
            </motion.div>
            <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Дуэль знаний
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Сразись с друзьями в битве за знания ПДД. Победи скорость и точность!
            </p>
          </motion.div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Create Duel Card */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="p-8 h-full bg-gradient-to-br from-red-500/10 via-orange-500/10 to-yellow-500/10 border-2 border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer group"
                onClick={() => handleActionClick(() => setShowCreateModal(true))}
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Swords className="h-8 w-8 text-white" />
                    </div>
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    >
                      <Sparkles className="h-6 w-6 text-red-500" />
                    </motion.div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black mb-2">Создать дуэль</h3>
                    <p className="text-muted-foreground">
                      Создайте дуэль и пригласите друга на битву знаний
                    </p>
                  </div>
                  <div className="flex items-center gap-4 pt-4">
                    <div className="flex-1 h-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full" />
                    <Button 
                      size="lg"
                      className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold shadow-lg shadow-red-500/30"
                    >
                      Создать
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Join Duel Card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="p-8 h-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-2 border-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer group"
                onClick={() => handleActionClick(() => setShowJoinModal(true))}
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Zap className="h-6 w-6 text-blue-500" />
                    </motion.div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black mb-2">Присоединиться</h3>
                    <p className="text-muted-foreground">
                      Введите код дуэли от друга и начните битву
                    </p>
                  </div>
                  <div className="flex items-center gap-4 pt-4">
                    <div className="flex-1 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                    <Button 
                      size="lg"
                      variant="outline"
                      className="border-2 border-blue-500/30 hover:border-blue-500/50 font-bold"
                    >
                      Присоединиться
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* How to Play Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="p-8 bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20">
              <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                Как играть
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Swords className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-lg mb-1">Создайте или присоединитесь</div>
                    <div className="text-sm text-muted-foreground">Пригласите друга или введите код дуэли</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-lg mb-1">Отвечайте быстрее</div>
                    <div className="text-sm text-muted-foreground">Бонус за скорость до +40%</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-lg mb-1">Собирайте комбо</div>
                    <div className="text-sm text-muted-foreground">До +20% за серию правильных ответов</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-lg mb-1">Побеждайте!</div>
                    <div className="text-sm text-muted-foreground">Получайте награды и поднимайтесь в рейтинге</div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {!isLoadingProfile && mode === 'create' && (
        <DuelLobby
          duelId={duelId}
          duelCode={duelCode}
          onDuelCreated={handleDuelCreated}
          onDuelStarted={handleDuelStarted}
          onCancel={handleBackToMenu}
        />
      )}

      {mode === 'result' && duelId && (
        <DuelResult
          duelId={duelId}
          onRematch={() => setMode('create')}
          onBackToMenu={handleBackToMenu}
        />
      )}
      
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Modals */}
      <DuelCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onDuelCreated={handleDuelCreated}
      />

      <DuelJoinModal
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onDuelJoined={handleDuelJoined}
      />
      </div>
    </Layout>
  );
}
