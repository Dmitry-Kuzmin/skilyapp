/**
 * QuizSheetTemplate — paper-style quiz sheet with animated cursor.
 * Completely independent from VideoTemplate — do not import from types.ts.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, Img } from "remotion";

// ── Public types ───────────────────────────────────────────────────────────────
export interface QuizSheetItem {
  question: string;
  sign_url: string | null;
  options: string[];
  correct_idx: number; // 0-based index into options[]
}

export interface QuizSheetProps {
  items: QuizSheetItem[];
  title?: string;
  subtitle?: string;
}

// ── Layout constants ───────────────────────────────────────────────────────────
const FPS        = 30;
const W          = 1080;
const H          = 1920;
const HEADER_H   = 138;
const FOOTER_H   = 88;
const CONTENT_H  = H - HEADER_H - FOOTER_H; // 1694
const PAD        = 52;
const SIGN_SIZE  = 182;
const COL_L      = PAD + SIGN_SIZE + 26;  // left edge of text column
const COL_W      = W - COL_L - PAD;       // width of text column
const Q_LINE_H   = 72;                    // question text row height
const OPT_H      = 74;                    // height per option row
const BLOCK_H    = Q_LINE_H + 3 * OPT_H; // 294 — total text content block
const OPT_R      = 20;                    // radio circle radius

// ── Per-question timing (frames from video start) ──────────────────────────────
const INTRO_F = 14;
const Q_DUR_F = 138; // 4.6 s per question @ 30 fps

function qTiming(i: number) {
  const b = INTRO_F + i * Q_DUR_F;
  return {
    appear:      b,
    optsStart:   b + 13,
    cursorStart: b + 29,
    cursorEnd:   b + 65,   // cursor arrives
    clickAt:     b + 71,
    checkAt:     b + 77,
  };
}

/** Total frames for n questions. Export so Root.tsx can use calculateMetadata. */
export function calcQuizSheetFrames(n: number): number {
  const last = qTiming(n - 1);
  return last.checkAt + 96; // ~3.2 s outro
}

// ── Animation helpers ──────────────────────────────────────────────────────────
function smoothStep(t: number) { return t * t * (3 - 2 * t); }
function easeOut(t: number)    { return 1 - Math.pow(1 - t, 2.5); }

function anim(
  frame: number, f0: number, f1: number,
  v0: number, v1: number,
  ease: "out" | "smooth" = "out",
): number {
  if (frame <= f0) return v0;
  if (frame >= f1) return v1;
  const t = (frame - f0) / (f1 - f0);
  return v0 + (ease === "smooth" ? smoothStep(t) : easeOut(t)) * (v1 - v0);
}

// ── Cursor target: pixel position of cursor TIP pointing at radio circle ───────
function cursorTarget(qi: number, correct_idx: number, total: number) {
  const rowH     = CONTENT_H / total;
  const rowY     = HEADER_H + qi * rowH;
  const blockTop = rowY + (rowH - BLOCK_H) / 2;
  const optsTop  = blockTop + Q_LINE_H;
  const cy       = optsTop + correct_idx * OPT_H + OPT_H / 2;
  const cx       = COL_L + OPT_R;
  return { x: cx - 17, y: cy - 19 }; // offset so SVG tip aligns with circle
}

