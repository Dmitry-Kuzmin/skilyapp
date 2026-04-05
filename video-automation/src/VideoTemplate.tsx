/**
 * VideoTemplate — точная копия Skily test UI для TikTok/YouTube Shorts
 * Цвета, карточки, нумерация (1/2/3) — всё как в приложении.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, Audio, Sequence, staticFile } from "remotion";
import { VideoQuestion, FPS, TIMING } from "./types";

const S = (f: string) => staticFile(`sounds/${f}`);

// ─── Skily UI colors (из приложения) ────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function lerp(frame: number, f0: number, f1: number, v0: number, v1: number) {
  if (frame <= f0) return v0;
  if (frame >= f1) return v1;
  return v0 + ((frame - f0) / (f1 - f0)) * (v1 - v0);
}

// Crossfade opacity: each scene fades out over XFADE frames after its end.
// The next scene starts (with its own fade-in) at exactly its startF.
// This creates a smooth dissolve with no flicker.
const XFADE = 10;
function sceneOp(frame: number, startF: number, endF: number): number {
  if (frame < startF || frame >= endF + XFADE) return 0;
  if (frame >= endF) return (endF + XFADE - frame) / XFADE; // fade-out
  return 1;
}

// ─── Scenes ──────────────────────────────────────────────────────────────────

function HookScene({ q }: { q: VideoQuestion }) {
  const frame = useCurrentFrame();
  const sceneFrame = frame;
  const op = lerp(sceneFrame, 0, 8, 0, 1);
  const scale = lerp(sceneFrame, 0, 14, 0.88, 1);

  // Badge slides in slightly after
  const badgeOp = lerp(sceneFrame, 4, 18, 0, 1);
  const badgeTy = lerp(sceneFrame, 4, 18, 20, 0);

  const difficulties = {
    ru: { easy: "ЛЁГКИЙ", medium: "СРЕДНИЙ", hard: "СЛОЖНЫЙ" },
    es: { easy: "FÁCIL",  medium: "MEDIO",   hard: "DIFÍCIL" },
  };
  const diffColors = { easy: C.emerald, medium: "#F0883E", hard: C.red };

  const examLabel = q.language === "ru" ? "🚗 ЭКЗАМЕН ПДД" : "🚗 EXAMEN DGT";
  const subLabel  = q.language === "ru" ? "Знаешь правила?" : "¿Conoces las normas?";

  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"0 80px",
      opacity: op }}>

      {/* Glow backdrop */}
      <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%",
        background:"radial-gradient(circle, rgba(47,129,247,0.12) 0%, transparent 70%)",
        pointerEvents:"none" }} />

      {/* Exam context badge — immediately establishes topic */}
      <div style={{ opacity: badgeOp, transform:`translateY(${badgeTy}px)`,
        marginBottom:40, display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
        <div style={{ padding:"14px 40px", borderRadius:100,
          background:"linear-gradient(135deg, #2F81F7 0%, #1a6bd4 100%)",
          fontSize:34, fontWeight:800, color:"#fff",
          fontFamily:"system-ui,sans-serif", letterSpacing:2,
          boxShadow:"0 4px 24px rgba(47,129,247,0.45)" }}>
          {examLabel}
        </div>
        <div style={{ fontSize:30, color: C.textMuted, fontFamily:"system-ui,sans-serif" }}>
          {subLabel}
        </div>
      </div>

      {/* Hook title */}
      <div style={{ fontSize:88, fontWeight:900, color: C.text, textAlign:"center",
        lineHeight:1.1, fontFamily:"system-ui,sans-serif",
        transform: `scale(${scale})`,
        textShadow:`0 0 60px rgba(47,129,247,0.4), 0 2px 8px rgba(0,0,0,0.8)` }}>
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
          {difficulties[q.language][q.difficulty]}
        </div>
        <div style={{ fontSize:26, color: C.textMuted, letterSpacing:4,
          fontFamily:"system-ui,sans-serif" }}>
          #{String(q.series_number).padStart(3,"0")}
        </div>
      </div>
    </div>
  );
}

function CountdownScene() {
  const frame = useCurrentFrame();
  const sceneFrame = frame - TIMING.countdown.start * FPS;
  const perNumber = 30;
  const currentNum = 3 - Math.floor(sceneFrame / perNumber);
  const localF = sceneFrame % perNumber;

  const n = Math.max(1, Math.min(3, currentNum));
  const op = lerp(localF, 0, 4, 0, 1) * lerp(localF, perNumber - 6, perNumber, 1, 0);
  const scale = lerp(localF, 0, 10, 0.5, 1);
  const colors = [C.red, "#F0883E", C.emerald];

  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontSize:240, fontWeight:900, color: colors[n-1], lineHeight:1,
        opacity: op, transform:`scale(${scale})`, fontFamily:"system-ui,sans-serif",
        textShadow:`0 0 100px ${colors[n-1]}55` }}>
        {n}
      </div>
    </div>
  );
}

