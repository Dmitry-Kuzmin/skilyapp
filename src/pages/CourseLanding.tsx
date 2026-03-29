import { useState, useEffect, useRef, useCallback } from "react";
import { SeoHead } from "@/components/seo/SeoHead";
import {
  CheckCircle2,
  Globe,
  BookOpen,
  Clock,
  Smartphone,
  Zap,
  MessageCircle,
  Shield,
  Star,
  ChevronDown,
  ArrowRight,
  ArrowDown,
  Brain,
  FileText,
  Stethoscope,
  Car,
  GraduationCap,
  UserCheck,
  CreditCard,
  BadgeCheck,
  Sparkles,
  Send,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   Scroll-reveal hook (IntersectionObserver)
   ───────────────────────────────────────────── */
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Fallback: force visible after 1.5s in case IntersectionObserver doesn't fire
    const fallback = setTimeout(() => setVisible(true), 1500);
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); clearTimeout(fallback); } },
      { threshold, rootMargin: "0px 0px 100px 0px" }
    );
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, [threshold]);
  return { ref, visible };
}

/* ─────────────────────────────────────────────
   Animated counter
   ───────────────────────────────────────────── */
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const { ref, visible } = useReveal(0.5);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 1200;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setDisplay(Math.floor(p * value));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, value]);
  return <span ref={ref}>{display}{suffix}</span>;
}

/* ─────────────────────────────────────────────
   STYLES (injected once)
   ───────────────────────────────────────────── */
const LANDING_STYLES = `
@keyframes curso-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
@keyframes curso-glow-pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
@keyframes curso-gradient-x { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes curso-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes curso-border-glow { 0%,100%{border-color:rgba(59,130,246,.15)} 50%{border-color:rgba(59,130,246,.4)} }
.curso-float { animation: curso-float 6s ease-in-out infinite; }
.curso-glow-pulse { animation: curso-glow-pulse 3s ease-in-out infinite; }
.curso-gradient-x { background-size:200% 200%; animation: curso-gradient-x 4s ease infinite; }
.curso-shimmer { background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.04) 50%, transparent 100%); background-size: 200% 100%; animation: curso-shimmer 3s ease-in-out infinite; }
.curso-border-glow { animation: curso-border-glow 3s ease-in-out infinite; }
.curso-card { position:relative; overflow:hidden; }
.curso-card::before { content:''; position:absolute; inset:0; opacity:0; transition:opacity .4s; pointer-events:none; background:radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(59,130,246,.06), transparent 40%); }
.curso-card:hover::before { opacity:1; }
.curso-reveal { opacity:0; transform:translateY(32px); transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1); }
.curso-reveal.visible { opacity:1; transform:translateY(0); }
`;

/* ─────────────────────────────────────────────
   DATA
   ───────────────────────────────────────────── */

const HERO_STATS = [
  { value: 9, suffix: "/10", label: "сдают с 1-го раза" },
  { value: 16000, suffix: "+", label: "вопросов в базе" },
  { value: 100, suffix: "%", label: "онлайн-формат" },
];

const TRUST_PILLS = [
  { text: "Любой город Испании", icon: Globe },
  { text: "С телефона или ПК", icon: Smartphone },
  { text: "Актуальная база DGT 2026", icon: Zap },
];

const PAIN_POINTS = [
  {
    icon: Globe,
    color: "from-red-500 to-orange-500",
    title: "Языковой барьер",
    desc: "Специфическая лексика и сложные формулировки на испанском, которые не переведет обычный переводчик.",
  },
  {
    icon: BookOpen,
    color: "from-amber-500 to-yellow-500",
    title: "16 000+ вопросов",
    desc: "Огромная база DGT с подвохами. Без системы подготовки можно учить месяцами и всё равно провалить.",
  },
  {
    icon: FileText,
    color: "from-purple-500 to-pink-500",
    title: "Бюрократия",
    desc: "Очереди, получение Cita Previa, оплата Tasa, медкомиссия — система запутает кого угодно.",
  },
];

