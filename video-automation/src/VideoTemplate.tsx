/**
 * VideoTemplate — Skily DGT video for TikTok / YouTube Shorts.
 * Uses dynamic timing driven by ElevenLabs audio durations so each answer
 * appears exactly when the narrator starts reading it.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, Audio, Sequence, staticFile } from "remotion";
import { VideoQuestion, DynamicTiming, buildDynamicTiming, FPS, UI_TEXT } from "./types";

const S = (f: string) => staticFile(`sounds/${f}`);

// ─── Skily UI colors ──────────────────────────────────────────────────────────
const C = {
  bg:          "#0D1117",
  card:        "#161B22",
  border:      "rgba(255,255,255,0.07)",
  borderFocus: "rgba(255,255,255,0.15)",
  text:        "#F0F6FC",
  textMuted:   "#8B949E",
  primary:     "#2F81F7",
  emerald:     "#3FB950",
  emeraldBg:   "rgba(63,185,80,0.12)",
  emeraldBdr:  "rgba(63,185,80,0.5)",
  red:         "#F85149",
  redBg:       "rgba(248,81,73,0.10)",
  redBdr:      "rgba(248,81,73,0.45)",
  badgeDefault:"rgba(255,255,255,0.08)",
  badgeText:   "#8B949E",
  gradient:    "linear-gradient(135deg, #2F81F7 0%, #1a6bd4 100%)",
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lerp(frame: number, f0: number, f1: number, v0: number, v1: number) {
  if (frame <= f0) return v0;
  if (frame >= f1) return v1;
  return v0 + ((frame - f0) / (f1 - f0)) * (v1 - v0);
}

// Crossfade: each scene fades out over XFADE frames after its scheduled end.
const XFADE = 10;
function sceneOp(frame: number, startF: number, endF: number): number {
  if (frame < startF || frame >= endF + XFADE) return 0;
  if (frame >= endF) return (endF + XFADE - frame) / XFADE;
  return 1;
}

// ─── HookScene ────────────────────────────────────────────────────────────────
function HookScene({ q, t }: { q: VideoQuestion; t: DynamicTiming }) {
  const frame = useCurrentFrame();
  const sceneF = frame - t.hookStart * FPS;
  const op     = lerp(sceneF, 0, 8, 0, 1);
  const scale  = lerp(sceneF, 0, 14, 0.88, 1);
  const badgeOp = lerp(sceneF, 4, 18, 0, 1);
  const badgeTy = lerp(sceneF, 4, 18, 20, 0);

  const ui = UI_TEXT[q.language];
  const diffColors = { easy: C.emerald, medium: "#F0883E", hard: C.red };
  const diffLabels = {
    ru: { easy: "ЛЁГКИЙ", medium: "СРЕДНИЙ", hard: "СЛОЖНЫЙ" },
    es: { easy: "FÁCIL",  medium: "MEDIO",   hard: "DIFÍCIL" },
  };

  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"0 80px", opacity: op }}>

      {/* Glow backdrop */}
      <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%",
        background:"radial-gradient(circle, rgba(47,129,247,0.12) 0%, transparent 70%)",
        pointerEvents:"none" }} />

      {/* Exam context badge */}
      <div style={{ opacity: badgeOp, transform:`translateY(${badgeTy}px)`,
        marginBottom:40, display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
        <div style={{ padding:"14px 40px", borderRadius:100,
          background:"linear-gradient(135deg, #2F81F7 0%, #1a6bd4 100%)",
          fontSize:34, fontWeight:800, color:"#fff",
          fontFamily:"system-ui,sans-serif", letterSpacing:2,
          boxShadow:"0 4px 24px rgba(47,129,247,0.45)" }}>
          {ui.examBadge}
        </div>
        <div style={{ fontSize:30, color: C.textMuted, fontFamily:"system-ui,sans-serif" }}>
          {ui.examSub}
        </div>
      </div>

      {/* Hook title */}
      <div style={{ fontSize:88, fontWeight:900, color: C.text, textAlign:"center",
        lineHeight:1.1, fontFamily:"system-ui,sans-serif",
        transform:`scale(${scale})`,
        textShadow:"0 0 60px rgba(47,129,247,0.4), 0 2px 8px rgba(0,0,0,0.8)" }}>
        {q.hook_title}
      </div>

      {/* Difficulty + series row */}
      <div style={{ marginTop:44, display:"flex", alignItems:"center", gap:24,
        opacity: badgeOp, transform:`translateY(${-badgeTy}px)` }}>
        <div style={{ padding:"10px 28px", borderRadius:100,
          backgroundColor:`${diffColors[q.difficulty]}18`,
          border:`1.5px solid ${diffColors[q.difficulty]}`,
          color: diffColors[q.difficulty], fontSize:26, fontWeight:700,
          letterSpacing:3, fontFamily:"system-ui,sans-serif" }}>
          {diffLabels[q.language][q.difficulty]}
        </div>
        <div style={{ fontSize:26, color: C.textMuted, letterSpacing:4,
          fontFamily:"system-ui,sans-serif" }}>
          #{String(q.series_number).padStart(3,"0")}
        </div>
      </div>
    </div>
  );
}

