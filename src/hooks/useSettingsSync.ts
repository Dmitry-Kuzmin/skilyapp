/**
 * useSettingsSync — синхронизирует exam_date и exam_city из профиля Supabase
 * в локальный settingsStore при старте приложения.
 *
 * Логика: при каждом входе проверяем Supabase. Если там есть данные —
 * обновляем хранилище. Это защищает от потери данных при переходе
 * между устройствами или очистке localStorage.
 */

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

interface ProfileSettingsPayload {
    exam_date?: string | null;
    exam_city?: string | null;
}

interface ProfileData {
    settings?: ProfileSettingsPayload | null;
}

export function useSettingsSync(profile: ProfileData | null | undefined) {
    const { setExamDate, setExamCity, examDate, examCity } = useSettingsStore();

    useEffect(() => {
        if (!profile?.settings) return;

        const serverDate = profile.settings.exam_date ?? null;
        const serverCity = profile.settings.exam_city ?? null;

        // Синхронизируем только если сервер знает что-то, чего нет в локальном хранилище
        if (serverDate && !examDate) {
            setExamDate(serverDate);
        }
        if (serverCity && !examCity) {
            setExamCity(serverCity);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.settings]);
}
