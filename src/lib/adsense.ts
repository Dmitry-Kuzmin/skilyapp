/**
 * Google AdSense H5 Games Ads Integration
 * 
 * Documentation: https://support.google.com/adsense/answer/10398031
 * Instruction from Dima: Steps 1-3.
 */

declare global {
    interface Window {
        adBreak?: (options: any) => void;
        adConfig?: (options: any) => void;
        adsbygoogle?: any[];
    }
}

/**
 * Initializes Google AdSense H5 Games Ads environment and proxies.
 * This should be called once at start.
 */
export function initAdSenseH5(): void {
    if (typeof window === 'undefined') return;

    // Define proxies that push to adsbygoogle array
    window.adsbygoogle = window.adsbygoogle || [];
    window.adBreak = window.adBreak || function (o) { (window.adsbygoogle = window.adsbygoogle || []).push(o); };
    window.adConfig = window.adConfig || function (o) { (window.adsbygoogle = window.adsbygoogle || []).push(o); };

    // IMPORTANT: Call adConfig to initialize the SDK
    // This turns on preloading and sets up the environment
    window.adConfig({
        preloadAdBreaks: 'on',
        onReady: () => {
            console.log('[AdSense H5] 🎮 SDK is ready and environment is verified ✅');
        },
    });

    console.log('[AdSense H5] 🛠️ Proxies and adConfig established');
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
        // Ensure proxies are ready
        if (!window.adBreak) {
            initAdSenseH5();
        }

        console.log(`[AdSense H5] 🚀 Requesting ad break: type=reward, name=${options.name}`);

        try {
            window.adBreak!({
                type: 'reward',
                name: options.name,
                beforeBreak: () => {
                    console.log('[AdSense H5] ⏸️ beforeBreak: Ad starting...');
                    // Logic to pause game/sounds if needed
                },
                afterBreak: () => {
                    console.log('[AdSense H5] ▶️ afterBreak: Ad instance completed');
                    // Logic to resume game
                },
                adViewed: () => {
                    console.log('[AdSense H5] 💎 adViewed: Reward granted ✅');
                    resolve(true);
                },
                adDismissed: () => {
                    console.log('[AdSense H5] ❌ adDismissed: User closed ad early');
                    resolve(false);
                },
                adError: () => {
                    console.error('[AdSense H5] ⚠️ adError: Commercial instance error');
                    resolve(false);
                },
                adNoSlot: () => {
                    console.warn('[AdSense H5] 📭 adNoSlot: No inventory available now');
                    resolve(false);
                },
                adTimeout: () => {
                    console.warn('[AdSense H5] ⏰ adTimeout: Ad took too long to load');
                    resolve(false);
                }
            });
        } catch (error) {
            console.error('[AdSense H5] 💥 Exception in adBreak call:', error);
            resolve(false);
        }
    });
}