// ─── CountdownScene ───────────────────────────────────────────────────────────
function CountdownScene({ t }: { t: DynamicTiming }) {
  const frame  = useCurrentFrame();
  const sceneF = frame - t.countdownStart * FPS;
  const perNum = 30;
  const n      = Math.max(1, Math.min(3, 3 - Math.floor(sceneF / perNum)));
  const localF = sceneF % perNum;
  const op     = lerp(localF, 0, 4, 0, 1) * lerp(localF, perNum - 6, perNum, 1, 0);
  const scale  = lerp(localF, 0, 10, 0.5, 1);
  const colors = [C.red, "#F0883E", C.emerald];

  return (
    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontSize:240, fontWeight:900, color: colors[n-1], lineHeight:1,
        opacity: op, transform:`scale(${scale})`, fontFamily:"system-ui,sans-serif",
        textShadow:`0 0 100px ${colors[n-1]}55` }}>
        {n}
      </div>
    </div>
  );
}

// ─── TestCard (shared question+answers card) ──────────────────────────────────
function TestCard({
  q, t, showOptions, revealFrame, showExplanation,
}: {
  q: VideoQuestion;
  t: DynamicTiming;
  showOptions: boolean;
  revealFrame: number;
  showExplanation: boolean;
}) {
  const frame = useCurrentFrame();
  const opts  = q.answer_options;

  // Explanation text: RU variant shows Russian explanation
  const expText = (q.language === "ru" && q.explanationRu) ? q.explanationRu : q.explanation;

  return (
    <div style={{ width:"100%", maxWidth:960, display:"flex", flexDirection:"column", gap:20 }}>

      {/* Image */}
      {q.image_url && (
        <div style={{ width:"100%", borderRadius:40,
          boxShadow:"0 24px 80px rgba(0,0,0,0.9), 0 8px 32px rgba(0,0,0,0.7), 0 0 0 1.5px rgba(255,255,255,0.10), 0 0 80px rgba(47,129,247,0.18)" }}>
          <div style={{ width:"100%", borderRadius:40, overflow:"hidden",
            backgroundColor:"#000", border:"1.5px solid rgba(255,255,255,0.10)" }}>
            <img src={q.image_url} alt="" style={{ width:"100%", maxHeight:500,
              objectFit:"contain", display:"block" }} />
          </div>
        </div>
      )}

      {/* Question text */}
      <div style={{ fontSize: q.question.length > 120 ? 38 : 46,
        fontWeight:700, color: C.text, lineHeight:1.4,
        fontFamily:"system-ui,sans-serif" }}>
        {q.question}
      </div>

      {/* Russian subtitle under question (RU-видео) */}
      {q.language === "ru" && q.question_ru && (
        <div style={{ fontSize:30, fontWeight:400, color: C.textMuted,
          lineHeight:1.4, fontFamily:"system-ui,sans-serif",
          borderLeft:`3px solid ${C.primary}`, paddingLeft:16,
          marginTop:-8 }}>
          {q.question_ru}
        </div>
      )}

      {/* Answer options — each appears at its scheduled time */}
      {opts.map((opt, i) => {
        const appearFrame = t.answerAppearAt[i] * FPS;
        const localF      = frame - appearFrame;
        const visible     = showOptions && localF >= 0;
        const op2         = visible ? Math.min(1, localF / 8) : 0;
        const tx          = visible ? lerp(localF, 0, 12, 40, 0) : 40;

        const isRevealed = revealFrame > 0;
        const isCorrect  = opt.is_correct;

        const borderColor = isRevealed
          ? isCorrect ? C.emeraldBdr : "rgba(255,255,255,0.04)"
          : C.border;
        const bgColor = isRevealed
          ? isCorrect ? C.emeraldBg : "rgba(255,255,255,0.01)"
          : C.card;
        const badgeBg    = isRevealed ? (isCorrect ? C.emerald : "rgba(255,255,255,0.04)") : C.badgeDefault;
        const badgeColor = isRevealed ? (isCorrect ? "#fff" : "rgba(255,255,255,0.15)") : C.badgeText;
        const textOp     = isRevealed && !isCorrect ? 0.3 : 1;

        return (
          <div key={opt.id}
            style={{ display:"flex", alignItems:"center", gap:20,
              padding:"24px 28px", borderRadius:20,
              border:`1.5px solid ${borderColor}`,
              backgroundColor: bgColor,
              opacity: op2,
              transform:`translateX(${tx}px)`,
              boxShadow: isRevealed && isCorrect ? "0 0 24px rgba(63,185,80,0.2)" : "none" }}>
            <div style={{ minWidth:52, height:52, borderRadius:14,
              backgroundColor: badgeBg, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:24, fontWeight:800,
              color: badgeColor, fontFamily:"system-ui,sans-serif", flexShrink:0 }}>
              {isRevealed && isCorrect ? "✓" : i + 1}
            </div>
            <div style={{ fontSize:38, fontWeight:500, color: C.text,
              fontFamily:"system-ui,sans-serif", lineHeight:1.3, opacity: textOp }}>
              {opt.text}
            </div>
          </div>
        );
      })}

      {/* Explanation */}
      {showExplanation && (
        <div style={{ marginTop:8, padding:"24px 28px", borderRadius:20,
          border:"1.5px solid rgba(47,129,247,0.35)",
          backgroundColor:"rgba(47,129,247,0.08)" }}>
          <div style={{ fontSize:24, fontWeight:700, color: C.primary,
            marginBottom:12, fontFamily:"system-ui,sans-serif" }}>
            {q.language === "ru" ? "Объяснение" : "Explicación"}
          </div>
          <div style={{ fontSize:34, color: C.text, lineHeight:1.5,
            fontFamily:"system-ui,sans-serif" }}>
            {expText}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QuestionScene ────────────────────────────────────────────────────────────
function QuestionScene({ q, t }: { q: VideoQuestion; t: DynamicTiming }) {
  const frame  = useCurrentFrame();
  const sceneF = frame - t.questionStart * FPS;
  const op = lerp(sceneF, 0, 12, 0, 1);
  const ty = lerp(sceneF, 0, 14, 60, 0);
  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"60px 60px",
      opacity: op, transform:`translateY(${ty}px)` }}>
      <TestCard q={q} t={t} showOptions={false} revealFrame={0} showExplanation={false} />
    </div>
  );
}

// ─── AnswersScene ─────────────────────────────────────────────────────────────
function AnswersScene({ q, t }: { q: VideoQuestion; t: DynamicTiming }) {
  const frame  = useCurrentFrame();
  const sceneF = frame - t.answersStart * FPS;
  const op     = lerp(sceneF, 0, 4, 0, 1);
  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"60px 60px", opacity: op }}>
      <TestCard q={q} t={t} showOptions={true} revealFrame={0} showExplanation={false} />
    </div>
  );
}

