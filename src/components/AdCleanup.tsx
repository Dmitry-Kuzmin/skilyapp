import { useEffect } from 'react';

/**
 * Component that proactively monitors and removes known harmful ad scripts
 * that might have slipped through or were cached.
 */
export const AdCleanup = () => {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Skip cleanup in production to avoid breaking revenue
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            return;
        }

        const cleanup = () => {
            const selectors = [
                'script[src*="vignette"]',
                'script[src*="monetag"]',
                'script[src*="groleegni"]',
                'script[src*="gizokraijaw"]',
                'iframe[src*="monetag"]'
            ];

            selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    console.warn('[AdCleanup] 🧹 Removing rogue element:', (el as any).src || el.tagName);
                    el.remove();
                });
            });
        };

        // Run immediately
        cleanup();

        // And periodically (in case something injects it later)
        const interval = setInterval(cleanup, 1000);

        // And closely observe head and body
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        const el = node as HTMLElement;
                        if (el.tagName === 'SCRIPT' && (el as HTMLScriptElement).src) {
                            const src = (el as HTMLScriptElement).src;
                            if (src.includes('monetag') || src.includes('vignette') || src.includes('groleegni')) {
                                console.warn('[AdCleanup] 🛡️ Intercepted injection:', src);
                                el.remove();
                            }
                        }
                    }
                });
            });
        });

        if (document.head) observer.observe(document.head, { childList: true, subtree: true });
        if (document.body) observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            clearInterval(interval);
            observer.disconnect();
        };
    }, []);

    return null; // Render nothing
};
