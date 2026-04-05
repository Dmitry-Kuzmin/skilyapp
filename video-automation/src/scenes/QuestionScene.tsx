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
          }}
        >
          {q.question}
        </div>
      </div>

      {/* Comment bait */}
      <div
        style={{
          marginTop: 28,
          fontSize: 30,
          color: BRAND.accent,
          fontFamily: "sans-serif",
          opacity: opacity * 0.8,
        }}
      >
        {q.language === "ru"
          ? "⬇️ Напиши ответ в комментах"
          : "⬇️ Escribe tu respuesta"}
      </div>
    </div>
  );
};
