import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui/unified-modal';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DuelSurrenderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duelId: string;
  onSurrender: () => void;
}

export function DuelSurrenderModal({
  open,
  onOpenChange,
  duelId,
  onSurrender
}: DuelSurrenderModalProps) {
  const { profileId } = useUserContext();
  const [isSurrendering, setIsSurrendering] = useState(false);

  const handleSurrender = async () => {
    if (!profileId || !duelId) return;

    setIsSurrendering(true);
    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'surrender',
          duel_id: duelId,
          profile_id: profileId
        }
      });

      if (error) {
        console.error('[DuelSurrenderModal] Error surrendering:', error);
        toast.error('Ошибка при выходе из дуэли');
        setIsSurrendering(false);
        return;
      }

      if (data?.surrendered) {
        toast.info('Вы сдались. Соперник получает победу.');
        onSurrender();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('[DuelSurrenderModal] Exception surrendering:', error);
      toast.error('Ошибка при выходе из дуэли');
      setIsSurrendering(false);
    }
  };

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      title="Выход из дуэли"
      modalType="default"
      preventClose={isSurrendering}
      className="max-w-md"
    >
      <div className="space-y-6 p-6">
        {/* Предупреждение */}
        <div className="flex items-start gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <h3 className="font-semibold text-red-500 text-base">
              Вы уверены, что хотите выйти?
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              При выходе из дуэли вам будет засчитано поражение, а ваш соперник получит победу.
              Это действие нельзя отменить.
            </p>
          </div>
        </div>

        {/* Последствия */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Последствия:
          </h4>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Вам будет засчитано поражение</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Соперник автоматически получит победу</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Если была ставка, она перейдет сопернику</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Вы не сможете вернуться в эту дуэль</span>
            </li>
          </ul>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSurrendering}
            className="flex-1 h-12 border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
          >
            Отмена
          </Button>
          <Button
            onClick={handleSurrender}
            disabled={isSurrendering}
            className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white"
          >
            {isSurrendering ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Выход...
              </span>
            ) : (
              'Выйти и сдаться'
            )}
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}


