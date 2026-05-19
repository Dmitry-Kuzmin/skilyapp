import React from "react";
import { Composition, registerRoot } from "remotion";
import { VideoTemplate } from "./VideoTemplate";
import { TOTAL_FRAMES, FPS, buildDynamicTiming } from "./types";
import type { VideoQuestion } from "./types";
import { QuizSheetTemplate, calcQuizSheetFrames } from "./QuizSheetTemplate";
import type { QuizSheetProps } from "./QuizSheetTemplate";
import { QuizFastTemplate, calcQuizFastFrames } from "./QuizFastTemplate";
import type { QuizFastProps } from "./QuizFastTemplate";
import { QuizQuestionTemplate, calcQuizQuestionFrames } from "./QuizQuestionTemplate";
import type { QuizQuestionProps } from "./QuizQuestionTemplate";

type VideoTemplateProps = { question: VideoQuestion };

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyComp = VideoTemplate as React.ComponentType<any>;

// ── QuizSheet demo data — 4 real DGT signs from our road_signs table ─────────
const DEMO_QUIZ_SHEET: QuizSheetProps = {
  title: "SEÑALES DE TRÁFICO",
  subtitle: "¿Sabes qué significa esta señal?",
  items: [
    {
      question: "¿Qué indica esta señal?",
      sign_url: "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/road-signs/4597badb-1c9b-47da-abe5-09c6e3c29efa.png",
      options: ["Stop obligatorio", "Ceda el paso", "Fin de prioridad"],
      correct_idx: 1,
    },
    {
      question: "¿Qué significa esta señal?",
      sign_url: "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/road-signs/f9c25efe-3a2d-4995-936c-110ea9425f12.png",
      options: ["Reducir velocidad", "STOP — detención obligatoria", "Ceda el paso"],
      correct_idx: 1,
    },
    {
      question: "¿Qué advierte esta señal?",
      sign_url: "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/road-signs/1614f5b8-30ca-4f3e-a849-46963c694361.png",
      options: ["Paso de peatones", "Obras en la vía", "Semáforos más adelante"],
      correct_idx: 2,
    },
    {
      question: "¿Qué señala este signo?",
      sign_url: "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/road-signs/e253a50a-8770-4e1b-9c35-1caa1846a737.png",
      options: ["Cruce peligroso", "Intersección con glorieta", "Sentido obligatorio"],
      correct_idx: 1,
    },
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnySheet = QuizSheetTemplate as React.ComponentType<any>;

// ── QuizFast demo data — single question per screen with TTS ─────────────────
const DEMO_QUIZ_FAST: QuizFastProps = {
  ctaText: "Aprende todas las señales con Skily",
  outroAudioFile: "audio/quiz-fast/outro-es.mp3",
  outroAudioDurationSec: 3.79,
  items: [
    {
      question: "¿Qué indica esta señal?",
      sign_url: "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/road-signs/4597badb-1c9b-47da-abe5-09c6e3c29efa.png",
      options: ["Stop obligatorio", "Ceda el paso", "Fin de prioridad"],
      correct_idx: 1,
      hookAudioFile: "audio/quiz-fast/hook-es.mp3",
      hookAudioDurationSec: 2.27,
      revealAudioFile: "audio/quiz-fast/reveal-ceda-el-paso-es.mp3",
      revealAudioDurationSec: 1.65,
    },
    {
      question: "¿Qué significa esta señal?",
      sign_url: "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/road-signs/f9c25efe-3a2d-4995-936c-110ea9425f12.png",
      options: ["Reducir velocidad", "STOP — detención obligatoria", "Ceda el paso"],
      correct_idx: 1,
      hookAudioFile: "audio/quiz-fast/hook-es.mp3",
      hookAudioDurationSec: 2.27,
      revealAudioFile: "audio/quiz-fast/reveal-stop-es.mp3",
      revealAudioDurationSec: 2.59,
    },
    {
      question: "¿Qué advierte esta señal?",
      sign_url: "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/road-signs/1614f5b8-30ca-4f3e-a849-46963c694361.png",
      options: ["Paso de peatones", "Obras en la vía", "Semáforos más adelante"],
      correct_idx: 2,
      hookAudioFile: "audio/quiz-fast/hook-es.mp3",
      hookAudioDurationSec: 2.27,
      revealAudioFile: "audio/quiz-fast/reveal-semaforos-es.mp3",
      revealAudioDurationSec: 1.72,
    },
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyFast = QuizFastTemplate as React.ComponentType<any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyQuestion = QuizQuestionTemplate as React.ComponentType<any>;

// ── QuizQuestion demo data — 3 DGT text questions ─────────────────────────────
const DEMO_QUIZ_QUESTION_ES: QuizQuestionProps = {
  lang: "es",
  ctaText: "Prepárate para el examen DGT con Skily",
  items: [
    {
      question: "¿A qué velocidad máxima puede circular en autopista?",
      options: ["100 km/h", "120 km/h", "130 km/h"],
      correct_idx: 1,
      category: "Velocidad",
      hookText: "¿APROBARÍAS EL EXAMEN?",
      percentCorrect: 62,
      explanation: "En autopistas la velocidad máxima genérica es 120 km/h.",
    },
    {
      question: "¿Cuándo tiene prioridad un vehículo que está en una glorieta?",
      options: ["Nunca, cede al que entra", "Siempre, frente a quien entra", "Solo si circula por el carril exterior"],
      correct_idx: 1,
      category: "Prioridad",
      hookText: "73% LO FALLA 👀",
      percentCorrect: 27,
      explanation: "El vehículo dentro de la glorieta siempre tiene preferencia.",
    },
    {
      question: "¿Cuál es la distancia mínima de seguridad en autovía a 100 km/h?",
      options: ["50 metros", "70 metros", "100 metros"],
      correct_idx: 2,
      category: "Seguridad",
      hookText: "¿LO SABES? 🚗",
      percentCorrect: 45,
      explanation: "A 100 km/h la distancia de seguridad recomendada es al menos 100 m.",
    },
  ],
};

// ── QuizFast Edge RU — Russian, FREE Microsoft Edge Neural (ru-RU-DmitryNeural) ─
const DEMO_QUIZ_FAST_EDGE_RU: QuizFastProps = {
  ctaText: "Учи все знаки в Skily — бесплатно",
  outroAudioFile: "audio/quiz-fast-edge-ru/outro-ru.mp3",
  outroAudioDurationSec: 3.38,
  items: [
    {
      question: "Что означает этот знак?",
      sign_url: "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/road-signs/4597badb-1c9b-47da-abe5-09c6e3c29efa.png",
      options: ["Стоп", "Уступи дорогу", "Конец приоритета"],
      correct_idx: 1,
      hookAudioFile: "audio/quiz-fast-edge-ru/hook-ru.mp3",
      hookAudioDurationSec: 3.07,
      revealAudioFile: "audio/quiz-fast-edge-ru/reveal-ceda-el-paso-ru.mp3",
      revealAudioDurationSec: 1.99,
    },
    {
      question: "Что означает этот знак?",
      sign_url: "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/road-signs/f9c25efe-3a2d-4995-936c-110ea9425f12.png",
      options: ["Снизить скорость", "СТОП — обязательная остановка", "Уступи дорогу"],
      correct_idx: 1,
      hookAudioFile: "audio/quiz-fast-edge-ru/hook-ru.mp3",
      hookAudioDurationSec: 3.07,
      revealAudioFile: "audio/quiz-fast-edge-ru/reveal-stop-ru.mp3",
      revealAudioDurationSec: 3.77,
    },
    {
      question: "Что предупреждает этот знак?",
      sign_url: "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/road-signs/1614f5b8-30ca-4f3e-a849-46963c694361.png",
      options: ["Пешеходный переход", "Дорожные работы", "Впереди светофоры"],
      correct_idx: 2,
      hookAudioFile: "audio/quiz-fast-edge-ru/hook-ru.mp3",
      hookAudioDurationSec: 3.07,
      revealAudioFile: "audio/quiz-fast-edge-ru/reveal-semaforos-ru.mp3",
      revealAudioDurationSec: 2.09,
    },
  ],
};

// ── QuizFast Edge — same video but with FREE Microsoft Edge Neural TTS ────────
const DEMO_QUIZ_FAST_EDGE: QuizFastProps = {
  ctaText: "Aprende todas las señales con Skily",
  outroAudioFile: "audio/quiz-fast-edge/outro-es-edge.mp3",
  outroAudioDurationSec: 3.41,
  items: [
    {
      question: "¿Qué indica esta señal?",
      sign_url: "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/road-signs/4597badb-1c9b-47da-abe5-09c6e3c29efa.png",
      options: ["Stop obligatorio", "Ceda el paso", "Fin de prioridad"],
      correct_idx: 1,
      hookAudioFile: "audio/quiz-fast-edge/hook-es-edge.mp3",
      hookAudioDurationSec: 2.62,
      revealAudioFile: "audio/quiz-fast-edge/reveal-ceda-el-paso-es-edge.mp3",
      revealAudioDurationSec: 1.80,
    },
    {
      question: "¿Qué significa esta señal?",
      sign_url: "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/road-signs/f9c25efe-3a2d-4995-936c-110ea9425f12.png",
      options: ["Reducir velocidad", "STOP — detención obligatoria", "Ceda el paso"],
      correct_idx: 1,
      hookAudioFile: "audio/quiz-fast-edge/hook-es-edge.mp3",
      hookAudioDurationSec: 2.62,
      revealAudioFile: "audio/quiz-fast-edge/reveal-stop-es-edge.mp3",
      revealAudioDurationSec: 3.43,
    },
    {
      question: "¿Qué advierte esta señal?",
      sign_url: "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/road-signs/1614f5b8-30ca-4f3e-a849-46963c694361.png",
      options: ["Paso de peatones", "Obras en la vía", "Semáforos más adelante"],
      correct_idx: 2,
      hookAudioFile: "audio/quiz-fast-edge/hook-es-edge.mp3",
      hookAudioDurationSec: 2.62,
      revealAudioFile: "audio/quiz-fast-edge/reveal-semaforos-es-edge.mp3",
      revealAudioDurationSec: 2.30,
    },
  ],
};

export const RemotionRoot: React.FC = () => (
  <>
    {/* ── Existing compositions — untouched ── */}
    <Composition
      id="VideoTemplate"
      component={AnyComp}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ question: DEMO_ES }}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.ceil(buildDynamicTiming((props as VideoTemplateProps).question).totalSec * FPS),
      })}
    />
    <Composition
      id="VideoTemplateRU"
      component={AnyComp}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ question: DEMO_RU }}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.ceil(buildDynamicTiming((props as VideoTemplateProps).question).totalSec * FPS),
      })}
    />
    {/* ── New: QuizSheet format ── */}
    <Composition
      id="QuizSheet"
      component={AnySheet}
      durationInFrames={calcQuizSheetFrames(4)}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={DEMO_QUIZ_SHEET}
      calculateMetadata={({ props }) => ({
        durationInFrames: calcQuizSheetFrames((props as unknown as QuizSheetProps).items.length),
      })}
    />
    {/* ── New: QuizFast — single question per screen with TTS ── */}
    <Composition
      id="QuizFast"
      component={AnyFast}
      durationInFrames={calcQuizFastFrames(DEMO_QUIZ_FAST.items)}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={DEMO_QUIZ_FAST}
      calculateMetadata={({ props }) => ({
        durationInFrames: calcQuizFastFrames((props as unknown as QuizFastProps).items),
      })}
    />
    {/* ── QuizFast Edge RU — FREE Microsoft Edge Neural TTS (ru-RU-DmitryNeural) ── */}
    <Composition
      id="QuizFastEdgeRU"
      component={AnyFast}
      durationInFrames={calcQuizFastFrames(DEMO_QUIZ_FAST_EDGE_RU.items)}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={DEMO_QUIZ_FAST_EDGE_RU}
      calculateMetadata={({ props }) => ({
        durationInFrames: calcQuizFastFrames((props as unknown as QuizFastProps).items),
      })}
    />
    {/* ── QuizFast Edge — FREE Microsoft Edge Neural TTS (es-ES-AlvaroNeural) ── */}
    <Composition
      id="QuizFastEdge"
      component={AnyFast}
      durationInFrames={calcQuizFastFrames(DEMO_QUIZ_FAST_EDGE.items)}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={DEMO_QUIZ_FAST_EDGE}
      calculateMetadata={({ props }) => ({
        durationInFrames: calcQuizFastFrames((props as unknown as QuizFastProps).items),
      })}
    />
    {/* ── QuizQuestion ES — text-only DGT questions, no sign images ── */}
    <Composition
      id="QuizQuestion"
      component={AnyQuestion}
      durationInFrames={calcQuizQuestionFrames(DEMO_QUIZ_QUESTION_ES.items)}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={DEMO_QUIZ_QUESTION_ES}
      calculateMetadata={({ props }) => ({
        durationInFrames: calcQuizQuestionFrames((props as unknown as QuizQuestionProps).items),
      })}
    />
  </>
);

registerRoot(RemotionRoot);
