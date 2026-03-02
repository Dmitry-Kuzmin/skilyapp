import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { useActiveDuel } from '@/hooks/useActiveDuel';
import { ReconnectionModal } from './ReconnectionModal';
import { toast } from 'sonner';

/**
 * Глобальный наблюдатель за активными дуэлями.
 *
 * Логика БЕЗ лишних запросов:
 * 1. Проверяем ТОЛЬКО если в localStorage есть activeDuel (значит игрок был в игре).
 * 2. Если localStorage пуст — не делаем НИ ОДНОГО запроса к БД.
 * 3. Единственный запрос — валидация duelId из localStorage.
 * 4. После dismiss — очищаем, больше не проверяем до следующего входа в игру.
 */
export function GlobalDuelWatcher() {
    const { profileId, isAuthenticated } = useUserContext();
    const location = useLocation();
    const navigate = useNavigate();
    const { activeDuel, clearActiveDuel } = useActiveDuel();
    const [showModal, setShowModal] = useState(false);
    const [activeDuelId, setActiveDuelId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const checkedRef = useRef(false);

    const isDuelPage = location.pathname.startsWith('/games/duel');

    useEffect(() => {
        // Только если:
        // 1. Пользователь авторизован
        // 2. Не на странице дуэли
        // 3. В localStorage есть activeDuel с duelId (игрок был в игре)
        // 4. Ещё не проверяли в этой сессии
        if (!isAuthenticated || !profileId || isDuelPage || checkedRef.current) return;
        if (!activeDuel?.duelId) return;

        checkedRef.current = true;

        const validate = async () => {
            try {
                const { data, error } = await supabase
                    .from('duels')
                    .select('status')
                    .eq('id', activeDuel.duelId)
                    .maybeSingle();

                if (error || !data || data.status !== 'active') {
                    // Дуэль не активна — очищаем localStorage, не беспокоим пользователя
                    clearActiveDuel();
                    return;
                }

                // Дуэль активна — показываем модалку
                console.log('[GlobalDuelWatcher] ✅ Active duel confirmed:', activeDuel.duelId);
                setActiveDuelId(activeDuel.duelId);
                setShowModal(true);
            } catch (err) {
                console.error('[GlobalDuelWatcher] Validation error:', err);
            }
        };

        validate();
    }, [isAuthenticated, profileId, isDuelPage, activeDuel, clearActiveDuel]);

    // Скрываем модалку если пользователь сам зашёл на страницу дуэли
    useEffect(() => {
        if (isDuelPage) setShowModal(false);
    }, [isDuelPage]);

    const handleResume = () => {
        if (activeDuelId) {
            setShowModal(false);
            navigate(`/games/duel?duelId=${activeDuelId}`);
        }
    };

    const handleDismiss = (open: boolean) => {
        if (!open) {
            // Пользователь закрыл — очищаем всё, больше не беспокоим
            clearActiveDuel();
            setActiveDuelId(null);
        }
        setShowModal(open);
    };

    const handleSurrender = async () => {
        if (!activeDuelId || !profileId) return;

        setIsProcessing(true);
        try {
            const { error } = await supabase.functions.invoke('duel-manager', {
                body: {
                    action: 'surrender',
                    duel_id: activeDuelId,
                    profile_id: profileId,
                },
            });

            if (error) throw error;

            toast.success('Дуэль завершена');
            clearActiveDuel();
            setShowModal(false);
            setActiveDuelId(null);
        } catch (err) {
            console.error('[GlobalDuelWatcher] Surrender error:', err);
            toast.error('Не удалось завершить дуэль');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <ReconnectionModal
            open={showModal}
            onResume={handleResume}
            onSurrender={handleSurrender}
            onOpenChange={handleDismiss}
        />
    );
}
