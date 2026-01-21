import { useEffect } from 'react';
import { liftStartupCurtain } from '@/utils/startup';

/**
 * StartupCurtain
 * A logic-only component that signals the application is ready to be shown.
 * Upon mounting, it triggers the removal of the initial HTML skeleton loader.
 * Place this component in the final UI views (PageSkeleton, Landing, etc.).
 */
export const StartupCurtain = () => {
    useEffect(() => {
        liftStartupCurtain();
    }, []);

    return null;
};