const ADVANTAGES = [
  {
    icon: Clock,
    title: "Учитесь где угодно 24/7",
    desc: "За утренним кофе, в метро или на диване. Не нужно подстраиваться под расписание офлайн-школ.",
  },
  {
    icon: Brain,
    title: "Сложное — простым языком",
    desc: "Перевели всю терминологию: Matricula, Psicotecnico, Jurado. Вы понимаете логику, а не зубрите.",
  },
  {
    icon: Shield,
    title: "Эмуляция реального экзамена",
    desc: "30 вопросов, 30 минут, максимум 3 ошибки — как на настоящем экзамене DGT. Придёте без стресса.",
  },
  {
    icon: MessageCircle,
    title: "Полное сопровождение",
    desc: "Поможем с медкомиссией, документами и записью на экзамен в вашем регионе.",
  },
];

const STEPS = [
  {
    icon: GraduationCap,
    color: "from-blue-500 to-cyan-500",
    title: "Подготовка на Skilyapp",
    desc: "Интерактивные уроки и тесты на русском языке на нашей онлайн-платформе.",
  },
  {
    icon: Stethoscope,
    color: "from-emerald-500 to-green-500",
    title: "Медкомиссия",
    desc: "Быстрый психофизический тест (Psicotecnico) в авторизованном центре вашего города.",
  },
  {
    icon: FileText,
    color: "from-violet-500 to-purple-500",
    title: "Сдача теории в DGT",
    desc: "Официальный экзамен. 9 из 10 наших студентов сдают с первого раза.",
  },
  {
    icon: Car,
    color: "from-orange-500 to-red-500",
    title: "Практика и права",
    desc: "Идёте в любую местную автошколу для практического вождения и финального экзамена.",
  },
];

const ELIGIBILITY = [
  { icon: UserCheck, text: "ВНЖ (резиденция) или студенческая виза" },
  { icon: BadgeCheck, text: "Возраст от 18 лет (категория B)" },
  { icon: CreditCard, text: "Нет действующих прав страны ЕС" },
];

const PLAN_BASIC = {
  name: "Базовый",
  subtitle: "Самостоятельная подготовка",
  features: [
    "Доступ к платформе на 3 месяца",
    "Вся теория DGT на русском",
    "Актуальная база тестов",
    "Словарь автомобилиста",
    "AI-помощник 24/7",
  ],
};

const PLAN_PREMIUM = {
  name: "Премиум",
  subtitle: "С сопровождением куратора",
  badge: "Хит продаж",
  features: [
    "Всё из Базового + доступ на 6 мес",
    "Чат с русскоязычным куратором",
    "Помощь с записью в DGT",
    "Оформление документов (Cita, Tasa)",
    "Разбор сложных тем 1-на-1",
    "Гарантия результата",
  ],
};

const FAQ_DATA = [
  {
    q: "Могу ли я учить теорию с вами, а практику сдавать в своем городе?",
    a: "Да, абсолютно. Сертификат о сдаче теории действителен на всей территории Испании. Вы можете выбрать любую автошколу рядом с домом для уроков вождения.",
  },
  {
    q: "На каком языке проходит реальный экзамен?",
    a: "Экзамен в DGT можно сдавать на испанском (в некоторых регионах — на английском, французском или немецком). Наш курс готовит вас к пониманию испанских вопросов без словаря.",
  },
  {
    q: "Сколько времени занимает подготовка?",
    a: "В среднем наши студенты готовы к экзамену за 4-6 недель регулярных занятий на платформе.",
  },
  {
    q: "А если я уже проваливал экзамен?",
    a: "Тем более подходит. Разберём ваши ошибки и закроем пробелы. Многие ученики сдали именно после 2-3 неудачных попыток самостоятельной подготовки.",
  },
  {
    q: "Подходит ли курс для категории B?",
    a: "Да, курс покрывает полную подготовку к теоретическому экзамену DGT категории B (легковые автомобили).",
  },
];

