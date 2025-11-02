import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Swords, Users, Trophy, LogIn } from 'lucide-react';
import { DuelLobby } from '@/components/duel/DuelLobby';
import { DuelJoin } from '@/components/duel/DuelJoin';
import { DuelBattleFullscreen } from '@/components/duel/DuelBattleFullscreen';
import { DuelResult } from '@/components/duel/DuelResult';
import { AuthModal } from '@/components/AuthModal';
import { useUserContext } from '@/contexts/UserContext';
import { Card } from '@/components/ui/card';
import { isTelegramMiniApp } from '@/lib/telegram';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type GameMode = 'menu' | 'create' | 'join' | 'battle' | 'result';

export default function Duel() {
  const { isAuthenticated, profileId, user, supabaseUser } = useUserContext();
  const [mode, setMode] = useState<GameMode>('menu');
  const [duelId, setDuelId] = useState<string | null>(null);
  const [duelCode, setDuelCode] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
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

  const handleDuelFinished = () => {
    setMode('result');
  };

  const handleBackToMenu = () => {
    setMode('menu');
    setDuelId(null);
    setDuelCode(null);
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
  if (mode === 'battle' && duelId) {
    return (
      <DuelBattleFullscreen
        duelId={duelId}
        onExit={handleBackToMenu}
        onDuelFinished={handleDuelFinished}
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
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Дуэль знаний</h1>
          <p className="text-muted-foreground">Сразись с друзьями в битве за знания ПДД</p>
        </div>

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
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
          <div className="grid gap-4">
            <Button
              size="lg"
              className="h-32 text-xl relative overflow-hidden group"
              onClick={() => handleActionClick(() => setMode('create'))}
              disabled={isLoadingProfile}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Swords className="h-7 w-7" />
                </div>
                <div className="text-left">
                  <div className="font-bold">Создать дуэль</div>
                  <div className="text-sm opacity-80">Пригласите друга на битву</div>
                </div>
              </div>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-32 text-xl relative overflow-hidden group border-2"
              onClick={() => handleActionClick(() => setMode('join'))}
              disabled={isLoadingProfile}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-bold">Присоединиться</div>
                  <div className="text-sm opacity-70">Введите код дуэли</div>
                </div>
              </div>
            </Button>

            <Button
              size="lg"
              variant="secondary"
              className="h-32 text-xl relative overflow-hidden group"
              onClick={() => {/* Navigate to stats */}}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <Trophy className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="text-left">
                  <div className="font-bold">Статистика</div>
                  <div className="text-sm opacity-70">Ваши достижения</div>
                </div>
              </div>
            </Button>
          </div>

          <Card className="p-8 bg-gradient-to-br from-card to-primary/5 border-primary/20">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">🎮</span>
              Как играть
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚔️</span>
                <div>
                  <div className="font-semibold">Создайте или присоединитесь</div>
                  <div className="text-sm text-muted-foreground">Пригласите друга или введите код</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="font-semibold">Отвечайте быстрее</div>
                  <div className="text-sm text-muted-foreground">Бонус за скорость до +40%</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <div className="font-semibold">Собирайте комбо</div>
                  <div className="text-sm text-muted-foreground">До +20% за серию правильных ответов</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎁</span>
                <div>
                  <div className="font-semibold">Побеждайте!</div>
                  <div className="text-sm text-muted-foreground">Получайте награды и поднимайтесь в рейтинге</div>
                </div>
              </div>
            </div>
          </Card>
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

      {mode === 'join' && (
        <DuelJoin
          onDuelJoined={handleDuelJoined}
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
      </div>
    </Layout>
  );
}