// ─── SuspenseScene ────────────────────────────────────────────────────────────
function SuspenseScene({ q, t }: { q: VideoQuestion; t: DynamicTiming }) {
  const frame    = useCurrentFrame();
  const sceneF   = frame - t.suspenseStart * FPS;
  const totalF   = (t.revealStart - t.suspenseStart) * FPS;
  const progress = Math.max(0, 1 - sceneF / totalF);
  const suspSecs = t.revealStart - t.suspenseStart;
  const secs     = Math.max(1, Math.ceil(progress * suspSecs));
  const pulse    = 1 + Math.sin(sceneF / 5) * 0.015;
  const overlayOp = lerp(sceneF, 0, 12, 0, 1);
  const ui = UI_TEXT[q.language];

  return (
    <div style={{ position:"absolute", inset:0 }}>
      {/* Question + answers visible in background */}
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", padding:"60px 60px" }}>
        <TestCard q={q} t={t} showOptions={true} revealFrame={0} showExplanation={false} />
      </div>

      {/* Dark overlay + ДУМАЙТЕ! */}
      <div style={{ position:"absolute", inset:0,
        background:"rgba(13,17,23,0.78)", backdropFilter:"blur(2px)",
        display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", gap:48, opacity: overlayOp }}>

        <div style={{ fontSize:90, fontWeight:900, color:"#F0883E",
          transform:`scale(${pulse})`, fontFamily:"system-ui,sans-serif",
          textShadow:"0 0 60px rgba(240,136,62,0.5)", letterSpacing:4 }}>
          {ui.think}
        </div>

        <div style={{ position:"relative", width:180, height:180,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width={180} height={180} style={{ position:"absolute", transform:"rotate(-90deg)" }}>
            <circle cx={90} cy={90} r={76} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
            <circle cx={90} cy={90} r={76} fill="none" stroke="#F0883E" strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 76}
              strokeDashoffset={2 * Math.PI * 76 * (1 - progress)} />
          </svg>
          <div style={{ fontSize:80, fontWeight:900, color: C.text,
            fontFamily:"system-ui,sans-serif" }}>{secs}</div>
        </div>

        <div style={{ fontSize:32, color: C.primary, fontFamily:"system-ui,sans-serif", fontWeight:600 }}>
          {q.language === "ru" ? "⬇️ Напиши ответ в комментах" : "⬇️ Escribe tu respuesta"}
        </div>
      </div>
    </div>
  );
}

// ─── RevealScene ──────────────────────────────────────────────────────────────
function RevealScene({ q, t }: { q: VideoQuestion; t: DynamicTiming }) {
  const frame  = useCurrentFrame();
  const sceneF = frame - t.revealStart * FPS;
  const op     = lerp(sceneF, 0, 8, 0, 1);
  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"60px 60px", opacity: op }}>
      <TestCard q={q} t={t} showOptions={true} revealFrame={sceneF} showExplanation={false} />
    </div>
  );
}

