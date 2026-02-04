import React, { Suspense, lazy, useMemo } from 'react';
import { motion } from "@/components/optimized/Motion";
import { useDuelStore } from '@/store/duelStore';
import { DuelEffectsOverlay } from '../../DuelEffectsOverlay';

// Lazy load heavy attack components
const OilSplashAttack = lazy(() => import('../../attacks/OilSplashAttack').then(m => ({ default: m.OilSplashAttack })));
const PoliceBackdoorAttack = lazy(() => import('../../attacks/PoliceBackdoorAttack').then(m => ({ default: m.PoliceBackdoorAttack })));

interface ArenaEffectsProps {
    feedbackEffect: 'correct' | 'wrong' | null;
    removeExploit: (id: string) => void;
}

export const ArenaEffects: React.FC<ArenaEffectsProps> = ({ feedbackEffect, removeExploit }) => {
    const activeExploits = useDuelStore(state => state.activeExploits);
    const setExploitPassed = useDuelStore(state => state.setExploitPassed);

    // Derived state for exploits - extracted from the main component to clean it up
    const { screenInjector, policeRaid, screenInjectorPassed, policePassed } = useMemo(() => {
        const NETWORK_LATENCY_BUFFER_MS = 10000; // 10 seconds buffer
        const now = Date.now();

        // activeExploits is a Map<string, ActiveExploit>
        const exploits = Array.from(activeExploits?.values() || []);

        const screenInjector = exploits.find(e => {
            if (e.type !== 'screen_injector' && e.type !== 'data_leak' && e.type !== 'oil_spill') return false;
            const isExpired = e.expiresAt <= now;
            const expiredBy = now - e.expiresAt;
            return !isExpired || expiredBy <= NETWORK_LATENCY_BUFFER_MS;
        });

        const policeRaid = exploits.find(e => {
            if (e.type !== 'police_backdoor') return false;
            const isExpired = e.expiresAt <= now;
            const expiredBy = now - e.expiresAt;
            return !isExpired || expiredBy <= NETWORK_LATENCY_BUFFER_MS;
        });

        // Check passed status
        const screenInjectorPassed =
            activeExploits.get('screen_injector')?.passed ||
            activeExploits.get('data_leak')?.passed ||
            activeExploits.get('oil_spill')?.passed ||
            false;

        const policePassed = activeExploits.get('police_backdoor')?.passed || false;

        return { screenInjector, policeRaid, screenInjectorPassed, policePassed };
    }, [activeExploits]);

    const inputLagActive = useMemo(() => {
        return !!activeExploits.get('input_lag') && !activeExploits.get('input_lag')?.passed;
    }, [activeExploits]);

    return (
        <>
            <DuelEffectsOverlay effect={feedbackEffect} />

            {/* Input Lag Banner */}
            {inputLagActive && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[9997] 
                      bg-red-950/90 border border-red-500/50 rounded-lg p-3 
                      backdrop-blur-xl shadow-2xl"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-red-400 animate-pulse">🕸️</span>
                        <span className="text-red-300 text-sm font-semibold">
                            СИСТЕМА ПЕРЕГРУЖЕНА! Враг применил Input Lag
                        </span>
                    </div>
                </motion.div>
            )}

            {/* Data Leak (Oil) */}
            {screenInjector && !screenInjectorPassed && (
                <Suspense fallback={null}>
                    <OilSplashAttack
                        isActive={true}
                        expiresAt={screenInjector.expiresAt}
                        exploitId={screenInjector.id}
                        onCleaned={() => {
                            console.log('[ArenaEffects] 🛢️ OilSplashAttack cleaned, exploit type:', screenInjector.type);
                            if (screenInjector.id) removeExploit(screenInjector.id);
                            setExploitPassed(screenInjector.type);
                        }}
                    />
                </Suspense>
            )}

            {/* Police Raid */}
            {policeRaid && !policePassed && (
                <Suspense fallback={null}>
                    <PoliceBackdoorAttack
                        isActive={true}
                        onUnlock={() => {
                            setExploitPassed('police_backdoor');
                        }}
                    />
                </Suspense>
            )}
        </>
    );
};
