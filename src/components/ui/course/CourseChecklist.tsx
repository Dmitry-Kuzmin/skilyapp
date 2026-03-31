"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, ArrowRight, ArrowLeft, CheckCircle2, Info,
  ChevronRight, CreditCard, Calendar, Car, Globe,
  AlertTriangle, Clock, Stethoscope, Sparkles, Crown, Star, Zap,
  Heart, Calculator, Receipt
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type QuestionType = "choice" | "info";

interface Choice {
  label: string;
  sublabel?: string;
  risk: number;
  tag?: string;
  tagVariant?: "danger" | "warning" | "success";
  special?: string;
  calcValue?: string;
}

interface Question {
  id: string;
  type: QuestionType;
  Icon: React.ElementType;
  iconColor: string;
  title: string;
  subtitle?: string;
  choices?: Choice[];
}

// ─── Trust phrases (rotating footer) ────────────────────────────────────────

const TRUST_PHRASES = [
  { stat: "9 из 10", text: "студентов сдают с первой попытки с сопровождением куратора" },
  { stat: "4.9 ★", text: "средний рейтинг курса по отзывам наших студентов" },
  { stat: "< €350", text: "курс дешевле одного штрафа за езду без испанских прав" },
  { stat: "6 недель", text: "средний срок от нуля до сдачи экзамена DGT" },
  { stat: "94%", text: "тех, кто провалился сам — сдали с нами с первого раза" },
  { stat: "16 000+", text: "вопросов DGT с разбором на платформе Skilyapp" },
];

// ─── Questions ────────────────────────────────────────────────────────────────

const QUESTIONS: Question[] = [
  {
    id: "residence",
    type: "choice",
    Icon: CreditCard,
    iconColor: "text-sky-400",
    title: "Есть ли у вас ВНЖ или студенческая виза в Испании?",
    subtitle: "Обязательное требование DGT для допуска к экзамену",
    choices: [
      { label: "Да, есть ВНЖ (TIE)", risk: 0 },
      { label: "Студенческая виза (estancia)", sublabel: "от 6 месяцев в стране", risk: 0 },
      { label: "Карта беженца / защиты", sublabel: "Tarjeta roja — международная защита", risk: 0, tag: "принимаем", tagVariant: "success" },
      { label: "В процессе оформления", sublabel: "ВНЖ / резидентура", risk: 1, tag: "скоро", tagVariant: "warning" },
      { label: "Нет, только туристическая", sublabel: "Шенген / виза туриста", risk: 2, tag: "барьер", tagVariant: "danger", special: "tourist" },
    ],
  },
  {
    id: "age",
    type: "choice",
    Icon: Calendar,
    iconColor: "text-violet-400",
    title: "Вам уже исполнилось 18 лет?",
    subtitle: "Категория B требует 18+, мотоцикл (А) — 20+",
    choices: [
      { label: "Да, 18 лет и старше", risk: 0 },
      { label: "Нет, мне меньше 18", risk: 2, tag: "барьер", tagVariant: "danger" },
    ],
  },
  {
    id: "existing_license",
    type: "choice",
    Icon: Car,
    iconColor: "text-emerald-400",
    title: "Какая у вас ситуация с водительскими правами?",
    subtitle: "Это влияет на процедуру получения прав в Испании",
    choices: [
      { label: "Прав нет — сдаю с нуля", risk: 0 },
      { label: "Есть права страны ЕС", sublabel: "Можно обменять без экзаменов", risk: 0, tag: "проще", tagVariant: "success" },
      { label: "Есть права не ЕС", sublabel: "Стандартная процедура DGT", risk: 1 },
    ],
  },
  {
    id: "driving_lessons",
    type: "choice",
    Icon: Car,
    iconColor: "text-purple-400",
    title: "Уроки вождения в автошколе",
    subtitle: "Для справки — мы не предоставляем уроки вождения, но учтём в общем расчёте затрат",
    choices: [
      { label: "Не нужны", sublabel: "Уже умею водить", risk: 0, calcValue: "none" },
      { label: "Немного уроков", sublabel: "5–10 занятий", risk: 0, calcValue: "few" },
      { label: "С нуля", sublabel: "15–25 занятий", risk: 0, calcValue: "many" },
    ],
  },
  {
    id: "spanish_level",
    type: "choice",
    Icon: Globe,
    iconColor: "text-amber-400",
    title: "Как вы оцениваете свой уровень испанского?",
    subtitle: "Экзамен DGT строго на испанском — словари и телефоны запрещены",
    choices: [
      { label: "A0–A1 — почти не знаю", sublabel: "Сложные тексты читаю с трудом", risk: 2, tag: "VIP нужен", tagVariant: "danger" },
      { label: "A2–B1 — базовый", sublabel: "Понимаю, но сложная грамматика тяжело", risk: 1, tag: "поддержка", tagVariant: "warning" },
      { label: "B2+ — свободно", sublabel: "Читаю сложные тексты без словаря", risk: 0 },
    ],
  },
  {
    id: "dgt_specifics",
    type: "choice",
    Icon: AlertTriangle,
    iconColor: "text-orange-400",
    title: "Знакомы ли вы со спецификой испанских ПДД?",
    subtitle: "Приоритеты на круговых, Carril VAO, ловушки с двойными отрицаниями",
    choices: [
      { label: "Да, изучал(а) правила Испании", risk: 0 },
      { label: "Частично, не уверен(а)", risk: 1, tag: "разборы нужны", tagVariant: "warning" },
      { label: "Нет, знаю только правила своей страны", risk: 2, tag: "важно изучить", tagVariant: "danger" },
    ],
  },
  {
    id: "psicotecnico",
    type: "info",
    Icon: Stethoscope,
    iconColor: "text-teal-400",
    title: "Медкомиссия — Psicotécnico",
    subtitle: "Важная информация о медицинском допуске к экзамену",
  },
];