function TestCard({ q, showOptions, revealFrame, showExplanation }:
  { q: VideoQuestion; showOptions: boolean; revealFrame: number; showExplanation: boolean }) {

  const frame = useCurrentFrame();
  const opts = q.answer_options;
  const perOpt = showOptions ? Math.floor(
    (TIMING.suspense.start - TIMING.answers.start) * FPS / opts.length
  ) : 999;
  const answersStartFrame = TIMING.answers.start * FPS;

  return (
    <div style={{ width:"100%", maxWidth:960, display:"flex", flexDirection:"column", gap:20 }}>

      {/* ── Image ── */}
      {q.image_url && (
        /* Outer div carries the shadow — overflow:hidden would clip box-shadow */
        <div style={{ width:"100%", borderRadius:40,
          boxShadow:"0 24px 80px rgba(0,0,0,0.9), 0 8px 32px rgba(0,0,0,0.7), 0 0 0 1.5px rgba(255,255,255,0.10), 0 0 80px rgba(47,129,247,0.18)" }}>
          {/* Inner div clips image to rounded corners */}
          <div style={{ width:"100%", borderRadius:40, overflow:"hidden",
            backgroundColor:"#000", border:"1.5px solid rgba(255,255,255,0.10)" }}>
            <img src={q.image_url} alt="" style={{ width:"100%", maxHeight:500,
              objectFit:"contain", display:"block" }} />
          </div>
        </div>
      )}

      {/* ── Question text ── */}
      <div style={{ fontSize: q.question.length > 120 ? 38 : 46,
        fontWeight:700, color: C.text, lineHeight:1.4,
        fontFamily:"system-ui,sans-serif" }}>
        {q.question}
      </div>

      {/* ── Options ── */}
      {opts.map((opt, i) => {
        const appearAt = answersStartFrame + i * perOpt;
        const localF = frame - appearAt;
        const visible = showOptions && localF >= 0;
        const op2 = visible ? Math.min(1, localF / 8) : 0;
        const tx = visible ? lerp(localF, 0, 12, 40, 0) : 40;

        // Reveal state
        const isRevealed = revealFrame > 0;
        const isCorrect = opt.is_correct;

        const borderColor = isRevealed
          ? isCorrect ? C.emeraldBdr : "rgba(255,255,255,0.04)"
          : C.border;
        const bgColor = isRevealed
          ? isCorrect ? C.emeraldBg : "rgba(255,255,255,0.01)"
          : C.card;
        const badgeBg = isRevealed
          ? isCorrect ? C.emerald : "rgba(255,255,255,0.04)"
          : C.badgeDefault;
        const badgeColor = isRevealed
          ? isCorrect ? "#fff" : "rgba(255,255,255,0.15)"
          : C.badgeText;
        const textOp = isRevealed && !isCorrect ? 0.3 : 1;

        return (
          <div key={opt.id}
            style={{ display:"flex", alignItems:"center", gap:20,
              padding:"24px 28px", borderRadius:20,
              border:`1.5px solid ${borderColor}`,
              backgroundColor: bgColor,
              opacity: op2,
              transform: `translateX(${tx}px)`,
              transition:"border-color 0.3s, background-color 0.3s",
              boxShadow: isRevealed && isCorrect ? `0 0 24px rgba(63,185,80,0.2)` : "none" }}>

            {/* Number badge */}
            <div style={{ minWidth:52, height:52, borderRadius:14,
              backgroundColor: badgeBg, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:24, fontWeight:800,
              color: badgeColor, fontFamily:"system-ui,sans-serif",
              flexShrink:0 }}>
              {isRevealed && isCorrect ? "✓" : i + 1}
            </div>

            {/* Text */}
            <div style={{ fontSize:38, fontWeight:500, color: C.text,
              fontFamily:"system-ui,sans-serif", lineHeight:1.3,
              opacity: textOp }}>
              {opt.text}
            </div>
          </div>
        );
      })}

      {/* ── Explanation (replaces bottom button area) ── */}
      {showExplanation && (
        <div style={{ marginTop:8, padding:"24px 28px", borderRadius:20,
          border:`1.5px solid rgba(47,129,247,0.35)`,
          backgroundColor:"rgba(47,129,247,0.08)" }}>
          <div style={{ fontSize:24, fontWeight:700, color: C.primary,
            marginBottom:12, fontFamily:"system-ui,sans-serif" }}>
            {q.language === "ru" ? "Объяснение" : "Explicación"}
          </div>
          <div style={{ fontSize:34, color: C.text, lineHeight:1.5,
            fontFamily:"system-ui,sans-serif" }}>
            {q.explanation}
          </div>
        </div>
      )}

      {/* "Responder" button removed intentionally */}
    </div>
  );
}

