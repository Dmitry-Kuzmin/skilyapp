import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Страница Referrals - редирект на дашборд с открытием модалки рефералов
 * Используется для deep-links типа /referrals
 */
export default function Referrals() {
    const navigate = useNavigate();

    useEffect(() => {
        // Редирект на дашборд с параметром для открытия модалки рефералов
        navigate('/dashboard?modal=referral', { replace: true });
    }, [navigate]);

    return null;
}