// ─── ExplanationScene ─────────────────────────────────────────────────────────
function ExplanationScene({ q, t }: { q: VideoQuestion; t: DynamicTiming }) {
  const frame  = useCurrentFrame();
  const sceneF = frame - t.explanationStart * FPS;
  const op     = lerp(sceneF, 0, 10, 0, 1);
  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"60px 60px", opacity: op }}>
      <TestCard q={q} t={t} showOptions={true} revealFrame={999} showExplanation={true} />
    </div>
  );
}

// ─── CTAScene ─────────────────────────────────────────────────────────────────
function CTAScene({ q, t }: { q: VideoQuestion; t: DynamicTiming }) {
  const frame  = useCurrentFrame();
  const sceneF = frame - t.ctaStart * FPS;
  const op     = lerp(sceneF, 0, 10, 0, 1);
  const scale  = lerp(sceneF, 0, 14, 0.88, 1);
  const pulse  = 1 + Math.sin(sceneF / 8) * 0.018;
  const ui     = UI_TEXT[q.language];

  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:40,
      opacity: op, transform:`scale(${scale})` }}>

      <div style={{ fontSize:64, fontWeight:900, color: C.text,
        fontFamily:"system-ui,sans-serif", letterSpacing:1 }}>
        SKILY
      </div>

      <div style={{ padding:"24px 64px", borderRadius:100,
        background: C.gradient, fontSize:40, fontWeight:700,
        color:"#fff", fontFamily:"system-ui,sans-serif",
        transform:`scale(${pulse})`,
        boxShadow:"0 8px 40px rgba(47,129,247,0.35)" }}>
        {ui.cta}
      </div>

      <div style={{ fontSize:34, color: C.textMuted, fontFamily:"system-ui,sans-serif" }}>
        {ui.subscribe}
      </div>

      <div style={{ fontSize:28, color: C.textMuted, fontFamily:"system-ui,sans-serif", opacity:0.7 }}>
        {q.language === "ru"
          ? `Следующий #${String(q.series_number+1).padStart(3,"0")} →`
          : `Siguiente #${String(q.series_number+1).padStart(3,"0")} →`}
      </div>
    </div>
  );
}

// ─── Main composition ─────────────────────────────────────────────────────────
interface VideoTemplateProps { question: VideoQuestion }

