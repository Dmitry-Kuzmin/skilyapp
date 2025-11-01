import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Swords, Users, Trophy, LogIn } from 'lucide-react';
import { DuelLobby } from '@/components/duel/DuelLobby';
import { DuelJoin } from '@/components/duel/DuelJoin';
import { DuelBattle } from '@/components/duel/DuelBattle';
import { DuelResult } from '@/components/duel/DuelResult';
import { AuthModal } from '@/components/AuthModal';
import { useUserContext } from '@/contexts/UserContext';
import { Card } from '@/components/ui/card';

type GameMode = 'menu' | 'create' | 'join' | 'battle' | 'result';

export default function Duel() {
  const { isAuthenticated, profileId } = useUserContext();
  const [mode, setMode] = useState<GameMode>('menu');
  const [duelId, setDuelId] = useState<string | null>(null);
  const [duelCode, setDuelCode] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleDuelCreated = (id: string, code: string) => {
    setDuelId(id);
    setDuelCode(code);
    setMode('create');
  };

  const handleDuelJoined = (id: string) => {
    setDuelId(id);
    setMode('create'); // Go to lobby to wait for start
  };

  const handleDuelStarted = () => {
    setMode('battle');
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
    if (!isAuthenticated || !profileId) {
      setShowAuthModal(true);
      return;
    }
    action();
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Дуэль знаний</h1>
          <p className="text-muted-foreground">Сразись с друзьями в битве за знания ПДД</p>
        </div>

      {!isAuthenticated || !profileId ? (
        <Card className="max-w-2xl mx-auto p-8 text-center space-y-4">
          <LogIn className="w-16 h-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold">Войдите, чтобы играть</h2>
          <p className="text-muted-foreground">
            Для участия в дуэлях необходимо авторизоваться
          </p>
          <Button size="lg" onClick={() => setShowAuthModal(true)}>
            <LogIn className="mr-2 h-5 w-5" />
            Войти
          </Button>
        </Card>
      ) : mode === 'menu' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <div className="grid gap-4">
            <Button
              size="lg"
              className="h-24 text-lg"
              onClick={() => handleActionClick(() => setMode('create'))}
            >
              <Swords className="mr-2 h-6 w-6" />
              Создать дуэль
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-24 text-lg"
              onClick={() => handleActionClick(() => setMode('join'))}
            >
              <Users className="mr-2 h-6 w-6" />
              Присоединиться по коду
            </Button>

            <Button
              size="lg"
              variant="secondary"
              className="h-24 text-lg"
              onClick={() => {/* Navigate to stats */}}
            >
              <Trophy className="mr-2 h-6 w-6" />
              Статистика дуэлей
            </Button>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold mb-2">Как играть:</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Создайте дуэль или присоединитесь по коду</li>
              <li>• Отвечайте на вопросы быстрее соперника</li>
              <li>• Зарабатывайте бонусы за скорость (+40%)</li>
              <li>• Собирайте комбо из правильных ответов (до +20%)</li>
              <li>• Побеждайте и получайте награды!</li>
            </ul>
          </div>
        </div>
      )}

      {mode === 'create' && (
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

      {mode === 'battle' && duelId && (
        <DuelBattle
          duelId={duelId}
          onDuelFinished={handleDuelFinished}
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
