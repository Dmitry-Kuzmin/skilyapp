/**
 * VideoTemplate — Skily DGT video for TikTok / YouTube Shorts.
 * Uses dynamic timing driven by ElevenLabs audio durations so each answer
 * appears exactly when the narrator starts reading it.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, Audio, Sequence, staticFile } from "remotion";
import { VideoQuestion, DynamicTiming, buildDynamicTiming, FPS, UI_TEXT } from "./types";

const S = (f: string) => staticFile(`sounds/${f}`);

// Убираем markdown (**жирный**, *курсив*) — Remotion не парсит HTML
function cleanText(text: string): string {
  return (text || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^#+\s*/gm, "")   // заголовки #
    .replace(/\uFFFD+/g, "")   // Unicode replacement chars (битые байты в БД)
    .replace(/\s{2,}/g, " ")   // двойные пробелы после удаления символов
    .trim();
}

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
  const frame  = useCurrentFrame();
  const sceneF = frame - t.hookStart * FPS;

  // Main fade-in
  const op     = lerp(sceneF, 0, 10, 0, 1);
  // Top badge slides down
  const badgeOp = lerp(sceneF, 2, 16, 0, 1);
  const badgeTy = lerp(sceneF, 2, 16, -40, 0);
  // Hook text pops up
  const hookOp    = lerp(sceneF, 6, 20, 0, 1);
  const hookScale = lerp(sceneF, 6, 22, 0.75, 1);
  // Bottom row slides up
  const bottomOp = lerp(sceneF, 12, 26, 0, 1);
  const bottomTy = lerp(sceneF, 12, 26, 40, 0);

  const isEs = q.language === "es";
  const diffColors = { easy: C.emerald, medium: "#F0883E", hard: C.red };
  const diffLabels = {
    ru: { easy: "ЛЁГКИЙ", medium: "СРЕДНИЙ", hard: "СЛОЖНЫЙ" },
    es: { easy: "FÁCIL",  medium: "MEDIO",   hard: "DIFÍCIL" },
  };

  return (
    <div style={{ position:"absolute", inset:0, opacity: op, display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center" }}>

      {/* Full-bg gradient overlay */}
      <div style={{ position:"absolute", inset:0,
        background:"radial-gradient(ellipse 80% 60% at 50% 40%, rgba(47,129,247,0.18) 0%, transparent 70%)",
        pointerEvents:"none" }} />

      {/* Decorative road lines */}
      {[0,1,2].map(i => (
        <div key={i} style={{
          position:"absolute",
          left: "50%", bottom: -20 + i * 0,
          width: 8, height: `${28 + i*8}%`,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 8,
          transform: `translateX(${(i-1)*120}px)`,
        }} />
      ))}

      {/* TOP: DGT exam badge */}
      <div style={{ opacity: badgeOp, transform:`translateY(${badgeTy}px)`,
        display:"flex", flexDirection:"column", alignItems:"center", gap:14, marginBottom:48 }}>

        {/* Flag + label row — always Spanish flag since content = DGT Spain */}
        <div style={{ display:"flex", alignItems:"center", gap:16,
          background:"rgba(255,255,255,0.06)", border:"1.5px solid rgba(255,255,255,0.12)",
          borderRadius:100, padding:"10px 28px" }}>
          <span style={{ fontSize:36 }}>🇪🇸</span>
          <span style={{ fontSize:26, fontWeight:800, color:"#fff", letterSpacing:3,
            fontFamily:"system-ui,sans-serif" }}>
            {isEs ? "EXAMEN DGT" : "ТЕСТ: ПДД ИСПАНИИ"}
          </span>
          <span style={{ fontSize:36 }}>🚗</span>
        </div>

        {/* Subtitle */}
        <div style={{ fontSize:26, color:"rgba(255,255,255,0.45)",
          fontFamily:"system-ui,sans-serif", letterSpacing:1 }}>
          {isEs ? "¿Conoces las normas de tráfico?" : "Знаешь испанские правила? 🤔"}
        </div>
      </div>

      {/* CENTRE: Hook title */}
      <div style={{
        opacity: hookOp,
        transform:`scale(${hookScale})`,
        fontSize: q.hook_title.length > 22 ? 72 : 84,
        fontWeight:900,
        color:"#fff",
        textAlign:"center",
        lineHeight:1.15,
        fontFamily:"system-ui,sans-serif",
        letterSpacing:-1,
        padding:"0 60px",
        textShadow:[
          "0 0 80px rgba(47,129,247,0.6)",
          "0 0 160px rgba(47,129,247,0.3)",
          "0 4px 12px rgba(0,0,0,0.9)",
        ].join(", "),
      }}>
        {q.hook_title}
      </div>

      {/* BOTTOM: difficulty + series + branding */}
      <div style={{ opacity: bottomOp, transform:`translateY(${bottomTy}px)`,
        marginTop:52, display:"flex", alignItems:"center", gap:20 }}>

        <div style={{
          padding:"10px 24px", borderRadius:100,
          backgroundColor:`${diffColors[q.difficulty]}20`,
          border:`1.5px solid ${diffColors[q.difficulty]}60`,
          color: diffColors[q.difficulty],
          fontSize:22, fontWeight:800, letterSpacing:3,
          fontFamily:"system-ui,sans-serif",
        }}>
          {diffLabels[q.language][q.difficulty]}
        </div>

        <div style={{ width:6, height:6, borderRadius:"50%", background:"rgba(255,255,255,0.2)" }} />

        <div style={{ fontSize:22, color:"rgba(255,255,255,0.35)",
          fontFamily:"system-ui,sans-serif", letterSpacing:2 }}>
          #{String(q.series_number).padStart(3,"0")}
        </div>

        <div style={{ width:6, height:6, borderRadius:"50%", background:"rgba(255,255,255,0.2)" }} />

        <div style={{ fontSize:22, color:"rgba(47,129,247,0.7)",
          fontFamily:"system-ui,sans-serif", fontWeight:600 }}>
          skilyapp.com
        </div>
      </div>
    </div>
  );
}

// ─── CountdownScene ───────────────────────────────────────────────────────────
function CountdownScene({ q, t }: { q: VideoQuestion; t: DynamicTiming }) {
  const frame  = useCurrentFrame();
  const sceneF = frame - t.countdownStart * FPS;
  const perNum = 30; // frames per digit
  const n      = Math.max(1, Math.min(3, 3 - Math.floor(sceneF / perNum)));
  const localF = sceneF % perNum;

  // Pop-in → hold → pop-out
  const numScale = lerp(localF, 0, 8, 1.6, 1) * lerp(localF, perNum-8, perNum, 1, 0.4);
  const numOp    = lerp(localF, 0, 5, 0, 1) * lerp(localF, perNum-6, perNum, 1, 0);

  // Ring sweep: 0→1 over the perNum frames
  const sweep = Math.min(1, localF / (perNum - 2));

  const ringColors = ["#F85149", "#F0883E", "#3FB950"]; // 3→2→1
  const ringColor  = ringColors[n - 1];

  const labelOp = lerp(sceneF, 0, 14, 0, 1);
  const ui = UI_TEXT[q.language];

  // SVG ring params
  const R = 160, stroke = 14;
  const circ = 2 * Math.PI * R;
  const dash = sweep * circ;

  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:40 }}>

      {/* Think label */}
      <div style={{ fontSize:44, fontWeight:900, color:"rgba(255,255,255,0.55)",
        letterSpacing:8, fontFamily:"system-ui,sans-serif", opacity: labelOp,
        textTransform:"uppercase" }}>
        {ui.think}
      </div>

      {/* Ring + number */}
      <div style={{ position:"relative", width: R*2+stroke*2, height: R*2+stroke*2 }}>
        {/* Background ring */}
        <svg width={R*2+stroke*2} height={R*2+stroke*2}
          style={{ position:"absolute", inset:0, transform:"rotate(-90deg)" }}>
          <circle cx={R+stroke} cy={R+stroke} r={R}
            fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
          <circle cx={R+stroke} cy={R+stroke} r={R}
            fill="none" stroke={ringColor} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ filter:`drop-shadow(0 0 12px ${ringColor}99)` }} />
        </svg>

        {/* Number */}
        <div style={{
          position:"absolute", inset:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:180, fontWeight:900, color:"#fff",
          fontFamily:"system-ui,sans-serif", lineHeight:1,
          opacity: numOp,
          transform:`scale(${numScale})`,
          textShadow:`0 0 60px ${ringColor}99, 0 4px 16px rgba(0,0,0,0.8)`,
        }}>
          {n}
        </div>
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

  // Объяснение ВСЕГДА на испанском (читается голосом на русском в RU-видео)
  const expText = cleanText(q.explanation);

  return (
    <div style={{ width:"100%", maxWidth:960, display:"flex", flexDirection:"column", gap:20 }}>

      {/* Image */}
      {q.image_url && (
        /* Внешний div: синий glow + закруглённые углы тени */
        <div style={{
          borderRadius: 36,
          padding: 3,
          background: "linear-gradient(135deg, rgba(47,129,247,0.55) 0%, rgba(47,129,247,0.18) 100%)",
          boxShadow: [
            "0 0 0 1px rgba(47,129,247,0.35)",
            "0 8px 32px rgba(47,129,247,0.40)",
            "0 24px 64px rgba(0,0,0,0.75)",
            "0 0 80px rgba(47,129,247,0.22)",
          ].join(", "),
        }}>
          {/* Внутренний div: clip rounded corners изображения */}
          <div style={{ borderRadius: 33, overflow: "hidden", backgroundColor: C.card }}>
            <img src={q.image_url} alt="" style={{ width:"100%", height:"auto",
              display:"block" }} />
          </div>
        </div>
      )}

      {/* Question text */}
      <div style={{ fontSize: q.question.length > 120 ? 38 : 46,
        fontWeight:700, color: C.text, lineHeight:1.4,
        fontFamily:"system-ui,sans-serif" }}>
        {cleanText(q.question)}
      </div>

      {/* Russian subtitle under question (RU-видео) */}
      {q.language === "ru" && q.question_ru && (
        <div style={{ fontSize:30, fontWeight:400, color: C.textMuted,
          lineHeight:1.4, fontFamily:"system-ui,sans-serif",
          borderLeft:`3px solid ${C.primary}`, paddingLeft:16,
          marginTop:-8 }}>
          {cleanText(q.question_ru)}
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
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <div style={{ fontSize:38, fontWeight:500, color: C.text,
                fontFamily:"system-ui,sans-serif", lineHeight:1.3, opacity: textOp }}>
                {opt.text}
              </div>
              {/* Русский перевод под испанским вариантом (RU-видео) */}
              {q.language === "ru" && opt.text_ru && (
                <div style={{ fontSize:26, color: C.textMuted, fontFamily:"system-ui,sans-serif",
                  lineHeight:1.3, opacity: textOp * 0.8 }}>
                  {cleanText(opt.text_ru)}
                </div>
              )}
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
          {/* В RU-видео подсказка что объяснение на испанском, голос на русском */}
          {q.language === "ru" && (
            <div style={{ marginTop:10, fontSize:22, color: C.primary,
              fontFamily:"system-ui,sans-serif", opacity:0.7 }}>
              🔊 Объяснение читается на русском
            </div>
          )}
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
          <CountdownScene q={question} t={t} />
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
