import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { LogIn, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserContext } from '@/contexts/UserContext';

interface DuelJoinProps {
  onDuelJoined: (duelId: string, code: string) => void;
  onCancel: () => void;
}

export function DuelJoin({ onDuelJoined, onCancel }: DuelJoinProps) {
  const { profileId } = useUserContext();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinDuel = async () => {
    if (!code || code.length !== 6) {
      toast.error('Введите 6-значный код');
      return;
    }

    if (!profileId) {
      toast.error('Загрузка профиля...');
      return;
    }

    setIsJoining(true);
    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'join_duel',
          profile_id: profileId,
          code: code.toUpperCase(),
        },
      });

      if (error) throw error;

      if (data.auto_started) {
        toast.success('Дуэль начинается! 🎮');
      } else {
        toast.success('Вы присоединились! Ожидание старта...');
      }
      onDuelJoined(data.duel.id, data.duel.code);
    } catch (error: any) {
      toast.error(error.message || 'Дуэль не найдена');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <Card className="p-8 space-y-8 bg-gradient-to-br from-card to-primary/5 border-primary/20">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-4">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Присоединиться
          </h2>
          <p className="text-muted-foreground text-lg">Введите код от друга</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Код дуэли</Label>
            <Input
              placeholder="ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="text-center text-3xl tracking-wider font-black h-16 bg-primary/5"
            />
            <p className="text-sm text-muted-foreground text-center">6 символов</p>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleJoinDuel} 
            disabled={isJoining || code.length !== 6}
            size="lg"
            className="flex-1 h-14 text-lg"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Присоединиться
          </Button>
          <Button variant="outline" onClick={onCancel} size="lg" className="h-14">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
