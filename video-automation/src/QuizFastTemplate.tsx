/**
 * QuizFastTemplate — fast quiz format: 3 questions × ~4.7s each.
 *
 * Per question structure:
 *   HOOK (0–22f, 0.73s):  sign PUNCH-in + "¿SABES ESTA SEÑAL?" text + TTS hook
 *   QFADE (22–42f):       hook text fades, question + options fade in
 *   SUSPENSE (42–87f, 1.5s): viewer thinks; subtle ticks
 *   CURSOR (87–105f):     cursor flies in from top-right
 *   CLICK (107f):         cursor click pulse
 *   CHECK (113f+):        correct answer marked + reveal TTS
 *
 * Independent of VideoTemplate / types.ts.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, Img, Audio, Sequence, staticFile } from "remotion";

// ── Public types ───────────────────────────────────────────────────────────────
export interface QuizFastItem {
  question: string;
  sign_url: string | null;
  options: string[];                 // 3 options
  correct_idx: number;
  hookText?: string;                 // override hook phrase, e.g. "73% LO FALLA 👀"
  percentCorrect?: number;           // 0–100, shows "X% falla esto" badge
  hookAudioFile?: string;
  hookAudioDurationSec?: number;
  revealAudioFile?: string;          // narrator reads correct answer
  revealAudioDurationSec?: number;
}

export interface QuizFastProps {
  items: QuizFastItem[];
  outroAudioFile?: string;
  outroAudioDurationSec?: number;
  ctaText?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const FPS = 30;
const W   = 1080;
const H   = 1920;

const BASE_Q_FRAMES = 140; // 4.67s minimum per question
const OUTRO_FRAMES  = 135; // 4.5s outro (fits ~4s narration)

const PH = {
  PUNCH_END:    22,
  QFADE_START:  22,
  QFADE_END:    42,
  SUSPENSE_END: 87,
  CURSOR_END:   105,
  CLICK_AT:     107,
  CHECK_AT:     113,
} as const;

const REVEAL_HOLD_F = 12; // extra frames after reveal TTS ends

/** Per-question frame count: base, OR extended to fit reveal narration. */
function qFrames(item: QuizFastItem): number {
  const revF = Math.ceil((item.revealAudioDurationSec ?? 0.8) * FPS);
  return Math.max(BASE_Q_FRAMES, PH.CHECK_AT + revF + REVEAL_HOLD_F);
}

export function calcQuizFastFrames(items: QuizFastItem[]): number {
  return items.reduce((s, it) => s + qFrames(it), 0) + OUTRO_FRAMES;
}

// ── Layout ─────────────────────────────────────────────────────────────────────
const PAD_X       = 65;
const SIGN_TOP    = 145;
const SIGN_SIZE   = 380;
const HOOK_Y      = SIGN_TOP + SIGN_SIZE + 35;
const QUESTION_Y  = SIGN_TOP + SIGN_SIZE + 30;
const OPTIONS_TOP = QUESTION_Y + 175;
const OPTION_H    = 175;
const OPTION_R    = 26;

// ── Animation helpers ──────────────────────────────────────────────────────────
function easeOut(t: number) { return 1 - Math.pow(1 - t, 2.5); }
function smooth(t: number)  { return t * t * (3 - 2 * t); }
function back(t: number) {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}
function anim(
  f: number, f0: number, f1: number,
  v0: number, v1: number,
  ease: "out" | "smooth" | "back" = "out",
): number {
  if (f <= f0) return v0;
  if (f >= f1) return v1;
  const t = (f - f0) / (f1 - f0);
  const e = ease === "smooth" ? smooth(t) : ease === "back" ? back(t) : easeOut(t);
  return v0 + e * (v1 - v0);
}

function cursorTarget(oi: number) {
  const y = OPTIONS_TOP + oi * OPTION_H + (OPTION_H - 25) / 2;
  const x = PAD_X + 32 + OPTION_R;
  return { x: x - 18, y: y - 22 };
}

