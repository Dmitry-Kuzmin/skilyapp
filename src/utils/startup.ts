/**
 * Startup Utility
 * Manages the transition from the initial HTML skeleton to the React application.
 * prevents "flashing" of multiple spinners by keeping the initial skeleton
 * visible until the application is truly ready to render content.
 */

declare global {
    interface Window {
        _startupCurtainLifted?: boolean;
    }
}

export const liftStartupCurtain = () => {
    // Idempotency check
    if (typeof window !== 'undefined' && window._startupCurtainLifted) return;

    if (typeof window !== 'undefined') {
        window._startupCurtainLifted = true;

        // Use requestAnimationFrame to ensure we are in a paint frame
        requestAnimationFrame(() => {
            const skeleton = document.querySelector('.app-skeleton');
            if (skeleton) {
                // Add fade-out class which should handle opacity and pointer-events
                skeleton.classList.add('fade-out');

                console.log('[Startup] 🎭 Lifting the curtain...');

                // Remove from DOM after transition completes
                // CSS transition is set to 0.5s in index.html
                setTimeout(() => {
                    skeleton.remove();
                    console.log('[Startup] ✅ Curtain removed');
                }, 600);
            }
        });
    }
};
