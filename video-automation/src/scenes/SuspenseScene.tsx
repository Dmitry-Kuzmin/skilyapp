import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { VideoQuestion, UI_TEXT, FPS, TIMING } from "../types";

export const SuspenseScene: React.FC<{ q: VideoQuestion }> = ({ q }) => {
  const frame = useCurrentFrame();
  const sceneFrame = frame - TIMING.suspense.start * FPS;
  const totalFrames = (TIMING.suspense.end - TIMING.suspense.start) * FPS;

  const ui = UI_TEXT[q.language];

  // Progress 1→0 as time runs out
  const progress = Math.max(0, 1 - sceneFrame / totalFrames);
  const secsLeft  = Math.ceil(progress * (TIMING.suspense.end - TIMING.suspense.start));

  // Fade in quickly
  const opacity = interpolate(sceneFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  // Arc params
  const R  = 28;
  const cx = 36;
  const cy = 36;
  const circumference = 2 * Math.PI * R;
  const dash = circumference * progress;

  // Colour shifts red as time runs out
  const hue   = Math.round(120 * progress); // green → yellow → red
  const color = `hsl(${hue},90%,60%)`;

  // Gentle pulse on last 2 seconds
  const pulse = secsLeft <= 2
    ? 1 + Math.sin(sceneFrame * 0.4) * 0.06
    : 1;

  return (
    <div style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none" }}>
      {/* Soft dark vignette — does NOT cover center text */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 110% 60% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)",
        pointerEvents: "none",
      }} />

      {/* ── Compact timer pill — top-right corner ── */}
      <div style={{
        position: "absolute",
        top: 48,
        right: 48,
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(12px)",
        border: `2px solid ${color}55`,
        borderRadius: 100,
        padding: "10px 20px 10px 12px",
        transform: `scale(${pulse})`,
        transformOrigin: "top right",
      }}>
        {/* SVG arc */}
        <svg width={72} height={72} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
          <circle cx={cx} cy={cy} r={R} fill="none"
            stroke="rgba(255,255,255,0.12)" strokeWidth={5} />
          <circle cx={cx} cy={cy} r={R} fill="none"
            stroke={color} strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: "stroke 0.3s" }}
          />
        </svg>
        {/* Number */}
        <div style={{
          fontSize: 52,
          fontWeight: 900,
          color,
          fontFamily: "system-ui, sans-serif",
          lineHeight: 1,
          minWidth: 32,
          textAlign: "center",
        }}>
          {secsLeft}
        </div>
      </div>

      {/* ── "ДУМАЙ!" label — small, below timer ── */}
      <div style={{
        position: "absolute",
        top: 136,
        right: 52,
        fontSize: 22,
        fontWeight: 800,
        color: "rgba(255,255,255,0.55)",
        fontFamily: "system-ui, sans-serif",
        letterSpacing: 3,
        textTransform: "uppercase",
      }}>
        {ui.think}
      </div>
    </div>
  );
};
