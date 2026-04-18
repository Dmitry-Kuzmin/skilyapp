// Skily Landing Page - Optimized for High Conversions
import React, { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Brain,
  Zap,
  Smartphone,
  Crown,
  Car,
  Infinity as InfinityIcon,
  Globe,
  Bike,
  Bus,
  Timer,
  Trophy,
  Swords,
  Target,
  Bookmark,
  XCircle,
  CheckCircle,
  ChevronRight,
  Gift,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Minus,
  Landmark,
  School,
  FileText,
  Languages,
  Sparkles,
  Coins,
  Users,
  Headset,
  Heart,
  MapPin,
  Rocket
} from "lucide-react";
import { playClickSound, playEngineSound } from "@/services/audioService";
import { LandingLogo } from "./LandingLogo";
import { StartEngineButton } from "./StartEngineButton";
import { OnlinePlayers } from "@/components/shared/OnlinePlayers";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "./LanguageSelector";
import { CountrySelector } from "./CountrySelector";
import { LandingGameModesShowcase } from "./LandingGameModesShowcase";
const TestimonialsSection = React.lazy(() => import("./TestimonialsSection").then(m => ({ default: m.TestimonialsSection })));

const SPAIN_TESTIMONIALS = [
  {
    text: "I listen in audio mode while driving — now roundabout signs just click. Failed twice before. Passed on my third try and I barely sat at a desk.",
    image: "https://randomuser.me/api/portraits/women/79.jpg",
    name: "María L.",
    role: "Barcelona 🇪🇸",
  },
  {
    text: "My Spanish was basic and the DGT questions are full of tricky wording. The app explained every trap in Russian. Passed without a single extra lesson.",
    image: "https://randomuser.me/api/portraits/men/76.jpg",
    name: "Andrei K.",
    role: "Belarus 🇧🇾 → Valencia",
  },
  {
    text: "I studied completely on my own — no school, no tutor. Just the app every morning before work. Took three months but I passed first time.",
    image: "https://randomuser.me/api/portraits/women/65.jpg",
    name: "Elena S.",
    role: "Russia → Alicante",
  },
  {
    text: "The leaderboard got me hooked. I started competing with strangers and somehow that made me memorise everything. Passed and I'm still top 10.",
    image: "https://randomuser.me/api/portraits/men/87.jpg",
    name: "Carlos M.",
    role: "Argentina → Madrid",
  },
  {
    text: "I was confused by roundabout priority rules for months. The AI explained it with a real intersection example in two minutes. Never got it wrong again.",
    image: "https://randomuser.me/api/portraits/women/90.jpg",
    name: "Sophie D.",
    role: "France → Sevilla",
  },
  {
    text: "20 minutes a day, every day, for six weeks. That was it. No cramming, no weekend marathons. The app just becomes a habit and the habit works.",
    image: "https://randomuser.me/api/portraits/men/91.jpg",
    name: "John T.",
    role: "USA → Barcelona",
  },
  {
    text: "I was drowning in DGT paperwork and studying at the same time. My curator handled the appointments and documents — I just showed up and passed.",
    image: "https://randomuser.me/api/portraits/men/64.jpg",
    name: "Dmitry P.",
    role: "Russia → Málaga",
  },
  {
    text: "I switched between Spanish and English depending on the topic. Being able to study in my own language made everything less stressful.",
    image: "https://randomuser.me/api/portraits/women/39.jpg",
    name: "Yuki M.",
    role: "Japan → Barcelona",
  },
  {
    text: "15 minutes at lunch every day. I never felt like I was studying — more like playing. Passed on my first attempt after five weeks.",
    image: "https://randomuser.me/api/portraits/women/73.jpg",
    name: "Laura B.",
    role: "Italy → Madrid",
  },
];
const LandingQuizDemo = React.lazy(() => import("./LandingQuizDemo").then(m => ({ default: m.LandingQuizDemo })));
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useCountry } from "@/contexts/CountryContext";
import { PartnershipExpansionPortal } from "./LazyPartnershipExpansionPortal";
import { FAQItem } from "./FAQItem";
import { examYear } from "@/utils/dateUtils";
import {
  landingTranslations,
  LANGUAGE_OPTIONS,
} from "@/translations/landing";

// Helper function to get the first Tuesday of current month
const getFirstTuesdayOfMonth = (): Date => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  let dayOfWeek = firstDay.getDay();

  // Convert Sunday (0) to 7 for calculation
  if (dayOfWeek === 0) dayOfWeek = 7;

  // Tuesday is 2, so we need to add (2 - dayOfWeek) days if positive, else add (9 - dayOfWeek)
  const daysUntilTuesday = dayOfWeek <= 2 ? (2 - dayOfWeek) : (9 - dayOfWeek);
  const firstTuesday = new Date(year, month, 1 + daysUntilTuesday);

  return firstTuesday;
};

// Format date for Russian display
const formatTuesdayRu = (): string => {
  const date = getFirstTuesdayOfMonth();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  };
  const formatted = new Intl.DateTimeFormat('ru-RU', options).format(date);
  return `Начало: ${formatted[0].toUpperCase()}${formatted.slice(1)}`;
};

const DEMO_VARIANTS = {
  ru: [
    {
      title: 'Мы научили AI думать как экзаменатор DGT',
      text: 'Мы "скормили" нейросети 5000 страниц дорожных кодексов. Skily AI знает каждый нюанс правил лучше любого профессора и объяснит его тебе за 2 секунды.'
    },
    {
      title: 'Лучше, чем инструктор. И вот почему',
      text: 'Живой учитель может устать. Skily AI доступен 24/7, имеет бесконечное терпение и переводит сложные термины на твой язык мгновенно.'
    },
    {
      title: 'Твой эксперт по ПДД',
      text: 'Забудь про сухие формулировки. Ошибайся сколько хочешь — Skily AI не осудит, а покажет, как избежать ошибки в будущем. Простым языком.'
    }
  ],
  es: [
    {
      title: 'Hemos enseñado a la IA a pensar como un examinador',
      text: 'Hemos alimentado la red neuronal con 5000 páginas de códigos de tráfico. Skily AI conoce cada matiz mejor que cualquier profesor y te lo explicará en 2 segundos.'
    },
    {
      title: 'Mejor que un instructor. He aquí por qué',
      text: 'Un profesor humano puede cansarse. Skily AI está disponible 24/7, tiene paciencia infinita y traduce términos complejos a tu idioma al instante.'
    },
    {
      title: 'Tu experto de bolsillo en normas de tráfico',
      text: 'Olvida las formulaciones secas. Comete tantos errores como quieras: Skily AI no te juzgará, sino que te mostrará cómo evitarlos en el futuro.'
    }
  ],
  en: [
    {
      title: 'We taught AI to think like a DGT examiner',
      text: 'We fed the network 5000 pages of traffic codes. Skily AI knows every nuance better than any professor and will explain it to you in 2 seconds.'
    },
    {
      title: 'Better than an instructor. Here is why',
      text: 'A human teacher can get tired. Skily AI is available 24/7, has infinite patience, and translates complex terms into your language instantly.'
    },
    {
      title: 'Your pocket traffic rules expert',
      text: 'Forget dry formulations. Make as many mistakes as you want — Skily AI won\'t judge, but will show you how to avoid them in the future.'
    }
  ]
};

