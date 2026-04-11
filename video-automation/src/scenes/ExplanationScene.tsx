import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { VideoQuestion, BRAND, UI_TEXT, FPS, TIMING } from "../types";

export const ExplanationScene: React.FC<{ q: VideoQuestion }> = ({ q }) => {
  const frame = useCurrentFrame();
  const sceneFrame = frame - TIMING.explanation.start * FPS;

  const ui = UI_TEXT[q.language];

  const slideY = interpolate(sceneFrame, [0, 18], [50, 0], {
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(sceneFrame, [0, 12], [0, 1], {
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
        padding: "0 60px",
        opacity,
      }}
    >
      <div
        style={{
          backgroundColor: BRAND.bgCard,
          border: `2px solid ${BRAND.accent}`,
          borderRadius: 24,
          padding: "48px 56px",
          maxWidth: 900,
          width: "100%",
          boxShadow: `0 0 50px ${BRAND.accent}22`,
          transform: `translateY(${slideY}px)`,
        }}
      >
        {/* Label */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: BRAND.accent,
            letterSpacing: 4,
            marginBottom: 24,
            fontFamily: "sans-serif",
          }}
        >
          {ui.explanation}
        </div>

        {/* Explanation text */}
        <div
          style={{
            fontSize: 42,
            fontWeight: 500,
            color: BRAND.textPrimary,
            lineHeight: 1.4,
            fontFamily: "sans-serif",
            textShadow: "0 2px 8px rgba(0,0,0,0.4)",
            WebkitFontSmoothing: "antialiased",
          }}
        >
          {q.explanation}
        </div>
      </div>
    </div>
  );
};