export const VideoTemplate: React.FC<VideoTemplateProps> = ({ question }) => {
  const frame = useCurrentFrame();
  const t     = buildDynamicTiming(question);
  const F     = FPS;

  const sOp = (startSec: number, endSec: number) =>
    sceneOp(frame, startSec * F, endSec * F);

  // Explanation audio: prefer Russian if available (RU variant)
  const expAudioFile = (question.language === "ru" && question.explanationRuAudioFile)
    ? question.explanationRuAudioFile
    : question.explanationAudioFile;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* Top gradient accent */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:400,
        background:"radial-gradient(ellipse at 50% 0%, rgba(47,129,247,0.08) 0%, transparent 70%)",
        pointerEvents:"none" }} />

      {/* ── Sound effects ── */}
      <Sequence from={0} durationInFrames={15}>
        <Audio src={S("whoosh.wav")} volume={0.7} />
      </Sequence>
      <Sequence from={t.countdownStart * F} durationInFrames={10}>
        <Audio src={S("beep3.wav")} volume={0.8} />
      </Sequence>
      <Sequence from={(t.countdownStart + 1) * F} durationInFrames={10}>
        <Audio src={S("beep2.wav")} volume={0.8} />
      </Sequence>
      <Sequence from={(t.countdownStart + 2) * F} durationInFrames={10}>
        <Audio src={S("beep1.wav")} volume={1.0} />
      </Sequence>
      {Array.from({ length: Math.ceil(t.revealStart - t.suspenseStart) }, (_, i) => (
        <Sequence key={i} from={(t.suspenseStart + i) * F} durationInFrames={6}>
          <Audio src={S("tick.wav")} volume={0.6} />
        </Sequence>
      ))}
      <Sequence from={t.revealStart * F} durationInFrames={20}>
        <Audio src={S("reveal.wav")} volume={0.9} />
      </Sequence>

      {/* ── ElevenLabs TTS ── */}
      {/* Question narration: plays during question + answers window */}
      {question.questionAudioFile && (
        <Sequence from={t.questionStart * F}
          durationInFrames={(t.suspenseStart - t.questionStart) * F}>
          <Audio src={staticFile(question.questionAudioFile)} volume={0.9} />
        </Sequence>
      )}
      {/* Answer narrations: each starts when that card appears */}
      {question.answerAudioFiles?.map((file, i) => (
        <Sequence key={i} from={Math.round(t.answerAppearAt[i] * F)}
          durationInFrames={Math.round((question.answerAudioDurationsSec?.[i] ?? 2.5) * F)}>
          <Audio src={staticFile(file)} volume={0.9} />
        </Sequence>
      ))}
      {/* Explanation narration */}
      {expAudioFile && (
        <Sequence from={t.explanationStart * F}
          durationInFrames={(t.ctaStart - t.explanationStart) * F}>
          <Audio src={staticFile(expAudioFile)} volume={0.9} />
        </Sequence>
      )}

      {/* ── Scenes with crossfade dissolve ── */}
      {sOp(t.hookStart, t.countdownStart) > 0 && (
        <div style={{ position:"absolute", inset:0, opacity: sOp(t.hookStart, t.countdownStart) }}>
          <HookScene q={question} t={t} />
        </div>
      )}
      {sOp(t.countdownStart, t.questionStart) > 0 && (
        <div style={{ position:"absolute", inset:0, opacity: sOp(t.countdownStart, t.questionStart) }}>
          <CountdownScene t={t} />
        </div>
      )}
      {sOp(t.questionStart, t.answersStart) > 0 && (
        <div style={{ position:"absolute", inset:0, opacity: sOp(t.questionStart, t.answersStart) }}>
          <QuestionScene q={question} t={t} />
        </div>
      )}
      {sOp(t.answersStart, t.suspenseStart) > 0 && (
        <div style={{ position:"absolute", inset:0, opacity: sOp(t.answersStart, t.suspenseStart) }}>
          <AnswersScene q={question} t={t} />
        </div>
      )}
      {sOp(t.suspenseStart, t.revealStart) > 0 && (
        <div style={{ position:"absolute", inset:0, opacity: sOp(t.suspenseStart, t.revealStart) }}>
          <SuspenseScene q={question} t={t} />
        </div>
      )}
      {sOp(t.revealStart, t.explanationStart) > 0 && (
        <div style={{ position:"absolute", inset:0, opacity: sOp(t.revealStart, t.explanationStart) }}>
          <RevealScene q={question} t={t} />
        </div>
      )}
      {sOp(t.explanationStart, t.ctaStart) > 0 && (
        <div style={{ position:"absolute", inset:0, opacity: sOp(t.explanationStart, t.ctaStart) }}>
          <ExplanationScene q={question} t={t} />
        </div>
      )}
      {sOp(t.ctaStart, t.totalSec) > 0 && (
        <div style={{ position:"absolute", inset:0, opacity: sOp(t.ctaStart, t.totalSec) }}>
          <CTAScene q={question} t={t} />
        </div>
      )}

      {/* Bottom brand line */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:5,
        background: C.gradient }} />
    </AbsoluteFill>
  );
};