const FEATURE_PILLS = {
  ru: [
    { icon: Zap, text: 'Мгновенный ответ', color: 'text-yellow-400' },
    { icon: InfinityIcon, text: 'Бесконечное терпение', color: 'text-blue-400' },
    { icon: Globe, text: 'Понятный язык', color: 'text-emerald-400' }
  ],
  es: [
    { icon: Zap, text: 'Respuesta instantánea', color: 'text-yellow-400' },
    { icon: InfinityIcon, text: 'Paciencia infinita', color: 'text-blue-400' },
    { icon: Globe, text: 'Traducción nativa', color: 'text-emerald-400' }
  ],
  en: [
    { icon: Zap, text: 'Instant Answer', color: 'text-yellow-400' },
    { icon: InfinityIcon, text: 'Infinite Patience', color: 'text-blue-400' },
    { icon: Globe, text: 'Native Translation', color: 'text-emerald-400' }
  ]
};

interface ReferrerInfo {
  first_name: string;
  username: string | null;
  referral_code: string;
  total_referrals: number;
  photo_url: string | null;
}

interface PartnerInfo {
  id: string;
  name: string;
  channel_name: string | null;
  channel_url: string | null;
  photo_url: string | null;
  partner_code: string;
  total_link_activations: number;
}

interface LandingSpainProps {
  onRequestAccess: () => void;
  referrerInfo?: ReferrerInfo | null;
  loadingReferrer?: boolean;
  partnerInfo?: PartnerInfo | null;
  loadingPartner?: boolean;
}