const TESTIMONIALS = [
  {
    name: "Анна К.",
    city: "Барселона",
    text: "Сдала теорию с первой попытки! До курса даже не понимала, как записаться на экзамен. Всё разложили по полочкам.",
    rating: 5,
  },
  {
    name: "Михаил Д.",
    city: "Мадрид",
    text: "Пробовал готовиться сам — завалил 2 раза. После курса — сдал на 29/30. Реально работает система.",
    rating: 5,
  },
  {
    name: "Елена В.",
    city: "Валенсия",
    text: "Больше всего ценю поддержку куратора. Перед экзаменом были вопросы — получила ответ за 5 минут.",
    rating: 5,
  },
];

/* ─────────────────────────────────────────────
   SECTION WRAPPER with reveal animation
   ───────────────────────────────────────────── */
function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const { ref, visible } = useReveal();
  return (
    <section
      id={id}
      ref={ref}
      className={cn("curso-reveal", visible && "visible", className)}
    >
      {children}
    </section>
  );
}

/* ─────────────────────────────────────────────
   CARD with mouse-follow glow
   ───────────────────────────────────────────── */
function GlowCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const handleMouse = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);
  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouse}
      className={cn("curso-card rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-sm", className)}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────── */
const CourseLanding = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [heroReady, setHeroReady] = useState(false);
  const [formSent, setFormSent] = useState(false);

  useEffect(() => {
    // inject styles
    if (!document.getElementById("curso-styles")) {
      const style = document.createElement("style");
      style.id = "curso-styles";
      style.textContent = LANDING_STYLES;
      document.head.appendChild(style);
    }
    // load Google Ads gtag.js
    if (!document.getElementById("gtag-script")) {
      const gtagScript = document.createElement("script");
      gtagScript.id = "gtag-script";
      gtagScript.async = true;
      gtagScript.src = "https://www.googletagmanager.com/gtag/js?id=AW-18034090184";
      document.head.appendChild(gtagScript);
      const gtagInit = document.createElement("script");
      gtagInit.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','AW-18034090184');`;
      document.head.appendChild(gtagInit);
    }
    requestAnimationFrame(() => setHeroReady(true));
    return () => { document.getElementById("curso-styles")?.remove(); };
  }, []);

  const scrollToForm = () => {
    document.getElementById("signup-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#060a14] text-white antialiased selection:bg-blue-500/30">
      <SeoHead
        title="Водительские права в Испании — сдайте теорию DGT с первого раза | Skilyapp"
        description="Онлайн-подготовка к экзамену DGT на русском языке. 9 из 10 сдают с первой попытки. Полное сопровождение: от теории до получения прав. Бесплатный демо-доступ."
        canonicalUrl="https://skilyapp.com/curso"
      />

      {/* ═══════════════════════════════════════════
          BLOCK 1: HERO
          ═══════════════════════════════════════════ */}
      <header className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden px-4">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-blue-600/[0.08] rounded-full blur-[140px] curso-glow-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/[0.05] rounded-full blur-[120px]" />
          <div className="absolute top-[20%] left-[-5%] w-[300px] h-[300px] bg-violet-500/[0.04] rounded-full blur-[100px]" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }} />
        </div>

        <div className="relative max-w-4xl w-full text-center">
          {/* Logo / brand */}
          <div className={cn(
            "mb-8 transition-all duration-700",
            heroReady ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-6"
          )}>
            <a href="/" className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-white/80 hover:text-white transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm font-black">S</div>
              Skilyapp
            </a>
          </div>

          {/* Badge */}
          <div className={cn(
            "flex justify-center mb-8 transition-all duration-700 delay-100",
            heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-sm backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.6)]" />
              Набор на новый поток открыт
            </div>
          </div>

          {/* H1 */}
          <h1 className={cn(
            "text-[2.25rem] sm:text-5xl lg:text-[3.75rem] font-extrabold leading-[1.1] tracking-tight mb-6 transition-all duration-700 delay-200",
            heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}>
            Водительские права в Испании:
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent curso-gradient-x">
              сдайте теорию с первого раза
            </span>
          </h1>

          {/* Subtitle */}
          <p className={cn(
            "text-base sm:text-lg lg:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-300",
            heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}>
            Пошаговая онлайн-подготовка к экзамену DGT на русском языке.
            {" "}Никаких скучных лекций на непонятном испанском — учитесь в своем темпе,
            а бюрократию мы возьмем на себя.
          </p>

          {/* CTA buttons */}
          <div className={cn(
            "flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 transition-all duration-700 delay-[400ms]",
            heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}>
            <button
              onClick={scrollToForm}
              className="group relative w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold text-lg overflow-hidden transition-all active:scale-[0.97]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 transition-all group-hover:brightness-110" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-blue-400 to-cyan-400" />
              <span className="relative flex items-center justify-center gap-2">
                Получить демо-доступ
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button
              onClick={scrollToHowItWorks}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold text-lg border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all active:scale-[0.97] flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              Как это работает?
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>

          {/* Trust pills */}
          <div className={cn(
            "flex flex-wrap items-center justify-center gap-3 mb-14 transition-all duration-700 delay-500",
            heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}>
            {TRUST_PILLS.map((pill) => (
              <div
                key={pill.text}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-sm text-zinc-400"
              >
                <pill.icon className="w-4 h-4 text-blue-400" />
                {pill.text}
              </div>
            ))}
          </div>

          {/* Animated stats */}
          <div className={cn(
            "grid grid-cols-3 gap-6 max-w-md mx-auto transition-all duration-700 delay-[600ms]",
            heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}>
            {HERO_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                  <AnimatedNumber value={s.value} suffix={s.suffix} />
                </div>
                <div className="text-xs sm:text-sm text-zinc-500 mt-1.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className={cn(
          "absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-700 delay-[800ms]",
          heroReady ? "opacity-60" : "opacity-0"
        )}>
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-3 rounded-full bg-white/40 animate-bounce" />
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          BLOCK 2: PAIN POINTS
          ═══════════════════════════════════════════ */}
      <Section className="max-w-5xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/15 text-red-400 text-xs font-medium uppercase tracking-wider mb-6">
            Проблема
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            Испанская автошкола без подготовки —<br className="hidden sm:block" />
            <span className="text-zinc-400">это потеря времени и денег</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          {PAIN_POINTS.map((p, i) => (
            <GlowCard key={p.title} className="p-6 hover:border-white/[0.12] transition-all duration-500 group" >
              <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform", p.color)}>
                <p.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">{p.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{p.desc}</p>
            </GlowCard>
          ))}
        </div>

        {/* Solution line */}
        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-blue-500/[0.08] to-cyan-500/[0.08] border border-blue-500/[0.12]">
          <p className="text-center text-sm sm:text-base text-zinc-300 leading-relaxed">
            <span className="font-semibold text-white">Со Skilyapp</span> вы получаете выжимку правил,
            понятные объяснения на родном языке и чёткий план действий до самого получения прав.
          </p>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════
          BLOCK 3: ADVANTAGES
          ═══════════════════════════════════════════ */}
      <Section className="relative py-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-500/[0.04] rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/15 text-blue-400 text-xs font-medium uppercase tracking-wider mb-6">
              Преимущества
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold">
              Ваш самый короткий путь к правам
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {ADVANTAGES.map((a, i) => (
              <GlowCard key={a.title} className="p-6 hover:border-blue-500/20 transition-all duration-500 group">
                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/15 group-hover:border-blue-500/30 transition-all">
                    <a.icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1.5">{a.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{a.desc}</p>
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════
          BLOCK 4: HOW IT WORKS (Steps)
          ═══════════════════════════════════════════ */}
      <Section id="how-it-works" className="max-w-5xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-xs font-medium uppercase tracking-wider mb-6">
            4 шага
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold">
            Путь к европейскому водительскому удостоверению
          </h2>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-[3.5rem] left-[calc(12.5%+1.5rem)] right-[calc(12.5%+1.5rem)] h-px bg-gradient-to-r from-blue-500/30 via-emerald-500/30 via-violet-500/30 to-orange-500/30" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative text-center lg:text-left">
                {/* Step number ring */}
                <div className="flex justify-center lg:justify-start mb-5">
                  <div className={cn("relative w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", step.color)}>
                    <step.icon className="w-7 h-7 text-white" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#060a14] border-2 border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                      {i + 1}
                    </div>
                  </div>
                </div>
                <h3 className="text-base font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════
          BLOCK 5: ELIGIBILITY
          ═══════════════════════════════════════════ */}
      <Section className="max-w-3xl mx-auto px-4 py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/15 text-violet-400 text-xs font-medium uppercase tracking-wider mb-6">
            Требования DGT
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold mb-3">
            Проверьте, готовы ли вы
          </h2>
          <p className="text-zinc-400">Для получения прав категории B в Испании необходимо:</p>
        </div>

        <div className="space-y-4 mb-10">
          {ELIGIBILITY.map((e) => (
            <GlowCard key={e.text} className="p-5 hover:border-emerald-500/20 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <e.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="font-medium">{e.text}</span>
              </div>
            </GlowCard>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={scrollToForm}
            className="group px-8 py-4 rounded-2xl font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-[0.97]"
          >
            Всё сходится? Начать обучение
            <ArrowRight className="inline ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════
          BLOCK 6: PRICING (2 tiers)
          ═══════════════════════════════════════════ */}
      <Section className="relative py-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/[0.04] rounded-full blur-[140px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/15 text-amber-400 text-xs font-medium uppercase tracking-wider mb-6">
              Тарифы
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold">
              Выберите свой формат подготовки
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 items-start">
            {/* Basic */}
            <GlowCard className="p-7 hover:border-white/[0.12] transition-all">
              <h3 className="text-xl font-bold mb-1">{PLAN_BASIC.name}</h3>
              <p className="text-sm text-zinc-400 mb-6">{PLAN_BASIC.subtitle}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">€10</span>
                <span className="text-zinc-500">/мес</span>
              </div>
              <ul className="space-y-3 mb-8">
                {PLAN_BASIC.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-300">{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={scrollToForm}
                className="w-full py-3.5 rounded-xl font-semibold border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] transition-all active:scale-[0.98]"
              >
                Выбрать Базовый
              </button>
            </GlowCard>

            {/* Premium */}
            <div className="relative">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-blue-500/30 via-cyan-500/20 to-transparent curso-border-glow" style={{ borderRadius: "1rem" }} />
              <GlowCard className="relative p-7 bg-white/[0.05] border-blue-500/20 hover:border-blue-500/30 transition-all">
                <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-xs font-bold shadow-lg shadow-blue-500/20">
                  {PLAN_PREMIUM.badge}
                </div>
                <h3 className="text-xl font-bold mb-1">{PLAN_PREMIUM.name}</h3>
                <p className="text-sm text-zinc-400 mb-6">{PLAN_PREMIUM.subtitle}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">€250</span>
                  <span className="text-zinc-500">разово</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {PLAN_PREMIUM.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-200">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={scrollToForm}
                  className="w-full py-3.5 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-[0.98]"
                >
                  Выбрать Премиум
                </button>
              </GlowCard>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════
          BLOCK 7: TESTIMONIALS
          ═══════════════════════════════════════════ */}
      <Section className="max-w-5xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/15 text-yellow-400 text-xs font-medium uppercase tracking-wider mb-6">
            Отзывы
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold">
            Наши ученики уже за рулём
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <GlowCard key={t.name} className="p-6 hover:border-yellow-500/15 transition-all">
              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed mb-6 italic">
                &laquo;{t.text}&raquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/[0.1] flex items-center justify-center text-sm font-bold text-blue-300">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-zinc-500">{t.city}</div>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </Section>

      {/* ═══════════════════════════════════════════
          BLOCK 8: FAQ
          ═══════════════════════════════════════════ */}
      <Section className="max-w-2xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-4xl font-bold">
            Остались вопросы?
          </h2>
        </div>
        <div className="space-y-3">
          {FAQ_DATA.map((faq, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className={cn(
                "w-full text-left rounded-2xl border transition-all duration-300",
                openFaq === i
                  ? "bg-white/[0.04] border-blue-500/20 shadow-lg shadow-blue-500/5"
                  : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]"
              )}
            >
              <div className="flex items-center justify-between gap-4 p-5">
                <span className="font-medium text-[15px]">{faq.q}</span>
                <ChevronDown className={cn(
                  "w-5 h-5 text-zinc-500 shrink-0 transition-transform duration-300",
                  openFaq === i && "rotate-180 text-blue-400"
                )} />
              </div>
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                openFaq === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
              )}>
                <p className="px-5 pb-5 text-sm text-zinc-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* ═══════════════════════════════════════════
          BLOCK 9: SIGNUP FORM + FINAL CTA
          ═══════════════════════════════════════════ */}
      <Section id="signup-form" className="relative py-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-blue-500/[0.06] rounded-full blur-[140px]" />
        </div>

        <div className="relative max-w-lg mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Хватит откладывать свободу<br />передвижения по Испании
            </h2>
            <p className="text-zinc-400">
              Получите бесплатный демо-доступ и пройдите первый урок прямо сейчас
            </p>
          </div>

          <GlowCard className="p-8 border-blue-500/15">
            {formSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Заявка отправлена!</h3>
                <p className="text-sm text-zinc-400">
                  Мы свяжемся с вами в течение 24 часов для предоставления демо-доступа.
                </p>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  // Track conversion for Google Ads
                  if (typeof window !== "undefined" && (window as any).gtag) {
                    (window as any).gtag("event", "conversion", {
                      send_to: "AW-18034090184/_KkqCNiSzZEcEMjBqZdD",
                      value: 250.0,
                      currency: "EUR",
                    });
                  }

                  // Submit lead to Telegram bot (verify_jwt = false — публичная функция)
                  const formData = new FormData(e.currentTarget);
                  try {
                    await fetch("https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/curso-lead", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: formData.get("name"),
                        phone: formData.get("phone"),
                        message: formData.get("message") || "",
                      }),
                    });
                  } catch (err) {
                    console.error("Failed to submit lead", err);
                  }

                  setFormSent(true);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5 font-medium">Имя</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Как вас зовут?"
                    className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5 font-medium">Телефон / WhatsApp</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="+34 6XX XXX XXX"
                    className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5 font-medium">Сообщение <span className="text-zinc-600">(необязательно)</span></label>
                  <textarea
                    name="message"
                    rows={2}
                    placeholder="Вопросы, пожелания..."
                    className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="group w-full py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Получить демо-доступ
                </button>
                <p className="text-xs text-zinc-500 text-center">
                  Нажимая кнопку, вы соглашаетесь с{" "}
                  <a href="/legal/privacy" className="underline hover:text-zinc-400 transition-colors">
                    политикой конфиденциальности
                  </a>
                </p>
              </form>
            )}
          </GlowCard>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.05] py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <a href="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-[10px] font-black text-white">S</div>
              Skilyapp
            </a>
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <a href="/legal/terms" className="hover:text-zinc-300 transition-colors">Оферта</a>
              <a href="/legal/privacy" className="hover:text-zinc-300 transition-colors">Конфиденциальность</a>
              <a href="https://t.me/skilyapp_bot" target="_blank" rel="noopener" className="hover:text-zinc-300 transition-colors">Telegram</a>
            </div>
          </div>
          <div className="mt-6 text-center text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} Skilyapp. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CourseLanding;
