import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Страница Settings - редирект на дашборд с открытием настроек
 * Используется для deep-links типа /settings
 */
export default function Settings() {
    const navigate = useNavigate();

    useEffect(() => {
        // Редирект на дашборд с параметром для открытия настроек
        navigate('/dashboard?modal=settings', { replace: true });
    }, [navigate]);

    return null;
}
