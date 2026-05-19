/**
 * QuizQuestionTemplate — viral format for DGT/ПДД test questions (text-only, no sign).
 *
 * Per question structure:
 *   HOOK  (0–22f):  big hook text punch-in + percent badge
 *   QFADE (22–42f): hook fades, question + options fade in
 *   TIMER (42–87f): 3-2-1 countdown + progress bar (suspense)
 *   CURSOR(87–105f): cursor flies to correct answer
 *   CLICK (107f):   cursor click
 *   CHECK (113f+):  answer revealed + TTS narration + explanation
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, Audio, Sequence, staticFile } from "remotion";

// ── Public types ───────────────────────────────────────────────────────────────
export interface QuizQuestionItem {
  question: string;
  options: string[];
  correct_idx: number;
  explanation?: string;          // short explanation shown after reveal
  category?: string;             // e.g. "Señales", "Velocidad", "Prioridad"
  hookText?: string;             // e.g. "¿APROBARÍAS EL EXAMEN?"
  percentCorrect?: number;       // 0-100 → shows "X% falla esto"
  hookAudioFile?: string;
  hookAudioDurationSec?: number;
  revealAudioFile?: string;
  revealAudioDurationSec?: number;
}

export interface QuizQuestionProps {
  items: QuizQuestionItem[];
  outroAudioFile?: string;
  outroAudioDurationSec?: number;
  ctaText?: string;
  lang?: "es" | "ru";           // affects color scheme & fallback texts
}

// ── Constants ──────────────────────────────────────────────────────────────────
const FPS = 30;
const W   = 1080;
const H   = 1920;

const BASE_Q_FRAMES = 155;
const OUTRO_FRAMES  = 135;

const PH = {
  PUNCH_END:    22,
  QFADE_START:  22,
  QFADE_END:    42,
  SUSPENSE_END: 87,
  CURSOR_END:   105,
  CLICK_AT:     107,
  CHECK_AT:     113,
} as const;

const REVEAL_HOLD_F = 18;

const PAD_X      = 65;
const OPTION_H   = 165;
const OPTION_R   = 26;

function qFrames(item: QuizQuestionItem): number {
  const revF = Math.ceil((item.revealAudioDurationSec ?? 0.8) * FPS);
  return Math.max(BASE_Q_FRAMES, PH.CHECK_AT + revF + REVEAL_HOLD_F);
}

export function calcQuizQuestionFrames(items: QuizQuestionItem[]): number {
  return items.reduce((s, it) => s + qFrames(it), 0) + OUTRO_FRAMES;
}

// ── Animations ─────────────────────────────────────────────────────────────────
function easeOut(t: number)  { return 1 - Math.pow(1 - t, 2.5); }
function smooth(t: number)   { return t * t * (3 - 2 * t); }
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

function cursorTarget(oi: number, optionsTop: number) {
  const y = optionsTop + oi * OPTION_H + (OPTION_H - 25) / 2;
  return { x: PAD_X + 32 + OPTION_R - 18, y: y - 22 };
}

// ── Cursor SVG ──────────────────────────────────────────────────────────────────
function Cursor({ x, y, scale }: { x: number; y: number; scale: number }) {
  const SZ = 66;
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      width: SZ, height: Math.round(SZ * 1.35),
      pointerEvents: "none",
      transform: `scale(${scale})`,
      transformOrigin: "5px 3px",
      filter: "drop-shadow(5px 9px 14px rgba(0,0,0,0.52)) drop-shadow(2px 4px 6px rgba(0,0,0,0.30))",
    }}>
      <svg width={SZ} height={Math.round(SZ * 1.35)} viewBox="0 0 22 30" fill="none">
        <path d="M 3 1 L 3 21 L 7.5 16.5 L 10.5 25.5 L 13.5 24 L 10.5 15 L 18 15 Z"
          stroke="rgba(255,255,255,0.92)" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />
        <path d="M 3 1 L 3 21 L 7.5 16.5 L 10.5 25.5 L 13.5 24 L 10.5 15 L 18 15 Z"
          fill="#141414" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── Timer components ────────────────────────────────────────────────────────────
function TimerBar({ frame, accent }: { frame: number; accent: string }) {
  if (frame < PH.QFADE_END || frame >= PH.SUSPENSE_END) return null;
  const progress = 1 - (frame - PH.QFADE_END) / (PH.SUSPENSE_END - PH.QFADE_END);
  const color = progress > 0.5 ? "#22c55e" : progress > 0.25 ? "#f59e0b" : accent;
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: "rgba(0,0,0,0.08)" }}>
      <div style={{
        height: "100%", width: `${progress * 100}%`, background: color,
        borderRadius: "0 6px 6px 0", boxShadow: `0 0 12px ${color}88`,
      }} />
    </div>
  );
}

function TimerBeat({ frame, beat, atF }: { frame: number; beat: number; atF: number }) {
  const f = frame - atF;
  if (f < 0 || f >= 15) return null;
  const popIn = anim(f, 0, 6, 0, 1, "back");
  const fadeOut = anim(f, 9, 15, 1, 0);
  const scale = anim(f, 0, 6, 1.6, 1.0, "out");
  return (
    <div style={{
      position: "absolute", bottom: 185, left: 0, right: 0,
      textAlign: "center", fontFamily: "system-ui, sans-serif",
      fontWeight: 900, fontSize: 200,
      color: beat === 1 ? "#b81111" : "#1a1a1a",
      opacity: popIn * fadeOut, transform: `scale(${scale})`,
      transformOrigin: "center", lineHeight: 1,
      textShadow: beat === 1 ? "0 0 60px rgba(184,17,17,0.35)" : "0 8px 24px rgba(0,0,0,0.12)",
    }}>
      {beat}
    </div>
  );
}

// ── Question scene ──────────────────────────────────────────────────────────────
function QuestionScene({
  item, frame, accent, total, qi,
}: {
  item: QuizQuestionItem;
  frame: number;
  accent: string;
  total: number;
  qi: number;
}) {
  const hookText = item.hookText ?? "¿APROBARÍAS EL EXAMEN?";
  const hookFontSize = hookText.length > 22 ? 60 : hookText.length > 16 ? 70 : 78;
  const failPct = item.percentCorrect != null ? 100 - item.percentCorrect : null;

  // Question text area: starts at y=300, taller since no sign
  const QUESTION_Y  = 300;
  const OPTIONS_TOP = QUESTION_Y + 370;

  // ── Hook ────────────────────────────────────────────────────────────────────
  const hookIn  = anim(frame, 2, 16, 0, 1, "back");
  const hookOut = anim(frame, PH.QFADE_START, PH.QFADE_END, 1, 0);
  const hookOp  = hookIn * hookOut;
  const hookShake = frame < 22 ? Math.sin(frame / 2.2) * Math.max(0, 22 - frame) * 0.4 : 0;
  const pctOp   = failPct != null ? anim(frame, 10, 22, 0, 1) * hookOut : 0;

  // ── Category badge ──────────────────────────────────────────────────────────
  const badgeOp = anim(frame, 0, 12, 0, 1);

  // ── Question + options ──────────────────────────────────────────────────────
  const qOp = anim(frame, PH.QFADE_START, PH.QFADE_END, 0, 1);
  const qTy = anim(frame, PH.QFADE_START, PH.QFADE_END, 20, 0);
  const susF  = Math.max(0, frame - PH.QFADE_END);
  const pulse = 1 + Math.sin(susF / 9) * 0.006;

  // ── Mark correct ────────────────────────────────────────────────────────────
  const marked     = frame >= PH.CHECK_AT;
  const checkScale = marked ? anim(frame, PH.CHECK_AT, PH.CHECK_AT + 11, 0, 1, "back") : 0;
  const explOp     = item.explanation ? anim(frame, PH.CHECK_AT + 12, PH.CHECK_AT + 28, 0, 1) : 0;

  // ── Cursor ───────────────────────────────────────────────────────────────────
  const target = cursorTarget(item.correct_idx, OPTIONS_TOP);
  const CUR_X0 = W + 90, CUR_Y0 = 300;
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
      <TimerBar frame={frame} accent={accent} />

      {/* Category badge top-left */}
      {item.category && (
        <div style={{
          position: "absolute", top: 38, left: 50,
          opacity: badgeOp,
          fontSize: 24, fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          color: accent, letterSpacing: 2,
          padding: "10px 22px",
          background: `${accent}18`,
          border: `2.5px solid ${accent}`,
          borderRadius: 32,
          textTransform: "uppercase",
        }}>
          {item.category}
        </div>
      )}

      {/* Counter top-right */}
      <div style={{
        position: "absolute", top: 38, right: 50,
        fontSize: 26, fontWeight: 800,
        color: accent, fontFamily: "system-ui, sans-serif",
        letterSpacing: 3, padding: "10px 22px",
        background: `${accent}14`, border: `2.5px solid ${accent}`,
        borderRadius: 32,
      }}>
        {qi + 1} / {total}
      </div>

      {/* Big hook text */}
      <div style={{
        position: "absolute",
        top: H * 0.22, left: 0, right: 0,
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
        fontWeight: 900,
        fontSize: hookFontSize,
        color: accent,
        letterSpacing: 1,
        opacity: hookOp,
        transform: `translateX(${hookShake}px) rotate(-1.5deg)`,
        textShadow: `0 6px 16px ${accent}38`,
        lineHeight: 1.1,
        padding: "0 50px",
      }}>
        {hookText}
      </div>

      {/* Percent badge */}
      {failPct != null && (
        <div style={{
          position: "absolute",
          top: H * 0.22 + hookFontSize * 1.3 + 14,
          left: 0, right: 0,
          textAlign: "center",
          opacity: pctOp,
          fontFamily: "system-ui, sans-serif",
          fontWeight: 800, fontSize: 46,
          color: "#1a1a1a", letterSpacing: 1,
        }}>
          <span style={{ color: accent }}>{failPct}%</span> lo falla 👀
        </div>
      )}

      {/* Question text */}
      <div style={{
        position: "absolute",
        top: QUESTION_Y, left: PAD_X, right: PAD_X,
        opacity: qOp, transform: `translateY(${qTy}px)`,
        fontFamily: "system-ui, sans-serif",
        fontWeight: 700, fontSize: 52,
        color: "#1a1a1a", textAlign: "center",
        borderBottom: `3px solid ${accent}`,
        paddingBottom: 18, lineHeight: 1.25,
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
            height: OPTION_H - 22,
            display: "flex", alignItems: "center", gap: 26,
            opacity: optOp,
            transform: `translateX(${optTx}px) scale(${popScale * pulse})`,
            transformOrigin: "center left",
            padding: "0 32px", borderRadius: 26,
            background: selected ? "#1b4ed814" : "transparent",
            border: selected ? "2.5px solid #1b4ed888" : "2.5px solid transparent",
            boxShadow: selected ? "0 8px 26px #1b4ed82e" : "none",
          }}>
            <div style={{
              width: OPTION_R * 2, height: OPTION_R * 2,
              borderRadius: "50%",
              border: `3px solid ${selected ? "#1b4ed8" : "#555"}`,
              backgroundColor: selected ? "#1b4ed8" : "transparent",
              flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: selected ? "0 0 0 7px #1b4ed824" : "none",
            }}>
              {selected && (
                <div style={{
                  fontSize: 32, color: "#fff", fontWeight: 900, lineHeight: 1,
                  transform: `scale(${checkScale})`, transformOrigin: "center",
                }}>✓</div>
              )}
            </div>
            <div style={{
              fontSize: 40, fontWeight: selected ? 800 : 500,
              color: selected ? "#1b4ed8" : "#1a1a1a",
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.25, flex: 1,
            }}>
              {opt}
            </div>
          </div>
        );
      })}

      {/* Explanation after reveal */}
      {item.explanation && (
        <div style={{
          position: "absolute",
          top: OPTIONS_TOP + item.options.length * OPTION_H + 10,
          left: PAD_X, right: PAD_X,
          opacity: explOp,
          fontFamily: "system-ui, sans-serif",
          fontSize: 36, fontWeight: 500,
          color: "#555", textAlign: "center",
          lineHeight: 1.35,
          padding: "18px 24px",
          background: "rgba(0,0,0,0.04)",
          borderRadius: 20,
          borderLeft: `4px solid ${accent}`,
        }}>
          {item.explanation}
        </div>
      )}

      {/* 3-2-1 countdown */}
      <TimerBeat frame={frame} beat={3} atF={PH.QFADE_END} />
      <TimerBeat frame={frame} beat={2} atF={PH.QFADE_END + 15} />
      <TimerBeat frame={frame} beat={1} atF={PH.QFADE_END + 30} />

      {/* Cursor */}
      {frame >= PH.SUSPENSE_END && (
        <Cursor x={cx} y={cy} scale={cScale} />
      )}
    </AbsoluteFill>
  );
}

