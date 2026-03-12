/**
 * Google AdSense H5 Games Ads Integration
 * 
 * Documentation: https://support.google.com/adsense/answer/10398031
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
    
    // Если уже грузится, ждем (с таймаутом)
    if (isScriptLoading) {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = setInterval(() => {
                attempts++;
                if (isScriptLoaded || attempts > 100) { // 10 секунд макс
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });
    }

    isScriptLoading = true;

    return new Promise((resolve, reject) => {
        console.log('[AdSense H5] 📂 Injecting SDK script...');
        
        // Создаем скрипт
        const script = document.createElement('script');
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        script.async = true;
        
        // Атрибуты для H5 Ads
        script.dataset.adClient = 'ca-pub-1758777358223420';
        script.dataset.adFrequencyHint = '30s';
        
        // Таймаут на загрузку самого скрипта
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

    // Инициализируем очередь
    window.adsbygoogle = window.adsbygoogle || [];
    
    // Переопределяем функции, если они не заданы
    const adsbygoogle = window.adsbygoogle;
    window.adBreak = window.adBreak || function (o) { adsbygoogle.push(o); };
    window.adConfig = window.adConfig || function (o) { adsbygoogle.push(o); };

    // Конфигурация (вызываем один раз)
    window.adConfig({
        preloadAdBreaks: 'on',
        onReady: () => {
            console.log('[AdSense H5] 🎮 SDK is ready (onReady callback) ✅');
        },
    });
    
    adConfigDone = true;
}

/**
 * Показ рекламы с вознаграждением
 */
export async function showAdSenseRewardedVideo(options: { name: string } = { name: 'reward' }): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    console.log(`[AdSense H5] 🚀 showAdSenseRewardedVideo start: ${options.name}`);

    // Шаг 1: Инициализация прокси
    initAdSenseH5();
    
    // Шаг 2: Загрузка скрипта
    try {
        await loadAdSenseScript();
    } catch (e) {
        console.error('[AdSense H5] ❌ Script failed:', e);
        return false;
    }

    // Шаг 3: Запрос adBreak
    return new Promise((resolve) => {
        console.log(`[AdSense H5] 📡 window.adBreak request: type=reward, name=${options.name}`);

        // Таймаут на весь процесс показа рекламы (чтобы не висел бесконечно в loading)
        const globalTimeout = setTimeout(() => {
            console.warn('[AdSense H5] ⏰ Global ad break timeout reached');
            resolve(false);
        }, 30000); // 30 секунд на всё

        try {
            window.adBreak!({
                type: 'reward',
                name: options.name,
                beforeBreak: () => {
                    console.log('[AdSense H5] ⏸️ beforeBreak');
                },
                afterBreak: () => {
                    console.log('[AdSense H5] ▶️ afterBreak');
                },
                adViewed: () => {
                    console.log('[AdSense H5] 💎 adViewed: Reward granted ✅');
                    clearTimeout(globalTimeout);
                    resolve(true);
                },
                adDismissed: () => {
                    console.log('[AdSense H5] ❌ adDismissed');
                    clearTimeout(globalTimeout);
                    resolve(false);
                },
                adError: () => {
                    console.error('[AdSense H5] ⚠️ adError');
                    clearTimeout(globalTimeout);
                    resolve(false);
                },
                adNoSlot: () => {
                    console.warn('[AdSense H5] 📭 adNoSlot: No ads available');
                    clearTimeout(globalTimeout);
                    resolve(false);
                },
                adTimeout: () => {
                    console.warn('[AdSense H5] ⏰ adTimeout: SDK reported timeout');
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