function QuestionScene({ q }: { q: VideoQuestion }) {
  const frame = useCurrentFrame();
  const sceneFrame = frame - TIMING.question.start * FPS;
  const op = lerp(sceneFrame, 0, 12, 0, 1);
  const ty = lerp(sceneFrame, 0, 14, 60, 0);

  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"60px 60px",
      opacity: op, transform: `translateY(${ty}px)` }}>
      <TestCard q={q} showOptions={false} revealFrame={0} showExplanation={false} />
    </div>
  );
}

function AnswersScene({ q }: { q: VideoQuestion }) {
  const op = lerp(useCurrentFrame() - TIMING.answers.start * FPS, 0, 4, 0, 1);
  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"60px 60px", opacity: op }}>
      <TestCard q={q} showOptions={true} revealFrame={0} showExplanation={false} />
    </div>
  );
}

function SuspenseScene({ q }: { q: VideoQuestion }) {
  const frame = useCurrentFrame();
  const sceneF = frame - TIMING.suspense.start * FPS;
  const totalF = (TIMING.suspense.end - TIMING.suspense.start) * FPS;
  const progress = 1 - sceneF / totalF;
  const suspenseSecs = TIMING.suspense.end - TIMING.suspense.start;
  const secs = Math.max(1, Math.ceil(progress * suspenseSecs));
  const pulse = 1 + Math.sin(sceneF / 5) * 0.015;
  const overlayOp = lerp(sceneF, 0, 12, 0, 1);

  return (
    <div style={{ position:"absolute", inset:0 }}>

      {/* Question + answers visible in background */}
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", padding:"60px 60px" }}>
        <TestCard q={q} showOptions={true} revealFrame={0} showExplanation={false} />
      </div>

      {/* Dark overlay + "ДУМАЙТЕ!" + countdown ring */}
      <div style={{ position:"absolute", inset:0,
        background:"rgba(13,17,23,0.78)",
        backdropFilter:"blur(2px)",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", gap:48,
        opacity: overlayOp }}>

        <div style={{ fontSize:90, fontWeight:900, color:"#F0883E",
          transform:`scale(${pulse})`, fontFamily:"system-ui,sans-serif",
          textShadow:"0 0 60px rgba(240,136,62,0.5)", letterSpacing:4 }}>
          {q.language === "ru" ? "ДУМАЙТЕ!" : "¡PIENSA!"}
        </div>

        {/* SVG countdown ring */}
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

        <div style={{ fontSize:32, color: C.primary, fontFamily:"system-ui,sans-serif",
          fontWeight:600 }}>
          {q.language === "ru" ? "⬇️ Напиши ответ в комментах" : "⬇️ Escribe tu respuesta"}
        </div>
      </div>
    </div>
  );
}

function RevealScene({ q }: { q: VideoQuestion }) {
  const frame = useCurrentFrame();
  const sceneF = frame - TIMING.reveal.start * FPS;
  const op = lerp(sceneF, 0, 8, 0, 1);

  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"60px 60px", opacity: op }}>
      <TestCard q={q} showOptions={true} revealFrame={sceneF} showExplanation={false} />
    </div>
  );
}

function ExplanationScene({ q }: { q: VideoQuestion }) {
  const frame = useCurrentFrame();
  const op = lerp(frame - TIMING.explanation.start * FPS, 0, 10, 0, 1);

  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"60px 60px", opacity: op }}>
      <TestCard q={q} showOptions={true} revealFrame={999} showExplanation={true} />
    </div>
  );
}

