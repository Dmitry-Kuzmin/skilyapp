import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { VideoQuestion, BRAND, FPS, TIMING } from "../types";

const LABELS = ["A", "B", "C", "D"];

export const AnswersScene: React.FC<{ q: VideoQuestion }> = ({ q }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneFrame = frame - TIMING.answers.start * FPS;
  const totalSceneFrames = (TIMING.answers.end - TIMING.answers.start) * FPS; // 240 frames
  const perAnswer = Math.floor(totalSceneFrames / q.answer_options.length);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 60px",
        gap: 20,
      }}
    >
      {/* Mini question recap */}
      <div
        style={{
          fontSize: 34,
          color: BRAND.textSecondary,
          textAlign: "center",
          marginBottom: 8,
          fontFamily: "sans-serif",
          maxWidth: 860,
          lineHeight: 1.3,
          textShadow: "0 2px 6px rgba(0,0,0,0.4)",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {q.question}
      </div>

      {/* Answer options */}
      {q.answer_options.map((option, i) => {
        const appearFrame = i * perAnswer;
        const localFrame = sceneFrame - appearFrame;

        const isVisible = localFrame >= 0;

        const slideX = isVisible
          ? spring({
              frame: localFrame,
              fps,
              config: { damping: 14, stiffness: 180 },
            })
          : 0;

        const opacity = isVisible
          ? interpolate(localFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" })
          : 0;

        const translateX = isVisible ? (1 - slideX) * (i % 2 === 0 ? -120 : 120) : (i % 2 === 0 ? -120 : 120);

        return (
          <div
            key={option.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              width: "100%",
              maxWidth: 860,
              backgroundColor: BRAND.bgCard,
              border: `2px solid ${BRAND.border}`,
              borderRadius: 20,
              padding: "24px 32px",
              transform: `translateX(${translateX}px)`,
              opacity,
            }}
          >
            {/* Label bubble */}
            <div
              style={{
                minWidth: 64,
                height: 64,
                borderRadius: "50%",
                background: BRAND.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontWeight: 900,
                color: BRAND.textPrimary,
                fontFamily: "sans-serif",
              }}
            >
              {LABELS[i]}
            </div>

            {/* Answer text */}
            <div
              style={{
                fontSize: 40,
                fontWeight: 600,
                color: BRAND.textPrimary,
                fontFamily: "sans-serif",
                lineHeight: 1.2,
              }}
            >
              {option.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};
