import { memo } from 'react';

interface OfflineStatusIndicatorProps {
    isOnline: boolean;
    pendingSync: boolean;
}

/**
 * Displays offline status and sync indicators.
 * Shows warning when offline and progress when syncing.
 */
export const OfflineStatusIndicator = memo(function OfflineStatusIndicator({
    isOnline,
    pendingSync,
}: OfflineStatusIndicatorProps) {
    if (isOnline && !pendingSync) return null;

    return (
        <>
            {!isOnline && (
                <div className="mb-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    <span>Офлайн режим: ответы сохраняются локально</span>
                </div>
            )}
            {pendingSync && (
                <div className="mb-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>Синхронизация прогресса...</span>
                </div>
            )}
        </>
    );
});

export default OfflineStatusIndicator;
