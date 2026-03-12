/**
 * Google AdSense H5 Games Ads Integration
 * 
 * Updated according to the latest Ad Placement API documentation (2026)
 * Documentation: https://developers.google.com/ad-placement/docs/reference
 */

declare global {
    interface Window {
        adBreak?: (options: any) => void;
        adConfig?: (options: any) => void;
        adsbygoogle?: any[];
    }
}

let isScriptLoading = false;
let isScriptLoaded = false;
let adConfigDone = false;

/**
 * Динамическая загрузка Google AdSense H5 SDK
 */
async function loadAdSenseScript(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (isScriptLoaded) return;
    
    if (isScriptLoading) {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = setInterval(() => {
                attempts++;
                if (isScriptLoaded || attempts > 100) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });
    }

    isScriptLoading = true;

    return new Promise((resolve, reject) => {
        console.log('[AdSense H5] 📂 Injecting SDK script...');
        const script = document.createElement('script');
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        script.async = true;
        // Используем подтвержденный нами ID
        script.dataset.adClient = 'ca-pub-1758777358223420';
        script.dataset.adFrequencyHint = '30s';
        
        const loadTimeout = setTimeout(() => {
            isScriptLoading = false;
            console.error('[AdSense H5] ⏰ Script load timeout');
            reject(new Error('AdSense SDK load timeout'));
        }, 15000);

        script.onload = () => {
            clearTimeout(loadTimeout);
            console.log('[AdSense H5] ✅ SDK Script loaded successfully');
            isScriptLoaded = true;
            isScriptLoading = false;
            resolve();
        };

        script.onerror = (e) => {
            clearTimeout(loadTimeout);
            isScriptLoading = false;
            console.error('[AdSense H5] ❌ SDK Script error:', e);
            reject(new Error('Failed to load AdSense SDK'));
        };

        document.head.appendChild(script);
    });
}

/**
 * Настройка прокси и конфигурации
 */
export function initAdSenseH5(): void {
    if (typeof window === 'undefined') return;
    if (adConfigDone) return;

    console.log('[AdSense H5] 🛠️ Initializing shims and config...');

    window.adsbygoogle = window.adsbygoogle || [];
    const adsbygoogle = window.adsbygoogle;
    
    // Новые прокси согласно документации
    window.adBreak = window.adBreak || function (o) { adsbygoogle.push(o); };
    window.adConfig = window.adConfig || function (o) { adsbygoogle.push(o); };

    window.adConfig({
        preloadAdBreaks: 'on',
        onReady: () => {
            console.log('[AdSense H5] 🎮 SDK is ready (onReady callback) ✅');
        },
    });
    
    adConfigDone = true;
}

/**
 * Показ рекламы с вознаграждением (Rewarded Ad)
 * Использует актуальный Flow из документации (2026)
 */
export async function showAdSenseRewardedVideo(options: { name: string } = { name: 'reward' }): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    console.log(`[AdSense H5] 🚀 Rewarded session start: ${options.name}`);

    initAdSenseH5();
    
    try {
        await loadAdSenseScript();
    } catch (e) {
        console.error('[AdSense H5] ❌ Script failed:', e);
        return false;
    }

    return new Promise((resolve) => {
        console.log(`[AdSense H5] 📡 window.adBreak request: type=reward`);

        const globalTimeout = setTimeout(() => {
            console.warn('[AdSense H5] ⏰ Global ad break timeout');
            resolve(false);
        }, 45000); // Даем больше времени на видео

        try {
            window.adBreak!({
                type: 'reward',
                name: options.name,
                // НОВЫЙ СИНТАКСИС ИЗ СКРИНШОТОВ (Detailed Call Sequence)
                beforeReward: (showAdFn: () => void) => {
                    console.log('[AdSense H5] 🟢 beforeReward: Ad available, launching...');
                    // Поскольку наш пользователь уже нажал кнопку в модалке, 
                    // мы вызываем showAdFn сразу.
                    showAdFn();
                },
                beforeAd: () => {
                    console.log('[AdSense H5] ⏸️ beforeAd: Pause game logic');
                },
                afterAd: () => {
                    console.log('[AdSense H5] ▶️ afterAd: Resume game logic');
                },
                adViewed: () => {
                    console.log('[AdSense H5] 💎 adViewed: Reward granted ✅');
                    clearTimeout(globalTimeout);
                    resolve(true);
                },
                adDismissed: () => {
                    console.log('[AdSense H5] ❌ adDismissed: User skipped');
                    clearTimeout(globalTimeout);
                    resolve(false);
                },
                adBreakDone: (placementInfo: any) => {
                    const status = placementInfo?.breakStatus;
                    console.log(`[AdSense H5] 🏁 adBreakDone. Status: ${status}`, placementInfo);
                    
                    // Логируем понятную причину, если реклама не показалась
                    const statusMessages: Record<string, string> = {
                        'notReady': 'API не инициализировано',
                        'timeout': 'Таймаут размещения',
                        'invalid': 'Некорректное размещение',
                        'error': 'Ошибка в скрипте',
                        'noAdPreloaded': 'Реклама еще не подгрузилась (прелоад)',
                        'frequencyCapped': 'Превышена частота показов (ограничение Google)',
                        'ignored': 'Запрос проигнорирован (showAdFn не вызван)',
                        'other': 'Скрыто по техническим причинам (ресайз/ротация)',
                        'dismissed': 'Пользователь закрыл рекламу',
                        'viewed': 'Реклама просмотрена полностью'
                    };

                    if (status && status !== 'viewed' && status !== 'dismissed') {
                        console.warn(`[AdSense H5] ℹ️ Причина отсутствия рекламы: ${statusMessages[status] || status}`);
                    }

                    clearTimeout(globalTimeout);
                    // Если resolve еще не был вызван, завершаем как false
                    setTimeout(() => resolve(false), 100); 
                },
                // Fallbacks для старых версий или ошибок
                adError: () => {
                    console.error('[AdSense H5] ⚠️ adError');
                    clearTimeout(globalTimeout);
                    resolve(false);
                },
                adNoSlot: () => {
                    console.warn('[AdSense H5] 📭 adNoSlot: No ads found');
                    clearTimeout(globalTimeout);
                    resolve(false);
                }
            });
        } catch (error) {
            console.error('[AdSense H5] 💥 Exception in adBreak call:', error);
            clearTimeout(globalTimeout);
            resolve(false);
        }
    });
}
