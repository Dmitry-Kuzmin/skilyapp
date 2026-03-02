export const initTelegramMock = () => {
    if (typeof window === 'undefined') return;

    // Only run on localhost
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return;
    }

    // Check if real Telegram WebApp exists and is not a dummy
    // @ts-expect-error
    const existingWebApp = window.Telegram?.WebApp;
    const isDummy = existingWebApp && (existingWebApp.platform === 'unknown' || existingWebApp.version === '6.0');

    if (!existingWebApp || isDummy) {
        console.log('[Mock] Telegram WebApp ' + (isDummy ? 'dummy detected' : 'not found') + ', initializing mock...');

        const mockWebApp = {
            ready: () => {
                console.log('[Mock] Telegram WebApp ready');
            },
            expand: () => {
                console.log('[Mock] Telegram WebApp expanded');
            },
            close: () => {
                console.log('[Mock] Telegram WebApp close');
                if (confirm('Закрыть приложение?')) {
                    window.close();
                }
            },
            initData: 'query_id=AAF_d...&user=...',
            initDataUnsafe: {
                query_id: 'AAF_d...',
                user: {
                    id: 123456789,
                    first_name: 'Тестовый',
                    last_name: 'Пользователь',
                    username: 'test_user',
                    language_code: 'ru',
                    photo_url: 'https://via.placeholder.com/150',
                    is_premium: true
                },
                auth_date: Math.floor(Date.now() / 1000),
                hash: 'mock_hash'
            },
            BackButton: {
                show: () => {
                    console.log('[Mock] BackButton show');
                    // @ts-expect-error
                    window.mockBackButtonVisible = true;
                },
                hide: () => {
                    console.log('[Mock] BackButton hide');
                    // @ts-expect-error
                    window.mockBackButtonVisible = false;
                },
                onClick: (callback: () => void) => {
                    console.log('[Mock] BackButton onClick registered');
                    // @ts-expect-error
                    window.mockBackButtonCallback = callback;
                },
                offClick: (callback: () => void) => {
                    console.log('[Mock] BackButton offClick registered');
                    // @ts-expect-error
                    window.mockBackButtonCallback = null;
                }
            },
            MainButton: {
                setText: (text: string) => {
                    console.log('[Mock] MainButton setText:', text);
                    // @ts-expect-error
                    window.mockMainButtonText = text;
                },
                show: () => {
                    console.log('[Mock] MainButton show');
                    // @ts-expect-error
                    window.mockMainButtonVisible = true;
                },
                hide: () => {
                    console.log('[Mock] MainButton hide');
                    // @ts-expect-error
                    window.mockMainButtonVisible = false;
                },
                onClick: (callback: () => void) => {
                    console.log('[Mock] MainButton onClick registered');
                    // @ts-expect-error
                    window.mockMainButtonCallback = callback;
                },
                offClick: (callback: () => void) => {
                    console.log('[Mock] MainButton offClick registered');
                    // @ts-expect-error
                    window.mockMainButtonCallback = null;
                },
                enable: () => {
                    console.log('[Mock] MainButton enable');
                    // @ts-expect-error
                    window.mockMainButtonEnabled = true;
                },
                disable: () => {
                    console.log('[Mock] MainButton disable');
                    // @ts-expect-error
                    window.mockMainButtonEnabled = false;
                },
                showProgress: (leave: boolean) => {
                    console.log('[Mock] MainButton showProgress', leave);
                },
                hideProgress: () => {
                    console.log('[Mock] MainButton hideProgress');
                },
                isActive: true,
                isVisible: true,
                isProgressVisible: false,
                text: 'MAIN BUTTON',
                color: '#2481cc',
                textColor: '#ffffff'
            },
            HapticFeedback: {
                impactOccurred: (style: string) => {
                    console.log('[Mock] HapticFeedback impactOccurred:', style);
                },
                notificationOccurred: (type: string) => {
                    console.log('[Mock] HapticFeedback notificationOccurred:', type);
                },
                selectionChanged: () => {
                    console.log('[Mock] HapticFeedback selectionChanged');
                }
            },
            isVersionAtLeast: (version: string) => {
                console.log('[Mock] isVersionAtLeast:', version);
                return true;
            },
            openTelegramLink: (url: string) => {
                console.log('[Mock] Open Telegram link:', url);
                window.open(url, '_blank');
            },
            openLink: (url: string) => {
                console.log('[Mock] Open link:', url);
                window.open(url, '_blank');
            },
            openInvoice: (url: string, callback?: (status: string) => void) => {
                console.log('[Mock] Open invoice:', url);
                if (callback) setTimeout(() => callback('paid'), 1000);
            },
            version: '8.0',
            platform: 'unknown', // Keep unknown or web to simulate behavior
            colorScheme: 'dark',
            themeParams: {
                bg_color: '#09090b',
                text_color: '#ffffff',
                hint_color: '#999999',
                link_color: '#2481cc',
                button_color: '#2481cc',
                button_text_color: '#ffffff',
                secondary_bg_color: '#18181b',
            },
            setHeaderColor: (color: string) => console.log('[Mock] setHeaderColor', color),
            setBackgroundColor: (color: string) => console.log('[Mock] setBackgroundColor', color),
            requestFullscreen: () => console.log('[Mock] requestFullscreen'),
        };

        // @ts-expect-error
        window.Telegram = window.Telegram || {};
        // @ts-expect-error
        window.Telegram.WebApp = mockWebApp;
        console.log('[Mock] Telegram WebApp Mock initialized for localhost');

        // Trigger ready event manually just in case
        // @ts-expect-error
        if (window.Telegram.WebApp.onEvent) {
            // @ts-expect-error
            window.Telegram.WebApp.onEvent('viewportChanged', { isStateStable: true });
        }
    } else {
        console.log('[Mock] Real Telegram WebApp detected, mock not needed');
    }
};
