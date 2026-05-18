import React, { useRef } from 'react';
import { Sparkles, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SkilyAIMood =
  | 'idle'
  | 'thinking'
  | 'speaking'
  | 'happy'
  | 'celebrating'
  | 'encouraging';

interface SkilyAICharacterProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  mood?: SkilyAIMood;
  className?: string;
  animate?: boolean;
}

// Dimensions for each size (pixels)
const SIZE = {
  sm: { total: 48,  ringPad: 3,  darkPad: 2, iconSize: 15 },
  md: { total: 96,  ringPad: 6,  darkPad: 4, iconSize: 28 },
  lg: { total: 144, ringPad: 9,  darkPad: 6, iconSize: 42 },
  xl: { total: 192, ringPad: 12, darkPad: 8, iconSize: 56 },
} as const;

function getMoodColors(mood: SkilyAIMood) {
  switch (mood) {
    case 'happy':
    case 'celebrating':
      return {
        ring:    'conic-gradient(#2e1065 0%, #7c3aed 15%, #8b5cf6 30%, #c4b5fd 50%, #38bdf8 65%, #7c3aed 85%, #2e1065 100%)',
        glow:    '0 0 28px rgba(139,92,246,0.55), 0 0 10px rgba(56,189,248,0.3)',
        ambient: 'rgba(139,92,246,0.32)',
        border:  'rgba(167,139,250,0.50)',
        icon:    '#c4b5fd',
        iconShadow: 'drop-shadow(0 0 10px rgba(167,139,250,0.9)) drop-shadow(0 0 5px rgba(56,189,248,0.6))',
        pulse:   'rgba(139,92,246,0.32)',
      };
    case 'encouraging':
      return {
        ring:    'conic-gradient(#7f1d1d 0%, #dc2626 15%, #ef4444 30%, #fca5a5 50%, #ef4444 70%, #dc2626 85%, #7f1d1d 100%)',
        glow:    '0 0 22px rgba(239,68,68,0.4)',
        ambient: 'rgba(239,68,68,0.22)',
        border:  'rgba(239,68,68,0.45)',
        icon:    '#f87171',
        iconShadow: 'drop-shadow(0 0 8px rgba(248,113,113,0.7))',
        pulse:   'rgba(239,68,68,0.28)',
      };
    default: // idle, thinking, speaking
      return {
        ring:    'conic-gradient(#1e3a8a 0%, #2563eb 15%, #3b82f6 30%, #818cf8 50%, #3b82f6 70%, #2563eb 85%, #1e3a8a 100%)',
        glow:    '0 0 22px rgba(59,130,246,0.35)',
        ambient: 'rgba(59,130,246,0.26)',
        border:  'rgba(99,102,241,0.38)',
        icon:    '#93c5fd',
        iconShadow: 'drop-shadow(0 0 8px rgba(59,130,246,0.65))',
        pulse:   'rgba(99,102,241,0.22)',
      };
  }
}

// Randomly pick Brain or Sparkles once per session (Math.random at module level = stable across renders)
const ICON_CHOICE: 'brain' | 'sparkles' = Math.random() < 0.5 ? 'brain' : 'sparkles';

export const SkilyAICharacter = ({
  size = 'md',
  mood = 'idle',
  className,
  animate = true,
}: SkilyAICharacterProps) => {
  const s = SIZE[size];
  const c = getMoodColors(mood);
  const isThinking    = mood === 'thinking';
  const isCelebrating = mood === 'celebrating';
  const isSpeaking    = mood === 'speaking';
  const pulseSpeed    = isSpeaking ? 2.2 : 5;

  // Stable per-instance icon choice (doesn't change on re-renders)
  const iconChoiceRef = useRef<'brain' | 'sparkles'>(ICON_CHOICE);
  const IconComponent = iconChoiceRef.current === 'brain' ? Brain : Sparkles;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center shrink-0', className)}
      style={{ width: s.total, height: s.total }}
    >
      {/* Expanding pulse rings — hidden while thinking (spinner takes over) */}
      {animate && !isThinking && (
        <>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `1px solid ${c.pulse}`,
              animation: `skily-pulse-expand ${pulseSpeed}s cubic-bezier(0, 0, 0.2, 1) infinite`,
              pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `1px solid ${c.pulse}`,
              animation: `skily-pulse-expand ${pulseSpeed}s cubic-bezier(0, 0, 0.2, 1) ${pulseSpeed / 2}s infinite`,
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* ── Conic-gradient metallic ring ─────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: c.ring,
          boxShadow: `0 4px 18px rgba(0,0,0,0.65), inset 0 1px 4px rgba(99,102,241,0.45), ${c.glow}`,
          padding: s.ringPad,
          zIndex: 1,
          animation: isCelebrating && animate ? 'skily-celebrate 0.45s ease-in-out infinite' : undefined,
          transition: 'background 0.4s ease, box-shadow 0.4s ease',
        }}
      >
        {/* ── Dark recessed circle ────────────────────────────────────────── */}
        <div
          style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: '#111',
            boxShadow: 'inset 0 3px 10px rgba(0,0,0,0.92)',
            padding: s.darkPad,
          }}
        >
          {/* ── Gradient face ──────────────────────────────────────────────── */}
          <div
            style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: 'linear-gradient(to bottom, #0d1f3c, #040810)',
              borderTop: `1px solid ${c.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
              transition: 'border-color 0.4s ease',
            }}
          >
            {/* Subtle radial highlight */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'radial-gradient(circle at 36% 32%, rgba(255,255,255,0.13) 0%, transparent 58%)',
                pointerEvents: 'none',
              }}
            />

            {/* Ambient bottom glow */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: '8%', left: '50%', transform: 'translateX(-50%)',
                width: '62%', height: '28%',
                background: c.ambient,
                filter: 'blur(5px)',
                borderRadius: '50% 50% 0 0',
                opacity: 0.85,
                pointerEvents: 'none',
                transition: 'background 0.4s ease',
              }}
            />

            {/* Thinking spinner — sits on top of inner face rim */}
            {isThinking && animate && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '2px solid transparent',
                  borderTopColor: '#60a5fa',
                  borderRightColor: 'rgba(96,165,250,0.22)',
                  animation: 'skily-spin 0.85s linear infinite',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Center icon — Brain or Sparkles (random per session) */}
            <IconComponent
              style={{
                width: s.iconSize,
                height: s.iconSize,
                color: c.icon,
                filter: c.iconShadow,
                flexShrink: 0,
                transition: 'color 0.35s',
              }}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