// ── Cursor SVG ─────────────────────────────────────────────────────────────────
function Cursor({ x, y, scale }: { x: number; y: number; scale: number }) {
  const SZ = 66;
  return (
    <div style={{
      position: "absolute",
      left: x, top: y,
      width: SZ, height: Math.round(SZ * 1.35),
      pointerEvents: "none",
      transform: `scale(${scale})`,
      transformOrigin: "5px 3px",
      filter: [
        "drop-shadow(5px 9px 14px rgba(0,0,0,0.52))",
        "drop-shadow(2px 4px 6px rgba(0,0,0,0.30))",
      ].join(" "),
    }}>
      <svg width={SZ} height={Math.round(SZ * 1.35)} viewBox="0 0 22 30" fill="none">
        <path
          d="M 3 1 L 3 21 L 7.5 16.5 L 10.5 25.5 L 13.5 24 L 10.5 15 L 18 15 Z"
          stroke="rgba(255,255,255,0.92)" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round"
        />
        <path
          d="M 3 1 L 3 21 L 7.5 16.5 L 10.5 25.5 L 13.5 24 L 10.5 15 L 18 15 Z"
          fill="#141414" strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ── Timer 3-2-1 countdown ──────────────────────────────────────────────────────
// Suspense phase: frames 42–87 = 45f = 1.5s → 3 beats of 15f each
function TimerBeat({ frame, beat, atF }: { frame: number; beat: number; atF: number }) {
  const BEAT_F = 15;
  const f = frame - atF;
  if (f < 0 || f >= BEAT_F) return null;
  const popIn = anim(f, 0, 6, 0, 1, "back");
  const fadeOut = anim(f, 9, BEAT_F, 1, 0);
  const scale = anim(f, 0, 6, 1.6, 1.0, "out");
  return (
    <div style={{
      position: "absolute",
      bottom: 185, left: 0, right: 0,
      textAlign: "center",
      fontFamily: "system-ui, sans-serif",
      fontWeight: 900,
      fontSize: 200,
      color: beat === 1 ? "#b81111" : "#1a1a1a",
      opacity: popIn * fadeOut,
      transform: `scale(${scale})`,
      transformOrigin: "center",
      lineHeight: 1,
      textShadow: beat === 1
        ? "0 0 60px rgba(184,17,17,0.35)"
        : "0 8px 24px rgba(0,0,0,0.12)",
    }}>
      {beat}
    </div>
  );
}

// Timer progress bar depleting during suspense
function TimerBar({ frame }: { frame: number }) {
  if (frame < PH.QFADE_END || frame >= PH.SUSPENSE_END) return null;
  const progress = 1 - (frame - PH.QFADE_END) / (PH.SUSPENSE_END - PH.QFADE_END);
  const color = progress > 0.5 ? "#22c55e" : progress > 0.25 ? "#f59e0b" : "#b81111";
  return (
    <div style={{
      position: "absolute",
      top: 0, left: 0, right: 0,
      height: 10,
      background: "rgba(0,0,0,0.08)",
    }}>
      <div style={{
        height: "100%",
        width: `${progress * 100}%`,
        background: color,
        transition: "background 0.2s",
        borderRadius: "0 6px 6px 0",
        boxShadow: `0 0 12px ${color}88`,
      }} />
    </div>
  );
}

// ── Single question scene ──────────────────────────────────────────────────────
function QuestionScene({ item, frame }: { item: QuizFastItem; frame: number }) {

  const hookText = item.hookText ?? "¿SABES ESTA SEÑAL?";
  const fontSize = hookText.length > 18 ? 66 : hookText.length > 14 ? 76 : 84;

  // ── Sign PUNCH-in animation (0.4 → 1.18 overshoot → 1.0) ────────────────────
  const signOp = anim(frame, 0, 8, 0, 1);
  const signScale = (() => {
    if (frame < 7)  return anim(frame, 0,  7,  0.42, 1.20, "out");
    if (frame < 15) return anim(frame, 7,  15, 1.20, 0.96, "smooth");
    if (frame < 22) return anim(frame, 15, 22, 0.96, 1.00, "smooth");
    return 1.0;
  })();

  // ── Hook text ────────────────────────────────────────────────────────────────
  const hookIn  = anim(frame, 4, 16, 0, 1, "back");
  const hookOut = anim(frame, PH.QFADE_START, PH.QFADE_END, 1, 0);
  const hookOp  = hookIn * hookOut;
  const hookShake = frame < 22 ? Math.sin(frame / 2.2) * Math.max(0, 22 - frame) * 0.45 : 0;

  // percent badge "X% falla esto" fades in just after hook
  const pctOp = item.percentCorrect != null
    ? anim(frame, 10, 22, 0, 1) * hookOut
    : 0;
  const failPct = item.percentCorrect != null ? 100 - item.percentCorrect : 0;

  // ── Question text + options ─────────────────────────────────────────────────
  const qOp = anim(frame, PH.QFADE_START, PH.QFADE_END, 0, 1);
  const qTy = anim(frame, PH.QFADE_START, PH.QFADE_END, 16, 0);

  const susF  = Math.max(0, frame - PH.QFADE_END);
  const pulse = 1 + Math.sin(susF / 9) * 0.006;

  // ── Mark correct answer after CHECK ─────────────────────────────────────────
  const marked     = frame >= PH.CHECK_AT;
  const checkScale = marked ? anim(frame, PH.CHECK_AT, PH.CHECK_AT + 11, 0, 1, "back") : 0;

  // ── Cursor: flies in diagonally from top-right ──────────────────────────────
  const target  = cursorTarget(item.correct_idx);
  const CUR_X0  = W + 90;
  const CUR_Y0  = 300;
  let cx = CUR_X0, cy = CUR_Y0, cScale = 1;
  if (frame >= PH.SUSPENSE_END) {
    cx = anim(frame, PH.SUSPENSE_END, PH.CURSOR_END, CUR_X0, target.x, "smooth");
    cy = anim(frame, PH.SUSPENSE_END, PH.CURSOR_END, CUR_Y0, target.y, "smooth");
    if (frame >= PH.CURSOR_END) { cx = target.x; cy = target.y; }
    if (frame >= PH.CLICK_AT && frame < PH.CLICK_AT + 14) {
      cScale = 1 - Math.sin(((frame - PH.CLICK_AT) / 14) * Math.PI) * 0.26;
    }
  }

  return (
    <AbsoluteFill>

      {/* Timer progress bar at top */}
      <TimerBar frame={frame} />

      {/* Sign */}
      <div style={{
        position: "absolute",
        left: (W - SIGN_SIZE) / 2,
        top: SIGN_TOP,
        width: SIGN_SIZE, height: SIGN_SIZE,
        opacity: signOp,
        transform: `scale(${signScale})`,
        transformOrigin: "center",
        display: "flex", alignItems: "center", justifyContent: "center",
        filter: "drop-shadow(0 16px 32px rgba(0,0,0,0.22)) drop-shadow(0 4px 10px rgba(0,0,0,0.12))",
      }}>
        {item.sign_url
          ? <Img src={item.sign_url} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          : <div style={{ fontSize: 220, color: "#888" }}>?</div>
        }
      </div>

      {/* HOOK text — dynamic */}
      <div style={{
        position: "absolute",
        top: HOOK_Y, left: 0, right: 0,
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
        fontWeight: 900,
        fontSize,
        color: "#b81111",
        letterSpacing: 1,
        opacity: hookOp,
        transform: `translateX(${hookShake}px) rotate(-2deg)`,
        textShadow: "0 6px 16px rgba(184,17,17,0.22), 0 2px 4px rgba(0,0,0,0.06)",
        lineHeight: 1.05,
        padding: "0 40px",
      }}>
        {hookText}
      </div>

      {/* Percent badge: "XX% LO FALLA" */}
      {item.percentCorrect != null && (
        <div style={{
          position: "absolute",
          top: HOOK_Y + fontSize + 18,
          left: 0, right: 0,
          textAlign: "center",
          opacity: pctOp,
          fontFamily: "system-ui, sans-serif",
          fontWeight: 800,
          fontSize: 46,
          color: "#1a1a1a",
          letterSpacing: 1,
        }}>
          <span style={{ color: "#b81111" }}>{failPct}%</span> lo falla 👀
        </div>
      )}

      {/* Question text */}
      <div style={{
        position: "absolute",
        top: QUESTION_Y,
        left: PAD_X, right: PAD_X,
        opacity: qOp,
        transform: `translateY(${qTy}px)`,
        fontFamily: "system-ui, sans-serif",
        fontWeight: 700,
        fontSize: 54,
        color: "#1a1a1a",
        textAlign: "center",
        borderBottom: "3px solid #b81111",
        paddingBottom: 14,
        lineHeight: 1.2,
      }}>
        {item.question}
      </div>

      {/* Options */}
      {item.options.map((opt, oi) => {
        const oF        = PH.QFADE_START + 4 + oi * 6;
        const optOp     = anim(frame, oF, oF + 12, 0, 1) * qOp;
        const optTx     = anim(frame, oF, oF + 16, 50, 0);
        const isCorrect = oi === item.correct_idx;
        const selected  = marked && isCorrect;
        const popScale  = selected ? 1.04 : 1;

        return (
          <div key={oi} style={{
            position: "absolute",
            top: OPTIONS_TOP + oi * OPTION_H,
            left: PAD_X, right: PAD_X,
            height: OPTION_H - 25,
            display: "flex",
            alignItems: "center",
            gap: 26,
            opacity: optOp,
            transform: `translateX(${optTx}px) scale(${popScale * pulse})`,
            transformOrigin: "center left",
            padding: "0 32px",
            borderRadius: 26,
            background: selected ? "rgba(27,78,216,0.08)" : "transparent",
            border: selected ? "2.5px solid rgba(27,78,216,0.55)" : "2.5px solid transparent",
            boxShadow: selected ? "0 8px 26px rgba(27,78,216,0.18)" : "none",
          }}>
            <div style={{
              width: OPTION_R * 2,
              height: OPTION_R * 2,
              borderRadius: "50%",
              border: `3px solid ${selected ? "#1b4ed8" : "#555"}`,
              backgroundColor: selected ? "#1b4ed8" : "transparent",
              flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: selected ? "0 0 0 7px rgba(27,78,216,0.14)" : "none",
            }}>
              {selected && (
                <div style={{
                  fontSize: 32, color: "#fff", fontWeight: 900, lineHeight: 1,
                  transform: `scale(${checkScale})`, transformOrigin: "center",
                }}>✓</div>
              )}
            </div>
            <div style={{
              fontSize: 42,
              fontWeight: selected ? 800 : 500,
              color: selected ? "#1b4ed8" : "#1a1a1a",
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.25,
              flex: 1,
            }}>
              {opt}
            </div>
          </div>
        );
      })}

      {/* 3-2-1 countdown during suspense */}
      <TimerBeat frame={frame} beat={3} atF={PH.QFADE_END} />
      <TimerBeat frame={frame} beat={2} atF={PH.QFADE_END + 15} />
      <TimerBeat frame={frame} beat={1} atF={PH.QFADE_END + 30} />

      {/* Cursor (only visible during reveal phase) */}
      {frame >= PH.SUSPENSE_END && (
        <Cursor x={cx} y={cy} scale={cScale} />
      )}

    </AbsoluteFill>
  );
}

// ── Main composition ───────────────────────────────────────────────────────────
export const QuizFastTemplate: React.FC<QuizFastProps> = ({
  items,
  outroAudioFile,
  outroAudioDurationSec,
  ctaText = "Aprende todas las señales con Skily",
}) => {
  const frame   = useCurrentFrame();
  const total   = items.length;

  // Compute per-question start frames (dynamic by audio duration)
  const starts: number[] = [];
  let acc = 0;
  for (let i = 0; i < total; i++) {
    starts.push(acc);
    acc += qFrames(items[i]);
  }
  const totalQFrames = acc;
  const isOutro      = frame >= totalQFrames;

  // Find current question
  let qi = total - 1;
  for (let i = 0; i < total; i++) {
    const next = i + 1 < total ? starts[i + 1] : totalQFrames;
    if (frame >= starts[i] && frame < next) { qi = i; break; }
  }
  const qFrame   = frame - starts[qi];
  const myQDur   = qFrames(items[qi]);

  // Crossfade tail: last 8 frames of each Q fade out
  const xfadeOp = qFrame >= myQDur - 8
    ? anim(qFrame, myQDur - 8, myQDur, 1, 0)
    : 1;

  // Outro
  const outroF     = frame - totalQFrames;
  const outroOp    = anim(outroF, 0, 14, 0, 1);
  const skilyScale = anim(outroF, 0, 22, 0.6, 1, "back");

  return (
    <AbsoluteFill>

      {/* Cream paper background */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(175deg, #fdfcf9 0%, #f4f1ea 100%)",
      }} />

      {/* Notebook ruled lines */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(180deg, transparent 0px, transparent 37px, rgba(175,155,145,0.18) 37px, rgba(175,155,145,0.18) 38.5px)",
      }} />

      {/* Red left margin */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, left: 38, width: 2,
        background: "rgba(170,35,35,0.28)", pointerEvents: "none",
      }} />

      {/* Counter top-right */}
      {!isOutro && (
        <div style={{
          position: "absolute",
          top: 38, right: 50,
          fontSize: 26,
          fontWeight: 800,
          color: "#b81111",
          fontFamily: "system-ui, sans-serif",
          letterSpacing: 3,
          padding: "10px 22px",
          background: "rgba(184,17,17,0.08)",
          border: "2.5px solid #b81111",
          borderRadius: 32,
        }}>
          {qi + 1} / {total}
        </div>
      )}

      {/* Question scene */}
      {!isOutro && (
        <AbsoluteFill style={{ opacity: xfadeOp }}>
          <QuestionScene item={items[qi]} frame={qFrame} />
        </AbsoluteFill>
      )}

      {/* Outro */}
      {isOutro && (
        <AbsoluteFill style={{
          opacity: outroOp,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 38,
        }}>
          <div style={{
            fontSize: 24,
            fontWeight: 600,
            color: "#888",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: 6,
            textTransform: "uppercase",
          }}>
            powered by
          </div>
          <div style={{
            fontSize: 120,
            fontWeight: 900,
            color: "#b81111",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: 10,
            transform: `scale(${skilyScale})`,
            textShadow: "0 8px 28px rgba(184,17,17,0.30)",
            lineHeight: 1,
          }}>
            SKILY
          </div>
          <div style={{
            fontSize: 38,
            color: "#1a1a1a",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 500,
            maxWidth: 880,
            textAlign: "center",
            lineHeight: 1.3,
            opacity: anim(outroF, 14, 30, 0, 1),
          }}>
            {ctaText}
          </div>
          <div style={{
            fontSize: 36,
            fontWeight: 800,
            color: "#b81111",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: 3,
            opacity: anim(outroF, 22, 40, 0, 1),
            padding: "14px 38px",
            background: "rgba(184,17,17,0.10)",
            border: "3px solid #b81111",
            borderRadius: 40,
          }}>
            skilyapp.com
          </div>
        </AbsoluteFill>
      )}

      {/* ── Sound effects ───────────────────────────────────────────────────── */}
      {/* Whoosh at each question hook start */}
      {items.map((_, i) => (
        <Sequence key={`wh-${i}`} from={starts[i]} durationInFrames={14}>
          <Audio src={staticFile("sounds/whoosh.wav")} volume={0.75} />
        </Sequence>
      ))}

      {/* Suspense ticks (3 per question) */}
      {items.flatMap((_, i) =>
        [0, 14, 28].map((dt, k) => (
          <Sequence
            key={`tk-${i}-${k}`}
            from={starts[i] + PH.QFADE_END + 6 + dt}
            durationInFrames={5}
          >
            <Audio src={staticFile("sounds/tick.wav")} volume={0.40} />
          </Sequence>
        ))
      )}

      {/* Reveal sound on click */}
      {items.map((_, i) => (
        <Sequence key={`rv-${i}`} from={starts[i] + PH.CLICK_AT} durationInFrames={22}>
          <Audio src={staticFile("sounds/reveal.wav")} volume={0.85} />
        </Sequence>
      ))}

      {/* ── TTS ─────────────────────────────────────────────────────────────── */}
      {/* Hook narration: "¿Sabes esta señal?" */}
      {items.map((it, i) => it.hookAudioFile ? (
        <Sequence key={`th-${i}`}
          from={starts[i] + 3}
          durationInFrames={Math.round((it.hookAudioDurationSec ?? 1.2) * FPS)}
        >
          <Audio src={staticFile(it.hookAudioFile)} volume={1.0} />
        </Sequence>
      ) : null)}

      {/* Reveal narration: correct answer text */}
      {items.map((it, i) => it.revealAudioFile ? (
        <Sequence key={`tr-${i}`}
          from={starts[i] + PH.CHECK_AT}
          durationInFrames={Math.round((it.revealAudioDurationSec ?? 1.5) * FPS)}
        >
          <Audio src={staticFile(it.revealAudioFile)} volume={1.0} />
        </Sequence>
      ) : null)}

      {/* Outro TTS */}
      {outroAudioFile && (
        <Sequence
          from={totalQFrames + 6}
          durationInFrames={Math.round((outroAudioDurationSec ?? 2) * FPS)}
        >
          <Audio src={staticFile(outroAudioFile)} volume={1.0} />
        </Sequence>
      )}

    </AbsoluteFill>
  );
};