// ── Main composition ────────────────────────────────────────────────────────────
export const QuizQuestionTemplate: React.FC<QuizQuestionProps> = ({
  items,
  outroAudioFile,
  outroAudioDurationSec,
  ctaText,
  lang = "es",
}) => {
  const frame = useCurrentFrame();
  const total = items.length;
  const accent = "#b81111";

  const defaultCta = lang === "ru"
    ? "Учи ПДД в Skily — это бесплатно"
    : "Prepárate para el examen DGT con Skily";

  const starts: number[] = [];
  let acc = 0;
  for (let i = 0; i < total; i++) {
    starts.push(acc);
    acc += qFrames(items[i]);
  }
  const totalQFrames = acc;
  const isOutro = frame >= totalQFrames;

  let qi = total - 1;
  for (let i = 0; i < total; i++) {
    const next = i + 1 < total ? starts[i + 1] : totalQFrames;
    if (frame >= starts[i] && frame < next) { qi = i; break; }
  }
  const qFrame  = frame - starts[qi];
  const myQDur  = qFrames(items[qi]);
  const xfadeOp = qFrame >= myQDur - 8 ? anim(qFrame, myQDur - 8, myQDur, 1, 0) : 1;

  const outroF     = frame - totalQFrames;
  const outroOp    = anim(outroF, 0, 14, 0, 1);
  const skilyScale = anim(outroF, 0, 22, 0.6, 1, "back");

  return (
    <AbsoluteFill>

      {/* Background */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(175deg, #fdfcf9 0%, #f4f1ea 100%)",
      }} />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(180deg, transparent 0px, transparent 37px, rgba(175,155,145,0.18) 37px, rgba(175,155,145,0.18) 38.5px)",
      }} />
      <div style={{
        position: "absolute", top: 0, bottom: 0, left: 38, width: 2,
        background: "rgba(170,35,35,0.28)", pointerEvents: "none",
      }} />

      {/* Question scene */}
      {!isOutro && (
        <AbsoluteFill style={{ opacity: xfadeOp }}>
          <QuestionScene
            item={items[qi]}
            frame={qFrame}
            accent={accent}
            total={total}
            qi={qi}
          />
        </AbsoluteFill>
      )}

      {/* Outro */}
      {isOutro && (
        <AbsoluteFill style={{
          opacity: outroOp,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 38,
        }}>
          <div style={{
            fontSize: 24, fontWeight: 600, color: "#888",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: 6, textTransform: "uppercase",
          }}>powered by</div>
          <div style={{
            fontSize: 120, fontWeight: 900, color: accent,
            fontFamily: "system-ui, sans-serif", letterSpacing: 10,
            transform: `scale(${skilyScale})`,
            textShadow: "0 8px 28px rgba(184,17,17,0.30)", lineHeight: 1,
          }}>SKILY</div>
          <div style={{
            fontSize: 38, color: "#1a1a1a",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 500, maxWidth: 880,
            textAlign: "center", lineHeight: 1.3,
            opacity: anim(outroF, 14, 30, 0, 1),
          }}>
            {ctaText ?? defaultCta}
          </div>
          <div style={{
            fontSize: 36, fontWeight: 800, color: accent,
            fontFamily: "system-ui, sans-serif", letterSpacing: 3,
            opacity: anim(outroF, 22, 40, 0, 1),
            padding: "14px 38px", background: `${accent}1a`,
            border: `3px solid ${accent}`, borderRadius: 40,
          }}>
            skilyapp.com
          </div>
        </AbsoluteFill>
      )}

      {/* Sound effects */}
      {items.map((_, i) => (
        <Sequence key={`wh-${i}`} from={starts[i]} durationInFrames={14}>
          <Audio src={staticFile("sounds/whoosh.wav")} volume={0.75} />
        </Sequence>
      ))}
      {items.flatMap((_, i) =>
        [0, 14, 28].map((dt, k) => (
          <Sequence key={`tk-${i}-${k}`} from={starts[i] + PH.QFADE_END + 6 + dt} durationInFrames={5}>
            <Audio src={staticFile("sounds/tick.wav")} volume={0.40} />
          </Sequence>
        ))
      )}
      {items.map((_, i) => (
        <Sequence key={`rv-${i}`} from={starts[i] + PH.CLICK_AT} durationInFrames={22}>
          <Audio src={staticFile("sounds/reveal.wav")} volume={0.85} />
        </Sequence>
      ))}

      {/* TTS */}
      {items.map((it, i) => it.hookAudioFile ? (
        <Sequence key={`th-${i}`} from={starts[i] + 3}
          durationInFrames={Math.round((it.hookAudioDurationSec ?? 1.2) * FPS)}>
          <Audio src={staticFile(it.hookAudioFile)} volume={1.0} />
        </Sequence>
      ) : null)}
      {items.map((it, i) => it.revealAudioFile ? (
        <Sequence key={`tr-${i}`} from={starts[i] + PH.CHECK_AT}
          durationInFrames={Math.round((it.revealAudioDurationSec ?? 1.5) * FPS)}>
          <Audio src={staticFile(it.revealAudioFile)} volume={1.0} />
        </Sequence>
      ) : null)}
      {outroAudioFile && (
        <Sequence from={totalQFrames + 6}
          durationInFrames={Math.round((outroAudioDurationSec ?? 2) * FPS)}>
          <Audio src={staticFile(outroAudioFile)} volume={1.0} />
        </Sequence>
      )}

    </AbsoluteFill>
  );
};
