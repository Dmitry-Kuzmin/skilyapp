/**
 * 🔒 ЖЕЛЕЗНАЯ ЛОГИКА ДЛЯ TELEGRAM MINI APP
 * 
 * Этот хук гарантирует, что profileId ВСЕГДА доступен перед использованием.
 * Использование: 
 *   const { profileId, isReady, waitForProfile } = useRequireProfile();
 * 
 * Если profileId еще не загружен:
 * - isReady = false
 * - waitForProfile() вернет Promise, который resolve когда profileId готов
 * 
 * ПРАВИЛО: Никогда не вызывай API без проверки isReady или await waitForProfile()
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUserContext } from '@/contexts/UserContext';

interface UseRequireProfileResult {
    /** ID профиля пользователя (null если еще не загружен) */
    profileId: string | null;

    /** true если profileId готов к использованию */
    isReady: boolean;

    /** Promise который resolve когда profileId станет доступен */
    waitForProfile: () => Promise<string>;

    /** true если идет загрузка */
    isLoading: boolean;

    /** Ошибка загрузки (если есть) */
    error: Error | null;
}

// Глобальный Promise для ожидания profileId (синглтон)
let globalProfilePromise: Promise<string> | null = null;
let globalProfileResolve: ((value: string) => void) | null = null;
let globalProfileId: string | null = null;

/**
 * Устанавливает глобальный profileId (вызывается из UserContext)
 */
export function setGlobalProfileId(id: string | null) {
    globalProfileId = id;
    if (id && globalProfileResolve) {
        globalProfileResolve(id);
        globalProfileResolve = null;
    }
}

/**
 * Получает глобальный profileId (для использования вне React)
 */
export function getGlobalProfileId(): string | null {
    return globalProfileId;
}

/**
 * Хук для гарантированного получения profileId
 */
export function useRequireProfile(): UseRequireProfileResult {
    const { profileId, isLoading: isAuthLoading } = useUserContext();
    const [isReady, setIsReady] = useState(!!profileId);
    const [error, setError] = useState<Error | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Обновляем глобальный profileId при изменении
    useEffect(() => {
        if (profileId) {
            setGlobalProfileId(profileId);
            setIsReady(true);
            setError(null);
        }
    }, [profileId]);

    // Таймаут на загрузку профиля (30 секунд)
    useEffect(() => {
        if (!profileId && !isAuthLoading) {
            timeoutRef.current = setTimeout(() => {
                if (!profileId) {
                    setError(new Error('Не удалось загрузить профиль. Попробуйте перезагрузить приложение.'));
                }
            }, 30000);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [profileId, isAuthLoading]);

    const waitForProfile = useCallback((): Promise<string> => {
        // Если profileId уже есть - возвращаем сразу
        if (profileId) {
            return Promise.resolve(profileId);
        }

        // Если глобальный profileId есть - возвращаем его
        if (globalProfileId) {
            return Promise.resolve(globalProfileId);
        }

        // Создаем или переиспользуем глобальный Promise
        if (!globalProfilePromise) {
            globalProfilePromise = new Promise<string>((resolve, reject) => {
                globalProfileResolve = resolve;

                // Таймаут на ожидание
                setTimeout(() => {
                    if (!globalProfileId) {
                        reject(new Error('Таймаут ожидания profileId'));
                    }
                }, 30000);
            });
        }

        return globalProfilePromise;
    }, [profileId]);

    return {
        profileId,
        isReady,
        waitForProfile,
        isLoading: isAuthLoading,
        error,
    };
}

/**
 * Утилита для безопасного вызова API с profileId
 * Автоматически ждет загрузки profileId перед вызовом
 */
export async function withProfileId<T>(
    fn: (profileId: string) => Promise<T>
): Promise<T> {
    // Если глобальный profileId есть - используем его
    if (globalProfileId) {
        return fn(globalProfileId);
    }

    // Ждем загрузки profileId
    if (globalProfilePromise) {
        const id = await globalProfilePromise;
        return fn(id);
    }

    throw new Error('ProfileId не доступен. Убедитесь, что UserProvider инициализирован.');
}