// ─── Recommendation logic ─────────────────────────────────────────────────────

interface PackageInfo {
  planId: "theory" | "pro" | "vip";
  name: string;
  price: number;
  features: string[];
  reason: string;
  cta: string;
  gradient: string;
  Icon: React.ElementType;
}

function getRecommendation(answers: Record<string, number>, isTourist: boolean): PackageInfo {
  if (isTourist) {
    return {
      planId: "pro",
      name: "Готовьтесь заранее!",
      price: 259,
      reason: "Туристическая виза не даёт права сдавать DGT. Но подготовку можно начать уже сейчас — и сдать сразу после получения ВНЖ.",
      features: [
        "Доступ к платформе сразу после записи",
        "16 000+ вопросов DGT с разбором",
        "Куратор поможет с оформлением ВНЖ",
        "Подготовитесь — пока идут документы",
        "Разборы ловушек и типичных ошибок",
      ],
      cta: "Записаться заранее",
      gradient: "from-sky-500 to-blue-600",
      Icon: Heart,
    };
  }
  const spanishRisk = answers["spanish_level"] ?? -1;
  const totalRisk = Object.values(answers).reduce((a, b) => a + b, 0);
  if (spanishRisk === 2 || totalRisk >= 5) {
    return {
      planId: "vip",
      name: "VIP — Под ключ",
      price: 349,
      reason: spanishRisk === 2
        ? "Слабый испанский — главный барьер на экзамене DGT. VIP включает мини-курс языка для водителей."
        : "Ваш профиль показывает несколько рисков. Индивидуальное сопровождение сильно увеличит шансы.",
      features: [
        "Мини-курс испанского для водителей",
        "Личный куратор 24/7",
        "Разборы ловушек DGT на эфирах",
        "Помощь с документами (Cita, Tasa, Psicotécnico)",
        "Запись на экзамен в DGT",
      ],
      cta: "Посмотреть VIP",
      gradient: "from-violet-600 to-purple-600",
      Icon: Crown,
    };
  }
  if (totalRisk >= 2) {
    return {
      planId: "pro",
      name: "С сопровождением",
      price: 259,
      reason: "Небольшие пробелы есть — куратор поможет их закрыть и не даст сдаться на полпути.",
      features: [
        "Полная база DGT (16 000 вопросов)",
        "Личный куратор в мессенджере",
        "Испанский для водителей (мини-курс)",
        "Симуляция экзамена DGT",
        "Консультация по документам",
      ],
      cta: "Посмотреть тариф",
      gradient: "from-sky-500 to-blue-600",
      Icon: Zap,
    };
  }
  return {
    planId: "theory",
    name: "Теория",
    price: 199,
    reason: "Хороший испанский и готовность заниматься — вы справитесь с базовым курсом.",
    features: [
      "8 живых эфиров с преподавателем",
      "Полная база DGT (16 000 вопросов)",
      "Симуляция экзамена",
    ],
    cta: "Посмотреть тариф",
    gradient: "from-emerald-500 to-teal-600",
    Icon: Star,
  };
}

