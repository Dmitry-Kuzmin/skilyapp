import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { LogIn, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DuelJoinProps {
  onDuelJoined: (duelId: string) => void;
  onCancel: () => void;
}

export function DuelJoin({ onDuelJoined, onCancel }: DuelJoinProps) {
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinDuel = async () => {
    if (!code || code.length !== 6) {
      toast.error('Введите 6-значный код');
      return;
    }

    setIsJoining(true);
    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'join_duel',
          code: code.toUpperCase(),
        },
      });

      if (error) throw error;

      if (data.auto_started) {
        toast.success('Дуэль начинается! 🎮');
      } else {
        toast.success('Вы присоединились! Ожидание старта...');
      }
      onDuelJoined(data.duel.id);
    } catch (error: any) {
      toast.error(error.message || 'Дуэль не найдена');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Присоединиться к дуэли</h2>
          <p className="text-muted-foreground">Введите код, полученный от друга</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Код дуэли</Label>
            <Input
              placeholder="ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="text-center text-2xl tracking-wider font-bold"
            />
            <p className="text-xs text-muted-foreground">6 символов</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={handleJoinDuel} 
            disabled={isJoining || code.length !== 6}
            className="flex-1"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Присоединиться
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
