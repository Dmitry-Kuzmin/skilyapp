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

/**
 * Динамическая загрузка Google AdSense H5 SDK
 * Мы загружаем его только ПЕРЕД показом первой рекламы, 
 * чтобы не мешать инициализации приложения.
 */
async function loadAdSenseScript(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (isScriptLoaded) return;
    if (isScriptLoading) {
        // Ждем завершения текущей загрузки
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (isScriptLoaded) {
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
        script.dataset.adClient = 'ca-pub-1758777358223420';
        script.dataset.adFrequencyHint = '30s';
        
        script.onload = () => {
            console.log('[AdSense H5] ✅ SDK Script loaded successfully');
            isScriptLoaded = true;
            isScriptLoading = false;
            resolve();
        };
        script.onerror = () => {
            isScriptLoading = false;
            reject(new Error('Failed to load AdSense SDK'));
        };
        document.head.appendChild(script);
    });
}

/**
 * Initializes Google AdSense H5 Games Ads Proxies
 * Вызывается при инициализации рекламного хука.
 * Теперь НЕ загружает скрипт автоматически, только настраивает прокси.
 */
export function initAdSenseH5(): void {
    if (typeof window === 'undefined') return;

    // Создаем прокси-функции сразу (в соответствии с документацией Google)
    // Это позволяет вызывать adBreak даже до полной загрузки скрипта
    window.adsbygoogle = window.adsbygoogle || [];
    window.adBreak = window.adBreak || function (o) { (window.adsbygoogle = window.adsbygoogle || []).push(o); };
    window.adConfig = window.adConfig || function (o) { (window.adsbygoogle = window.adsbygoogle || []).push(o); };

    // Настраиваем среду
    window.adConfig({
        preloadAdBreaks: 'on',
        onReady: () => {
            console.log('[AdSense H5] 🎮 SDK is ready and fully initialized ✅');
        },
    });
}

/**
 * Shows a rewarded video ad using Google AdSense H5 Placement API
 */
export async function showAdSenseRewardedVideo(options: { name: string } = { name: 'reward' }): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Гарантируем наличие прокси и скрипта только в момент вызова
    initAdSenseH5();
    
    try {
        await loadAdSenseScript();
    } catch (e) {
        console.error('[AdSense H5] ❌ Cannot show ad because script failed to load');
        return false;
    }

    return new Promise((resolve) => {
        console.log(`[AdSense H5] 🚀 Requesting ad break: type=reward, name=${options.name}`);

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
                    resolve(true);
                },
                adDismissed: () => {
                    console.log('[AdSense H5] ❌ adDismissed');
                    resolve(false);
                },
                adError: () => {
                    console.error('[AdSense H5] ⚠️ adError');
                    resolve(false);
                },
                adNoSlot: () => {
                    console.warn('[AdSense H5] 📭 adNoSlot');
                    resolve(false);
                },
                adTimeout: () => {
                    console.warn('[AdSense H5] ⏰ adTimeout');
                    resolve(false);
                }
            });
        } catch (error) {
            console.error('[AdSense H5] 💥 Exception in adBreak call:', error);
            resolve(false);
        }
    });
}
