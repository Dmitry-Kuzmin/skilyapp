import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BRAND, FPS, TIMING } from "../types";

export const CountdownScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Local frame within this scene
  const sceneFrame = frame - TIMING.countdown.start * FPS;
  const totalSceneFrames = (TIMING.countdown.end - TIMING.countdown.start) * FPS; // 90 frames

  const framesPerNumber = Math.floor(totalSceneFrames / 3); // 30 frames each

  const currentNumber = 3 - Math.floor(sceneFrame / framesPerNumber);
  const frameInNumber = sceneFrame % framesPerNumber;

  const scale = spring({
    frame: frameInNumber,
    fps,
    config: { damping: 8, stiffness: 300, mass: 0.5 },
  });

  const opacity = interpolate(
    frameInNumber,
    [0, framesPerNumber * 0.6, framesPerNumber],
    [1, 1, 0],
    { extrapolateRight: "clamp" }
  );

  const displayNumber = Math.max(1, Math.min(3, currentNumber));

  const colors = ["#ef4444", "#f59e0b", "#10b981"]; // 1=red, 2=amber, 3=green
  const color = colors[displayNumber - 1];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Circular pulse */}
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          backgroundColor: `${color}11`,
          border: `3px solid ${color}44`,
          transform: `scale(${1 + (1 - scale) * 0.3})`,
          opacity: opacity * 0.6,
        }}
      />

      {/* Number */}
      <div
        style={{
          fontSize: 240,
          fontWeight: 900,
          color,
          transform: `scale(${scale})`,
          opacity,
          lineHeight: 1,
          fontFamily: "sans-serif",
          textShadow: `0 0 80px ${color}66`,
        }}
      >
        {displayNumber}
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 16, marginTop: 32 }}>
        {[3, 2, 1].map((n) => (
          <div
            key={n}
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              backgroundColor: currentNumber <= n ? colors[n - 1] : BRAND.border,
              transition: "background-color 0.2s",
            }}
          />
        ))}
      </div>
    </div>
  );
};
