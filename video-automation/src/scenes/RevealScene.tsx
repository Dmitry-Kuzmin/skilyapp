import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { VideoQuestion, BRAND, UI_TEXT, FPS, TIMING } from "../types";

const LABELS = ["A", "B", "C", "D"];

export const RevealScene: React.FC<{ q: VideoQuestion }> = ({ q }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneFrame = frame - TIMING.reveal.start * FPS;

  const ui = UI_TEXT[q.language];

  const headerScale = spring({
    frame: sceneFrame,
    fps,
    config: { damping: 10, stiffness: 300 },
  });

  const opacity = interpolate(sceneFrame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  const correctIndex = q.answer_options.findIndex((o) => o.is_correct);

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
        opacity,
      }}
    >
      {/* ПРАВИЛЬНО header */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: BRAND.green,
          transform: `scale(${headerScale})`,
          fontFamily: "sans-serif",
          textShadow: `0 0 60px ${BRAND.green}55`,
          marginBottom: 12,
        }}
      >
        ✓ {ui.correct}
      </div>

      {/* Answer options with highlights */}
      {q.answer_options.map((option, i) => {
        const isCorrect = option.is_correct;
        const answerDelay = i * 4;
        const localFrame = Math.max(0, sceneFrame - answerDelay);

        const answerOpacity = interpolate(localFrame, [0, 8], [0, 1], {
          extrapolateRight: "clamp",
        });

        const bgColor = isCorrect ? `${BRAND.green}22` : `${BRAND.bgCard}`;
        const borderColor = isCorrect ? BRAND.green : BRAND.border;
        const textColor = isCorrect ? BRAND.textPrimary : BRAND.textSecondary;
        const labelBg = isCorrect ? BRAND.green : BRAND.border;

        return (
          <div
            key={option.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              width: "100%",
              maxWidth: 860,
              backgroundColor: bgColor,
              border: `2px solid ${borderColor}`,
              borderRadius: 20,
              padding: "20px 28px",
              opacity: answerOpacity * (isCorrect ? 1 : 0.5),
              boxShadow: isCorrect ? `0 0 30px ${BRAND.green}44` : "none",
            }}
          >
            <div
              style={{
                minWidth: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: labelBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 900,
                color: isCorrect ? "#fff" : BRAND.textSecondary,
                fontFamily: "sans-serif",
              }}
            >
              {isCorrect ? "✓" : LABELS[i]}
            </div>

            <div
              style={{
                fontSize: 38,
                fontWeight: isCorrect ? 700 : 400,
                color: textColor,
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