// ─── Cost calculator ──────────────────────────────────────────────────────────

interface CostRow {
  emoji: string;
  label: string;
  withoutUs: number | null;   // null = "включено"
  withUs: number | null;      // null = "включено"
  withoutUsSub?: string;
  withUsSub?: string;
  practical?: boolean;        // true = не входит в наш курс
}

interface CostBreakdown {
  rows: CostRow[];
  totalWithoutUs: number;
  totalWithUs: number;
  savings: number;
  retakesWithoutUs: number;
  hasPractical: boolean;
}

function getCostBreakdown(
  answers: Record<string, number>,
  isTourist: boolean,
  calcData: Record<string, string>
): CostBreakdown {
  const riskScore = Object.values(answers).reduce((a, b) => a + b, 0);
  const spanishRisk = answers["spanish_level"] ?? 0;

  const retakesWithoutUs = riskScore >= 6 ? 3.0 : riskScore >= 4 ? 2.4 : riskScore >= 2 ? 1.8 : 1.2;
  const retakesWithUs = 1.05;
  const dgtFee = 94;
  const psico = 30;

  const rec = getRecommendation(answers, isTourist);
  const ourPrice = rec.price;
  const traditionalTheory = spanishRisk === 2 ? 450 : 350;
  const languageExtra = spanishRisk === 2 ? 200 : 0;

  const lessons = calcData["driving_lessons"] ?? "none";
  const lessonCost = lessons === "many" ? 650 : lessons === "few" ? 320 : 0;
  const practicalExam = lessons !== "none" ? 150 : 0;
  const hasPractical = lessons !== "none";

  const rows: CostRow[] = [
    {
      emoji: "📚",
      label: "Курс теории DGT",
      withoutUs: traditionalTheory,
      withoutUsSub: "автошкола / онлайн",
      withUs: ourPrice,
      withUsSub: `Skilyapp ${rec.name}`,
    },
    ...(languageExtra > 0 ? [{
      emoji: "🇪🇸",
      label: "Занятия испанским",
      withoutUs: languageExtra,
      withoutUsSub: "отдельные курсы",
      withUs: null,
      withUsSub: rec.planId === "vip" ? "входит в VIP" : "мини-курс включён",
    }] : []),
    {
      emoji: "📋",
      label: "Экзамен DGT (теория)",
      withoutUs: Math.round(dgtFee * retakesWithoutUs),
      withoutUsSub: `≈ ${retakesWithoutUs.toFixed(1)} попытки`,
      withUs: Math.round(dgtFee * retakesWithUs),
      withUsSub: "обычно 1 раз",
    },
    {
      emoji: "🏥",
      label: "Псикотехника",
      withoutUs: psico,
      withUs: psico,
    },
    ...(lessonCost > 0 ? [{
      emoji: "🚗",
      label: "Уроки вождения",
      withoutUs: lessonCost,
      withoutUsSub: lessons === "many" ? "≈ 20 уроков" : "≈ 8 уроков",
      withUs: lessonCost,
      withUsSub: "в вашей автошколе",
      practical: true,
    }] : []),
    ...(practicalExam > 0 ? [{
      emoji: "🏁",
      label: "Практический экзамен",
      withoutUs: practicalExam,
      withUs: practicalExam,
      practical: true,
    }] : []),
  ];

  // Считаем totals только по не-null значениям
  const totalWithoutUs = rows.reduce((a, r) => a + (r.withoutUs ?? 0), 0);
  const totalWithUs = rows.reduce((a, r) => a + (r.withUs ?? 0), 0);

  return { rows, totalWithoutUs, totalWithUs, savings: totalWithoutUs - totalWithUs, retakesWithoutUs, hasPractical };
}

