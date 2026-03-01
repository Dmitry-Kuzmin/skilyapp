import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { ReconnectionModal } from './ReconnectionModal';
import { toast } from 'sonner';

/**
 * Глобальный наблюдатель за активными дуэлями.
 * Показывает модалку восстановления, если пользователь не на странице дуэли,
 * но у него есть незавершенная игра.
 *
 * Условие показа:
 * - Пользователь аутентифицирован
 * - Пользователь НЕ на странице дуэли
 * - В БД есть дуэль со статусом 'active'
 * - В этой дуэли есть хотя бы 1 ответ пользователя (т.е. он действительно играл)
 * - Дуэль не была создана более 1 часа назад
 * - Модалка не была закрыта в течение текущей сессии (dismissedRef)
 */
export function GlobalDuelWatcher() {
    const { profileId, isAuthenticated } = useUserContext();
    const location = useLocation();
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [activeDuelId, setActiveDuelId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Проверяем при монтировании и при повторном входе на "мирные" страницы
    useEffect(() => {
        if (!isAuthenticated || !profileId) return;

        // Строгая проверка страницы дуэли (чтобы не срабатывало на /duel-pass и т.д.)
        const isDuelPage = location.pathname.startsWith('/games/duel') || location.pathname.includes('/game/duel');

        if (isDuelPage) {
            setShowModal(false);
            // При входе в дуэль НЕ удаляем флаг сразу, удалим только если мы действительно начали новую игру
            return;
        }

        // Если в этой сессии браузера мы уже проверяли и ничего не нашли (или пользователь закрыл), не беспокоим
        if (sessionStorage.getItem('duel_global_suppress')) return;
        const alreadyChecked = sessionStorage.getItem('duel_global_checked');
        if (alreadyChecked) return;

        // Дополнительная защита: не проверять слишком часто (cooldown 30 секунд)
        const lastCheck = Number(sessionStorage.getItem('duel_last_check_ts') || 0);
        if (Date.now() - lastCheck < 30000) return;

        const checkActiveDuel = async () => {
            try {
                // Ищем дуэли со статусом 'active', где пользователь участник
                // Ограничиваем поиском за последние 20 минут (дуэль обычно длится 3-5 мин)
                const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
                sessionStorage.setItem('duel_last_check_ts', Date.now().toString());

                const { data: playerSessions, error } = await supabase
                    .from('duel_players')
                    .select('duel_id, duels!inner(id, status, started_at, bet_amount)')
                    .eq('user_id', profileId)
                    .eq('duels.status', 'active')
                    .gte('duels.started_at', twentyMinutesAgo)
                    .limit(1) as { data: any[] | null, error: any };

                if (error) {
                    console.error('[GlobalDuelWatcher] Error checking active duels:', error);
                    return;
                }

                if (!playerSessions || playerSessions.length === 0) {
                    setShowModal(false);
                    setActiveDuelId(null);
                    return;
                }

                const duelId = playerSessions[0].duel_id;

                // Пропускаем если пользователь уже закрыл этот баннер в рамках сессии
                const dismissed = JSON.parse(sessionStorage.getItem('duel_dismissed_ids') || '[]');
                if (dismissed.includes(duelId)) {
                    // Раз уже закрыто, помечаем что проверено и выходим
                    sessionStorage.setItem('duel_global_checked', 'true');
                    return;
                }

                // Дополнительная проверка: есть ли хотя бы 1 ответ игрока в этой дуэли
                // (защита от фантомных/брошенных дуэлей до первого вопроса)
                const { data: playerData, error: playerError } = await supabase
                    .from('duel_players')
                    .select('id')
                    .eq('duel_id', duelId)
                    .eq('user_id', profileId)
                    .maybeSingle() as { data: any | null, error: any };

                if (playerError || !playerData) return;

                const { count: answerCount, error: answerError } = await supabase
                    .from('duel_answers')
                    .select('*', { count: 'exact', head: true })
                    .eq('duel_id', duelId)
                    .eq('player_id', playerData.id);

                if (answerError) return;

                // Показываем баннер только если игрок успел ответить хотя бы на 1 вопрос
                if ((answerCount ?? 0) === 0) {
                    console.log('[GlobalDuelWatcher] Active duel found but no answers yet — skipping modal');
                    return;
                }

                console.log('[GlobalDuelWatcher] Active duel with answers found, showing modal:', duelId);
                setActiveDuelId(duelId);
                setShowModal(true);
                // Помечаем что проверили, но не ставим в sessionStorage 'true' пока модалка открыта, 
                // чтобы она не исчезла при случайном ре-рендере (хотя состояние setShowModal(true) должно держать)
            } catch (err) {
                console.error('[GlobalDuelWatcher] Unexpected error:', err);
                sessionStorage.setItem('duel_global_checked', 'true'); // В случае ошибки тоже стопаем спам
            }
        };

        checkActiveDuel();
        // Сразу помечаем как проверенное (запрос асинхронный, но повторные триггеры эффекта по location.pathname нам не нужны)
        sessionStorage.setItem('duel_global_checked', 'true');
    }, [profileId, isAuthenticated, location.pathname]);

    const handleResume = () => {
        if (activeDuelId) {
            setShowModal(false);
            navigate(`/games/duel?duelId=${activeDuelId}`);
        }
    };

    const handleDismiss = (open: boolean) => {
        if (!open) {
            // Если пользователь закрыл крестиком или свайпом - блокируем показы в этой сессии совсем
            sessionStorage.setItem('duel_global_suppress', 'true');
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
            sessionStorage.setItem('duel_global_suppress', 'true');
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
