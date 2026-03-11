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

/**
 * Динамическая загрузка Google AdSense H5 SDK
 */
async function loadAdSenseScript(): Promise<void> {
    if (window.adsbygoogle) return;

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        script.async = true;
        script.dataset.adClient = 'ca-pub-1758777358223420';
        script.dataset.adFrequencyHint = '30s';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load AdSense SDK'));
        document.head.appendChild(script);
    });
}

/**
 * Initializes Google AdSense H5 Games Ads
 */
export async function initAdSenseH5(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Загружаем скрипт динамически
    if (!window.adsbygoogle) {
        try {
            await loadAdSenseScript();
        } catch (error) {
            console.error('[AdSense H5] Script loading failed:', error);
            return;
        }
    }

    // Initialize adBreak function if not already present
    // It pushes the configuration to the adsbygoogle array
    window.adsbygoogle = window.adsbygoogle || [];
    window.adBreak = window.adBreak || function (o) { (window.adsbygoogle = window.adsbygoogle || []).push(o); };
    window.adConfig = window.adConfig || function (o) { (window.adsbygoogle = window.adsbygoogle || []).push(o); };

    console.log('[AdSense H5] Initialized Placement API');
}

/**
 * Shows a rewarded video ad using Google AdSense H5 Placement API
 * 
 * @param options - Additional options like placement name
 * @returns Promise<boolean> - Resolves with true if ad was shown successfully
 */
export async function showAdSenseRewardedVideo(options: { name: string } = { name: 'reward' }): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    return new Promise((resolve) => {
        // Check if adBreak is available
        if (!window.adBreak) {
            initAdSenseH5();
        }

        try {
            window.adBreak!({
                type: 'reward',
                name: options.name,
                beforeBreak: () => {
                    console.log('[AdSense H5] Before break');
                    // Optional: pause game sounds or logic
                },
                afterBreak: () => {
                    console.log('[AdSense H5] After break');
                    // Optional: resume game sounds or logic
                },
                adViewed: () => {
                    console.log('[AdSense H5] Ad viewed - Reward granted ✅');
                    resolve(true);
                },
                adDismissed: () => {
                    console.log('[AdSense H5] Ad dismissed ❌');
                    resolve(false);
                },
                adError: () => {
                    console.error('[AdSense H5] Ad error ❌');
                    resolve(false);
                },
                adNoSlot: () => {
                    console.warn('[AdSense H5] No ad slot available ❌');
                    resolve(false);
                }
            });
        } catch (error) {
            console.error('[AdSense H5] Error during adBreak:', error);
            resolve(false);
        }
    });
}
