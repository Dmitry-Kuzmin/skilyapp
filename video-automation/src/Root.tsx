import React from "react";
import { Composition, registerRoot } from "remotion";
import { VideoTemplate } from "./VideoTemplate";
import { TOTAL_FRAMES, FPS, buildDynamicTiming } from "./types";
import type { VideoQuestion } from "./types";

const DEMO_ES: VideoQuestion = {
  id: "demo-es-001",
  question: "¿A qué velocidad máxima puede circular un vehículo en autopista?",
  explanation: "En autopistas y autovías la velocidad máxima genérica es 120 km/h. Superar este límite es una infracción grave o muy grave según el exceso.",
  image_url: null,
  difficulty: "easy",
  percent_correct: 78,
  topic: "Normas de circulación",
  answer_options: [
    { id: "b1", text: "100 km/h", is_correct: false, position: 1 },
    { id: "b2", text: "120 km/h", is_correct: true,  position: 2 },
    { id: "b3", text: "130 km/h", is_correct: false, position: 3 },
  ],
  country: "es",
  language: "es",
  hook_title: "¿Sabes la respuesta? ⚡",
  series_number: 1,
};

const DEMO_RU: VideoQuestion = {
  ...DEMO_ES,
  id: "demo-ru-001",
  language: "ru",
  hook_title: "Знаешь правила? 🚗",
  explanationRu: "На автострадах максимальная скорость — 120 км/ч. Превышение этого лимита является серьёзным нарушением.",
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="VideoTemplate"
      component={VideoTemplate}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ question: DEMO_ES }}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.ceil(buildDynamicTiming(props.question).totalSec * FPS),
      })}
    />
    <Composition
      id="VideoTemplateRU"
      component={VideoTemplate}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ question: DEMO_RU }}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.ceil(buildDynamicTiming(props.question).totalSec * FPS),
      })}
    />
  </>
);

registerRoot(RemotionRoot);
