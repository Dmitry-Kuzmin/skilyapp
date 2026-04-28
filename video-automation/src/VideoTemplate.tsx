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

  const op        = lerp(sceneF, 0, 8, 0, 1);
  const badgeOp   = lerp(sceneF, 2, 14, 0, 1);
  const badgeTy   = lerp(sceneF, 2, 14, -50, 0);
  const hookOp    = lerp(sceneF, 8, 20, 0, 1);
  const hookScale = lerp(sceneF, 8, 22, 0.7, 1);
  const bottomOp  = lerp(sceneF, 14, 26, 0, 1);
  const bottomTy  = lerp(sceneF, 14, 26, 50, 0);
  // Лёгкая пульсация хука
  const hookPulse = 1 + Math.sin(sceneF / 14) * 0.012;

  const isEs = q.language === "es";
  const diffColors = { easy: C.emerald, medium: "#F0883E", hard: C.red };
  const diffLabels = {
    ru: { easy: "ЛЁГКИЙ", medium: "СРЕДНИЙ", hard: "СЛОЖНЫЙ" },
    es: { easy: "FÁCIL",  medium: "MEDIO",   hard: "DIFÍCIL" },
  };

  return (
    <div style={{ position:"absolute", inset:0, opacity: op, display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center" }}>

      {/* Многослойный фоновый градиент */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
        <div style={{
          position:"absolute", inset:0,
          background:"radial-gradient(ellipse 100% 70% at 50% 20%, rgba(47,129,247,0.22) 0%, transparent 70%)",
        }} />
        <div style={{
          position:"absolute", inset:0,
          background:"radial-gradient(ellipse 60% 50% at 50% 90%, rgba(47,129,247,0.10) 0%, transparent 60%)",
        }} />
      </div>

      {/* Декоративные вертикальные линии */}
      {[-220, -80, 80, 220].map((x, i) => (
        <div key={i} style={{
          position:"absolute",
          left:"50%", bottom:0,
          width:2 + (i % 2) * 2,
          height:`${20 + i * 8}%`,
          background:`linear-gradient(to top, rgba(47,129,247,${0.12 - i * 0.02}), transparent)`,
          borderRadius:4,
          transform:`translateX(${x}px)`,
        }} />
      ))}

      {/* Горизонтальная линия-разделитель вверху */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:3,
        background:"linear-gradient(90deg, transparent 0%, #2F81F7 30%, #7C3AED 70%, transparent 100%)",
        opacity:0.8,
      }} />

      {/* TOP: DGT exam badge */}
      <div style={{ opacity: badgeOp, transform:`translateY(${badgeTy}px)`,
        display:"flex", flexDirection:"column", alignItems:"center", gap:16, marginBottom:52 }}>

        <div style={{
          display:"flex", alignItems:"center", gap:18,
          background:"rgba(47,129,247,0.10)",
          border:"1.5px solid rgba(47,129,247,0.35)",
          borderRadius:100,
          padding:"12px 32px",
          boxShadow:"0 0 30px rgba(47,129,247,0.15)",
        }}>
          <span style={{ fontSize:36 }}>🇪🇸</span>
          <span style={{ fontSize:28, fontWeight:900, color:"#fff", letterSpacing:3,
            fontFamily:"system-ui,sans-serif",
            textShadow:"0 0 20px rgba(47,129,247,0.5)" }}>
            {isEs ? "EXAMEN DGT" : "ТЕСТ: ПДД ИСПАНИИ"}
          </span>
          <span style={{ fontSize:36 }}>🚗</span>
        </div>

        <div style={{ fontSize:26, color:"rgba(255,255,255,0.5)",
          fontFamily:"system-ui,sans-serif", letterSpacing:1 }}>
          {isEs ? "¿Conoces las normas de tráfico?" : "Знаешь испанские правила? 🤔"}
        </div>
      </div>

      {/* CENTRE: Hook title с неоновым glow */}
      <div style={{
        opacity: hookOp,
        transform:`scale(${hookScale * hookPulse})`,
        fontSize: q.hook_title.length > 22 ? 70 : 82,
        fontWeight:900,
        color:"#fff",
        textAlign:"center",
        lineHeight:1.15,
        fontFamily:"system-ui,sans-serif",
        letterSpacing:-1,
        padding:"0 60px",
        textShadow:[
          "0 0 40px rgba(47,129,247,0.9)",
          "0 0 80px rgba(47,129,247,0.5)",
          "0 0 160px rgba(47,129,247,0.25)",
          "0 4px 20px rgba(0,0,0,0.95)",
        ].join(", "),
      }}>
        {q.hook_title}
      </div>

      {/* BOTTOM: difficulty + series + branding */}
      <div style={{ opacity: bottomOp, transform:`translateY(${bottomTy}px)`,
        marginTop:56, display:"flex", alignItems:"center", gap:20 }}>

        <div style={{
          padding:"10px 26px", borderRadius:100,
          backgroundColor:`${diffColors[q.difficulty]}18`,
          border:`1.5px solid ${diffColors[q.difficulty]}55`,
          color: diffColors[q.difficulty],
          fontSize:22, fontWeight:800, letterSpacing:3,
          fontFamily:"system-ui,sans-serif",
          boxShadow:`0 0 16px ${diffColors[q.difficulty]}30`,
        }}>
          {diffLabels[q.language][q.difficulty]}
        </div>

        <div style={{ width:5, height:5, borderRadius:"50%", background:"rgba(255,255,255,0.2)" }} />

        <div style={{ fontSize:22, color:"rgba(255,255,255,0.3)",
          fontFamily:"system-ui,sans-serif", letterSpacing:2 }}>
          #{String(q.series_number).padStart(3,"0")}
        </div>

        <div style={{ width:5, height:5, borderRadius:"50%", background:"rgba(255,255,255,0.2)" }} />

        <div style={{ fontSize:22, color:"rgba(47,129,247,0.8)",
          fontFamily:"system-ui,sans-serif", fontWeight:700,
          textShadow:"0 0 12px rgba(47,129,247,0.5)" }}>
          skilyapp.com
        </div>
      </div>

      {/* Нижняя градиентная полоска */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0, height:3,
        background:"linear-gradient(90deg, transparent 0%, rgba(47,129,247,0.6) 50%, transparent 100%)",
        opacity: bottomOp,
      }} />
    </div>
  );
}