const SkilyComparisonCard = ({ copy }: { copy: any }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const handleSpotlightMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      onMouseMove={handleSpotlightMove}
      className="relative bg-slate-900/40 backdrop-blur-2xl border border-white/10 border-t-white/20 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_60px_-10px_rgba(99,102,241,0.3),inset_0_0_30px_rgba(255,255,255,0.03)] overflow-hidden transform md:-translate-y-4 hover:border-indigo-500/50 transition-all duration-300 group ring-0"
    >
      {/* Spotlight Effect */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2.5rem] z-0"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.15), transparent 40%)`
        }}
      />

      <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none z-0"></div>
      <h3 className="relative z-10 text-2xl font-black text-white text-center uppercase tracking-widest mb-10 flex items-center justify-center gap-3">
        {copy.comparison.skily} <Crown size={24} className="text-amber-400 fill-amber-400/20" />
      </h3>

      {/* Price */}
      <div className="text-center relative mx-4">
        <div className="text-6xl font-black text-white tracking-tight drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
          {copy.comparison.rows[0].skily}
        </div>
        <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full mt-4 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
          <Zap size={12} className="fill-current" /> SAVE 95%
        </div>
      </div>

      {/* Divider */}
      <div className="w-1/2 mx-auto border-t border-white/10 my-8"></div>

      {/* Other Rows */}
      <div className="space-y-8 px-2 relative z-10">
        {copy.comparison.rows.slice(1).map((row: any, i: number) => (
          <div key={i} className="flex flex-col items-center justify-center min-h-[4rem] text-center">
            <span className="flex items-center gap-3 text-white font-black text-xl tracking-tight drop-shadow-lg">
              {row.skily} <CheckCircle size={24} className="text-indigo-400 fill-indigo-400/20" />
            </span>
            {row.skilyDesc && (
              <span className="text-sm font-medium text-indigo-100/80 mt-1.5 block">
                {row.skilyDesc}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const LandingSpain: React.FC<LandingSpainProps> = ({
  onRequestAccess,
  referrerInfo,
  loadingReferrer = false,
  partnerInfo,
  loadingPartner = false,
}) => {
  const isMobile = useIsMobile();
  const [isStarting, setIsStarting] = useState(false);
  const [isPartnershipOpen, setIsPartnershipOpen] = useState(false);

  // КРИТИЧНО: Обработка хеша #partnership для открытия портала извне (например, из консоли)
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#partnership') {
        setIsPartnershipOpen(true);
      }
    };

    // Проверяем при монтировании
    checkHash();

    // Слушаем изменения хеша
    window.addEventListener('hashchange', checkHash);

    // Экспонируем функцию глобально для пасхалки в консоли
    (window as any).openPartnership = () => setIsPartnershipOpen(true);

    return () => {
      window.removeEventListener('hashchange', checkHash);
      delete (window as any).openPartnership;
    };
  }, []);
  const [demoVariantIndex, setDemoVariantIndex] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { selectedCountry } = useCountry();

  const [shouldLoadDemo, setShouldLoadDemo] = useState(false);
  const demoContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!demoContainerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoadDemo(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0, rootMargin: '600px' }
    );
    observer.observe(demoContainerRef.current);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Монтируется один раз — shouldLoadDemo не нужен в deps



  // FAQ Types & Content
  interface FAQCategory {
    id: string;
    title: string;
    questions: {
      q: string;
      a: string;
      icon: any;
    }[];
  }

  const faqContent: Record<string, { sectionTitle: string; sectionSubtitle: string; categories: FAQCategory[] }> = {
    ru: {
      sectionTitle: 'Зачем платить автошколе, если есть Skily?',
      sectionSubtitle: 'Развеиваем мифы о получении прав и экономим ваши деньги.',
      categories: [
        {
          id: 'money',
          title: 'Экономия и Законы',
          questions: [
            {
              q: 'Обязательно ли ходить в автошколу для теории?',
              a: 'Нет, это миф. Вы имеете законное право сдавать теорию экстерном ("Por Libre"). Автошколы берут деньги за лекции. Мы даем ту же подготовку, но в удобном формате и без переплат за "воздух".',
              icon: School
            },
            {
              q: 'Сколько я реально сэкономлю?',
              a: 'Минимум 300€. Средний чек автошколы за теорию ("Matrícula") — 250€ + учебники. С подпиской Skily вы тратите эти деньги на 10 лишних уроков вождения с инструктором.',
              icon: Coins
            },
            {
              q: 'Мои права с родины действуют?',
              a: 'Только первые 6 месяцев. Если обмен (Canje) невозможен для вашей страны, сдача экзамена с нуля — единственный способ ездить легально.',
              icon: Landmark
            }
          ]
        },
        {
          id: 'lang',
          title: 'Язык и Сложность',
          questions: [
            {
              q: 'Я плохо знаю язык. Как мне сдать?',
              a: 'Skily AI переводит сложные термины и объясняет логику ПДД на вашем родном языке. Вы учитесь понимать дорожные ситуации, а не просто зубрить непонятный текст.',
              icon: Languages
            },
            {
              q: 'Насколько актуальны вопросы?',
              a: 'Мы обновляем базу еженедельно. Если вчера DGT изменила формулировку вопроса про электросамокаты — сегодня утром она уже обновлена в Skily.',
              icon: Sparkles
            }
          ]
        },
        {
          id: 'process',
          title: 'Бюрократия',
          questions: [
            {
              q: 'Как записаться на экзамен самому?',
              a: 'Это просто. Нужно оплатить пошлину (Tasa) и заполнить форму в DGT. Внутри Skily Premium есть гайд со ссылками и примерами. Мы проведем вас.',
              icon: FileText
            }
          ]
        }
      ]
    },
    es: {
      sectionTitle: '¿Por qué pagar autoescuela si existe Skily?',
      sectionSubtitle: 'Desmentimos mitos sobre el carnet y ahorramos tu dinero.',
      categories: [
        {
          id: 'money',
          title: 'Ahorro y Leyes',
          questions: [
            {
              q: '¿Es obligatorio ir a la autoescuela para la teórica?',
              a: 'No, es un mito. Tienes el derecho legal de presentarte por libre. Las autoescuelas cobran por clases. Nosotros damos la misma preparación sin sobrecostes.',
              icon: School
            },
            {
              q: '¿Cuánto ahorraré realmente?',
              a: 'Mínimo 300€. La media de matrícula en autoescuela es 250€ + libros. Con Skily usas ese dinero para 10 clases prácticas extra.',
              icon: Coins
            },
            {
              q: '¿Vale mi carnet de origen?',
              a: 'Solo los primeros 6 meses. Si el canje no es posible para tu país, examinarte es la única vía legal.',
              icon: Landmark
            }
          ]
        },
        {
          id: 'lang',
          title: 'Idioma y Dificultad',
          questions: [
            {
              q: 'Mi nivel de idioma es bajo. ¿Podré aprobar?',
              a: 'Skily AI traduce términos complejos y explica la lógica en tu idioma nativo. Aprendes a entender el tráfico, no a memorizar textos.',
              icon: Languages
            },
            {
              q: '¿Están actualizadas las preguntas?',
              a: 'Actualizamos semanalmente. Si la DGT cambia una norma ayer, hoy ya está en Skily.',
              icon: Sparkles
            }
          ]
        },
        {
          id: 'process',
          title: 'Burocracia',
          questions: [
            {
              q: '¿Cómo me inscribo al examen por libre?',
              a: 'Es fácil. Pagas la tasa y rellenas el impreso DGT. En Skily Premium tienes una guía paso a paso con enlaces.',
              icon: FileText
            }
          ]
        }
      ]
    },
    en: {
      sectionTitle: 'Why pay driving school if you have Skily?',
      sectionSubtitle: 'Busting driving license myths and saving your money.',
      categories: [
        {
          id: 'money',
          title: 'Savings & Laws',
          questions: [
            {
              q: 'Is driving school mandatory for theory?',
              a: 'No, that\'s a myth. You have the legal right to take the theory test "Por Libre". Driving schools charge for lectures. We give you the same prep without the markup.',
              icon: School
            },
            {
              q: 'How much will I really save?',
              a: 'At least 300€. Average school fee is 250€ + books. With Skily, you spend that money on 10 extra driving lessons with an instructor.',
              icon: Coins
            },
            {
              q: 'Is my home license valid?',
              a: 'Only for the first 6 months. If exchange (Canje) isn\'t possible for your country, taking the test is the only legal way.',
              icon: Landmark
            }
          ]
        },
        {
          id: 'lang',
          title: 'Language & Difficulty',
          questions: [
            {
              q: 'My language skills are poor. Can I pass?',
              a: 'Yes. Skily AI translates complex terms and explains logic in your native language. You learn to understand traffic, not just memorize text.',
              icon: Languages
            },
            {
              q: 'Are questions up to date?',
              a: 'We update weekly. If DGT changed a rule yesterday, it\'s in Skily this morning.',
              icon: Sparkles
            }
          ]
        },
        {
          id: 'process',
          title: 'Bureaucracy',
          questions: [
            {
              q: 'How do I register for the exam myself?',
              a: 'It\'s simple. Pay the fee (Tasa) and fill the DGT form. Skily Premium includes a step-by-step guide with links.',
              icon: FileText
            }
          ]
        }
      ]
    }
  };




  useEffect(() => {
    setDemoVariantIndex(Math.floor(Math.random() * 3));
  }, []);

  // Reset avatar error when referrerInfo changes
  useEffect(() => {
    if (referrerInfo) {
      setAvatarError(false);
    }
  }, [referrerInfo?.photo_url, referrerInfo]);
  const navigate = useNavigate();

  // Language is now forced by Landing.tsx based on selectedCountry
  // LandingSpain will always get 'es' language set by parent Landing component
  let copy = landingTranslations[language];

  // Override pricing for Spain landing: ALWAYS use EUR regardless of language
  // Keep text translations in their language, but use EUR currency prices
  copy = {
    ...copy,
    pricing: {
      ...copy.pricing,
      plans: {
        cadet: {
          ...copy.pricing.plans.cadet,
        },
        monthly: {
          ...copy.pricing.plans.monthly,
          price: "€9.99",
        },
        quarterly: {
          ...copy.pricing.plans.quarterly,
          price: "€24.99",
        },
        biannual: {
          ...copy.pricing.plans.biannual,
          price: "€39.99",
        },
        yearly: {
          ...copy.pricing.plans.yearly,
          price: "€59.99",
        },
      },
    },
    // Also override comparison section pricing for Spain landing
    comparison: {
      ...copy.comparison,
      rows: copy.comparison.rows.map((row, index) => {
        if (index === 0) {
          // First row is the pricing comparison - always show EUR prices
          return {
            ...row,
            traditional: "€400+",
            skily: "€4.99",
          };
        }
        return row;
      }),
    },
  };


  const handleStartEngine = () => {
    if (isStarting) return; // избегаем двойного триггера во время анимации
    setIsStarting(true);

    try { playEngineSound(); } catch { /* audio never blocks UI */ }

    // Даем 1000ms-1500ms на вибрацию двигателя перед переходом
    const delay = isMobile ? 1200 : 1500;

    setTimeout(() => {
      try {
        if (isMobile) navigate('/login');
        else onRequestAccess();
      } finally {
        setIsStarting(false);
      }
    }, delay);

    // Safety: гарантируем разблокировку кнопки даже если setTimeout потерялся
    setTimeout(() => setIsStarting(false), delay + 500);
  };

  const handleEnter = () => {
    if (isMobile) {
      navigate('/login');
      return;
    }
    playClickSound();
    onRequestAccess();
  };

  const handleLanguageChange = (code: Language) => {
    if (language !== code) {
      setLanguage(code);
    }
  };

  const gameIcons = [Trophy, Swords, Target, Brain];
  const gameColors = [
    "text-yellow-400",
    "text-red-400",
    "text-blue-400",
    "text-purple-400",
  ];

  return (
    <div className="relative min-h-[100dvh] bg-[#0f172a] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30 w-full">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{ backgroundImage: 'url("/noise.svg")' }}
      ></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>

      <nav className="relative z-[100] px-4 md:px-10 pt-[max(1rem,env(safe-area-inset-top))] pb-4 md:pb-6 flex items-center justify-between max-w-[1400px] mx-auto gap-2 md:gap-4" style={{ overflow: 'visible' }}>
        {/* Left Side: Brand + Location */}
        <div className="flex items-center gap-0 md:gap-4" style={{ overflow: 'visible', position: 'relative' }}>
          <LandingLogo theme="dark" variant="bold" className="scale-75 md:scale-90 origin-left -mr-5 md:mr-0" />

          {/* Divider */}
          <div className="h-4 w-px bg-white/20 self-center mx-0.5" />

          {/* Country Selector */}
          <CountrySelector />
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2 md:gap-3 ml-auto">
          {language === 'ru' && (
            <button
              onClick={() => navigate('/curso')}
              className="hidden md:flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-blue-200 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:from-blue-500/20 hover:to-cyan-500/20 transition-all mr-0 md:mr-2 group shadow-lg shadow-blue-500/5 backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Живой курс
            </button>
          )}

          {/* Language selector: all three languages available */}
          {selectedCountry.code !== 'RU' && (
            <LanguageSelector
              language={language}
              onSelect={handleLanguageChange}
              label={copy.controls.languageLabel}
            />
          )}

          <button
            onClick={handleEnter}
            className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg shadow-white/10 whitespace-nowrap"
          >
            {referrerInfo ? (
              <span className="flex items-center">
                {copy.controls.studentAccess}
                <span className="ml-2 text-amber-500 inline-flex items-center gap-1">
                  +50 <Coins className="h-4 w-4 inline" />
                </span>
              </span>
            ) : (
              copy.controls.studentAccess
            )}
          </button>
        </div>
      </nav>

      {/* Partner Banner (Priority over Referral) */}
      {partnerInfo && !loadingPartner && (
        <div className="relative z-40 px-6 pt-6 pb-0 max-w-[1400px] mx-auto animate-fade-in">
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-900/80 backdrop-blur-xl border border-amber-500/30 shadow-2xl">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-yellow-500/10 pointer-events-none" />

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-50" />

            <div className="relative p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar and Info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-lg border border-amber-500/30 overflow-hidden backdrop-blur-sm">
                    <span className="bg-gradient-to-br from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                      {partnerInfo.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-2xl blur-xl -z-10 opacity-50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      {language === 'ru' ? 'Партнер' : language === 'es' ? 'Socio' : 'Partner'}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-white mb-1.5 leading-tight">
                    {partnerInfo.name} {language === 'ru' ? 'дарит Premium!' : language === 'es' ? 'regala Premium!' : 'gives Premium!'}
                  </h3>
                  <p className="text-sm md:text-base text-slate-300">
                    <span className="font-bold text-amber-400">Premium на 30 дней</span> {language === 'ru' ? 'при регистрации' : language === 'es' ? 'al registrarse' : 'on registration'}
                  </p>
                  {partnerInfo.channel_name && (
                    <p className="text-xs text-slate-400 mt-1">
                      {partnerInfo.channel_name}
                    </p>
                  )}
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleEnter}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-white font-black text-sm md:text-base shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Crown className="h-4 w-4 relative z-10" />
                <span className="relative z-10">{language === 'ru' ? 'Получить Premium' : language === 'es' ? 'Obtener Premium' : 'Get Premium'}</span>
                <ArrowRight className="h-4 w-4 relative z-10 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Referral Banner (Shown only if no partner banner) */}
      {!partnerInfo && referrerInfo && !loadingReferrer && (
        <div className="relative z-40 px-6 pt-6 pb-0 max-w-[1400px] mx-auto animate-fade-in">
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 shadow-2xl">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-50" />

            <div className="relative p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar and Info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-lg border border-slate-700/50 overflow-hidden backdrop-blur-sm">
                    {referrerInfo.photo_url && !avatarError ? (
                      <img
                        src={referrerInfo.photo_url}
                        alt={referrerInfo.first_name}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span className="bg-gradient-to-br from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
                        {referrerInfo.first_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 rounded-2xl blur-xl -z-10 opacity-50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {copy.referral.badge}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-white mb-1.5 leading-tight">
                    {referrerInfo.first_name} {copy.referral.invitesYou}
                  </h3>
                  <p className="text-sm md:text-base text-slate-300">
                    <span className="font-bold text-indigo-400">+50 {language === 'ru' ? 'монет' : language === 'es' ? 'monedas' : 'coins'}</span> {copy.referral.coinsOnRegistration}
                  </p>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleEnter}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:via-violet-500 hover:to-indigo-500 text-white font-black text-sm md:text-base shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Gift className="h-4 w-4 relative z-10" />
                <span className="relative z-10">{copy.referral.join}</span>
                <ArrowRight className="h-4 w-4 relative z-10 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="relative z-10 px-6 pt-12 pb-8 md:pt-20 md:pb-12 max-w-[1400px] mx-auto flex flex-col items-center text-center min-h-[80vh]">
        {/* Badge с электрическим синим */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[9px] sm:text-[10px] font-bold tracking-[0.25em] uppercase mb-5 sm:mb-6 animate-fade-in relative z-20">
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          {selectedCountry.code === 'ru' ? `ГИБДД ${examYear} · Официальные вопросы` : `DGT Approved · ${examYear}`}
        </div>

        {/* H1 с электрическим градиентом и свечением */}
        <div className="relative mb-4 md:mb-6 w-full flex flex-col items-center">
          {/* Улучшенное свечение: центрированное и органичное */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[140%] blur-[120px] opacity-25 bg-gradient-to-r from-blue-600 via-sky-400 to-cyan-300 pointer-events-none"></div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full blur-3xl opacity-10 bg-blue-500 pointer-events-none"></div>

          <h1
            className="relative text-[clamp(2.25rem,8vw,5.5rem)] font-black tracking-tighter leading-[1.05] sm:leading-[0.95] animate-slide-up select-none max-w-4xl"
          >
            <>
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-100 to-slate-300 block pb-1 sm:pb-2">
                {copy.hero.titleTop}
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-300 block">
                {copy.hero.titleBottom}
              </span>
            </>
          </h1>
        </div>

        {/* H2 - увеличен отступ перед кнопкой для дыхания */}
        <p
          className="max-w-3xl text-base sm:text-lg md:text-xl text-slate-300 leading-relaxed mb-10 md:mb-12 animate-slide-up font-medium px-1"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="text-white font-bold">{copy.hero.descriptionHighlight}</span>. {copy.hero.descriptionRest}
        </p>

        {/* CTA - уменьшили отступы для плотности */}
        <div
          className="flex flex-col items-center gap-5 animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="scale-75 md:scale-90">
            <StartEngineButton
              onClick={handleStartEngine}
              isIgniting={isStarting}
            />
          </div>

          <div className="flex items-center gap-4 opacity-60">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-slate-500 animate-engine-idle" style={{ animationDelay: '0.3s' }}></div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 animate-engine-idle">
              {copy.hero.pressStart}
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-slate-500 animate-engine-idle" style={{ animationDelay: '0.3s' }}></div>
          </div>

          {/* Fallback CTA for users who don't get the engine metaphor */}
          <button
            onClick={handleEnter}
            className="mt-1 text-slate-500 hover:text-slate-300 text-xs font-medium flex items-center gap-1.5 group transition-colors"
          >
            {language === 'ru' ? 'или войти напрямую' : language === 'es' ? 'o accede directamente' : 'or sign up directly'}
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* TRUST STRIP (Перемещено под Hero) */}
      <section className="relative z-20 border-y border-white/5 bg-slate-900/30 backdrop-blur-sm shadow-xl mt-8">
        <div className="max-w-[1400px] mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10">
            {copy.stats.map((stat, index) => (
              <div key={stat.label} className="flex flex-col items-center justify-center text-center md:px-8 py-4 md:py-0">
                <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-2">
                  {stat.value}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    {stat.label}
                  </span>
                  <p className="text-[10px] md:text-xs text-slate-500 font-medium max-w-[200px] mx-auto leading-relaxed">
                    {stat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* INTERACTIVE DEMO (WITH CONTEXT) */}
      <section className="relative z-10 px-6 py-20 md:py-32 max-w-[1400px] mx-auto overflow-hidden">
        {/* Background Glow Spot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none z-0 mix-blend-screen"></div>

        <div className="relative z-10 text-center mb-16 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3 h-3" />
            {language === 'ru' ? 'Live Demo' : 'Live Demo'}
          </div>
          <h2 style={{ textWrap: 'balance' }} className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight min-h-[1.2em] animate-fade-in">
            {DEMO_VARIANTS[language][demoVariantIndex].title}
          </h2>
          <p style={{ textWrap: 'balance' }} className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-8 min-h-[3.5em] animate-fade-in">
            {DEMO_VARIANTS[language][demoVariantIndex].text}
          </p>

          <div className="flex flex-wrap justify-center gap-3 md:gap-6 animate-fade-in mb-8">
            {FEATURE_PILLS[language].map((pill, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300 text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors cursor-default">
                <pill.icon className={cn("w-3.5 h-3.5", pill.color)} />
                {pill.text}
              </div>
            ))}
          </div>
        </div>

        <div ref={demoContainerRef} className="relative z-10 min-h-[500px]">
          {shouldLoadDemo ? (
            <React.Suspense fallback={
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                <div className="text-slate-500 text-sm font-bold animate-pulse">Загрузка интерактивного блока...</div>
              </div>
            }>
              <LandingQuizDemo
                onRegisterClick={handleEnter}
                language={language}
              />
            </React.Suspense>
          ) : (
            <div className="opacity-0">Loading...</div>
          )}
        </div>
      </section>

      {/* CTA strip after demo */}
      <div className="relative z-10 flex justify-center px-6 pb-4">
        <button
          onClick={handleEnter}
          className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-sm tracking-wide transition-all shadow-lg shadow-blue-500/20 group"
        >
          <Rocket className="w-4 h-4 group-hover:scale-110 transition-transform" />
          {language === 'ru' ? 'Начать бесплатно' : language === 'es' ? 'Empezar gratis' : 'Start for free'}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* ECOSYSTEM SECTION */}
      <section className="relative z-10 px-6 pt-24 pb-6 max-w-[1400px] mx-auto">
        <div className="mb-10">
          <h2 className="text-3xl md:text-5xl font-black mb-4">{copy.ecosystem.title}</h2>
          <p className="text-slate-400 max-w-xl">{copy.ecosystem.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] hover:border-indigo-500/30 transition-all relative overflow-hidden group">
            {/* Background Icon - Fixed Alignment */}
            <div className="absolute top-4 right-4 opacity-10 text-indigo-400 rotate-12 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
              <CheckCircle size={120} />
            </div>

            <div className="relative z-10 pt-2">
              <div className="font-black text-white mb-2 leading-snug text-pretty text-[clamp(1.4rem,2vw,2rem)] max-w-[280px]">
                {copy.ecosystem.cards.totalQuestions}
              </div>
              <p className="text-slate-500 text-sm max-w-[200px]">
                {copy.ecosystem.cards.totalQuestionsDescription}
              </p>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] hover:border-indigo-500/30 transition-all">
            <div className="flex gap-4 mb-4">
              <Car size={32} className="text-blue-400" />
              <Bike size={32} className="text-emerald-400" />
              <Bus size={32} className="text-amber-400" />
            </div>
            <h3 className="font-bold text-lg mb-1">{copy.ecosystem.cards.categoriesTitle}</h3>
            <p className="text-slate-500 text-sm">
              {copy.ecosystem.cards.categoriesDescription}
            </p>
          </div>
          <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900/20 to-slate-900 border border-indigo-500/20 p-8 rounded-[2rem] relative overflow-hidden flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-indigo-300 font-mono text-xs uppercase tracking-widest">
                <Timer size={14} /> {copy.ecosystem.cards.timer}
              </div>
              <h3 className="font-bold text-2xl text-white mb-2">{copy.ecosystem.cards.simulationTitle}</h3>
              <p className="text-slate-400 text-sm max-w-xs">
                {copy.ecosystem.cards.simulationDescription}
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-20 h-20 rounded-full border-4 border-indigo-500 flex items-center justify-center text-xl font-black bg-indigo-900/20">
                {copy.ecosystem.cards.passRate}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI & Features Section */}
      <section className="relative z-10 px-6 pt-6 pb-16 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-10 rounded-[2.5rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <Brain size={300} />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-400 text-xs font-bold uppercase mb-6">
                <Zap size={12} /> {copy.aiSection.poweredBy}
              </div>
              <h2 className="text-4xl font-bold mb-4">{copy.aiSection.title}</h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-md">
                {copy.aiSection.description}
              </p>
              <ul className="space-y-4 text-slate-300">
                {copy.aiSection.bullets.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2.5rem] relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
              {/* Background icon */}
              <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Brain size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Brain className="text-amber-400" size={24} />
                  </div>
                  <h3 className="font-bold text-xl text-white">{copy.aiSection.challengeBank}</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{copy.aiSection.challengeBankDescription}</p>
              </div>
            </div>

            {/* TELEGRAM MINI APP CARD */}
            <div className="bg-slate-900/50 border border-slate-800 p-8 md:p-10 rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden group mb-6 hover:border-indigo-500/30 transition-all cursor-pointer transition-all duration-300" onClick={() => window.open("https://t.me/skilyapp_bot", "_blank")}>
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 group-hover:scale-110 transition-transform duration-500">
                      <Smartphone className="text-sky-400" size={24} />
                    </div>
                    <h3 className="font-bold text-xl text-white">{copy.aiSection.telegramTitle}</h3>
                  </div>
                  <div className="hidden sm:block">
                    <OnlinePlayers baseCount={8430} className="scale-75 origin-right" />
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed max-w-[280px]">{copy.aiSection.telegramDescription}</p>
                
                <div className="flex flex-col gap-4">
                  <div className="sm:hidden mb-4">
                    <OnlinePlayers baseCount={8430} className="scale-90 origin-left mb-2" />
                  </div>
                  
                  <div className="inline-flex items-center gap-1 text-sm font-bold text-sky-400 group-hover:text-sky-300 transition-colors">
                    {copy.aiSection.telegramCTA} <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Phone Mockup (Restored) */}
              <div className="absolute bottom-[-10%] right-[-5%] w-32 h-56 bg-slate-800 rounded-t-[2rem] border-x-[6px] border-t-[6px] border-slate-700 shadow-2xl flex flex-col items-center pt-4 opacity-40 group-hover:opacity-80 group-hover:translate-y-[-15px] transition-all duration-700 rotate-6 group-hover:rotate-0">
                <div className="w-10 h-1 bg-slate-600 rounded-full mb-5"></div>
                <div className="w-full flex-1 bg-slate-900/50 px-3 pt-3 space-y-3">
                  <div className="flex gap-2 items-end">
                    <div className="w-full h-12 bg-sky-500/20 rounded-xl rounded-bl-sm border border-sky-500/10"></div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <div className="w-3/4 h-12 bg-slate-700/40 rounded-xl rounded-br-sm border border-white/5"></div>
                  </div>
                  <div className="w-full h-8 bg-sky-500/10 rounded-lg animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON - BATTLE OF TECH */}
      <section className="relative z-10 px-6 py-24 max-w-[1400px] mx-auto">
        <div className="mb-20 text-center">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-4">{copy.comparison.title}</h2>
          <p className="text-slate-400 max-w-xl mx-auto">{copy.comparison.label}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-4xl mx-auto items-center">
          {/* LEFT: LEGACY (OLD SCHOOL) */}
          <div className="relative py-8 px-6 space-y-10">
            <h3 className="text-2xl font-bold text-slate-500 text-center uppercase tracking-widest mb-8">{copy.comparison.traditional}</h3>

            {/* First Row (Price) */}
            <div className="text-center pb-8 border-b border-white/5 mx-8">
              <div className="text-3xl text-slate-500 font-mono line-through decoration-red-500/50 decoration-4">{copy.comparison.rows[0].traditional}</div>
            </div>

            {/* Other Rows */}
            <div className="space-y-8 px-2">
              {copy.comparison.rows.slice(1).map((row, i) => (
                <div key={i} className="flex items-center justify-center text-slate-500 group min-h-[4rem]">
                  <span className="flex items-center gap-3 decoration-slate-600 group-hover:line-through transition-all text-lg font-medium">
                    {row.traditional} <XCircle size={20} className="text-red-900/60" />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: SKILY (NEXT GEN) */}
          <SkilyComparisonCard copy={copy} />
        </div>
      </section>


      {/* Games Demo - Show, Don't Tell */}
      <section className="relative z-10 px-6 py-16 md:py-20 max-w-[1400px] mx-auto">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Trophy className="w-3 h-3" />
            {copy.arena.bannerLabel}
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
            {copy.arena.bannerTitle}
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            {copy.arena.bannerDescription}
          </p>
        </div>

        {/* Interactive Gameplay Showcase */}
        <div className="mb-24 relative mt-16 px-4">
          <LandingGameModesShowcase language={language} />
        </div>

        {/* Season Rewards Row (Battle Pass Style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-16">
          {copy.arena.seasonRewards.map((reward, i) => {
            const icons = [Sparkles, Zap, Trophy];
            const Icon = icons[i] || Sparkles;
            const colors = [
              "from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-400 group-hover:border-purple-500/50",
              "from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-400 group-hover:border-amber-500/50",
              "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-400 group-hover:border-emerald-500/50"
            ];
            const style = colors[i];

            return (
              <div key={i} className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 backdrop-blur-sm transition-all hover:-translate-y-1 ${style}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                    <Icon size={24} />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest opacity-30 group-hover:opacity-100 transition-opacity">Season 1</div>
                </div>
                <h4 className="text-lg font-bold text-white mb-1">{reward.title}</h4>
                <p className="text-sm text-slate-400">{reward.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ARENA GAMES GRID */}
      <section className="px-6 py-24 max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">{copy.arena?.gamesTitle || "Соревновательная арена"}</h2>
            <p className="text-slate-400">{copy.arena?.bannerDescription || "Бросайте вызов друзьям, зарабатывайте опыт и поднимайтесь в таблице лидеров в нашем турнирном режиме."}</p>
          </div>
          <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            {copy.arena?.onlineText || "10,000+ ОНЛАЙН"}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(copy.arena?.games || [
            { icon: "rocket", title: "Дуэли на скорость", description: "Кто первым ответит на 10 вопросов? Тестовый батл один на один с реальным оппонентом." },
            { icon: "swords", title: "Турниры на выживание", description: "Серия тестов без права на ошибку. Выживает только один." },
            { icon: "target", title: "Снайперская точность", description: "Сложные вопросы, где важна максимальная точность и внимательность." },
            { icon: "brain", title: "Блиц-опрос", description: "Быстрые серии по 20 секунд на ответ. Проверьте скорость мышления." }
          ]).map((game: any, i: number) => (
            <div key={i} className="group p-8 rounded-[2.5rem] bg-slate-900/40 border border-white/5 hover:border-indigo-500/30 transition-all duration-300">
               <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {i === 0 && <Rocket className="text-indigo-400" size={28} />}
                  {i === 1 && <Swords className="text-indigo-400" size={28} />}
                  {i === 2 && <Target className="text-indigo-400" size={28} />}
                  {i === 3 && <Brain className="text-indigo-400" size={28} />}
               </div>
               <h3 className="text-xl font-bold text-white mb-3">{game.title}</h3>
               <p className="text-slate-400 text-sm leading-relaxed">{game.description}</p>
            </div>
          ))}
        </div>
      </section>

      <React.Suspense fallback={<div className="h-[200px]" />}>
        <TestimonialsSection
          testimonials={SPAIN_TESTIMONIALS}
          badge="Student Reviews"
          title="Real people, real licenses"
          subtitle="Students from 20+ countries passed their DGT exam with Skily — at their own pace, in their own language."
        />
      </React.Suspense>

      {/* LIVE CLASS SECTION - RUSSIAN ONLY */}
      {language === 'ru' && (
        <section className="relative z-10 px-6 py-20 max-w-[1500px] mx-auto">
          {/* Background effects */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <div className="rounded-3xl overflow-hidden border border-white/20 bg-gradient-to-br from-blue-950/60 via-slate-900/60 to-slate-950/80 backdrop-blur-xl shadow-2xl">
            {/* Glow effect overlay */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/0 via-transparent to-cyan-500/0 pointer-events-none"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 relative">
              {/* LEFT: Content */}
              <div className="p-8 md:p-12 flex flex-col justify-center relative">
                <div className="inline-flex items-center gap-2 w-fit mb-6 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/50 backdrop-blur-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-400"></span>
                  </span>
                  <span className="text-blue-200 text-sm font-bold tracking-wide">{copy.liveClass.badge}</span>
                </div>

                <h3 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
                  {copy.liveClass.title}
                </h3>

                <p className="text-slate-300 text-base md:text-lg mb-8 leading-relaxed">
                  {copy.liveClass.description}
                </p>

                <div className="flex items-center gap-3 mb-8 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 w-fit">
                  <svg className="w-5 h-5 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-blue-200 font-semibold text-sm">{copy.liveClass.schedule}</span>
                </div>

                {/* Features List */}
                <div className="space-y-3 mb-10">
                  {copy.liveClass.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <svg className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-slate-200 text-sm md:text-base font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    playClickSound();
                    navigate('/curso');
                  }}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold transition-all duration-300 hover:shadow-2xl hover:shadow-blue-600/50 w-fit group hover:scale-105 active:scale-95 text-lg"
                >
                  Оформить заявку
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>

              {/* RIGHT: Visual - Enhanced Card */}
              <div className="relative p-8 md:p-12 flex items-center justify-center bg-gradient-to-bl from-blue-500/5 via-transparent to-cyan-500/10 md:border-l border-white/10">
                <div className="relative w-full max-w-sm">
                  {/* Animated gradient background */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/30 via-cyan-500/20 to-blue-600/10 blur-2xl animate-pulse"></div>
                  <div className="absolute -top-4 -right-4 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl animate-pulse delay-700"></div>

                  {/* Main card with enhanced styling */}
                  <div className="relative rounded-2xl border border-blue-400/50 bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl p-8 shadow-2xl">
                    {/* Card header - Next class */}
                    <div className="flex items-center gap-4 mb-8">
                      <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/20 border border-blue-400/50 flex items-center justify-center flex-shrink-0">
                        <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-pulse"></div>
                        <svg className="w-7 h-7 text-blue-300 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white font-bold text-base">Следующий класс</p>
                        <p className="text-cyan-300 text-sm font-semibold">Автоматическое расписание</p>
                      </div>
                    </div>

                    {/* Animated divider */}
                    <div className="relative h-1 mb-8 rounded-full overflow-hidden bg-slate-700/50">
                      <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-blue-500 via-cyan-400 to-transparent animate-pulse"></div>
                    </div>

                    {/* Info items with enhanced styling */}
                    <div className="space-y-4 mb-8">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:border-blue-400/40 transition-all group">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400"></div>
                        <span className="text-slate-200 text-sm font-medium group-hover:text-white transition-colors">2 раза в неделю (вт, чт)</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-400/40 transition-all group">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400"></div>
                        <span className="text-slate-200 text-sm font-medium group-hover:text-white transition-colors">{formatTuesdayRu()}</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:border-blue-400/40 transition-all group">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400"></div>
                        <span className="text-slate-200 text-sm font-medium group-hover:text-white transition-colors">45-50 минут интерактива</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-6 border-t border-white/10">
                      <p className="text-xs text-cyan-300/80 font-semibold">📹 Прямой эфир + Запись вечно</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PRICING SECTION */}
      <section className="relative z-10 px-6 py-20 pb-32 max-w-[1500px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">{copy.pricing.title}</h2>
          <p className="text-slate-400 mb-8">{copy.pricing.description}</p>

          {/* Pre-pricing CTA */}
          <button
            onClick={handleEnter}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-black text-sm uppercase tracking-wide transition-all shadow-xl shadow-blue-500/25 group"
          >
            <Rocket className="w-4 h-4 group-hover:scale-110 transition-transform" />
            {language === 'ru' ? 'Начать бесплатно' : language === 'es' ? 'Empezar gratis — sin tarjeta' : 'Start free — no card needed'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <p className="text-slate-600 text-xs mt-3">
            {language === 'ru' ? 'Базовый доступ бесплатно · Премиум можно подключить позже'
              : language === 'es' ? 'Acceso básico gratis · Premium se puede añadir después'
              : 'Basic access free · Premium can be added later'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-y-10 gap-x-4 items-stretch pt-12">
          {Object.entries(copy.pricing.plans).map(([key, plan]) => {
            const isPremium = key !== 'cadet';
            const isHighlighted = key === 'biannual';

            return (
              <div
                key={key}
                className={cn(
                  "flex flex-col p-6 rounded-[2rem] transition-all duration-300 relative group",
                  !isPremium ? "bg-slate-900 border border-slate-800" :
                    isHighlighted ? "bg-indigo-900/40 border-2 border-indigo-500 shadow-[0_0_50px_-15px_rgba(99,102,241,0.5)] scale-[1.03] z-10" :
                      "bg-[#11141D] border border-white/5 hover:border-white/10"
                )}
              >
                {(plan as any).badge && (
                  <div className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                    isHighlighted ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : "bg-slate-800 text-slate-400"
                  )}>
                    {(plan as any).badge}
                  </div>
                )}

                <h3 className={cn(
                  "font-black text-lg mb-2",
                  isPremium ? "text-indigo-300" : "text-slate-400"
                )}>
                  {plan.title}
                </h3>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-2xl font-black text-white">{plan.price}</span>
                  {(plan as any).note && <span className="text-slate-500 text-xs font-medium">{(plan as any).note}</span>}
                </div>

                <ul className="space-y-3 mb-8 text-xs flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-slate-300">
                      <CheckCircle2 size={14} className={cn("shrink-0", isPremium ? "text-indigo-400" : "text-slate-600")} />
                      <span className="leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleEnter}
                  className={cn(
                    "w-full py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 relative overflow-hidden group/btn",
                    !isPremium ? "border border-slate-700 text-slate-300 hover:bg-slate-800" :
                      isHighlighted ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20" :
                        "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20"
                  )}
                >
                  <span className="relative z-10">{plan.cta}</span>
                  {referrerInfo && (
                    <span className="ml-2 text-amber-300 inline-flex items-center gap-1 relative z-10">
                      +50 <Coins className="h-3 w-3 inline" />
                    </span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="relative z-10 px-6 py-24 max-w-[1400px] mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
            {faqContent[language].sectionTitle}
          </h2>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
            {faqContent[language].sectionSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {faqContent[language].categories.flatMap(cat =>
            cat.questions.map(q => ({ ...q, category: cat.title }))
          ).map((item, idx) => (
            <FAQItem
              key={idx}
              question={item.q}
              answer={item.a}
              icon={item.icon}
              category={item.category}
            />
          ))}

          {/* Electric Portal CTA */}
          <div className="md:col-span-2 lg:col-span-3 group relative overflow-hidden rounded-2xl border border-blue-400/50 bg-gradient-to-r from-blue-600 to-indigo-600 p-1 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all cursor-pointer hover:scale-[1.01]"
            onClick={() => window.open("https://t.me/skilyapp_bot", "_blank")}>

            {/* Glow Overlay */}
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative bg-slate-900/10 backdrop-blur-sm rounded-xl p-6 h-full flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6 text-center sm:text-left">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30 relative">
                  <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-50" />
                  <Headset size={32} className="text-white relative z-10" />
                </div>
                <div>
                  <h3 className="text-white font-black text-xl md:text-2xl mb-1 text-shadow-sm">
                    {language === 'ru' ? 'Не нашли ответ? Свяжитесь с базой.' : 'Questions left? Contact Base.'}
                  </h3>
                  <p className="text-blue-100 font-medium text-sm md:text-base">
                    {language === 'ru' ? 'Живая поддержка ответит за 2 минуты (24/7).' : 'Live support replies in 2 minutes (24/7).'}
                  </p>
                </div>
              </div>

              <button className="whitespace-nowrap px-8 py-4 rounded-xl bg-white text-blue-700 font-black text-sm uppercase tracking-wider hover:bg-blue-50 transition-colors shadow-lg flex items-center gap-2 group/btn">
                {language === 'ru' ? 'Открыть чат Telegram' : 'Open Telegram Chat'}
                <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* SEO Schema */}
        <script id="faq-jsonld" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqContent[language].categories.flatMap(cat =>
              cat.questions.map(q => ({
                "@type": "Question",
                "name": q.q,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": q.a
                }
              }))
            )
          })}
        </script>
      </section>

      {/* Disclaimer Section */}
      <section className="px-6 py-12 border-y border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            <span>{language === 'ru' ? 'SaaS / Mobile Gaming / EdTech' : language === 'es' ? 'SaaS / Juegos Móviles / EdTech' : 'SaaS / Mobile Gaming / EdTech'}</span>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            {language === 'ru' ?
              'SkilyApp — это программная платформа с собственными играми, AI-технологиями и системой геймификации. Мы не продаем доступ к экзаменам или сертификаты. Все наши игры, алгоритмы и интерактивный опыт являются нашей собственной интеллектуальной собственностью.' :
              language === 'es' ?
                'SkilyApp es una plataforma de software con juegos propios, tecnologías de IA y sistema de gamificación. No vendemos acceso a exámenes ni certificados. Todos nuestros juegos, algoritmos y experiencia interactiva son nuestra propiedad intelectual.' :
                'SkilyApp is a software platform with proprietary games, AI technologies, and gamification system. We do not sell exam access or certificates. All our games, algorithms, and interactive experience are our own intellectual property.'
            }
          </p>
          <button
            onClick={() => navigate('/about')}
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
          >
            {language === 'ru' ? 'Подробнее о нас' : language === 'es' ? 'Más sobre nosotros' : 'Learn more about us'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* SEO Content Section - keyword-rich, crawlable text */}
      <section className="relative z-10 px-6 py-16 max-w-[1400px] mx-auto">
        <div className="prose prose-invert prose-sm max-w-4xl mx-auto text-slate-400 leading-relaxed">
          {language === 'es' ? (
            <>
              <h2 className="text-xl font-bold text-white mb-4">Test DGT {examYear} - La mejor app de autoescuela online gratis</h2>
              <p>
                Skilyapp es la <strong>app de autoescuela online gratis</strong> más completa para preparar el <strong>examen teórico DGT {examYear}</strong>.
                Con más de 1000 <strong>preguntas oficiales del test DGT</strong> actualizadas, <strong>simulacros de examen real</strong> con temporizador de 30 minutos,
                y un <strong>tutor de inteligencia artificial</strong> disponible 24/7. Nuestra plataforma es ideal para obtener el <strong>permiso de conducir en España</strong> —
                tanto el <strong>permiso B</strong> como otras categorías.
              </p>
              <p>
                ¿Buscas un <strong>test de conducir gratis</strong> o una <strong>autoescuela móvil</strong>? Skilyapp ofrece todo lo que necesitas para <strong>aprobar el examen DGT a la primera</strong>:
                <strong>test autoescuela DGT</strong> con preguntas reales, explicaciones detalladas de cada error, y un sistema de gamificación que hace
                el estudio más divertido. Disponible en <strong>español, inglés y ruso</strong> — perfecto para expatriados y extranjeros en España.
              </p>
              <p>
                Nuestro <strong>simulacro examen DGT</strong> replica las condiciones exactas del examen real: 30 preguntas, 30 minutos, necesitas acertar 27 para aprobar.
                La IA analiza tus errores y crea un plan de estudio personalizado. <strong>El 97% de nuestros alumnos aprueba el carnet de conducir</strong> con Skilyapp.
              </p>
            </>
          ) : language === 'en' ? (
            <>
              <h2 className="text-xl font-bold text-white mb-4">Spain DGT Driving Theory Test {examYear} - Best Free App</h2>
              <p>
                Skilyapp is the most comprehensive free app for preparing the <strong>Spanish DGT driving theory test {examYear}</strong>.
                With over 1000 <strong>official DGT exam questions</strong> in English, <strong>real exam simulation</strong> with 30-minute timer,
                and an <strong>AI tutor available 24/7</strong>. Perfect for expats and foreigners getting their <strong>driving license in Spain</strong>.
              </p>
              <p>
                Looking for a <strong>Spain driving test app</strong>? Skilyapp offers everything you need to <strong>pass the DGT exam on your first try</strong>:
                official questions with English translations, detailed explanations for every mistake, and gamified learning that makes studying fun.
                <strong>97% of our students pass</strong> the Spanish driving theory test with Skilyapp.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-4">Экзамен DGT {examYear} на русском языке - Лучшее приложение</h2>
              <p>
                Skilyapp — лучшее приложение для подготовки к <strong>теоретическому экзамену DGT {examYear}</strong> на русском языке.
                Более 1000 <strong>официальных вопросов DGT</strong> с переводом, <strong>симуляция реального экзамена</strong>,
                <strong>AI-репетитор 24/7</strong>. <strong>97% наших студентов сдают с первого раза</strong>.
              </p>
            </>
          )}
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-800 bg-[#0f172a]">
        <div className="px-6 py-16 max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">

            {/* Brand Column */}
            <div className="lg:col-span-4 space-y-6">
              <div className="scale-75 origin-top-left -ml-2">
                <LandingLogo theme="dark" variant="bold" />
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                {language === 'ru' ?
                  'Первая в мире платформа подготовки водителей с искусственным интеллектом, геймификацией и PvP-дуэлями.' :
                  language === 'es' ?
                    'La primera plataforma de formación vial del mundo con inteligencia artificial, gamificación y duelos PvP.' :
                    'The world\'s first driver training platform with artificial intelligence, gamification and PvP duels.'
                }
              </p>
              <div className="flex items-center gap-4 text-slate-500">
                {/* Social placeholders - can be real links later */}
                <div className="flex items-center gap-4 text-slate-500">
                  {/* Social links removed */}
                </div>
              </div>
            </div>

            {/* Links Columns */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">

              {/* Product / Company */}
              <div>
                <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                  <Globe size={16} className="text-blue-500" />
                  Product
                </h4>
                <ul className="space-y-4">
                  {copy.footer.menu.filter(i => !i.href.includes('/legal/')).map((item) => (
                    <li key={item.label}>
                      {item.external ? (
                        <a href={item.href} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white text-sm transition-colors block">
                          {item.label}
                        </a>
                      ) : (
                        <button
                          onClick={() => {
                            if (item.href === '#partnership') {
                              setIsPartnershipOpen(true);
                            } else {
                              navigate(item.href);
                            }
                          }}
                          className="text-slate-400 hover:text-white text-sm transition-colors text-left block"
                        >
                          {item.label}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                  <FileText size={16} className="text-slate-500" />
                  Legal
                </h4>
                <ul className="space-y-4">
                  {copy.footer.menu.filter(i => i.href.includes('/legal/')).map((item) => (
                    <li key={item.label}>
                      <button onClick={() => navigate(item.href)} className="text-slate-400 hover:text-white text-sm transition-colors text-left block">
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact / Location */}
              <div>
                <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                  <MapPin size={16} className="text-amber-500" />
                  Office
                </h4>
                <address className="not-italic text-slate-400 text-sm space-y-4">
                  <p>Barcelona, Spain<br />Carrer de la Marina</p>
                  <a href="mailto:hello@skily.ai" className="text-indigo-400 hover:text-white transition-colors block">hello@skily.ai</a>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    All Systems Operational
                  </div>
                </address>

              </div>

            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 pb-[max(env(safe-area-inset-bottom),1rem)] border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500 uppercase tracking-widest">
            <p>{copy.footer.note}</p>
            <div className="flex flex-col items-center gap-3 md:items-end">
              <a
                href="https://www.nrtv.studio"
                target="_blank"
                rel="noreferrer"
                aria-label={language === 'ru' ? 'Перейти на nrtv.studio' : language === 'es' ? 'Abrir nrtv.studio' : 'Visit nrtv.studio'}
                className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-medium normal-case tracking-normal text-slate-200 shadow-[0_12px_30px_rgba(15,23,42,0.22)] backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
              >
                <img
                  src="/nrtv-logo.png"
                  alt="NRTV"
                  className="h-6 w-6 rounded-md object-cover"
                />
                <span>
                  {language === 'ru'
                    ? 'Сайт запущен студией NRTV'
                    : language === 'es'
                      ? 'Sitio lanzado por el estudio NRTV'
                      : 'Site launched by NRTV Studio'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-medium text-slate-100">
                  nrtv.studio <ArrowUpRight size={12} />
                </span>
              </a>
              <div className="flex items-center gap-2">
                {/* Made with text removed */}
              </div>
            </div>
          </div>
        </div>
      </footer>
      <PartnershipExpansionPortal
        isOpen={isPartnershipOpen}
        onClose={() => setIsPartnershipOpen(false)}
      />
    </div>
  );
};
