import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { VideoQuestion, BRAND, FPS, TIMING, TOTAL_FRAMES } from "./types";
import { HookScene } from "./scenes/HookScene";
import { CountdownScene } from "./scenes/CountdownScene";
import { QuestionScene } from "./scenes/QuestionScene";
import { AnswersScene } from "./scenes/AnswersScene";
import { SuspenseScene } from "./scenes/SuspenseScene";
import { RevealScene } from "./scenes/RevealScene";
import { ExplanationScene } from "./scenes/ExplanationScene";
import { CTAScene } from "./scenes/CTAScene";

function activeScene(frame: number): keyof typeof TIMING {
  const secs = frame / FPS;
  if (secs < TIMING.countdown.start)   return "hook";
  if (secs < TIMING.question.start)    return "countdown";
  if (secs < TIMING.answers.start)     return "question";
  if (secs < TIMING.suspense.start)    return "answers";
  if (secs < TIMING.reveal.start)      return "suspense";
  if (secs < TIMING.explanation.start) return "reveal";
  if (secs < TIMING.cta.start)         return "explanation";
  return "cta";
}

interface VideoTemplateProps {
  question: VideoQuestion;
}

export const VideoTemplate: React.FC<VideoTemplateProps> = ({ question }) => {
  const frame = useCurrentFrame();
  const scene = activeScene(frame);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.bg,
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* Background gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 20%, #7c3aed22 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      {/* Scenes */}
      {scene === "hook"        && <HookScene q={question} />}
      {scene === "countdown"   && <CountdownScene />}
      {scene === "question"    && <QuestionScene q={question} />}
      {scene === "answers"     && <AnswersScene q={question} />}
      {scene === "suspense"    && <SuspenseScene q={question} />}
      {scene === "reveal"      && <RevealScene q={question} />}
      {scene === "explanation" && <ExplanationScene q={question} />}
      {scene === "cta"         && <CTAScene q={question} />}

      {/* Persistent bottom brand strip */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          background: BRAND.gradient,
        }}
      />
    </AbsoluteFill>
  );
};