// ─── FlashScene (заменяет CountdownScene) ────────────────────────────────────
// Вместо отсчёта 3-2-1 — мгновенный флэш-удар 1 сек: яркая вспышка + "?" влетает.
// Соцсети: зрители листают быстро, счёт никто не ждёт.
function CountdownScene({ q, t }: { q: VideoQuestion; t: DynamicTiming }) {
  const frame  = useCurrentFrame();
  const sceneF = frame - t.countdownStart * FPS;
  const DUR    = 1 * FPS; // 30 frames = 1 сек

  // Белая вспышка: ярко вначале → гаснет к середине
  const flashOp = lerp(sceneF, 0, DUR * 0.45, 0.95, 0);

  // "?" влетает с масштабом + уходит
  const qOp    = lerp(sceneF, 2, 10, 0, 1) * lerp(sceneF, DUR * 0.55, DUR, 1, 0);
  const qScale = lerp(sceneF, 2, 12, 2.2, 1);

  // Текст-подсказка снизу
  const hintOp = lerp(sceneF, 6, 16, 0, 1) * lerp(sceneF, DUR * 0.6, DUR, 1, 0);

  return (
    <div style={{ position:"absolute", inset:0, display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center" }}>

      {/* Белая вспышка */}
      <div style={{
        position:"absolute", inset:0,
        background:"linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(200,220,255,1) 100%)",
        opacity: flashOp,
        pointerEvents:"none",
      }} />

      {/* Синяя окантовка-вспышка */}
      <div style={{
        position:"absolute", inset:0,
        background:"radial-gradient(ellipse at 50% 50%, rgba(47,129,247,0.35) 0%, transparent 65%)",
        opacity: flashOp * 1.2,
        pointerEvents:"none",
      }} />

      {/* Большой "?" */}
      <div style={{
        fontSize: 280,
        fontWeight: 900,
        color: "#2F81F7",
        opacity: qOp,
        transform: `scale(${qScale})`,
        fontFamily: "system-ui,sans-serif",
        lineHeight: 1,
        textShadow: [
          "0 0 60px rgba(47,129,247,0.9)",
          "0 0 120px rgba(47,129,247,0.5)",
          "0 8px 30px rgba(0,0,0,0.9)",
        ].join(", "),
      }}>
        ?
      </div>

      {/* Подсказка под "?" */}
      <div style={{
        fontSize: 36,
        fontWeight: 700,
        color: "rgba(255,255,255,0.7)",
        opacity: hintOp,
        fontFamily: "system-ui,sans-serif",
        letterSpacing: 6,
        textTransform: "uppercase",
        textShadow: "0 2px 12px rgba(0,0,0,0.8)",
        marginTop: 20,
      }}>
        {q.language === "ru" ? "читай вопрос ↓" : "lee la pregunta ↓"}
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
// Таймер плавает над изображением — контент полностью виден снизу (AnswersScene)
function SuspenseScene({ q, t }: { q: VideoQuestion; t: DynamicTiming }) {
  const frame    = useCurrentFrame();
  const sceneF   = frame - t.suspenseStart * FPS;
  const totalF   = (t.revealStart - t.suspenseStart) * FPS;
  const progress = Math.max(0, 1 - sceneF / totalF);
  const suspSecs = t.revealStart - t.suspenseStart;
  const secs     = Math.max(1, Math.ceil(progress * suspSecs));

  // Цвет: зелёный → оранжевый → красный
  const ringHue   = Math.round(120 * progress);
  const ringColor = `hsl(${ringHue}, 90%, 58%)`;
  const glowColor = `hsla(${ringHue}, 90%, 58%, 0.6)`;

  const widgetOp  = lerp(sceneF, 0, 10, 0, 1);
  const widgetTy  = lerp(sceneF, 0, 14, -20, 0);
  const pulseSpeed = 6 + (1 - progress) * 10;
  const numScale  = 1 + Math.sin(sceneF / pulseSpeed) * 0.06;
  const labelOp   = lerp(sceneF, 4, 18, 0, 1);

  const R = 74, SW = 9;
  const circ = 2 * Math.PI * R;

  // Позиция: над изображением (верхние ~36% экрана 1920px = ~690px)
  const timerTop = q.image_url ? 490 : 140;

  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>

      {/* Тонкая неоновая полоска прогресса вверху */}
      <div style={{
        position:"absolute", top:0, left:0,
        height:5,
        width:`${progress * 100}%`,
        background:`linear-gradient(90deg, ${ringColor} 0%, rgba(255,255,255,0.5) 100%)`,
        boxShadow:`0 0 14px 2px ${ringColor}99`,
        borderRadius:"0 3px 3px 0",
      }} />

      {/* Таймер-виджет над изображением */}
      <div style={{
        position:"absolute",
        top: timerTop,
        left:"50%",
        transform:`translateX(-50%) translateY(${widgetTy}px)`,
        opacity: widgetOp,
        display:"flex",
        flexDirection:"column",
        alignItems:"center",
        gap:16,
      }}>

        {/* "ДУМАЙТЕ!" над кольцом */}
        <div style={{
          opacity: labelOp,
          fontSize:46,
          fontWeight:900,
          color:"#fff",
          fontFamily:"system-ui,sans-serif",
          letterSpacing:6,
          textTransform:"uppercase",
          lineHeight:1,
          textShadow:`0 0 24px ${ringColor}, 0 2px 10px rgba(0,0,0,0.9)`,
          whiteSpace:"nowrap",
        }}>
          {UI_TEXT[q.language].think}
        </div>

        {/* Frosted pill — кольцо + цифра */}
        <div style={{
          position:"relative",
          width: R*2 + SW*2 + 40,
          height: R*2 + SW*2 + 40,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
        }}>
          {/* Frosted glass circle background */}
          <div style={{
            position:"absolute", inset:0,
            borderRadius:"50%",
            background:"rgba(0,0,0,0.55)",
            backdropFilter:"blur(18px)",
            WebkitBackdropFilter:"blur(18px)",
            border:`1px solid rgba(255,255,255,0.10)`,
            boxShadow:`0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset`,
          }} />

          {/* Ring SVG */}
          <svg
            width={R*2 + SW*2 + 40}
            height={R*2 + SW*2 + 40}
            style={{ position:"absolute", inset:0, transform:"rotate(-90deg)" }}
            overflow="visible"
          >
            {/* Track */}
            <circle
              cx={(R*2 + SW*2 + 40)/2} cy={(R*2 + SW*2 + 40)/2} r={R}
              fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={SW}
            />
            {/* Progress arc */}
            <circle
              cx={(R*2 + SW*2 + 40)/2} cy={(R*2 + SW*2 + 40)/2} r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth={SW}
              strokeLinecap="round"
              strokeDasharray={`${progress * circ} ${circ}`}
              style={{ filter:`drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 16px ${glowColor})`, transition:"stroke 0.4s ease" }}
            />
          </svg>

          {/* Цифра */}
          <div style={{
            position:"relative",
            fontSize:80,
            fontWeight:900,
            color:"#fff",
            fontFamily:"system-ui,sans-serif",
            lineHeight:1,
            transform:`scale(${numScale})`,
            textShadow:`0 0 28px ${glowColor}, 0 2px 8px rgba(0,0,0,0.8)`,
          }}>
            {secs}
          </div>
        </div>

        {/* Подсказка под кольцом */}
        <div style={{
          opacity: labelOp * 0.6,
          fontSize:24,
          fontWeight:500,
          color:"rgba(255,255,255,0.6)",
          fontFamily:"system-ui,sans-serif",
          letterSpacing:2,
          textShadow:"0 1px 6px rgba(0,0,0,0.8)",
          whiteSpace:"nowrap",
        }}>
          {q.language === "ru" ? "выбери правильный ответ" : "elige tu respuesta"}
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
  const btnPulse = 1 + Math.sin(sceneF / 8) * 0.022;
  const glowPulse = 0.35 + Math.sin(sceneF / 10) * 0.15;
  const logoOp  = lerp(sceneF, 0, 16, 0, 1);
  const logoTy  = lerp(sceneF, 0, 16, -30, 0);
  const btnOp   = lerp(sceneF, 6, 20, 0, 1);
  const subOp   = lerp(sceneF, 12, 24, 0, 1);
  const ui      = UI_TEXT[q.language];

  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:36,
      opacity: op, transform:`scale(${scale})` }}>

      {/* Фоновый glow */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 80% 60% at 50% 50%, rgba(47,129,247,0.12) 0%, transparent 70%)",
      }} />

      {/* Логотип SKILY */}
      <div style={{ opacity: logoOp, transform:`translateY(${logoTy}px)`,
        display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
        <div style={{
          fontSize:22,
          fontWeight:500,
          color:"rgba(255,255,255,0.4)",
          fontFamily:"system-ui,sans-serif",
          letterSpacing:8,
          textTransform:"uppercase",
        }}>
          {q.language === "ru" ? "powered by" : "presentado por"}
        </div>
        <div style={{
          fontSize:80,
          fontWeight:900,
          color:"#fff",
          fontFamily:"system-ui,sans-serif",
          letterSpacing:-2,
          lineHeight:1,
          textShadow:[
            "0 0 40px rgba(47,129,247,0.8)",
            "0 0 80px rgba(47,129,247,0.4)",
            "0 4px 20px rgba(0,0,0,0.9)",
          ].join(", "),
        }}>
          SKILY
        </div>
        <div style={{
          fontSize:24,
          color:"rgba(47,129,247,0.8)",
          fontFamily:"system-ui,sans-serif",
          fontWeight:500,
          letterSpacing:3,
        }}>
          skilyapp.com
        </div>
      </div>

      {/* CTA кнопка */}
      <div style={{
        opacity: btnOp,
        transform:`scale(${btnPulse})`,
        padding:"26px 72px",
        borderRadius:100,
        background:"linear-gradient(135deg, #2F81F7 0%, #7C3AED 100%)",
        fontSize:38,
        fontWeight:800,
        color:"#fff",
        fontFamily:"system-ui,sans-serif",
        boxShadow:`0 8px 40px rgba(47,129,247,${glowPulse}), 0 0 80px rgba(124,58,237,0.25)`,
        letterSpacing:0.5,
        textAlign:"center",
      }}>
        {ui.cta}
      </div>

      {/* Подпись */}
      <div style={{ opacity: subOp, display:"flex", flexDirection:"column",
        alignItems:"center", gap:10 }}>
        <div style={{ fontSize:32, color:"rgba(255,255,255,0.7)",
          fontFamily:"system-ui,sans-serif",
          textShadow:"0 2px 8px rgba(0,0,0,0.8)" }}>
          {ui.subscribe}
        </div>
        <div style={{ fontSize:24, color:"rgba(255,255,255,0.3)",
          fontFamily:"system-ui,sans-serif", letterSpacing:1 }}>
          {q.language === "ru"
            ? `Следующий #${String(q.series_number+1).padStart(3,"0")} →`
            : `Siguiente #${String(q.series_number+1).padStart(3,"0")} →`}
        </div>
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

      {/* ── TTS Audio tracks ── */}
      {/* Hook intro: plays during HookScene */}
      {question.hookAudioFile && (
        <Sequence from={t.hookStart * F}
          durationInFrames={Math.round((question.hookAudioDurationSec ?? 2) * F)}>
          <Audio src={staticFile(question.hookAudioFile)} volume={1.0} />
        </Sequence>
      )}
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
      {/* Outro / CTA narration */}
      {question.outroAudioFile && (
        <Sequence from={t.ctaStart * F}
          durationInFrames={Math.round((question.outroAudioDurationSec ?? 4) * F)}>
          <Audio src={staticFile(question.outroAudioFile)} volume={1.0} />
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
      {/* AnswersScene stays visible through suspense — timer overlays on top */}
      {sOp(t.answersStart, t.revealStart) > 0 && (
        <div style={{ position:"absolute", inset:0, opacity: sOp(t.answersStart, t.revealStart) }}>
          <AnswersScene q={question} t={t} />
        </div>
      )}
      {/* SuspenseScene = compact timer overlay only, no full bg */}
      {sOp(t.suspenseStart, t.revealStart) > 0 && (
        <div style={{ position:"absolute", inset:0, opacity: sOp(t.suspenseStart, t.revealStart),
          pointerEvents:"none" }}>
          <SuspenseScene q={question} t={t} />
        </div>
      )}
      {/* RevealScene stays visible through explanation when show_explanation=false */}
      {sOp(t.revealStart, question.show_explanation !== false ? t.explanationStart : t.ctaStart) > 0 && (
        <div style={{ position:"absolute", inset:0,
          opacity: sOp(t.revealStart, question.show_explanation !== false ? t.explanationStart : t.ctaStart) }}>
          <RevealScene q={question} t={t} />
        </div>
      )}
      {/* ExplanationScene — only when enabled */}
      {question.show_explanation !== false && sOp(t.explanationStart, t.ctaStart) > 0 && (
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
