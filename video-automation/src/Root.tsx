import React from "react";
import { Composition, registerRoot } from "remotion";
import { VideoTemplate } from "./VideoTemplate";
import { TOTAL_FRAMES, FPS } from "./types";
import type { VideoQuestion } from "./types";

// Demo question for preview
const DEMO_QUESTION: VideoQuestion = {
  id: "demo-001",
  question: "На какое расстояние должен быть виден автомобиль при включённых ближних фарах?",
  explanation: "Ближний свет обеспечивает видимость на 40–50 метров. При скорости 60 км/ч тормозной путь составляет около 36 м — это достаточно для безопасной остановки.",
  image_url: null,
  difficulty: "medium",
  percent_correct: 42,
  topic: "Техника безопасности",
  answer_options: [
    { id: "a1", text: "40-50 м", is_correct: true, position: 1 },
    { id: "a2", text: "100-150 м", is_correct: false, position: 2 },
    { id: "a3", text: "25-30 м", is_correct: false, position: 3 },
    { id: "a4", text: "80-90 м", is_correct: false, position: 4 },
  ],
  country: "ru",
  language: "ru",
  hook_title: "99% водителей ошибаются ❌",
  series_number: 1,
};

const DEMO_QUESTION_ES: VideoQuestion = {
  id: "demo-es-001",
  question: "¿A qué velocidad máxima puede circular un vehículo en autopista?",
  explanation: "En autopistas y autovías la velocidad máxima genérica es 120 km/h. Superar este límite es una infracción grave o muy grave según el exceso.",
  image_url: null,
  difficulty: "easy",
  percent_correct: 78,
  topic: "Normas de circulación",
  answer_options: [
    { id: "b1", text: "100 km/h", is_correct: false, position: 1 },
    { id: "b2", text: "120 km/h", is_correct: true, position: 2 },
    { id: "b3", text: "130 km/h", is_correct: false, position: 3 },
    { id: "b4", text: "110 km/h", is_correct: false, position: 4 },
  ],
  country: "es",
  language: "es",
  hook_title: "¿Sabes la respuesta? ⚡",
  series_number: 1,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoTemplate"
        component={VideoTemplate}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ question: DEMO_QUESTION }}
      />
      <Composition
        id="VideoTemplateES"
        component={VideoTemplate}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ question: DEMO_QUESTION_ES }}
      />
    </>
  );
};
