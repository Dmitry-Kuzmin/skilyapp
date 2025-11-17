import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { LogIn, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { useLumiToast } from '@/hooks/useLumiToast';

interface DuelJoinProps {
  onDuelJoined: (duelId: string, code: string) => void;
  onCancel: () => void;
}

export function DuelJoin({ onDuelJoined, onCancel }: DuelJoinProps) {
  const { profileId } = useUserContext();
  const { showDuelJoinError, showDuelJoinSuccess, ToastContainer } = useLumiToast();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinDuel = async () => {
    if (!code || code.length !== 4) {
      showDuelJoinError('Code must be exactly 4 characters');
      return;
    }

    if (!profileId) {
      showDuelJoinError('Profile not found');
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

      showDuelJoinSuccess(data.auto_started);
      onDuelJoined(data.duel.id, data.duel.code);
    } catch (error: any) {
      showDuelJoinError(error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <>
      <ToastContainer />
      <div className="max-w-md mx-auto animate-fade-in">
      <Card className="p-8 space-y-8 bg-gradient-to-br from-card to-primary/5 border-primary/20">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-4">
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
              placeholder="AB12"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
              maxLength={4}
              className="text-center text-3xl tracking-wider font-black h-16 bg-primary/5"
            />
            <p className="text-sm text-muted-foreground text-center">4 символа</p>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleJoinDuel} 
            disabled={isJoining || code.length !== 4}
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
    </>
  );
}