// ── SVG cursor arrow ──────────────────────────────────────────────────────────
function CursorArrow({ x, y, scale }: { x: number; y: number; scale: number }) {
  const SZ = 54;
  return (
    <div style={{
      position: "absolute",
      left: x,
      top: y,
      width: SZ,
      height: Math.round(SZ * 1.35),
      pointerEvents: "none",
      transform: `scale(${scale})`,
      transformOrigin: "4px 2px",
      filter: [
        "drop-shadow(4px 7px 12px rgba(0,0,0,0.52))",
        "drop-shadow(2px 3px 5px rgba(0,0,0,0.28))",
      ].join(" "),
    }}>
      <svg width={SZ} height={Math.round(SZ * 1.35)} viewBox="0 0 22 30" fill="none">
        {/* White outline for contrast on any background */}
        <path
          d="M 3 1 L 3 21 L 7.5 16.5 L 10.5 25.5 L 13.5 24 L 10.5 15 L 18 15 Z"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Dark cursor body */}
        <path
          d="M 3 1 L 3 21 L 7.5 16.5 L 10.5 25.5 L 13.5 24 L 10.5 15 L 18 15 Z"
          fill="#141414"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ── Question row ───────────────────────────────────────────────────────────────
function QuestionRow({
  item, qi, total, frame,
}: {
  item: QuizSheetItem;
  qi: number;
  total: number;
  frame: number;
}) {
  const t        = qTiming(qi);
  const rowH     = CONTENT_H / total;
  const rowY     = HEADER_H + qi * rowH;
  const blockTop = rowY + (rowH - BLOCK_H) / 2;
  const optsTop  = blockTop + Q_LINE_H;

  const rowOp = anim(frame, t.appear, t.appear + 12, 0, 1);
  const rowTy = anim(frame, t.appear, t.appear + 14, 22, 0);
  const marked = frame >= t.checkAt;

  return (
    <div style={{
      position: "absolute",
      left: 0,
      top: rowY,
      width: W,
      height: rowH,
      opacity: rowOp,
      transform: `translateY(${rowTy}px)`,
    }}>

      {/* Row separator (skip for first row) */}
      {qi > 0 && (
        <div style={{
          position: "absolute",
          top: 0, left: PAD, right: PAD,
          height: 1.5,
          background: "#c8bdb5",
        }} />
      )}

      {/* Sign circle */}
      <div style={{
        position: "absolute",
        left: PAD,
        top: rowH / 2 - SIGN_SIZE / 2,
        width: SIGN_SIZE,
        height: SIGN_SIZE,
        borderRadius: "50%",
        overflow: "hidden",
        border: "3.5px solid #b81111",
        backgroundColor: "#ffffff",
        boxShadow: "0 4px 18px rgba(0,0,0,0.17), 0 0 0 1px rgba(0,0,0,0.05)",
      }}>
        {item.sign_url
          ? <Img src={item.sign_url} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
          : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 68, color: "#666" }}>?</div>
          )
        }
      </div>

      {/* Question text with red underline */}
      <div style={{
        position: "absolute",
        left: COL_L,
        top: blockTop,
        width: COL_W,
        height: Q_LINE_H,
        display: "flex",
        alignItems: "flex-end",
        paddingBottom: 8,
        borderBottom: "2.5px solid #b81111",
        fontFamily: "system-ui, sans-serif",
        fontSize: 30,
        fontWeight: 700,
        color: "#1a1a1a",
        lineHeight: 1.2,
        overflow: "hidden",
      }}>
        {qi + 1}{")"} {item.question}
      </div>

      {/* Answer options */}
      {item.options.map((opt, oi) => {
        const optF      = t.optsStart + oi * 7;
        const optOp     = anim(frame, optF, optF + 8, 0, 1);
        const isCorrect = oi === item.correct_idx;
        const selected  = marked && isCorrect;
        const checkS    = selected ? anim(frame, t.checkAt, t.checkAt + 9, 0, 1) : 0;

        return (
          <div key={oi} style={{
            position: "absolute",
            left: COL_L,
            top: optsTop + oi * OPT_H,
            width: COL_W,
            height: OPT_H,
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: optOp,
          }}>
            {/* Radio circle */}
            <div style={{
              width: OPT_R * 2,
              height: OPT_R * 2,
              borderRadius: "50%",
              border: `2.5px solid ${selected ? "#1b4ed8" : "#5a5a5a"}`,
              backgroundColor: selected ? "#1b4ed8" : "transparent",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: selected ? "0 0 0 5px rgba(27,78,216,0.17)" : "none",
            }}>
              {selected && (
                <div style={{
                  fontSize: 22,
                  color: "#fff",
                  fontWeight: 900,
                  lineHeight: 1,
                  transform: `scale(${checkS})`,
                  transformOrigin: "center",
                }}>✓</div>
              )}
            </div>

            {/* Option text */}
            <div style={{
              fontSize: 28,
              fontWeight: selected ? 700 : 400,
              color: selected ? "#1b4ed8" : "#1a1a1a",
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.3,
            }}>
              {opt}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main composition ───────────────────────────────────────────────────────────
export const QuizSheetTemplate: React.FC<QuizSheetProps> = ({
  items,
  title    = "SEÑALES DE TRÁFICO",
  subtitle = "¿Sabes qué significa esta señal?",
}) => {
  const frame = useCurrentFrame();
  const total = items.length;

  // ── Cursor position ──────────────────────────────────────────────────────────
  const OFF_X = W + 72;
  const OFF_Y = 360;
  let cx = OFF_X, cy = OFF_Y, cScale = 1;

  for (let i = 0; i < total; i++) {
    const t    = qTiming(i);
    const tgt  = cursorTarget(i, items[i].correct_idx, total);
    const px   = i === 0 ? OFF_X : cursorTarget(i - 1, items[i - 1].correct_idx, total).x;
    const py   = i === 0 ? OFF_Y : cursorTarget(i - 1, items[i - 1].correct_idx, total).y;

    if (frame >= t.cursorStart) {
      cx = anim(frame, t.cursorStart, t.cursorEnd, px, tgt.x, "smooth");
      cy = anim(frame, t.cursorStart, t.cursorEnd, py, tgt.y, "smooth");
      if (frame >= t.cursorEnd) { cx = tgt.x; cy = tgt.y; }
      if (frame >= t.clickAt && frame < t.clickAt + 14) {
        cScale = 1 - Math.sin(((frame - t.clickAt) / 14) * Math.PI) * 0.22;
      }
    }
  }

  // Outro: cursor slides off right
  const lastT    = qTiming(total - 1);
  const outroF   = lastT.checkAt + 34;
  const lastTgt  = cursorTarget(total - 1, items[total - 1].correct_idx, total);
  if (frame >= outroF) {
    cx     = anim(frame, outroF, outroF + 42, lastTgt.x, W + 100, "smooth");
    cy     = anim(frame, outroF, outroF + 42, lastTgt.y, lastTgt.y - 36, "smooth");
    cScale = anim(frame, outroF + 30, outroF + 42, 1, 0, "out");
  }

  const headerOp = anim(frame, 0, 10, 0, 1);
  const headerTy = anim(frame, 0, 12, -24, 0);
  const footerOp = anim(frame, 10, 22, 0, 1);

  return (
    <AbsoluteFill>

      {/* Paper background */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(175deg, #fdfcf9 0%, #f4f1ea 100%)",
      }} />

      {/* Ruled notebook lines */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(180deg, transparent 0px, transparent 37px, rgba(175,155,145,0.20) 37px, rgba(175,155,145,0.20) 38.5px)",
      }} />

      {/* Red left margin line (Spanish cuaderno) */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, left: 36, width: 2,
        background: "rgba(170,35,35,0.32)", pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: HEADER_H,
        background: "linear-gradient(180deg, #fdfcf9 65%, rgba(253,252,249,0))",
        borderBottom: "3px solid #b81111",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        opacity: headerOp,
        transform: `translateY(${headerTy}px)`,
        zIndex: 2,
      }}>
        <div style={{
          fontSize: 44,
          fontWeight: 900,
          color: "#b81111",
          fontFamily: "system-ui, sans-serif",
          letterSpacing: 5,
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 25,
          color: "#666",
          fontFamily: "system-ui, sans-serif",
          letterSpacing: 0.5,
        }}>
          {subtitle}
        </div>
      </div>

      {/* Question rows */}
      {items.map((item, i) => (
        <QuestionRow key={i} item={item} qi={i} total={total} frame={frame} />
      ))}

      {/* Footer */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: FOOTER_H,
        borderTop: "2px solid #d8cfc7",
        background: "linear-gradient(0deg, #fdfcf9 65%, rgba(253,252,249,0))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: footerOp,
        zIndex: 2,
      }}>
        <div style={{
          fontSize: 30,
          fontWeight: 700,
          color: "#b81111",
          fontFamily: "system-ui, sans-serif",
          letterSpacing: 2,
        }}>
          skilyapp.com
        </div>
      </div>

      {/* Cursor — always on top */}
      <CursorArrow x={cx} y={cy} scale={cScale} />

    </AbsoluteFill>
  );
};
