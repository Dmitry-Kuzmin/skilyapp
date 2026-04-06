import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { VideoQuestion, BRAND, UI_TEXT, FPS, TIMING } from "../types";

export const CTAScene: React.FC<{ q: VideoQuestion }> = ({ q }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneFrame = frame - TIMING.cta.start * FPS;

  const ui = UI_TEXT[q.language];

  const scale = spring({
    frame: sceneFrame,
    fps,
    config: { damping: 12, stiffness: 220 },
  });
  const opacity = interpolate(sceneFrame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Gentle pulsing for the button
  const pulse = 1 + Math.sin(sceneFrame / 6) * 0.02;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        opacity,
      }}
    >
      {/* Skily logo text */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 900,
          background: BRAND.gradient,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          transform: `scale(${scale})`,
          fontFamily: "sans-serif",
          letterSpacing: 2,
        }}
      >
        SKILY
      </div>

      {/* CTA button — custom outro_text or default */}
      <div
        style={{
          padding: "24px 56px",
          borderRadius: 100,
          background: BRAND.gradient,
          fontSize: q.outro_text && q.outro_text.length > 30 ? 32 : 40,
          fontWeight: 800,
          color: "#fff",
          fontFamily: "sans-serif",
          transform: `scale(${scale * pulse})`,
          boxShadow: `0 8px 40px ${BRAND.primaryGlow}`,
          textAlign: "center",
          maxWidth: 760,
          lineHeight: 1.3,
        }}
      >
        {q.outro_text || ui.cta}
      </div>

      {/* Subscribe nudge */}
      <div
        style={{
          fontSize: 36,
          color: BRAND.textSecondary,
          fontFamily: "sans-serif",
          textAlign: "center",
        }}
      >
        {ui.subscribe}
      </div>

      {/* Next video teaser */}
      <div
        style={{
          fontSize: 30,
          color: BRAND.textSecondary,
          fontFamily: "sans-serif",
          textAlign: "center",
          opacity: 0.7,
        }}
      >
        {q.language === "ru"
          ? `Следующий вопрос #${String(q.series_number + 1).padStart(3, "0")} →`
          : `Siguiente pregunta #${String(q.series_number + 1).padStart(3, "0")} →`}
      </div>
    </div>
  );
};
