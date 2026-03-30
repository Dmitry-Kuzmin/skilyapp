import { useState, useEffect, useRef, useCallback } from "react";
import { SeoHead } from "@/components/seo/SeoHead";
import { motion, AnimatePresence } from "framer-motion";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns";
import { ArcGalleryHero } from "@/components/ui/arc-gallery-hero";
import { FAQ } from "@/components/ui/faq-tabs";
import { PricingCards, type DbPlanPrices } from "@/components/ui/pricing-cards";
import { CourseComparison } from "@/components/ui/course/CourseComparison";
import { CourseTimeline } from "@/components/ui/course/CourseTimeline";
import { CourseChecklist } from "@/components/ui/course/CourseChecklist";
import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
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
    desc: "Перевели всю терминологию DGT на понятный русский язык. Объясняем ПДД, а не заставляем зубрить.",
  },
  {
    icon: Stethoscope,
    title: "Тесты по официальной базе",
    desc: "Более 16.000 актуальных вопросов от Генерального управления транзитом (DGT).",
  },
];

const FAQ_CATEGORIES = {
  process: "Получение прав в Испании",
  theory: "Теоретический экзамен",
  practice: "Практика и вождение",
  course: "О курсе и платформе",
};

const NEW_FAQ_DATA = {
  process: [
    {
      question: "Как вообще получить права в Испании?",
      answer: "Всё зависит от вашей ситуации:\n1. Права из стран ЕС: можно пользоваться без обмена.\n2. Обмен (Canje): возможен, если между странами есть соглашение (Украина, Молдова, Грузия и др.) и права были получены ДО вашей первой резиденции в Испании.\n3. Остальные случаи (Россия, Беларусь, Казахстан и др.): после 6 месяцев легального пребывания в Испании ваши права перестают действовать. Стаж не дает привилегий на экзаменах — вам придется сдавать теорию и практику на общих основаниях."
    },
    {
      question: "С какими документами можно сдавать экзамен?",
      answer: "DGT требует подтверждения легального статуса. Подойдут: карточка резидента TIE (Arraigo, No lucrativa, виза инвестора и др.), регистрация гражданина ЕС (одного NIE недостаточно), ВНЖ по учебе (на срок более 6 месяцев), красная карта беженца (через 6 месяцев после подачи) или DNI."
    },
    {
      question: "Можно купить водительское удостоверение?",
      answer: "Нет, мы не связываемся с криминалом. Покупка прав не даст никаких гарантий: вы будете бояться каждой проверки, а поддельные или купленные в обход системы документы рано или поздно аннулируются полицией. Кроме того, предлагаемые в сети «схемы» стоят во много раз дороже реального обучения. Получить права легально и сдать экзамены с нами — это надёжно и гораздо дешевле."
    },
    {
      question: "Какой минимальный возраст для получения прав?",
      answer: "Права категории B в Испании выдаются строго с 18 лет. Однако готовиться и сдавать теоретический экзамен можно досрочно — начиная с 17 лет и 9 месяцев. Практика вождения доступна только после совершеннолетия."
    }
  ],
  theory: [
    {
      question: "Как проводят экзамен теории?",
      answer: "Для категории B теоретический экзамен состоит из 30 вопросов. На их решение отводится 30 минут, для успешной сдачи допускается максимум 3 ошибки. Как правило, всё проходит в компьютерных залах DGT (Дорожной полиции). Исключением являются некоторые региональные центры, где экзамены всё ещё могут проводить на бумажных бланках."
    },
    {
      question: "Можно ли сдать теорию без автошколы?",
      answer: "Да! Вы можете подготовиться с нами и записаться на теоретический экзамен самостоятельно, не привязываясь к автошколе. Оформить документы можно онлайн: необходимо получить запись (Cita) и уплатить госпошлину DGT (чуть больше 94 евро). Мы предоставляем нашим студентам четкие инструкции, как это сделать правильно и без нервов. (А вот для практического экзамена уже понадобится местная автошкола)."
    },
    {
      question: "Можно вызубрить наизусть ответы на тесты?",
      answer: "Официальная база DGT насчитывает более 16 000 вопросов. В испанских тестах очень много хитрых формулировок и «ловушек». Чтобы уверенно отвечать на экзамене, необходимо понимать логику правил, а не механически заучивать ответы к тестам. Именно поэтому мы детально разбираем каждую тему — от устройства автомобиля до сложных ситуаций на перекрестках."
    },
    {
      question: "Зачем так много учить теорию?",
      answer: "Наш курс адаптирован в том числе для студентов, которые не владеют испанским языком. В процессе подготовки мы параллельно разбираем специфические испанские термины и все каверзные вопросы. Мы систематизируем знания так, чтобы максимально сократить время вашей подготовки и дать всю теорию испанских ПДД в сжатые и понятные сроки."
    }
  ],
  practice: [
    {
      question: "Как проводят экзамен вождения?",
      answer: "Экзамен сдается в реальных условиях дорожного движения и длится от 25 до 30 минут (для категории B «площадку» не сдают). Экзаменатор от DGT сидит на заднем сиденье вашей учебной машины, а инструктор находится рядом с двойными педалями, но помогать он не имеет права. Экзамены обычно проходят в первую половину дня."
    },
    {
      question: "У меня многолетний опыт вождения. Можно сдать без уроков?",
      answer: "Нет, совсем без уроков не получится — DGT обязывает вас взять как минимум одно практическое занятие перед экзаменом. Почти всегда одного занятия не хватает даже крайне опытным водителям. Экзамен требует строгого соблюдения испанских нюансов: активного контроля слепых зон (angulos muertos) и круговых перекрестков. За 3-4 урока мы помогаем опытным водителям скорректировать их привычки и пройтись непосредственно по зонам сдачи экзамена."
    },
    {
      question: "Сколько практических уроков нужно новичкам?",
      answer: "Минимальной часовой нормы по закону нет. Новичкам мы рекомендуем рассчитывать от 10-15 и более уроков, всё очень индивидуально. Важно помнить, что каждая пересдача увеличивает итоговые траты (новая пошлина DGT и оплата автошколе за переоформление). Поэтому выгоднее брать оптимальное число уроков и сдавать уверенно."
    },
    {
      question: "Можно ли сдать теорию и вождение в один день?",
      answer: "Нет. Сначала вы должны успешно сдать теорию. Только после того, как в системе DGT появится официальный статус о сдаче (обычно на следующий рабочий день), вы сможете подать заявку на прохождение практического экзамена."
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
// ─────────────────────────────────────────────
// COMPONENT: RotatingHeroBadge
// Данные берутся из БД (course_streams) через props
// ─────────────────────────────────────────────
type StreamInfo = { number: number; start_date: string; spots_total: number; spots_enrolled: number };

const RotatingHeroBadge = ({ stream }: { stream?: StreamInfo | null }) => {
  const [index, setIndex] = useState(0);

  // Форматирование даты из ISO string
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(iso + 'T00:00:00'));

  // Fallback: вычислить ближайший первый вторник
  const getFallbackDate = (): { dateFormatted: string; streamNum: number } => {
    const now = new Date();
    let year = now.getFullYear(); let month = now.getMonth();
    const getFirstTuesday = (y: number, m: number) => {
      const d = new Date(y, m, 1); const day = d.getDay();
      d.setDate(1 + (2 - day + 7) % 7); return d;
    };
    let nextTuesday = getFirstTuesday(year, month);
    if (now.getTime() > nextTuesday.getTime() + 86400000) {
      month === 11 ? (year++, month = 0) : month++;
      nextTuesday = getFirstTuesday(year, month);
    }
    return {
      dateFormatted: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(nextTuesday),
      streamNum: 50 + (nextTuesday.getFullYear() - 2026) * 12 + (nextTuesday.getMonth() - 2),
    };
  };

  const { dateFormatted, streamNum } = stream
    ? { dateFormatted: formatDate(stream.start_date), streamNum: stream.number }
    : getFallbackDate();

  const spotsLeft = stream ? stream.spots_total - stream.spots_enrolled : 4;

  const badges = [
    {
      id: 0,
      content: (
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span className="text-blue-200 text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-sm">
            Набор на {streamNum} поток открыт · {spotsLeft} мест
          </span>
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
          <span className="text-orange-200 text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-sm">
            {spotsLeft <= 2 ? `⚠️ Осталось ${spotsLeft} места — торопись!` : 'Успейте занять место: набор скоро закроется'}
          </span>
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
  const [dbStreams, setDbStreams] = useState<StreamInfo[] | null>(null);

  // Загружаем ЦЕНЫ и ПОТОКИ из БД — единый источник правды с ботом
  useEffect(() => {
    getSupabaseClient().then(async (sb) => {
      const [plansRes, streamsRes] = await Promise.all([
        sb.from('course_plans' as never).select('id, price_eur, original_price_eur, payment_link').eq('active', true),
        sb.from('course_streams' as never).select('number, start_date, spots_total, spots_enrolled').eq('status', 'open').order('start_date', { ascending: true }).limit(3),
      ]);

      if (plansRes.data && Array.isArray(plansRes.data)) {
        const map: DbPlanPrices = {};
        (plansRes.data as { id: string; price_eur: number; original_price_eur: number | null; payment_link: string | null }[])
          .forEach((p) => { map[p.id] = p; });
        setDbPrices(map);
      }

      if (streamsRes.data && Array.isArray(streamsRes.data)) {
        setDbStreams(streamsRes.data as StreamInfo[]);
      }
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
            <RotatingHeroBadge stream={dbStreams?.[0] ?? null} />
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
          BLOCK 2: COMPARISON (Evolution)
          ═══════════════════════════════════════════ */}
      <Section className="relative py-24 px-4 w-full overflow-hidden">
        {/* Abstract background blur for right side highlights */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 left-3/4 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-sky-500/[0.03] rounded-full blur-[120px]" />
          <div className="absolute top-1/2 right-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-500/[0.02] rounded-full blur-[100px]" />
        </div>
        <CourseComparison />
      </Section>

      {/* ═══════════════════════════════════════════
          BLOCK 4: HOW IT WORKS (Steps)
          ═══════════════════════════════════════════ */}
      <Section id="how-it-works" className="max-w-[1400px] mx-auto py-24">
        <CourseTimeline />
      </Section>


      <CourseChecklist />

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

          {/* Urgency bar — данные из course_streams */}
          {(() => {
            const nextStream = dbStreams?.[0];
            const spotsLeft = nextStream ? nextStream.spots_total - nextStream.spots_enrolled : 4;
            const spotsTotal = nextStream?.spots_total ?? 8;
            const streamNum = nextStream?.number ?? 51;
            return (
              <div className="max-w-2xl mx-auto mb-8">
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                    <span className="text-zinc-300 text-sm font-medium">Поток {streamNum} — набор открыт</span>
                    <span className="hidden sm:inline text-zinc-700">·</span>
                    <span className={cn("hidden sm:inline text-sm font-semibold", spotsLeft <= 2 ? "text-rose-400" : "text-orange-400")}>
                      {spotsLeft} из {spotsTotal} мест
                    </span>
                    {dbStreams && dbStreams.length > 1 && (
                      <>
                        <span className="text-zinc-700">·</span>
                        <span className="text-zinc-500 text-xs">+{dbStreams.length - 1} следующих потока</span>
                      </>
                    )}
                  </div>
                  <PricingCountdown />
                </div>
              </div>
            );
          })()}

          {/* Three cards */}
          <PricingCards onBooking={scrollToForm} dbPrices={dbPrices} />

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
          CINEMATIC CTA FOOTER
          ═══════════════════════════════════════════ */}
      <CinematicHero />

      
    </div>
  );
};

export default CourseLanding;
