import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { VideoQuestion, BRAND } from "../types";

const DIFFICULTY_COLORS = {
  easy:   "#10b981",
  medium: "#f59e0b",
  hard:   "#ef4444",
};

const DIFFICULTY_LABELS = {
  ru: { easy: "ЛЁГКИЙ", medium: "СРЕДНИЙ", hard: "СЛОЖНЫЙ" },
  es: { easy: "FÁCIL",  medium: "MEDIO",   hard: "DIFÍCIL"  },
};

export const HookScene: React.FC<{ q: VideoQuestion }> = ({ q }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  const diffColor = DIFFICULTY_COLORS[q.difficulty];
  const diffLabel = DIFFICULTY_LABELS[q.language][q.difficulty];

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
      {/* Series number */}
      <div
        style={{
          fontSize: 32,
          color: BRAND.textSecondary,
          marginBottom: 24,
          letterSpacing: 4,
          textTransform: "uppercase",
          fontFamily: "sans-serif",
          textShadow: "0 1px 4px rgba(0,0,0,0.3)",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        #{String(q.series_number).padStart(3, "0")}
      </div>

      {/* Hook title */}
      <div
        style={{
          transform: `scale(${scale})`,
          fontSize: 72,
          fontWeight: 900,
          color: BRAND.textPrimary,
          textAlign: "center",
          lineHeight: 1.1,
          fontFamily: "sans-serif",
          textShadow: `0 0 40px ${BRAND.primaryGlow}`,
        }}
      >
        {q.hook_title}
      </div>

      {/* Difficulty badge */}
      <div
        style={{
          marginTop: 36,
          padding: "10px 28px",
          borderRadius: 100,
          backgroundColor: `${diffColor}22`,
          border: `2px solid ${diffColor}`,
          color: diffColor,
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 3,
          fontFamily: "sans-serif",
        }}
      >
        {diffLabel}
      </div>

      {/* Topic */}
      <div
        style={{
          marginTop: 20,
          fontSize: 26,
          color: BRAND.textSecondary,
          fontFamily: "sans-serif",
        }}
      >
        {q.topic}
      </div>
    </div>
  );
};
