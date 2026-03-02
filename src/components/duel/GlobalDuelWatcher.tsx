import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { ReconnectionModal } from './ReconnectionModal';
import { toast } from 'sonner';

/**
 * Глобальный наблюдатель за активными дуэлями.
 * Показывает модалку восстановления если пользователь ушёл со страницы дуэли
 * пока дуэль ещё активна (краш, перезагрузка, навигация).
 *
 * Логика показа:
 * - Пользователь аутентифицирован
 * - Пользователь НЕ на странице дуэли
 * - В БД есть дуэль со статусом 'active' где пользователь участник
 * - Дуэль не старше 30 минут
 * - Модалка не была явно закрыта пользователем (dismiss)
 */
export function GlobalDuelWatcher() {
    const { profileId, isAuthenticated } = useUserContext();
    const location = useLocation();
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [activeDuelId, setActiveDuelId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Храним id дуэлей, которые пользователь явно закрыл (dismiss) — сбрасывается при перезагрузке
    const dismissedRef = useRef<Set<string>>(new Set());
    // Таймер для периодической проверки
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isDuelPage = location.pathname.startsWith('/games/duel') || location.pathname.includes('/game/duel');

    const checkActiveDuel = async () => {
        if (!profileId || !isAuthenticated || isDuelPage) return;

        try {
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

            // Один запрос: ищем активную дуэль пользователя за последние 30 минут
            const { data: playerSessions, error } = await supabase
                .from('duel_players')
                .select('duel_id, duels!inner(id, status, started_at)')
                .eq('user_id', profileId)
                .eq('duels.status', 'active')
                .gte('duels.started_at', thirtyMinutesAgo)
                .limit(1) as { data: any[] | null, error: any };

            if (error) {
                console.error('[GlobalDuelWatcher] Error checking active duels:', error);
                return;
            }

            if (!playerSessions || playerSessions.length === 0) {
                // Активных дуэлей нет — скрываем модалку если показана
                if (showModal) {
                    setShowModal(false);
                    setActiveDuelId(null);
                }
                return;
            }

            const duelId = playerSessions[0].duel_id;

            // Пользователь явно закрыл эту дуэль — не показываем снова
            if (dismissedRef.current.has(duelId)) return;

            console.log('[GlobalDuelWatcher] ✅ Active duel found, showing modal:', duelId);
            setActiveDuelId(duelId);
            setShowModal(true);
        } catch (err) {
            console.error('[GlobalDuelWatcher] Unexpected error:', err);
        }
    };

    // Запускаем проверку при изменении страницы и периодически (каждые 15 сек)
    useEffect(() => {
        if (!isAuthenticated || !profileId) return;

        if (isDuelPage) {
            // На странице дуэли скрываем модалку — пользователь уже там
            setShowModal(false);

            // Очищаем интервал — не нужен пока в игре
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Первая проверка сразу при входе на "мирную" страницу
        checkActiveDuel();

        // Периодическая проверка каждые 15 секунд пока не на странице дуэли
        intervalRef.current = setInterval(checkActiveDuel, 15000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileId, isAuthenticated, isDuelPage]);

    const handleResume = () => {
        if (activeDuelId) {
            setShowModal(false);
            navigate(`/games/duel?duelId=${activeDuelId}`);
        }
    };

    const handleDismiss = (open: boolean) => {
        if (!open && activeDuelId) {
            // Пользователь явно закрыл — запоминаем, больше не беспокоим за эту дуэль
            dismissedRef.current.add(activeDuelId);
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
            setShowModal(false);
            if (activeDuelId) dismissedRef.current.add(activeDuelId);
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
