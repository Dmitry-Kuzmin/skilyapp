import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { VideoQuestion, FPS, TIMING } from "../types";

export const SuspenseScene: React.FC<{ q: VideoQuestion }> = ({ q }) => {
  const frame = useCurrentFrame();
  const sceneFrame = frame - TIMING.suspense.start * FPS;
  const totalFrames = (TIMING.suspense.end - TIMING.suspense.start) * FPS;

  // 0→1 as time runs out
  const elapsed  = Math.min(1, sceneFrame / totalFrames);
  const remaining = 1 - elapsed;

  const fadeIn = interpolate(sceneFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  // Countdown number
  const totalSecs = TIMING.suspense.end - TIMING.suspense.start;
  const secsLeft  = Math.max(1, Math.ceil(remaining * totalSecs));

  // Number pop animation each second
  const secFrame  = sceneFrame % FPS;
  const numScale  = interpolate(secFrame, [0, 6, 12], [1.25, 1.0, 1.0], { extrapolateRight: "clamp" });

  // Colour: white → amber → red
  const r = Math.round(255);
  const g = Math.round(255 * remaining * 0.9);
  const b = Math.round(80 * remaining);
  const accentColor = `rgb(${r},${g},${b})`;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: fadeIn, pointerEvents: "none" }}>

      {/* ── Thin neon progress bar at top ── */}
      <div style={{
        position: "absolute",
        top: 0, left: 0,
        height: 5,
        width: `${remaining * 100}%`,
        background: `linear-gradient(90deg, ${accentColor}, rgba(255,255,255,0.4))`,
        boxShadow: `0 0 16px 2px ${accentColor}88`,
        borderRadius: "0 4px 4px 0",
        transition: "none",
      }} />

      {/* ── Minimal countdown chip — bottom center ── */}
      <div style={{
        position: "absolute",
        bottom: 60,
        left: "50%",
        transform: `translateX(-50%)`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(20px)",
        border: `1.5px solid rgba(255,255,255,0.12)`,
        borderRadius: 100,
        padding: "14px 32px",
      }}>
        {/* Pulsing dot */}
        <div style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: accentColor,
          boxShadow: `0 0 12px 3px ${accentColor}`,
          opacity: 0.5 + 0.5 * Math.sin(sceneFrame * 0.25),
        }} />

        {/* Number */}
        <span style={{
          fontSize: 52,
          fontWeight: 900,
          color: accentColor,
          fontFamily: "system-ui, sans-serif",
          lineHeight: 1,
          transform: `scale(${numScale})`,
          display: "inline-block",
          textShadow: `0 0 24px ${accentColor}66`,
        }}>
          {secsLeft}
        </span>

        {/* Pulsing dot */}
        <div style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: accentColor,
          boxShadow: `0 0 12px 3px ${accentColor}`,
          opacity: 0.5 + 0.5 * Math.sin(sceneFrame * 0.25 + Math.PI),
        }} />
      </div>

    </div>
  );
};
