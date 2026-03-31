import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { SeoHead } from "@/components/seo/SeoHead";
import { motion, AnimatePresence } from "framer-motion";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns";
import { ArcGalleryHero } from "@/components/ui/arc-gallery-hero";
import { FAQ } from "@/components/ui/faq-tabs";
import { PricingCards, type DbPlanPrices } from "@/components/ui/pricing-cards";
import { CourseComparison } from "@/components/ui/course/CourseComparison";
import { CourseTimeline } from "@/components/ui/course/CourseTimeline";
import { CourseChecklist } from "@/components/ui/course/CourseChecklist";
import { IndividualPricingCards } from "@/components/ui/course/IndividualPricingCards";
import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
import { useCrispChat } from "@/hooks/useCrispChat";
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
  Lock,
  Calendar,
  Users,
  Flame,
  Menu,
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
  legal: "Условия и оплата",
};
const NEW_FAQ_DATA = {
  process: [
    {
      question: "Как вообще получить права в Испании?",
      answer: "Всё зависит от вашей ситуации:\n\n1. Права из стран ЕС: можно пользоваться без обмена.\n\n2. Обмен (Canje): возможен, если между странами есть соглашение (Украина, Молдова, Грузия и др.) и права были получены ДО вашей первой резиденции в Испании.\n\n3. Остальные случаи (Россия, Беларусь, Казахстан и др.): после 6 месяцев легального пребывания в Испании ваши права перестают действовать.\n\nСтаж не дает привилегий на экзаменах — вам придется сдавать теорию и практику на общих основаниях."
    },
    {
      question: "С какими документами можно сдавать экзамен?",
      answer: "DGT требует подтверждения легального статуса. Подойдут:\n\n• карточка резидента TIE (Arraigo, No lucrativa, виза инвестора и др.)\n• регистрация гражданина ЕС (одного NIE недостаточно)\n• ВНЖ по учебе (на срок более 6 месяцев)\n• красная карта беженца (через 6 месяцев после подачи)\n• DNI."
    },
    {
      question: "Можно купить водительское удостоверение?",
      answer: "Нет, мы не связываемся с криминалом. Покупка прав не даст никаких гарантий: вы будете бояться каждой проверки, а поддельные или купленные в обход системы документы рано или поздно аннулируются полицией.\n\nКроме того, предлагаемые в сети «схемы» стоят во много раз дороже реального обучения. Получить права легально и сдать экзамены с нами — это надёжно и гораздо дешевле."
    },
    {
      question: "Какой минимальный возраст для получения прав?",
      answer: "Права категории B в Испании выдаются строго с 18 лет.\n\nОднако готовиться и сдавать теоретический экзамен можно досрочно — начиная с 17 лет и 9 месяцев. Практика вождения доступна только после совершеннолетия."
    }
  ],
  theory: [
    {
      question: "Как проводят экзамен теории?",
      answer: "Для категории B теоретический экзамен состоит из 30 вопросов. На их решение отводится 30 минут, для успешной сдачи допускается максимум 3 ошибки.\n\nКак правило, всё проходит в компьютерных залах DGT (Дорожной полиции). Исключением являются некоторые региональные центры, где экзамены всё ещё могут проводить на бумажных бланках."
    },
    {
      question: "Можно ли сдать теорию без автошколы?",
      answer: "Да! Вы можете подготовиться с нами и записаться на теоретический экзамен самостоятельно, не привязываясь к автошколе.\n\nОформить документы можно онлайн: необходимо получить запись (Cita) и уплатить госпошлину DGT (чуть больше 94 евро).\n\nМы предоставляем нашим студентам четкие инструкции, как это сделать правильно и без нервов. (А вот для практического экзамена уже понадобится местная автошкола)."
    },
    {
      question: "Можно вызубрить наизусть ответы на тесты?",
      answer: "Официальная база DGT насчитывает более 16 000 вопросов. В испанских тестах очень много хитрых формулировок и «ловушек».\n\nЧтобы уверенно отвечать на экзамене, необходимо понимать логику правил, а не механически заучивать ответы к тестам. Именно поэтому мы детально разбираем каждую тему — от устройства автомобиля до сложных ситуаций на перекрестках."
    },
    {
      question: "Зачем так много учить теорию?",
      answer: "Наш курс адаптирован в том числе для студентов, которые не владеют испанским языком.\n\nВ процессе подготовки мы параллельно разбираем специфические испанские термины и все каверзные вопросы. Мы систематизируем знания так, чтобы максимально сократить время вашей подготовки и дать всю теорию испанских ПДД в сжатые и понятные сроки."
    }
  ],
  practice: [
    {
      question: "Как проводят экзамен вождения?",
      answer: "Экзамен сдается в реальных условиях дорожного движения и длится от 25 до 30 минут (для категории B «площадку» не сдают).\n\nЭкзаменатор от DGT сидит на заднем сиденье вашей учебной машины, а инструктор находится рядом с двойными педалями, но помогать он не имеет права. Экзамены обычно проходят в первую половину дня."
    },
    {
      question: "У меня многолетний опыт вождения. Можно сдать без уроков?",
      answer: "Нет, совсем без уроков не получится — DGT обязывает вас взять как минимум одно практическое занятие перед экзаменом. Почти всегда одного занятия не хватает даже крайне опытным водителям.\n\nЭкзамен требует строгого соблюдения испанских нюансов: активного контроля слепых зон (angulos muertos) и круговых перекрестков. За 3-4 урока мы помогаем опытным водителям скорректировать их привычки и пройтись непосредственно по зонам сдачи экзамена."
    },
    {
      question: "Сколько практических уроков нужно новичкам?",
      answer: "Минимальной часовой нормы по закону нет. Новичкам мы рекомендуем рассчитывать от 10-15 и более уроков, всё очень индивидуально.\n\nВажно помнить, что каждая пересдача увеличивает итоговые траты (новая пошлина DGT и оплата автошколе за переоформление). Поэтому выгоднее брать оптимальное число уроков и сдавать уверенно."
    },
    {
      question: "Можно ли сдать теорию и вождение в один день?",
      answer: "Нет. Сначала вы должны успешно сдать теорию.\n\nТолько после того, как в системе DGT появится официальный статус о сдаче (обычно на следующий рабочий день), вы сможете подать заявку на прохождение практического экзамена."
    }
  ],
  course: [
    {
      question: "Вы — автошкола?",
      answer: "Нет. Мы — образовательная онлайн-платформа. Наш курс подготовлен дипломированными методистами и русскоязычными инструкторами по вождению.\n\nМы учим языку и логике испанских ПДД — параллельно.\n\nСертификаты выдаёт только DGT — но мы помогаем вам к этому прийти. Сотрудничаем с испанскими автошколами и даём студентам промокоды на практику."
    },
    {
      question: "Зачем выбирать вас, а не пойти в местную испанскую автошколу?",
      answer: "Во-первых, мы объясняем сложные испанские правила на вашем родном языке.\n\nВо-вторых, онлайн-формат позволяет готовиться в своем темпе.\n\nВ-третьих, мы даем мощную поддержку: от технических вопросов до документов и пошлин.\n\nИ самое главное — вы экономите время и деньги: наши студенты сдают теорию за 1-2 месяца, не переплачивают за пересдачи и могут избежать навязанных автошколами обязательных часов вождения."
    },
    {
      question: "Я пропустил онлайн-урок. Что делать?",
      answer: "Ничего страшного. Все живые вебинары записываются, и вы сможете посмотреть видео в любое удобное время на платформе.\n\nЕсли после просмотра у вас останутся вопросы, вы всегда сможете задать их куратору."
    },
    {
      question: "Буду сдавать теорию на английском языке. Вы поможете?",
      answer: "Да. Экзамен в DGT можно сдать на английском (в некоторых регионах).\n\nНаш курс сфокусирован на подготовке к сдаче на испанском языке, но в платформе Skilyapp есть настройка интерфейса и тестов на английский.\n\nМы предоставим вам учебные материалы на английском (включая учебник), а вся остальная наша административная поддержка и инструкции на русском останутся в вашем распоряжении."
    },
    {
      question: "Как происходит оплата курса?",
      answer: "Оплата — 100% предоплата. Никаких рассрочек и частичных бронирований мы не предоставляем.\n\nОплата проходит через наш Telegram-бот, принимая который вы автоматически соглашаетесь с условиями использования платформы.\n\nПосле оплаты вы получаете полный доступ к материалам в течение 24 часов."
    }
  ],
  legal: [
    {
      question: "Что я покупаю — это официальный курс с сертификатом?",
      answer: "Нет. Skilyapp — образовательная онлайн-платформа. Мы предоставляем методические материалы, тренировочные тесты и поддержку куратора на русском языке.\n\nОфициальный документ (водительское удостоверение) выдаёт только DGT после сдачи экзаменов — мы помогаем вам к этому прийти."
    },
    {
      question: "Какова политика возврата средств?",
      answer: "Оплата — 100% предоплата, возвраты не предусмотрены после активации доступа к материалам курса.\n\nЕсли доступ ещё не был активирован, вы можете запросить возврат в течение 14 дней с момента оплаты, написав на support@skilyapp.com."
    },
    {
      question: "Где найти полные условия использования?",
      answer: "Полный текст условий использования доступен на странице skilyapp.com/legal/terms.\n\nОплачивая курс, вы принимаете эти условия."
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
    "Поддержка до получения прав",
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
type StreamInfo = { id?: string; number: number; start_date: string; spots_total: number; spots_enrolled: number; status?: string; };

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
            Подобрать тариф
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
        const el = document.getElementById('pricing');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
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
   COMPONENT: StreamSelectorBanner
   Интерактивный баннер выбора потока с выпадающим списком (dropdown)
   ───────────────────────────────────────────── */
const StreamSelectorBanner = ({ dbStreams }: { dbStreams: any[] | null }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (dbStreams && dbStreams.length > 0) {
      const idx = dbStreams.findIndex(s => s.status === 'open');
      if (idx !== -1) setSelectedIndex(idx);
    }
  }, [dbStreams]);

  // Fallbacks if dbStreams is null
  const activeStream = dbStreams?.[selectedIndex];
  const isCompleted = activeStream?.status === 'finished' || activeStream?.status === 'closed';
  const spotsTotal = activeStream?.spots_total ?? 8;
  // If completed, SpotsLeft = 0 naturally.
  const spotsLeft = isCompleted ? 0 : Math.max(0, spotsTotal - (activeStream?.spots_enrolled ?? 0));
  const isFewSpots = !isCompleted && spotsLeft <= 2 && spotsLeft > 0;
  const isSFull = isCompleted || spotsLeft <= 0;
  const streamNum = activeStream?.number ?? 51;
  const hasMore = dbStreams && dbStreams.length > 1;

  const getFallbackDate = () => {
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

  const targetDate = activeStream?.start_date ? new Date(activeStream.start_date + 'T00:00:00') : getFallbackDate();
  const dateFormatted = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(targetDate);

  return (
    <div className="max-w-[700px] mx-auto mb-10 w-full relative z-20">
      <div 
        className={cn(
          "relative overflow-hidden rounded-2xl bg-white/[0.03] border backdrop-blur-md transition-colors duration-300",
          isOpen ? "border-white/20" : "border-white/10"
        )}
      >
        {/* Subtle Top Gradient Line */}
        <div className={cn("absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r via-white/50 to-transparent opacity-30", isSFull ? "from-red-500" : isFewSpots ? "from-orange-500" : "from-blue-500")} />
        
        {/* Main Banner row */}
        <div 
          className={cn(
            "p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 select-none",
            hasMore && "cursor-pointer hover:bg-white/[0.02]"
          )}
          onClick={() => hasMore && setIsOpen(!isOpen)}
        >
          {/* Stream Info Box */}
          <div className="flex items-center gap-3">
            <div className={cn("flex flex-col items-center justify-center bg-white/5 border rounded-xl w-12 h-12 shrink-0 relative overflow-hidden", isSFull ? "border-red-500/30" : "border-white/10")}>
              <div className={cn("absolute bottom-0 w-full transition-all duration-700", isSFull ? "bg-red-500/20" : isFewSpots ? "bg-orange-500/20" : "bg-blue-500/20")} style={{ height: `${( (spotsTotal - spotsLeft) / spotsTotal ) * 100}%` }} />
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest relative z-10 leading-none mb-0.5">Поток</span>
              <span className="text-lg font-black text-white relative z-10 leading-none">{streamNum}</span>
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn("w-1.5 h-1.5 rounded-full", isSFull ? "bg-red-500" : isFewSpots ? "bg-orange-500 animate-pulse" : "bg-emerald-500 animate-pulse")} />
                <span className="text-sm font-semibold text-zinc-200">
                  {isSFull ? "Набор закрыт" : isFewSpots ? "Закрытие набора" : "Набор открыт"}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 text-xs">
                {isSFull ? (
                  <Lock className="w-3.5 h-3.5 text-red-400" />
                ) : isFewSpots ? (
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                ) : (
                  <Users className="w-3.5 h-3.5 text-zinc-500" />
                )}
                <span className={cn("font-medium", isSFull ? "text-red-400" : isFewSpots ? "text-orange-400" : "text-zinc-500")}>
                  {isSFull ? "Мест нет" : `${spotsLeft} из ${spotsTotal} мест свободно`}
                </span>
                {hasMore && (
                  <>
                    <span className="text-zinc-700 hidden sm:inline">·</span>
                    <span className="text-zinc-500 hidden sm:inline underline decoration-dotted underline-offset-4 hover:text-white transition-colors">
                      {isOpen ? "Свернуть" : `Выбрать дату старта`}
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-500 hidden sm:inline transition-transform duration-300", isOpen && "rotate-180")} />
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Right side Data */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl whitespace-nowrap">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Старт:</span>
            <span className="text-white text-sm font-bold tracking-wide">{dateFormatted}</span>
          </div>
        </div>

        {/* Expanded list of streams */}
        <AnimatePresence>
          {isOpen && hasMore && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="border-t border-white/5 bg-black/40 overflow-hidden"
            >
              <div className="p-3 grid grid-cols-1 gap-1.5">
                <div className="text-xs text-zinc-500 font-medium px-2 py-1 uppercase tracking-widest mb-1">
                  План запусков на ближайшее время:
                </div>
                {dbStreams.map((s, idx) => {
                  const sIsCompleted = s.status === 'finished' || s.status === 'closed';
                  const sSpotsLeft = sIsCompleted ? 0 : Math.max(0, s.spots_total - s.spots_enrolled);
                  const isSFull = sIsCompleted || sSpotsLeft <= 0;
                  const isSelected = idx === selectedIndex;
                  const sDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(s.start_date + 'T00:00:00'));
                  
                  return (
                    <div 
                      key={s.id}
                      onClick={() => {
                        if (isSFull) return;
                        setSelectedIndex(idx);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl transition-all border",
                        isSelected 
                          ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                          : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10",
                        isSFull ? "opacity-50 cursor-pointer" : "cursor-pointer" // No longer hiding full streams, lets show them as unselectable
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center font-bold font-mono text-sm shadow-inner transition-colors",
                          isSelected ? "bg-blue-500 text-white" : isSFull ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-white/10 text-zinc-400"
                        )}>
                          {s.number}
                        </div>
                        <div className="flex flex-col">
                           <span className={cn("text-sm font-bold tracking-wide", isSelected ? "text-white" : "text-zinc-300")}>
                             {sDate}
                           </span>
                           <span className={cn("text-[11px] font-medium", isSFull ? "text-red-400/80" : "text-zinc-500")}>
                             {isSFull ? "Мест нет" : `Осталось мест: ${sSpotsLeft}`}
                           </span>
                        </div>
                      </div>
                      
                      {isSelected ? (
                        <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold mr-2 uppercase tracking-widest">
                          <Check className="w-4 h-4" />
                          <span>Выбран</span>
                        </div>
                      ) : isSFull ? (
                        <div className="flex items-center gap-1.5 text-red-500/60 text-xs font-bold mr-2 uppercase tracking-widest">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Закрыт</span>
                        </div>
                      ) : (
                        <div className="text-zinc-600 text-xs mr-2 group-hover:text-zinc-400 transition-colors">
                          Выбрать
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const CourseLanding = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [heroReady, setHeroReady] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dbPrices, setDbPrices] = useState<DbPlanPrices | undefined>(undefined);
  const [pricingTab, setPricingTab] = useState<"groups" | "individual">("groups");
  const [dbAddons, setDbAddons] = useState<{ addon_key: string; label: string; price_group: number; price_individual: number }[]>([]);
  const [dbStreams, setDbStreams] = useState<StreamInfo[] | null>(null);

  // Smart form state
  const [nameValue, setNameValue] = useState('');
  const [contactCategory, setContactCategory] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [phoneCountry, setPhoneCountry] = useState<'es' | 'ru'>('es');
  const [contactValue, setContactValue] = useState('+34 ');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only text and spaces, no numbers or strange symbols
    const val = e.target.value.replace(/[0-9!@#$%^&*()_+=[\]{};:"\\|,<.>?]/g, '');
    setNameValue(val);
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    const digits = val.replace(/\D/g, ''); 
    
    if (phoneCountry === 'es') {
      let number = digits;
      if (number.startsWith('34')) number = number.slice(2);
      number = number.slice(0, 9); // Spain gets 9 digits
      
      let formatted = '+34';
      if (number.length > 0) formatted += ' ' + number.slice(0, 3);
      if (number.length > 3) formatted += ' ' + number.slice(3, 6);
      if (number.length > 6) formatted += ' ' + number.slice(6, 9);
      
      setContactValue(formatted || '+34 ');
    } else {
      let number = digits;
      if (number.startsWith('7') || number.startsWith('8')) number = number.slice(1);
      number = number.slice(0, 10); // RF gets 10 digits
      
      let formatted = '+7';
      if (number.length > 0) formatted += ' ' + number.slice(0, 3);
      if (number.length > 3) formatted += ' ' + number.slice(3, 6);
      if (number.length > 6) formatted += ' ' + number.slice(6, 8);
      if (number.length > 8) formatted += ' ' + number.slice(8, 10);
      
      setContactValue(formatted || '+7 ');
    }
  };

  const handleTelegramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    let username = val.replace(/[^a-zA-Z0-9_@]/g, '');
    if (username.startsWith('@')) {
      username = username.slice(1);
    }
    username = username.replace(/@/g, '');
    setContactValue('@' + username);
  };

  // Загружаем ЦЕНЫ и ПОТОКИ из БД — единый источник правды с ботом
  useEffect(() => {
    getSupabaseClient().then(async (sb) => {
      const [plansRes, streamsRes, addonsRes] = await Promise.all([
        sb.from('course_plans' as never).select('id, price_eur, original_price_eur, payment_link').eq('active', true),
        sb.from('course_streams' as never).select('id, status, number, start_date, spots_total, spots_enrolled').gte('start_date', new Date().toISOString().split('T')[0]).order('start_date', { ascending: true }).limit(4),
        sb.from('course_addons' as never).select('addon_key, label, price_group, price_individual').eq('is_active', true).order('sort_order'),
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

  useCrispChat();

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
    document.getElementById("smart-checklist")?.scrollIntoView({ behavior: "smooth" });
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
                const el = document.getElementById('pricing');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }} className="hover:text-white transition-colors">Тарифы</button>
              <button onClick={() => {
                const el = document.getElementById('faq');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }} className="hover:text-white transition-colors">FAQ</button>
            </div>

            <button
              onClick={() => {
                const el = document.getElementById('pricing');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hidden sm:inline-flex bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.2)] items-center gap-2"
            >
              Начать учиться
            </button>

            {/* Mobile Burger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </nav>

        {/* Mobile Flyout Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 left-0 w-full z-[100] bg-[#060a14]/95 backdrop-blur-3xl border-b border-white/10 px-6 py-8 shadow-2xl flex flex-col h-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <a href="/" className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-white/90">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm font-black shadow-lg shadow-blue-500/20 text-white">S</div>
                  Skilyapp
                </a>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex flex-col gap-6 text-lg font-medium text-zinc-300">
                <button 
                  onClick={() => { setMobileMenuOpen(false); scrollToHowItWorks(); }}
                  className="text-left w-full hover:text-white transition-colors"
                >
                  Формат курса
                </button>
                <button 
                  onClick={() => { 
                    setMobileMenuOpen(false); 
                    const el = document.getElementById('pricing');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-left w-full hover:text-white transition-colors"
                >
                  Тарифы
                </button>
                <button 
                  onClick={() => { 
                    setMobileMenuOpen(false); 
                    const el = document.getElementById('faq');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-left w-full hover:text-white transition-colors"
                >
                  Частые вопросы
                </button>
                
                <hr className="border-white/10 my-2" />
                
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    const el = document.getElementById('pricing');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-5 py-4 rounded-xl font-semibold text-center mt-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                >
                  Найти место
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            <RotatingHeroBadge stream={dbStreams?.find(s => s.status === 'open') ?? dbStreams?.[0] ?? null} />
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
                Подобрать тариф
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
            <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/15 text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
              Специальное предложение потока
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 tracking-tight px-2">
              Выберите свой формат
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto font-light px-4">
              Все тарифы включают 2 месяца живых занятий и доступ к платформе Skilyapp в подарок
            </p>
          </div>

          {/* Premium Urgency Banner (Interactive) */}
          <StreamSelectorBanner dbStreams={dbStreams} />

          {/* Tab switcher */}
          <div className="flex gap-1 bg-white/[0.04] border border-white/[0.07] rounded-xl p-1 mb-8 max-w-xs mx-auto">
            <button
              onClick={() => setPricingTab("groups")}
              className={[
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold",
                pricingTab === "groups"
                  ? "bg-white text-zinc-900 shadow"
                  : "text-zinc-400",
              ].join(" ")}
            >
              <Users className="w-3.5 h-3.5" />
              Группы
            </button>
            <button
              onClick={() => setPricingTab("individual")}
              className={[
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold",
                pricingTab === "individual"
                  ? "bg-white text-zinc-900 shadow"
                  : "text-zinc-400",
              ].join(" ")}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Индивидуально
            </button>
          </div>

          {/* Cards — both stay mounted, no remount freeze */}
          <div className={pricingTab === "groups" ? "block" : "hidden"}>
            <PricingCards onBooking={scrollToForm} dbPrices={dbPrices} />
          </div>
          <div className={pricingTab === "individual" ? "block" : "hidden"}>
            <IndividualPricingCards onBooking={scrollToForm} />
          </div>

          {/* Trust footer */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mt-12 text-zinc-400 text-xs sm:text-sm">
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] shadow-inner">
              <Lock className="w-4 h-4 text-amber-500/80" />
              Цена фиксируется при бронировании
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] shadow-inner">
              <CreditCard className="w-4 h-4 text-blue-400/80" />
              Предоплата 50% · остаток перед стартом
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] shadow-inner">
              <BadgeCheck className="w-4 h-4 text-emerald-400/80" />
              Без скрытых платежей
            </span>
          </div>

          {/* Platform-only note */}
          <p className="text-center text-zinc-600 text-sm mt-6">
            Нужен только доступ к платформе без живого курса?{" "}
            <Link to="/" className="text-zinc-400 underline underline-offset-4 hover:text-white transition-colors">
              Самостоятельная подготовка от €10/мес →
            </Link>
          </p>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════
          BLOCK 7: TESTIMONIALS (animated columns)
          ═══════════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden">
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
            <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/15 text-yellow-400 text-xs font-bold uppercase tracking-widest mb-4">
              Отзывы
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 tracking-tight px-2 text-center">
              Наши ученики уже за рулём
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto font-light px-4 text-center">
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

      {/* ─── Lead Form Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {formModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => setFormModalOpen(false)}
            />

            {/* Modal — bottom sheet on mobile, centered dialog on desktop */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed z-50 inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center pointer-events-none"
            >
              <div className="pointer-events-auto w-full md:w-auto md:min-w-[440px] md:max-w-lg bg-zinc-900 border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-6 mx-0 md:mx-4">
                {/* Handle (mobile only) */}
                <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5 md:hidden" />

                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white">Оставить заявку</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Ответим в течение 24 часов</p>
                  </div>
                  <button
                    onClick={() => setFormModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors text-zinc-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {formSent ? (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-1">Заявка отправлена!</h4>
                    <p className="text-sm text-zinc-400">Мы свяжемся с вами в течение 24 часов.</p>
                    <button
                      onClick={() => { setFormSent(false); setFormModalOpen(false); }}
                      className="mt-5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      Закрыть
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (typeof window !== "undefined" && (window as any).gtag) {
                        (window as any).gtag("event", "conversion", {
                          send_to: "AW-18034090184/_KkqCNiSzZEcEMjBqZdD",
                          value: 250.0,
                          currency: "EUR",
                        });
                      }
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
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Имя</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={nameValue}
                        onChange={handleNameChange}
                        placeholder="Как вас зовут?"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-2 font-medium">Способ связи</label>
                      <div className="flex bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 mb-3">
                        <button 
                          type="button" 
                          onClick={() => { setContactCategory('whatsapp'); setPhoneCountry('es'); setContactValue('+34 '); }} 
                          className={cn("flex-1 text-xs py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-1.5", contactCategory === 'whatsapp' ? "bg-emerald-500/20 text-emerald-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.996 0A12.003 12.003 0 0 0 0 12.003a12.007 12.007 0 0 0 1.6 6.03L.004 23.996l6.095-1.595A11.97 11.97 0 0 0 11.996 24 12.005 12.005 0 0 0 24 11.996 12.002 12.002 0 0 0 12 0Zm0 21.996a9.966 9.966 0 0 1-5.076-1.39l-.364-.216-3.774.985.992-3.67-.234-.378A9.973 9.973 0 0 1 2.004 12a10.003 10.003 0 0 1 10.001-10 9.998 9.998 0 0 1 9.995 9.997 10.003 10.003 0 0 1-9.995 9.995Zm5.445-7.447c-.297-.15-1.765-.87-2.038-.97-.272-.1-4.71-.15-5.698 1.332-.1.148-1.127 1.1-.148 1.128 1.258.077-.346-.11.45.698 1.259 1.026 2.015 1.154 2.312 1.303.297.15.474.13.655-.07.18-.2.775-.904.98-1.213.204-.308.406-.258.675-.158.272.1 1.765.832 2.065.98.3.15.5.22.574.343.076.126.076.732-.22 1.256Z"/></svg>
                          WhatsApp
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { setContactCategory('telegram'); setContactValue('@'); }} 
                          className={cn("flex-1 text-xs py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-1.5", contactCategory === 'telegram' ? "bg-[#2AABEE]/20 text-[#2AABEE] shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.699 1.203-1.206 1.249-.168.016-.388.01-.585-.044-.216-.06-.52-.164-.783-.284-.467-.215-2.996-1.928-3.953-2.607-.225-.16-.49-.401-.013-.824.125-.11 2.29-2.146 4.197-4.04.22-.22.427-.674-.251-.215-2.226 1.503-4.484 3.033-5.044 3.413-.505.342-1.127.42-1.638.16l-.037-.02c-.521-.295-1.506-.615-2.238-.857-.899-.297-1.517-.45-1.458-.949.03-.255.337-.514.922-.777 3.614-1.626 6.025-2.673 7.234-3.181 3.442-1.446 4.156-1.696 4.542-1.704z"/></svg>
                          Telegram
                        </button>
                      </div>

                      {contactCategory === 'whatsapp' ? (
                        <div className="flex bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                           <div className="flex bg-white/5 border-r border-white/[0.08]">
                             <button
                               type="button"
                               onClick={() => { setPhoneCountry('es'); setContactValue('+34 '); }}
                               className={cn("px-3 py-3 text-xs flex items-center gap-1.5 transition-colors font-medium border-b-2", phoneCountry === 'es' ? "bg-white/10 text-white border-emerald-400" : "text-zinc-500 hover:text-zinc-300 border-transparent")}
                             >
                               🇪🇸
                             </button>
                             <button
                               type="button"
                               onClick={() => { setPhoneCountry('ru'); setContactValue('+7 '); }}
                               className={cn("px-3 py-3 text-xs flex items-center gap-1.5 transition-colors font-medium border-b-2", phoneCountry === 'ru' ? "bg-white/10 text-white border-emerald-400" : "text-zinc-500 hover:text-zinc-300 border-transparent")}
                             >
                               🇷🇺
                             </button>
                           </div>
                           <input
                             type="tel"
                             name="phone"
                             required
                             value={contactValue}
                             onChange={handleWhatsAppChange}
                             placeholder={phoneCountry === 'es' ? "+34 600 000 000" : "+7 900 000 00 00"}
                             className="flex-1 w-full min-w-0 bg-transparent px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none text-sm font-medium tracking-wide"
                           />
                        </div>
                      ) : (
                        <input
                          type="text"
                          name="phone"
                          required
                          value={contactValue}
                          onChange={handleTelegramChange}
                          placeholder="@username"
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-[#2AABEE]/40 focus:outline-none focus:ring-2 focus:ring-[#2AABEE]/20 transition-all text-sm font-medium tracking-wide"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                        Сообщение <span className="text-zinc-600">(необязательно)</span>
                      </label>
                      <textarea
                        name="message"
                        rows={2}
                        placeholder="Вопросы, пожелания..."
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl font-semibold text-base bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Забронировать место
                    </button>
                    <p className="text-[10px] text-zinc-600 text-center">
                      Нажимая кнопку, вы соглашаетесь с{" "}
                      <a href="/legal/privacy" className="underline hover:text-zinc-400 transition-colors">
                        политикой конфиденциальности
                      </a>
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          CINEMATIC CTA FOOTER
          ═══════════════════════════════════════════ */}
      <CinematicHero onOpenForm={() => setFormModalOpen(true)} />
    </div>
  );
};

export default CourseLanding;
