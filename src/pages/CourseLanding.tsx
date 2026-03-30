import { useState, useEffect, useRef, useCallback } from "react";
import { SeoHead } from "@/components/seo/SeoHead";
import { motion, AnimatePresence } from "framer-motion";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns";
import { ArcGalleryHero } from "@/components/ui/arc-gallery-hero";
import { FAQ } from "@/components/ui/faq-tabs";
import { PricingCards, type DbPlanPrices } from "@/components/ui/pricing-cards";
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";
import {
  CheckCircle2,
  Globe,
  BookOpen,
  Clock,
  Smartphone,
  Zap,
  MessageCircle,
  Shield,
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

const ARC_IMAGES = Array.from({ length: 12 }, (_, i) => `/assets/landing/arc/img-${String(i + 1).padStart(2, '0')}.png`);

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
  { text: "Живой курс: 2 месяца", icon: Clock },
  { text: "Оформление документов под ключ", icon: FileText },
  { text: "Зачет стажа из стран СНГ", icon: BadgeCheck },
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

const FAQ_CATEGORIES = {
  general: "Общая информация",
  course: "О курсе",
};

const NEW_FAQ_DATA = {
  general: [
    {
      question: "Нужно ли знать испанский для сдачи?",
      answer: "Теоретический экзамен доступен на нескольких языках (испанский, английский, французский, немецкий), но вождение сдается исключительно на испанском. Наш курс ведется на русском языке с постепенным погружением в испанскую терминологию. Вы без труда выучите все необходимые автомобильные термины и сможете уверенно сдать теорию на испанском, не прибегая к словарю."
    },
    {
      question: "Можно ли сдать теорию и вождение в один день?",
      answer: "Нет. Сначала необходимо успешно сдать теоретическую часть. Как правило, результаты теории публикуются в тот же или на следующий рабочий день. Только после официального подтверждения сдачи теории автошкола может записать вас на практический экзамен по вождению."
    },
    {
      question: "Какой минимальный возраст для получения прав?",
      answer: "Права категории B в Испании выдаются с 18 лет. Однако сдавать теоретический экзамен можно заранее — начиная с 17 лет и 9 месяцев. Практический экзамен доступен строго после совершеннолетия (18 лет)."
    },
    {
      question: "Нужно ли заново сдавать на права резидентам?",
      answer: "Да. Испания и РФ не имеют договора о взаимном признании водительских удостоверений. Поэтому резидентам необходимо пройти обучение, сдать теорию и практику для получения местных прав. Иностранными правами можно пользоваться не более 6 месяцев с момента получения ВНЖ в Испании."
    },
    {
      question: "Нужно ли проходить медицинское обследование?",
      answer: "Обязательно (справка Psicotécnico). Перед допуском к экзаменам необходимо пройти медкомиссию (проверка зрения, координации, общего состояния здоровья). Справка действительна 90 дней, поэтому ее стоит получать ближе к дате подачи документов в DGT."
    },
    {
      question: "Сколько практических уроков вождения потребуется?",
      answer: "Минимального обязательного количества часов по закону нет. Однако мы рекомендуем брать не менее 10–12 занятий. Провал на практике влечет дополнительные расходы: вам придется заново оплачивать пошлину DGT (Tasa DGT) и услуги автошколы по оформлению документов. Дешевле взять больше уроков и сдать с первого раза."
    },
    {
      question: "С какими документами можно сдавать экзамен?",
      answer: "DGT требует легального статуса нахождения в стране. Подходят: карточка резидента TIE (Arraigo, No lucrativa, виза инвестора и др.), регистрация гражданина ЕС (одного NIE недостаточно), вид на жительство по учебе (срок более 6 месяцев), красная карта беженца (через 6 месяцев после подачи) или испанский DNI."
    }
  ],
  course: [
    {
      question: "Как происходит оплата курса?",
      answer: "Оплата делится на две части для вашего удобства. 50% стоимости (предоплата) вносится при бронировании места и заключении договора. Оставшиеся 50% оплачиваются непосредственно перед стартом занятий. Это гарантирует вам место в группе и бронирует доступ к платформе."
    },
    {
      question: "На каком языке проходит экзамен в автошколе?",
      answer: "По умолчанию в DGT экзамен сдается на испанском (в ряде регионов доступен английский, французский или немецкий). Наш курс сфокусирован на подготовке к сдаче именно на испанском языке, выстраивая базу терминологии так, чтобы вам не потребовался переводчик."
    },
    {
      question: "Сколько времени занимает обучение?",
      answer: "Интенсивный курс рассчитан на 2 месяца живых эфиров (2 раза в неделю по 2 часа). Благодаря грамотному расписанию и нашей AI-платформе с базой DGT, в среднем студенты готовы к успешной сдаче через 6–8 недель регулярной практики."
    },
    {
      question: "Могу ли я учить теорию у вас, а практику в своем городе?",
      answer: "Абсолютно! Экзамен сдается в государственном органе DGT. Результат успешной сдачи теории закрепляется за вами в базе DGT по всей Испании. Вы можете пройти теоретическую подготовку онлайн с нами, а затем выбрать любую удобную автошколу в своем регионе."
    },
    {
      question: "Подойдет ли курс, если я уже пытался сдать и провалился?",
      answer: "Да, этот курс идеально вам подойдет. Живой формат с преподавателем позволяет разобрать конкретные ошибки и закрыть пробелы, которые мешали сдать. Многие студенты приходят именно после неудачных самостоятельных попыток и благополучно сдают теорию с нашей помощью."
    },
    {
      question: "Подходит ли курс для других категорий (мотоцикл)?",
      answer: "Курс полностью закрывает 'Общую теорию' (Тест Común), которая идентична для категорий B (легковое авто) и A1/A2 (мотоциклы). Однако для мотоцикла нужно сдавать еще дополнительный специфический тест, который в рамки данного курса не входит. Для категории B этот курс является исчерпывающим."
    }
  ]
};

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


const TESTIMONIALS = [
  {
    text: "Три раза подходила к экзамену с книжкой на испанском — не понимала ничего. Тут прошла за 5 недель и с первого раза. Даже не верится.",
    image: "https://randomuser.me/api/portraits/women/44.jpg",
    name: "Ольга Семёнова",
    role: "Барселона · домохозяйка",
  },
  {
    text: "Работаю в стройке, времени нет вообще. Учился по 15-20 минут в обед со смартфона. Сдал. Куратор реально помог с бумагами в DGT.",
    image: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "Виктор Лученко",
    role: "Мадрид · строитель",
  },
  {
    text: "Я уже 54 и боялась, что мозг не потянет. Всё объяснено так просто, что даже страхи ушли. Сдала с 28 правильными из 30.",
    image: "https://randomuser.me/api/portraits/women/62.jpg",
    name: "Наталья Воронцова",
    role: "Аликанте · пенсионерка",
  },
  {
    text: "Я студент, денег в обрез. Автошкола просила 280€ только за теорию. Тут заплатил в 10 раз меньше и сдал лучше, чем те, кто ходил на курсы.",
    image: "https://randomuser.me/api/portraits/men/18.jpg",
    name: "Артём Ковалёв",
    role: "Валенсия · студент",
  },
  {
    text: "Переехала с двумя детьми, муж в командировках. Без прав — как без рук. Спасибо, что есть поддержка на русском, прям выдыхаешь.",
    image: "https://randomuser.me/api/portraits/women/29.jpg",
    name: "Марина Фёдорова",
    role: "Малага · мама в декрете",
  },
  {
    text: "Права с Украины не меняют. Пришлось сдавать с нуля в 38 лет. Честно, думал всё — провалюсь. Но нет, с первого раза. Система работает.",
    image: "https://randomuser.me/api/portraits/men/41.jpg",
    name: "Олег Бондаренко",
    role: "Бильбао · инженер",
  },
  {
    text: "Испанский у меня так себе. Но экзамен сдала на испанском — потому что учила именно те слова из вопросов, а не грамматику. Спасибо за точность.",
    image: "https://randomuser.me/api/portraits/women/11.jpg",
    name: "Светлана Журавлёва",
    role: "Севилья · переводчик",
  },
  {
    text: "Открываю свой бизнес, нужно ездить к клиентам. Прошёл курс параллельно с работой, никаких офлайн прогулок в автошколу не потребовалось.",
    image: "https://randomuser.me/api/portraits/men/55.jpg",
    name: "Дмитрий Прохоров",
    role: "Мадрид · предприниматель",
  },
  {
    text: "Мне 22, сдала первый раз — вроде норм. Но главное — не надо было платить автошколе. Всё ясно, быстро, без воды. Рекомендую девчонкам.",
    image: "https://randomuser.me/api/portraits/women/22.jpg",
    name: "Катя Миронова",
    role: "Барселона · официантка",
  },
];

const testimonialsCol1 = TESTIMONIALS.slice(0, 3);
const testimonialsCol2 = TESTIMONIALS.slice(3, 6);
const testimonialsCol3 = TESTIMONIALS.slice(6, 9);

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
// ─────────────────────────────────────────────
// COMPONENT: RotatingHeroBadge
// ─────────────────────────────────────────────
const RotatingHeroBadge = () => {
  const [index, setIndex] = useState(0);

  // Compute next first Tuesday dynamically
  const getNextFirstTuesday = () => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();

    const getFirstTuesday = (y: number, m: number) => {
      const d = new Date(y, m, 1);
      const day = d.getDay(); // 0-Sun.. 2-Tue
      const offset = (2 - day + 7) % 7;
      d.setDate(1 + offset);
      return d;
    };

    let nextTuesday = getFirstTuesday(year, month);
    // If today is past the Tuesday, bump to next month
    if (now.getTime() > nextTuesday.getTime() + 24 * 60 * 60 * 1000) {
      if (month === 11) {
        month = 0;
        year++;
      } else {
        month++;
      }
      nextTuesday = getFirstTuesday(year, month);
    }
    return nextTuesday;
  };

  const nextDate = getNextFirstTuesday();
  const dateFormatted = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(nextDate);

  // Derive stream number assuming March 2026 is stream 50
  const buildStreamNumber = () => {
     let currentStream = 50 + (nextDate.getFullYear() - 2026) * 12 + (nextDate.getMonth() - 2); 
     return currentStream;
  };

  const streamNum = buildStreamNumber();

  const badges = [
    {
      id: 0,
      content: (
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span className="text-blue-200 text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-sm">Набор на {streamNum} поток открыт</span>
        </div>
      ),
      className: "bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:bg-blue-500/20",
    },
    {
      id: 1,
      content: (
        <div className="group flex items-center gap-3 px-1.5 py-1.5 pr-4">
          <div className="bg-white/10 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
            LIVE
          </div>
          <span className="text-zinc-300 text-xs sm:text-sm font-medium tracking-wide">Старт потока: {dateFormatted}</span>
          <div className="h-4 w-px bg-white/10 hidden sm:block mx-1"></div>
          <span className="text-zinc-500 hidden sm:flex items-center gap-1 text-xs font-semibold">
            Забронировать
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform text-zinc-400" />
          </span>
        </div>
      ),
      className: "bg-white/[0.03] border-white/5 shadow-[0_0_15px_rgba(255,255,255,0.02)] hover:bg-white/10",
    },
    {
      id: 2,
      content: (
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
          <span className="text-orange-200 text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-sm">Успейте занять место: набор скоро закроется</span>
        </div>
      ),
      className: "bg-orange-500/10 border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)] hover:bg-orange-500/20",
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % badges.length);
    }, 4500); 
    return () => clearInterval(timer);
  }, [badges.length]);

  const activeBadge = badges[index];

  return (
    <div 
      className="relative flex justify-center items-center h-12 w-full mb-6 cursor-pointer"
      onClick={() => {
        const form = document.getElementById('enroll-form');
        if (form) form.scrollIntoView({ behavior: 'smooth' });
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeBadge.id}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`absolute flex justify-center items-center rounded-full border backdrop-blur-md transition-colors ${activeBadge.className}`}
        >
          {activeBadge.content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/* ─────────────────────────────────────────────
   COMPONENT: PricingCountdown
   Считает время до ближайшего первого вторника
   ───────────────────────────────────────────── */
const PricingCountdown = () => {
  const getNextFirstTuesday = () => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    const getFirst = (y: number, m: number) => {
      const d = new Date(y, m, 1);
      const offset = (2 - d.getDay() + 7) % 7;
      d.setDate(1 + offset);
      return d;
    };
    let target = getFirst(year, month);
    if (now.getTime() > target.getTime() + 24 * 60 * 60 * 1000) {
      month = month === 11 ? (year++, 0) : month + 1;
      target = getFirst(year, month);
    }
    return target;
  };

  const calcDiff = () => {
    const diff = getNextFirstTuesday().getTime() - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
    const s = Math.floor(diff / 1000);
    return {
      d: Math.floor(s / 86400),
      h: Math.floor((s % 86400) / 3600),
      m: Math.floor((s % 3600) / 60),
      s: s % 60,
    };
  };

  const [time, setTime] = useState(calcDiff);

  useEffect(() => {
    const t = setInterval(() => setTime(calcDiff()), 1000);
    return () => clearInterval(t);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-orange-300">
      <span className="text-zinc-500 font-sans font-normal text-[10px] mr-1 hidden sm:block">До старта:</span>
      <span>{time.d}д</span>
      <span className="text-zinc-600">:</span>
      <span>{pad(time.h)}ч</span>
      <span className="text-zinc-600">:</span>
      <span>{pad(time.m)}м</span>
      <span className="text-zinc-600">:</span>
      <span>{pad(time.s)}с</span>
    </div>
  );
};

const CourseLanding = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [heroReady, setHeroReady] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [dbPrices, setDbPrices] = useState<DbPlanPrices | undefined>(undefined);

  // Загружаем цены из course_plans — единый источник правды с ботом
  useEffect(() => {
    getSupabaseClient().then((sb) =>
      sb.from('course_plans' as never).select('id, price_eur, original_price_eur, payment_link').eq('active', true)
    ).then(({ data }) => {
      if (!data || !Array.isArray(data)) return;
      const map: DbPlanPrices = {};
      (data as { id: string; price_eur: number; original_price_eur: number | null; payment_link: string | null }[])
        .forEach((p) => { map[p.id] = p; });
      setDbPrices(map);
    }).catch(() => { /* fallback to hardcoded */ });
  }, []);

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
        description="Запись на живой онлайн-курс по теории DGT на русском языке. 9 из 10 сдают с первой попытки. Полное сопровождение: от документов до получения прав."
        canonicalUrl="https://skilyapp.com/curso"
      />

      {/* ═══════════════════════════════════════════
          BLOCK 1: HERO — Arc Gallery
          ═══════════════════════════════════════════ */}
      <header className="relative min-h-[100dvh] flex flex-col items-center overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-blue-600/[0.08] rounded-full blur-[140px] curso-glow-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/[0.05] rounded-full blur-[120px]" />
          <div className="absolute top-[20%] left-[-5%] w-[300px] h-[300px] bg-violet-500/[0.04] rounded-full blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }} />
        </div>

        {/* Navbar */}
        <nav className={cn(
          "relative z-50 flex items-center justify-between w-full px-6 py-6 md:px-10 max-w-[1325px] mx-auto transition-all duration-700",
          heroReady ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-6"
        )}>
          <a href="/" className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-white/90 hover:text-white transition-colors">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm font-black shadow-lg shadow-blue-500/20 text-white">S</div>
            Skilyapp
          </a>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400 mr-2">
              <button onClick={scrollToHowItWorks} className="hover:text-white transition-colors">Формат курса</button>
              <button onClick={() => {
                const form = document.getElementById('enroll-form');
                if (form) form.scrollIntoView({ behavior: 'smooth' });
              }} className="hover:text-white transition-colors">Для кого</button>
              <a href="https://t.me/skilyapp_bot" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Отзывы</a>
            </div>

            <a
              href="https://t.me/skilyapp_bot"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex bg-white/10 border border-white/10 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/20 transition-all active:scale-95 backdrop-blur-md shadow-lg items-center gap-2"
            >
              Задать вопрос
            </a>
          </div>
        </nav>

        {/* Arc Gallery */}
        <ArcGalleryHero
          images={ARC_IMAGES}
          startAngle={15}
          endAngle={165}
          radiusLg={620}
          radiusMd={440}
          radiusSm={280}
          cardSizeLg={110}
          cardSizeMd={90}
          cardSizeSm={64}
          overlapLg={-450}
          overlapMd={-300}
          overlapSm={-180}
        >
          {/* Content inside the arc curve */}
          {/* Badge */}
          <div className={cn(
            "transition-all duration-700 delay-100",
            heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}>
            <RotatingHeroBadge />
          </div>

          {/* H1 */}
          <h1 className={cn(
            "max-w-4xl mx-auto text-4xl sm:text-5xl lg:text-6xl xl:text-[4.25rem] font-extrabold leading-[1.1] tracking-tight mb-6 transition-all duration-700 delay-200",
            heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}>
            Сдаем теорию DGT.
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent curso-gradient-x sm:mt-2 inline-block">
              Вместе и с первой попытки.
            </span>
          </h1>

          {/* Subtitle */}
          <p className={cn(
            "max-w-3xl mx-auto text-base sm:text-lg lg:text-xl text-zinc-400 mb-10 leading-relaxed transition-all duration-700 delay-300 font-medium",
            heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}>
            Забудьте про страх перед испанской бюрократией и терминологией. Получите доступ к премиальному курсу, где вас будут сопровождать от первого урока до успешной сдачи экзамена в Trafico.
          </p>

          {/* CTA buttons */}
          <div className={cn(
            "flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 transition-all duration-700 delay-[400ms]",
            heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}>
            <button
              onClick={scrollToForm}
              className="group relative w-full sm:w-auto px-7 py-3.5 rounded-2xl font-semibold text-base overflow-hidden transition-all active:scale-[0.97]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 transition-all group-hover:brightness-110" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-blue-400 to-cyan-400" />
              <span className="relative flex items-center justify-center gap-2">
                Забронировать место
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button
              onClick={scrollToHowItWorks}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl font-semibold text-base border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all active:scale-[0.97] flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              Как это работает?
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>

          {/* Trust pills */}
          <div className={cn(
            "flex flex-wrap items-center justify-center gap-2.5 mb-10 transition-all duration-700 delay-500",
            heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}>
            {TRUST_PILLS.map((pill) => (
              <div
                key={pill.text}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-400"
              >
                <pill.icon className="w-3.5 h-3.5 text-blue-400" />
                {pill.text}
              </div>
            ))}
          </div>

          {/* Animated stats */}
          <div className={cn(
            "grid grid-cols-3 gap-5 max-w-sm mx-auto transition-all duration-700 delay-[600ms]",
            heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}>
            {HERO_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                  <AnimatedNumber value={s.value} suffix={s.suffix} />
                </div>
                <div className="text-[11px] sm:text-xs text-zinc-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </ArcGalleryHero>

        {/* Scroll indicator */}
        <div className={cn(
          "absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-700 delay-[800ms] z-20",
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
      <Section className="max-w-[1325px] mx-auto px-4 py-24">
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
        <div className="relative max-w-[1325px] mx-auto px-4">
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
      <Section id="how-it-works" className="max-w-[1325px] mx-auto px-4 py-24">
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
          BLOCK 6: PRICING (3 tiers)
          ═══════════════════════════════════════════ */}
      <Section className="relative py-24" id="pricing">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-500/[0.04] rounded-full blur-[150px]" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-violet-500/[0.03] rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-[1325px] mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/15 text-amber-400 text-xs font-bold uppercase tracking-widest mb-6">
              Специальное предложение потока
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
              Выберите свой формат
            </h2>
            <p className="text-zinc-400 text-base max-w-lg mx-auto">
              Все тарифы включают 2 месяца живых занятий и доступ к платформе Skilyapp в подарок
            </p>
          </div>

          {/* Urgency bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span className="text-zinc-300 text-sm font-medium">Набор в поток открыт</span>
                <span className="hidden sm:inline text-zinc-700">·</span>
                <span className="hidden sm:inline text-orange-400 text-sm font-semibold">
                  4 места из 8
                </span>
              </div>
              <PricingCountdown />
            </div>
          </div>

          {/* Three cards */}
          <PricingCards onBooking={scrollToForm} />

          {/* Trust footer */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-zinc-600 text-xs">
            <span className="flex items-center gap-1.5">🔒 Цена фиксируется при бронировании</span>
            <span className="flex items-center gap-1.5">💳 Предоплата 50% · остаток перед стартом</span>
            <span className="flex items-center gap-1.5">🔁 Без скрытых платежей</span>
          </div>

          {/* Platform-only note */}
          <p className="text-center text-zinc-600 text-sm mt-6">
            Нужен только доступ к платформе без живого курса?{" "}
            <a href="/app" className="text-zinc-400 underline underline-offset-4 hover:text-white transition-colors">
              Самостоятельная подготовка от €10/мес →
            </a>
          </p>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════
          BLOCK 7: TESTIMONIALS (animated columns)
          ═══════════════════════════════════════════ */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-yellow-500/[0.03] rounded-full blur-[140px]" />
        </div>

        {/* Header — constrained width */}
        <div className="relative max-w-2xl mx-auto px-4 text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/15 text-yellow-400 text-xs font-medium uppercase tracking-wider mb-5">
              Отзывы
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold mb-3">
              Наши ученики уже за рулём
            </h2>
            <p className="text-zinc-500 text-sm">
              Реальные люди из разных городов Испании — разный возраст, разные обстоятельства, один результат.
            </p>
          </motion.div>
        </div>

        {/* Columns — no width constraint to fill screen naturally */}
        <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden px-4">
          <TestimonialsColumn testimonials={testimonialsCol1} duration={25} />
          <TestimonialsColumn testimonials={testimonialsCol2} duration={30} className="hidden md:block" />
          <TestimonialsColumn testimonials={testimonialsCol3} duration={20} className="hidden lg:block" />
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          DIVIDER
          ───────────────────────────────────────────── */}
      <div className="relative w-full h-px max-w-[1325px] mx-auto my-8">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent blur-[2px]" />
      </div>

      {/* ═══════════════════════════════════════════
          BLOCK 8: FAQ
          ═══════════════════════════════════════════ */}
      <FAQ 
        id="faq"
        title="Остались вопросы?"
        subtitle="FAQ"
        categories={FAQ_CATEGORIES}
        faqData={NEW_FAQ_DATA}
      />

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
              Количество мест в группе ограничено. Оставьте заявку, чтобы закрепить за собой место и получить бесплатную консультацию.
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
                  Мы свяжемся с вами в течение 24 часов, чтобы подтвердить место и ответить на все вопросы.
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
                  Забронировать место
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
        <div className="max-w-[1325px] mx-auto px-4">
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