// ─── Animated number ──────────────────────────────────────────────────────────

function AnimatedNumber({ value, prefix = "€" }: { value: number; prefix?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = displayed;
    const end = value;
    if (start === end) return;
    const duration = 500;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + (end - start) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{prefix}{displayed}</>;
}

// ─── Tag & Choice Styles ──────────────────────────────────────────────────────

const TAG_STYLES = {
  danger: "bg-rose-500/15 text-rose-400 border border-rose-500/25",
  warning: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
};

const CHOICE_STYLES = {
  2: "border-rose-500/20 bg-rose-500/[0.04] hover:border-rose-500/45 hover:bg-rose-500/[0.08] text-rose-100",
  1: "border-amber-500/20 bg-amber-500/[0.04] hover:border-amber-500/45 hover:bg-amber-500/[0.08] text-amber-100",
  0: "border-white/[0.08] bg-white/[0.02] hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] text-zinc-100",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function CourseChecklist() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [calcData, setCalcData] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [touristInterstitial, setTouristInterstitial] = useState(false);
  const [isTourist, setIsTourist] = useState(false);
  const [trustIndex, setTrustIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"tariff" | "calc">("tariff");

  const totalSteps = QUESTIONS.length;
  const question = QUESTIONS[currentStep];
  const answeredCount = Object.keys(answers).length;
  const progress = (currentStep / totalSteps) * 100;
  const recommendation = getRecommendation(answers, isTourist);
  const costBreakdown = getCostBreakdown(answers, isTourist, calcData);

  useEffect(() => {
    if (answeredCount >= 2 && !panelVisible) {
      const t = setTimeout(() => setPanelVisible(true), 150);
      return () => clearTimeout(t);
    }
  }, [answeredCount, panelVisible]);

  useEffect(() => {
    const timer = setInterval(() => setTrustIndex((i) => (i + 1) % TRUST_PHRASES.length), 3500);
    return () => clearInterval(timer);
  }, []);

  function handleChoice(choice: Choice) {
    const newAnswers = { ...answers, [question.id]: choice.risk };
    setAnswers(newAnswers);

    if (choice.calcValue) {
      setCalcData((prev) => ({ ...prev, [question.id]: choice.calcValue! }));
    }

    if (choice.special === "tourist") {
      setIsTourist(true);
      setTouristInterstitial(true);
      return;
    }

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setCompleted(true);
    }
  }

  function handleTouristContinue() {
    setTouristInterstitial(false);
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setCompleted(true);
    }
  }

  function handleBack() {
    if (touristInterstitial) {
      setTouristInterstitial(false);
      setIsTourist(false);
      const newAnswers = { ...answers };
      delete newAnswers[question.id];
      setAnswers(newAnswers);
      return;
    }
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }

  function handleInfoNext() {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setCompleted(true);
    }
  }

  function scrollToPricingWithHighlight() {
    sessionStorage.setItem("recommendedPlan", recommendation.planId);
    window.dispatchEvent(new CustomEvent("recommendPlan", { detail: { planId: recommendation.planId } }));
    setTimeout(() => {
      const card = document.getElementById(`plan-${recommendation.planId}`);
      const section = document.getElementById("pricing");
      (card ?? section)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }

  const riskScore = Object.values(answers).reduce((a, b) => a + b, 0);
  const showPanel = panelVisible || completed;
  const phrase = TRUST_PHRASES[trustIndex];

  // ── Вкладка Калькулятор ──────────────────────────────────────────────────

  const CalcTab = () => {
    const cb = costBreakdown;
    const theoryRows = cb.rows.filter((r) => !r.practical);
    const practicalRows = cb.rows.filter((r) => r.practical);

    return (
      <div className="flex flex-col gap-3">
        {/* Заголовок */}
        <p className="text-[10px] text-zinc-600 leading-snug">
          Полная стоимость получения прав в Испании
        </p>

        {/* Таблица */}
        <div className="rounded-xl border border-white/[0.07] overflow-hidden">
          {/* Шапка */}
          <div className="grid grid-cols-[1fr_56px_56px] bg-white/[0.03] border-b border-white/[0.06] px-3 py-2">
            <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">Статья</span>
            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider text-right">Без&nbsp;нас</span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider text-right">С&nbsp;нами</span>
          </div>

          {/* Строки теории */}
          {theoryRows.map((row, i) => {
            const saved = row.withoutUs !== null && row.withUs !== null && row.withUs < row.withoutUs;
            const included = row.withUs === null;
            return (
              <div key={i} className={`grid grid-cols-[1fr_56px_56px] px-3 py-2 gap-x-1 ${i < theoryRows.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                <div>
                  <div className="text-[11px] text-zinc-300 leading-snug">{row.emoji} {row.label}</div>
                  {row.withUsSub && included && (
                    <div className="text-[9px] text-emerald-500 mt-0.5">{row.withUsSub}</div>
                  )}
                </div>
                <div className="text-right self-center">
                  {row.withoutUs !== null
                    ? <span className="text-[11px] text-zinc-400 font-medium"><AnimatedNumber value={row.withoutUs} /></span>
                    : <span className="text-[10px] text-zinc-600">—</span>}
                  {row.withoutUsSub && <div className="text-[9px] text-zinc-600 leading-none mt-0.5">{row.withoutUsSub}</div>}
                </div>
                <div className="text-right self-center">
                  {included
                    ? <span className="text-[9px] text-emerald-500 font-semibold">включено</span>
                    : row.withUs !== null
                      ? <span className={`text-[11px] font-semibold ${saved ? "text-emerald-400" : "text-zinc-400"}`}>
                          <AnimatedNumber value={row.withUs} />
                          {saved && <span className="text-emerald-500 text-[8px] block leading-none">↓ дешевле</span>}
                        </span>
                      : null}
                  {row.withUsSub && !included && (
                    <div className="text-[9px] text-zinc-600 leading-none mt-0.5">{row.withUsSub}</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Разделитель практики */}
          {practicalRows.length > 0 && (
            <>
              <div className="px-3 py-1.5 bg-zinc-800/40 border-y border-white/[0.05]">
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-semibold">
                  Не входит в курс Skilyapp — для справки
                </span>
              </div>
              {practicalRows.map((row, i) => (
                <div key={i} className={`grid grid-cols-[1fr_56px_56px] px-3 py-2 gap-x-1 opacity-50 ${i < practicalRows.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                  <div className="text-[11px] text-zinc-500">{row.emoji} {row.label}</div>
                  <div className="text-right self-center">
                    {row.withoutUs !== null && <span className="text-[11px] text-zinc-500"><AnimatedNumber value={row.withoutUs} /></span>}
                    {row.withoutUsSub && <div className="text-[9px] text-zinc-600 mt-0.5">{row.withoutUsSub}</div>}
                  </div>
                  <div className="text-right self-center">
                    {row.withUs !== null && <span className="text-[11px] text-zinc-500"><AnimatedNumber value={row.withUs} /></span>}
                    {row.withUsSub && <div className="text-[9px] text-zinc-600 mt-0.5">{row.withUsSub}</div>}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Итого */}
          <div className="grid grid-cols-[1fr_56px_56px] px-3 py-2.5 bg-white/[0.03] border-t border-white/[0.08] gap-x-1">
            <span className="text-xs font-bold text-zinc-300">Итого</span>
            <span className="text-sm font-black text-rose-400 text-right">
              <AnimatedNumber value={cb.totalWithoutUs} />
            </span>
            <span className="text-sm font-black text-emerald-400 text-right">
              <AnimatedNumber value={cb.totalWithUs} />
            </span>
          </div>
        </div>

        {/* Экономия */}
        {cb.savings > 0 && (
          <div className="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Ваша экономия</div>
              <div className="text-[10px] text-zinc-600 mt-0.5">
                + с первого раза вместо ≈{cb.retakesWithoutUs.toFixed(1)} попыток
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-400 shrink-0">
              <AnimatedNumber value={cb.savings} />
            </div>
          </div>
        )}

        {/* Штраф */}
        <div className="bg-amber-500/[0.05] border border-amber-500/15 rounded-xl px-3 py-2">
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            <span className="text-amber-400 font-semibold">⚠️ Штраф</span> за езду без испанских прав —
            от <span className="text-amber-400 font-bold">€200</span> до{" "}
            <span className="text-amber-400 font-bold">€500</span>. Курс окупается с первого же штрафа.
          </p>
        </div>

        {!completed && (
          <p className="text-center text-[10px] text-zinc-700">
            Расчёт уточняется по мере ответов
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 py-24 relative z-10" id="smart-checklist">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/15 text-violet-400 text-xs font-bold uppercase tracking-widest mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Подбор тарифа
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 tracking-tight text-center px-2">
          Подберём тариф под вас
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto text-center font-light px-4">
          Ответьте на {totalSteps} вопросов — получите точный план и подходящий тариф
        </p>
      </div>

      {/* Карточка */}
      <motion.div
        layout
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/40"
      >
        <div className={`grid grid-cols-1 divide-white/[0.06] ${showPanel ? "lg:grid-cols-[60%_40%] lg:divide-x" : ""}`}>

          {/* LEFT: Wizard */}
          <motion.div layout transition={{ duration: 0.5 }} className="min-w-0 w-full">
            {!completed && (
              <div className="px-6 pt-5 pb-0">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                  <button
                    onClick={handleBack}
                    disabled={currentStep === 0 && !touristInterstitial}
                    className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Назад</span>
                  </button>
                  <span className="text-zinc-600">{currentStep + 1} / {totalSteps}</span>
                </div>
                <div className="h-[3px] bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}

            <div className="p-6 sm:p-8 min-h-[320px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {!completed ? (
                  <motion.div
                    key={touristInterstitial ? "tourist-info" : question.id}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    {touristInterstitial ? (
                      <div className="space-y-4">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
                          <Heart className="w-5 h-5 text-sky-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white leading-snug">
                          Туристическая виза — пока барьер, но не приговор
                        </h3>
                        <div className="bg-sky-500/[0.07] border border-sky-500/20 rounded-xl p-4 space-y-3 text-sm text-zinc-300 leading-relaxed">
                          <p>
                            <span className="text-white font-semibold">Да, сдать экзамен DGT</span> с туристической визой официально нельзя — DGT требует ВНЖ или студенческую визу.
                          </p>
                          <p>
                            <span className="text-sky-400 font-semibold">Но вот в чём фишка:</span> большинство наших студентов <b>начинают готовиться заранее</b> — пока оформляют документы. Это самый умный ход.
                          </p>
                          <p className="text-zinc-500 text-xs">
                            Процесс получения ВНЖ занимает месяцы — и всё это время можно учиться, чтобы сдать с первого раза, как только откроется окно.
                          </p>
                        </div>
                        <button
                          onClick={handleTouristContinue}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                        >
                          <Heart className="w-4 h-4" />
                          Хочу готовиться заранее
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <p className="text-center text-xs text-zinc-600">
                          Мы поможем с оформлением ВНЖ — и встретим вас на старте потока
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-6">
                          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-4">
                            <question.Icon className={`w-5 h-5 ${question.iconColor}`} />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-1.5 leading-snug">{question.title}</h3>
                          {question.subtitle && (
                            <p className="text-sm text-zinc-500 leading-relaxed">{question.subtitle}</p>
                          )}
                        </div>

                        {question.type === "choice" && question.choices && (
                          <div className="grid grid-cols-2 gap-2">
                            {question.choices.map((choice, idx) => (
                              <motion.button
                                key={idx}
                                onClick={() => handleChoice(choice)}
                                className={`flex flex-col items-start px-3 py-3 rounded-xl border text-left transition-all duration-200 ${CHOICE_STYLES[choice.risk as 0 | 1 | 2]}`}
                                whileTap={{ scale: 0.985 }}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                              >
                                <div className="font-medium text-sm leading-snug">{choice.label}</div>
                                {choice.sublabel && (
                                  <div className="text-[11px] text-zinc-600 mt-0.5 leading-snug">{choice.sublabel}</div>
                                )}
                                {choice.tag && choice.tagVariant && (
                                  <span className={`mt-1.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${TAG_STYLES[choice.tagVariant]}`}>
                                    {choice.tag}
                                  </span>
                                )}
                              </motion.button>
                            ))}
                          </div>
                        )}

                        {question.type === "info" && (
                          <div className="space-y-4">
                            <div className="bg-teal-500/[0.08] border border-teal-500/20 rounded-xl p-4 space-y-3">
                              <div className="flex items-start gap-3">
                                <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                                <div className="text-sm text-zinc-300 leading-relaxed">
                                  <span className="font-semibold text-white">Psicotécnico</span> — медицинская комиссия DGT: проверка зрения, реакции и координации.
                                </div>
                              </div>
                              <div className="pl-7 space-y-2 text-sm text-zinc-400">
                                <p><span className="text-amber-400 font-medium">Действует всего 3 месяца</span> — её сдают ближе к экзамену, не в начале подготовки.</p>
                                <p><span className="text-emerald-400 font-medium">Если только начинаете</span> — пока не нужна. Мы напомним и поможем с записью.</p>
                                <p className="text-zinc-600 text-xs">Стоит ~€30 в любом Centro de Reconocimiento. Можно пройти за 15 минут.</p>
                              </div>
                            </div>
                            <button
                              onClick={handleInfoNext}
                              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                            >
                              Понятно, продолжить <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-2"
                  >
                    <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                      isTourist ? "bg-sky-500/15 border border-sky-500/25" :
                      riskScore >= 5 ? "bg-rose-500/15 border border-rose-500/25" :
                      riskScore >= 2 ? "bg-amber-500/15 border border-amber-500/25" :
                      "bg-emerald-500/15 border border-emerald-500/25"
                    }`}>
                      {isTourist ? <Heart className="w-7 h-7 text-sky-400" /> :
                       riskScore >= 5 ? <ShieldAlert className="w-7 h-7 text-rose-400" /> :
                       riskScore >= 2 ? <AlertTriangle className="w-7 h-7 text-amber-400" /> :
                       <CheckCircle2 className="w-7 h-7 text-emerald-400" />}
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">
                      {isTourist ? "Начните готовиться сейчас!" :
                       riskScore >= 5 ? "Есть серьёзные пробелы" :
                       riskScore >= 2 ? "Небольшие риски — исправимо" : "Отличный старт!"}
                    </h3>
                    <p className="text-zinc-400 text-sm mb-5 max-w-sm mx-auto leading-relaxed">
                      {isTourist
                        ? "Пока идут документы — изучайте теорию DGT. Сдадите сразу после получения ВНЖ."
                        : riskScore >= 5
                        ? "Несколько красных флагов — особенно языковой барьер. VIP даст максимальный шанс."
                        : riskScore >= 2
                        ? "Один-два пробела, которые куратор поможет закрыть за пару недель."
                        : "Хорошая база. Практика на платформе — и вы готовы!"}
                    </p>

                    {/* Итоговая экономия в финале */}
                    {costBreakdown.savings > 0 && (
                      <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-2 mb-5">
                        <Receipt className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-sm text-zinc-300">
                          Экономия с нами: <span className="text-emerald-400 font-black">€<AnimatedNumber value={costBreakdown.savings} prefix="" /></span> vs стандартный путь
                        </span>
                      </div>
                    )}

                    <button
                      onClick={scrollToPricingWithHighlight}
                      className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm bg-gradient-to-r ${recommendation.gradient} text-white hover:opacity-90 hover:shadow-xl transition-all`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Перейти к рекомендованному тарифу
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setCurrentStep(0); setAnswers({}); setCalcData({}); setCompleted(false); setPanelVisible(false); setIsTourist(false); setTouristInterstitial(false); setActiveTab("tariff"); }}
                      className="block mt-3 mx-auto text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      Пройти заново
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* RIGHT: Panel with tabs */}
          <AnimatePresence>
            {showPanel && (
              <motion.div
                key="panel"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full"
              >
                <div className="p-6 sm:p-8 h-full flex flex-col">
                  {/* Tabs */}
                  <div className="flex gap-1 bg-white/[0.04] border border-white/[0.07] rounded-xl p-1 mb-5">
                    <button
                      onClick={() => setActiveTab("tariff")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === "tariff"
                          ? "bg-white/[0.08] text-white"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      Тариф
                    </button>
                    <button
                      onClick={() => setActiveTab("calc")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === "calc"
                          ? "bg-white/[0.08] text-white"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <Calculator className="w-3 h-3" />
                      Затраты
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTab === "tariff" ? (
                      <motion.div
                        key="tariff-tab"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="flex flex-col flex-1"
                      >
                        <div className={`inline-flex items-center self-start gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${recommendation.gradient} mb-5`}>
                          <recommendation.Icon className="w-3.5 h-3.5 text-white" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            {completed ? "Ваш тариф" : "Предварительно"}
                          </span>
                        </div>

                        <AnimatePresence mode="wait">
                          <motion.div
                            key={recommendation.planId + String(isTourist)}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.25 }}
                            className="flex flex-col flex-1"
                          >
                            <div className="font-black text-white text-xl leading-tight mb-1">{recommendation.name}</div>
                            <div className="text-3xl font-black text-white mb-4">от €{recommendation.price}</div>

                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 mb-4">
                              <p className="text-xs text-zinc-400 leading-relaxed">{recommendation.reason}</p>
                            </div>

                            <ul className="space-y-2 mb-5 flex-1">
                              {recommendation.features.map((f, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  {f}
                                </li>
                              ))}
                            </ul>

                            <button
                              onClick={scrollToPricingWithHighlight}
                              className={`w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${recommendation.gradient} hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
                            >
                              {recommendation.cta}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>

                            {!completed && (
                              <p className="text-center text-[10px] text-zinc-600 mt-2.5">
                                Рекомендация уточняется по мере ответов
                              </p>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="calc-tab"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="flex-1 flex flex-col"
                      >
                        <CalcTab />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trust footer */}
        <div className="px-6 py-3 border-t border-white/[0.05] bg-white/[0.01] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={trustIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="text-[11px] text-zinc-600 text-center"
            >
              <span className="text-zinc-400 font-semibold">{phrase.stat}</span>{" "}{phrase.text}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
