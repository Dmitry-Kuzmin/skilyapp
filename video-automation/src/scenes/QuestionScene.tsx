import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { VideoQuestion, BRAND, FPS, TIMING } from "../types";

export const QuestionScene: React.FC<{ q: VideoQuestion }> = ({ q }) => {
  const frame = useCurrentFrame();
  const sceneFrame = frame - TIMING.question.start * FPS;

  const slideY = interpolate(sceneFrame, [0, 20], [60, 0], {
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(sceneFrame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const questionLabel = q.language === "ru" ? "ВОПРОС" : "PREGUNTA";

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
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: BRAND.primaryLight,
          letterSpacing: 6,
          marginBottom: 32,
          fontFamily: "sans-serif",
          opacity,
        }}
      >
        {questionLabel}
      </div>

      {/* Question card */}
      <div
        style={{
          backgroundColor: BRAND.bgCard,
          border: `2px solid ${BRAND.primary}`,
          borderRadius: 24,
          padding: "48px 56px",
          maxWidth: 900,
          width: "100%",
          boxShadow: `0 0 60px ${BRAND.primaryGlow}`,
          transform: `translateY(${slideY}px)`,
          opacity,
        }}
      >
        {/* Image */}
        {q.image_url && (
          <img
            src={q.image_url}
            alt="question"
            style={{
              width: "100%",
              maxHeight: 300,
              objectFit: "contain",
              borderRadius: 12,
              marginBottom: 32,
            }}
          />
        )}

        {/* Question text */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: BRAND.textPrimary,
            textAlign: "center",
            lineHeight: 1.3,
            fontFamily: "sans-serif",
            textShadow: "0 2px 8px rgba(0,0,0,0.5), 0 0 20px rgba(47,129,247,0.2)",
            WebkitFontSmoothing: "antialiased",
          }}
        >
          {q.question}
        </div>
      </div>

      {/* Minimal comment nudge — small, bottom-right pill */}
      <div style={{
        marginTop: 20,
        alignSelf: "flex-end",
        padding: "8px 18px",
        borderRadius: 100,
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        fontSize: 22,
        color: "rgba(255,255,255,0.55)",
        fontFamily: "sans-serif",
        letterSpacing: 0.5,
        opacity: opacity,
      }}>
        {q.language === "ru" ? "💬 пиши в комментах" : "💬 comenta tu respuesta"}
      </div>
    </div>
  );
};
