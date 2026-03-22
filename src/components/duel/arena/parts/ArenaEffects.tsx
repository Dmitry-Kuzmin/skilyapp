import React, { Suspense, lazy, useMemo } from 'react';
import { motion } from "@/components/optimized/Motion";
import { useDuelStore } from '@/store/duelStore';
import { DuelEffectsOverlay } from '../../DuelEffectsOverlay';

// Lazy load heavy attack components
const OilSplashAttack = lazy(() => import('../../attacks/OilSplashAttack').then(m => ({ default: m.OilSplashAttack })));
const PoliceBackdoorAttack = lazy(() => import('../../attacks/PoliceBackdoorAttack').then(m => ({ default: m.PoliceBackdoorAttack })));
const IceScreenAttack = lazy(() => import('../../attacks/IceScreenAttack').then(m => ({ default: m.IceScreenAttack })));
const SunGlareAttack = lazy(() => import('../../attacks/SunGlareAttack').then(m => ({ default: m.SunGlareAttack })));
const RainStormAttack = lazy(() => import('../../attacks/RainStormAttack').then(m => ({ default: m.RainStormAttack })));
const BugSplatAttack = lazy(() => import('../../attacks/BugSplatAttack').then(m => ({ default: m.BugSplatAttack })));
const FogScreenAttack = lazy(() => import('../../attacks/FogScreenAttack').then(m => ({ default: m.FogScreenAttack })));

interface ArenaEffectsProps {
    feedbackEffect: 'correct' | 'wrong' | null;
    removeExploit: (id: string) => void;
}

export const ArenaEffects: React.FC<ArenaEffectsProps> = ({ feedbackEffect, removeExploit }) => {
    const activeExploits = useDuelStore(state => state.activeExploits);
    const setExploitPassed = useDuelStore(state => state.setExploitPassed);

    // Derived state for exploits - extracted from the main component to clean it up
    const { screenInjector, policeRaid, iceScreen, sunGlare, rainStorm, bugSplat, fogScreen, screenInjectorPassed, policePassed, iceScreenPassed, sunGlarePassed, rainStormPassed, bugSplatPassed, fogScreenPassed } = useMemo(() => {
        const NETWORK_LATENCY_BUFFER_MS = 10000; // 10 seconds buffer
        const now = Date.now();

        // activeExploits is a Map<string, ActiveExploit>
        const exploits = Array.from(activeExploits?.values() || []);

        const findExploit = (types: string[]) => exploits.find(e => {
            if (!types.includes(e.type)) return false;
            const isExpired = e.expiresAt <= now;
            const expiredBy = now - e.expiresAt;
            return !isExpired || expiredBy <= NETWORK_LATENCY_BUFFER_MS;
        });

        const screenInjector = findExploit(['screen_injector', 'data_leak', 'oil_spill']);
        const policeRaid = findExploit(['police_backdoor']);
        const iceScreen = findExploit(['ice_screen']);
        const sunGlare = findExploit(['sun_glare']);
        const rainStorm = findExploit(['rain_storm']);
        const bugSplat = findExploit(['bug_splat']);
        const fogScreen = findExploit(['fog_screen']);

        // Check passed status
        const screenInjectorPassed =
            activeExploits.get('screen_injector')?.passed ||
            activeExploits.get('data_leak')?.passed ||
            activeExploits.get('oil_spill')?.passed ||
            false;

        const policePassed = activeExploits.get('police_backdoor')?.passed || false;
        const iceScreenPassed = activeExploits.get('ice_screen')?.passed || false;
        const sunGlarePassed = activeExploits.get('sun_glare')?.passed || false;
        const rainStormPassed = activeExploits.get('rain_storm')?.passed || false;
        const bugSplatPassed = activeExploits.get('bug_splat')?.passed || false;
        const fogScreenPassed = activeExploits.get('fog_screen')?.passed || false;

        return { screenInjector, policeRaid, iceScreen, sunGlare, rainStorm, bugSplat, fogScreen, screenInjectorPassed, policePassed, iceScreenPassed, sunGlarePassed, rainStormPassed, bugSplatPassed, fogScreenPassed };
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

            {/* Ice Screen */}
            {iceScreen && !iceScreenPassed && (
                <Suspense fallback={null}>
                    <IceScreenAttack
                        isActive={true}
                        expiresAt={iceScreen.expiresAt}
                        exploitId={iceScreen.id}
                        onCleaned={() => {
                            if (iceScreen.id) removeExploit(iceScreen.id);
                            setExploitPassed('ice_screen');
                        }}
                    />
                </Suspense>
            )}

            {/* Sun Glare */}
            {sunGlare && !sunGlarePassed && (
                <Suspense fallback={null}>
                    <SunGlareAttack
                        isActive={true}
                        expiresAt={sunGlare.expiresAt}
                        exploitId={sunGlare.id}
                        onCleaned={() => {
                            if (sunGlare.id) removeExploit(sunGlare.id);
                            setExploitPassed('sun_glare');
                        }}
                    />
                </Suspense>
            )}

            {/* Rain Storm */}
            {rainStorm && !rainStormPassed && (
                <Suspense fallback={null}>
                    <RainStormAttack
                        isActive={true}
                        expiresAt={rainStorm.expiresAt}
                        exploitId={rainStorm.id}
                        onCleaned={() => {
                            if (rainStorm.id) removeExploit(rainStorm.id);
                            setExploitPassed('rain_storm');
                        }}
                    />
                </Suspense>
            )}

            {/* Bug Splat */}
            {bugSplat && !bugSplatPassed && (
                <Suspense fallback={null}>
                    <BugSplatAttack
                        isActive={true}
                        expiresAt={bugSplat.expiresAt}
                        exploitId={bugSplat.id}
                        onCleaned={() => {
                            if (bugSplat.id) removeExploit(bugSplat.id);
                            setExploitPassed('bug_splat');
                        }}
                    />
                </Suspense>
            )}

            {/* Fog Screen */}
            {fogScreen && !fogScreenPassed && (
                <Suspense fallback={null}>
                    <FogScreenAttack
                        isActive={true}
                        expiresAt={fogScreen.expiresAt}
                        exploitId={fogScreen.id}
                        onCleaned={() => {
                            if (fogScreen.id) removeExploit(fogScreen.id);
                            setExploitPassed('fog_screen');
                        }}
                    />
                </Suspense>
            )}
        </>
    );
};
