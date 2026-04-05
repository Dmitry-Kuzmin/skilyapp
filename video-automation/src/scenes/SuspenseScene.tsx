import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { VideoQuestion, BRAND, UI_TEXT, FPS, TIMING } from "../types";

export const SuspenseScene: React.FC<{ q: VideoQuestion }> = ({ q }) => {
  const frame = useCurrentFrame();
  const sceneFrame = frame - TIMING.suspense.start * FPS;
  const totalFrames = (TIMING.suspense.end - TIMING.suspense.start) * FPS; // 90 frames

  const ui = UI_TEXT[q.language];

  // Pulsing effect
  const pulse = Math.sin((sceneFrame / totalFrames) * Math.PI * 6);
  const scale = 1 + pulse * 0.04;

  // Timer countdown (3 seconds visual)
  const progress = 1 - sceneFrame / totalFrames;
  const timerSeconds = Math.ceil(progress * 3);

  const opacity = interpolate(sceneFrame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
        opacity,
      }}
    >
      {/* ДУМАЙТЕ text */}
      <div
        style={{
          fontSize: 96,
          fontWeight: 900,
          color: BRAND.gold,
          transform: `scale(${scale})`,
          fontFamily: "sans-serif",
          textShadow: `0 0 60px ${BRAND.gold}66`,
          letterSpacing: 4,
        }}
      >
        {ui.think}
      </div>

      {/* Timer ring */}
      <div
        style={{
          position: "relative",
          width: 160,
          height: 160,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* SVG progress ring */}
        <svg
          width={160}
          height={160}
          style={{ position: "absolute", transform: "rotate(-90deg)" }}
        >
          {/* Background ring */}
          <circle cx={80} cy={80} r={68} fill="none" stroke={BRAND.border} strokeWidth={8} />
          {/* Progress ring */}
          <circle
            cx={80}
            cy={80}
            r={68}
            fill="none"
            stroke={BRAND.gold}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 68}
            strokeDashoffset={2 * Math.PI * 68 * (1 - progress)}
          />
        </svg>

        {/* Timer number */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: BRAND.textPrimary,
            fontFamily: "sans-serif",
          }}
        >
          {timerSeconds}
        </div>
      </div>

      {/* Comment bait */}
      <div
        style={{
          fontSize: 36,
          color: BRAND.accent,
          fontFamily: "sans-serif",
          fontWeight: 600,
        }}
      >
        {ui.answer_before}
      </div>
    </div>
  );
};