function CTAScene({ q }: { q: VideoQuestion }) {
  const frame = useCurrentFrame();
  const sceneF = frame - TIMING.cta.start * FPS;
  const op = lerp(sceneF, 0, 10, 0, 1);
  const scale = lerp(sceneF, 0, 14, 0.88, 1);
  const pulse = 1 + Math.sin(sceneF / 8) * 0.018;

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
        {q.language === "ru" ? "Ещё вопросы → skilyapp.com" : "Más preguntas → skilyapp.com"}
      </div>

      <div style={{ fontSize:34, color: C.textMuted, fontFamily:"system-ui,sans-serif" }}>
        {q.language === "ru" ? "Подпишись 👇" : "Suscríbete 👇"}
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

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* Subtle top gradient */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:400,
        background:"radial-gradient(ellipse at 50% 0%, rgba(47,129,247,0.08) 0%, transparent 70%)",
        pointerEvents:"none" }} />

      {/* ── Sound effects ── */}
      {/* Hook whoosh at frame 0 */}
      <Sequence from={0} durationInFrames={15}>
        <Audio src={S("whoosh.wav")} volume={0.7} />
      </Sequence>
      {/* Countdown beeps: 3 at 2s, 2 at 3s, 1 at 4s */}
      <Sequence from={TIMING.countdown.start * FPS} durationInFrames={10}>
        <Audio src={S("beep3.wav")} volume={0.8} />
      </Sequence>
      <Sequence from={(TIMING.countdown.start + 1) * FPS} durationInFrames={10}>
        <Audio src={S("beep2.wav")} volume={0.8} />
      </Sequence>
      <Sequence from={(TIMING.countdown.start + 2) * FPS} durationInFrames={10}>
        <Audio src={S("beep1.wav")} volume={1.0} />
      </Sequence>
      {/* Tick every second during suspense (6 seconds = 6 ticks) */}
      {[0,1,2,3,4,5].map(i => (
        <Sequence key={i} from={(TIMING.suspense.start + i) * FPS} durationInFrames={6}>
          <Audio src={S("tick.wav")} volume={0.6} />
        </Sequence>
      ))}
      {/* Reveal chime */}
      <Sequence from={TIMING.reveal.start * FPS} durationInFrames={20}>
        <Audio src={S("reveal.wav")} volume={0.9} />
      </Sequence>

      {/* ── ElevenLabs TTS voiceover ── */}
      {/* Question narration: starts at QuestionScene, plays through AnswersScene */}
      {question.questionAudioFile && (
        <Sequence
          from={TIMING.question.start * FPS}
          durationInFrames={(TIMING.suspense.end - TIMING.question.start) * FPS}
        >
          <Audio src={staticFile(question.questionAudioFile)} volume={0.9} />
        </Sequence>
      )}
      {/* Explanation narration: starts at ExplanationScene */}
      {question.explanationAudioFile && (
        <Sequence
          from={TIMING.explanation.start * FPS}
          durationInFrames={(TIMING.cta.end - TIMING.explanation.start) * FPS}
        >
          <Audio src={staticFile(question.explanationAudioFile)} volume={0.9} />
        </Sequence>
      )}

      {/* ── Scenes with crossfade dissolve ── */}
      {(()=> {
        const t = TIMING;
        const f = FPS;
        const op = (s: number, e: number) => sceneOp(frame, s * f, e * f);
        return (
          <>
            {op(t.hook.start, t.hook.end) > 0 && (
              <div style={{ position:"absolute", inset:0, opacity: op(t.hook.start, t.hook.end) }}>
                <HookScene q={question} />
              </div>
            )}
            {op(t.countdown.start, t.countdown.end) > 0 && (
              <div style={{ position:"absolute", inset:0, opacity: op(t.countdown.start, t.countdown.end) }}>
                <CountdownScene />
              </div>
            )}
            {op(t.question.start, t.question.end) > 0 && (
              <div style={{ position:"absolute", inset:0, opacity: op(t.question.start, t.question.end) }}>
                <QuestionScene q={question} />
              </div>
            )}
            {op(t.answers.start, t.answers.end) > 0 && (
              <div style={{ position:"absolute", inset:0, opacity: op(t.answers.start, t.answers.end) }}>
                <AnswersScene q={question} />
              </div>
            )}
            {op(t.suspense.start, t.suspense.end) > 0 && (
              <div style={{ position:"absolute", inset:0, opacity: op(t.suspense.start, t.suspense.end) }}>
                <SuspenseScene q={question} />
              </div>
            )}
            {op(t.reveal.start, t.reveal.end) > 0 && (
              <div style={{ position:"absolute", inset:0, opacity: op(t.reveal.start, t.reveal.end) }}>
                <RevealScene q={question} />
              </div>
            )}
            {op(t.explanation.start, t.explanation.end) > 0 && (
              <div style={{ position:"absolute", inset:0, opacity: op(t.explanation.start, t.explanation.end) }}>
                <ExplanationScene q={question} />
              </div>
            )}
            {op(t.cta.start, t.cta.end) > 0 && (
              <div style={{ position:"absolute", inset:0, opacity: op(t.cta.start, t.cta.end) }}>
                <CTAScene q={question} />
              </div>
            )}
          </>
        );
      })()}

      {/* Bottom brand line */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:5,
        background: C.gradient }} />
    </AbsoluteFill>
  );
};
