import { useState } from 'react';

export const TestAuraButton = () => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="fixed top-20 right-20 z-[999999] bg-black/50 p-8 rounded-lg">
            <div className="relative">
                {/* SUPER VISIBLE AURA - NO BLUR */}
                <div
                    className="absolute -inset-16 rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.8) 0%, rgba(99, 102, 241, 0.6) 30%, rgba(59, 130, 246, 0.3) 60%, transparent 100%)',
                        border: '3px solid rgba(59, 130, 246, 0.5)',
                        animation: 'pulse 2s ease-in-out infinite'
                    }}
                />

                {/* Inner bright ring */}
                <div
                    className="absolute -inset-8 rounded-full pointer-events-none border-4 border-blue-400/50"
                />

                {/* Test Button */}
                <button
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="relative z-10 px-8 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-2xl"
                >
                    Test Button
                </button>
            </div>

            {/* Status Display */}
            <div className="mt-6 space-y-2 text-white text-sm bg-zinc-900 p-4 rounded border border-zinc-700">
                <div>Hovered: <span className="text-green-400 font-bold">{isHovered ? 'YES ✓' : 'NO ✗'}</span></div>
                <div>Aura: <span className="text-blue-400 font-bold">SHOULD BE VISIBLE</span></div>
                <div className="text-xs text-zinc-400 mt-2">
                    If you see blue circles around the button - AURA WORKS!
                </div>
            </div>
        </div>
    );
};
