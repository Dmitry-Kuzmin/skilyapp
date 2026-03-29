// Skily Landing Page - Russia Market (ГИБДД)
import React, { useState, useEffect } from "react";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
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
  Rocket,
  Star
} from "lucide-react";
import { playClickSound, playEngineSound } from "@/services/audioService";
import { LandingLogo } from "./LandingLogo";
import { StartEngineButton } from "./StartEngineButton";
import { OnlinePlayers } from "@/components/shared/OnlinePlayers";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "./LanguageSelector";
import { CountrySelector } from "./CountrySelector";
const InfiniteMarquee = React.lazy(() => import("./InfiniteMarquee").then(m => ({ default: m.InfiniteMarquee })));
const LandingGameModesShowcase = React.lazy(() => import("./LandingGameModesShowcase").then(m => ({ default: m.LandingGameModesShowcase })));
const LandingQuizDemo = React.lazy(() => import("./LandingQuizDemo").then(m => ({ default: m.LandingQuizDemo })));
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useCountry } from "@/contexts/CountryContext";
import { PartnershipExpansionPortal } from "./PartnershipExpansionPortal";
import { examYear } from "@/utils/dateUtils";
import {
  landingTranslations,
  LANGUAGE_OPTIONS,
  RUSSIA_LANGUAGE_OPTIONS,
} from "@/translations/landing";

// ВРЕМЕННО: прямой импорт вместо lazy для дебага
const LandingDuelPassSection = React.lazy(() => import('./LandingDuelPassSection').then(module => ({ default: module.LandingDuelPassSection })));
import { FAQItem } from "./FAQItem";
// const LandingDuelDemo = React.lazy(() => import('./LandingDuelDemo').then(module => ({ default: module.LandingDuelDemo })));

const DEMO_VARIANTS = {
  ru: [
    {
      title: 'Мы научили AI думать как экзаменатор DGT',
      text: 'Skily AI знает каждый подвох в билетах DGT. Объясняет сложные юридические термины простым языком за 2 секунды.'
    },
    {
      title: 'Персональный репетитор по ПДД',
      text: 'Забудь про зубрежку 3000 вопросов DGT. AI подстраивается под твои ошибки и объясняет логику правил, а не сухие цитаты из закона.'
    },
    {
      title: 'Разбор сценариев с подвохом',
      text: 'В билетах DGT часто встречаются ловушки. Skily AI научит тебя видеть их и не попадаться. Сдашь теорию в Испании с первого раза.'
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
      text: 'We fed the neural network 5000 pages of traffic codes. Skily AI knows every nuance better than any professor and will explain it to you in 2 seconds.'
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
    { icon: Zap, text: 'Без зубрежки', color: 'text-yellow-400' },
    { icon: InfinityIcon, text: 'Разбор ловушек', color: 'text-blue-400' },
    { icon: Globe, text: 'Простым языком', color: 'text-emerald-400' }
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

interface AiStudioLandingProps {
  onRequestAccess: () => void;
  referrerInfo?: ReferrerInfo | null;
  loadingReferrer?: boolean;
  partnerInfo?: PartnerInfo | null;
  loadingPartner?: boolean;
}

export const LandingRussia: React.FC<AiStudioLandingProps> = ({
  onRequestAccess,
  referrerInfo,
  loadingReferrer = false,
  partnerInfo,
  loadingPartner = false,
}) => {
  const isTouchDevice = useIsTouchDevice();
  const isMobile = useIsMobile();
  const [isStarting, setIsStarting] = useState(false);
  const [isEchoActive, setIsEchoActive] = useState(false);
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleSpotlightMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };



  const [activeGameMode, setActiveGameMode] = useState<'pvp' | 'race'>('pvp');
  const [shouldLoadDemo, setShouldLoadDemo] = useState(false);
  const demoContainerRef = React.useRef<HTMLDivElement>(null);

  const [shouldLoadQuizDemo, setShouldLoadQuizDemo] = useState(false);
  const quizDemoContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!quizDemoContainerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !shouldLoadQuizDemo) {
            setShouldLoadQuizDemo(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0, rootMargin: '600px' }
    );
    observer.observe(quizDemoContainerRef.current);
    return () => observer.disconnect();
  }, [shouldLoadQuizDemo]);

  // Intersection Observer для ленивой загрузки демо-дуэли
  useEffect(() => {
    console.log('[Landing] Demo container ref:', demoContainerRef.current);
    console.log('[Landing] shouldLoadDemo:', shouldLoadDemo);

    if (!demoContainerRef.current) {
      console.warn('[Landing] Demo container ref not found!');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          console.log('[Landing] Intersection:', entry.isIntersecting);
          if (entry.isIntersecting && !shouldLoadDemo) {
            console.log('[Landing] Loading demo...');
            setShouldLoadDemo(true);
            observer.disconnect(); // Загрузили один раз - отключаем observer
          }
        });
      },
      { threshold: 0, rootMargin: '600px' } // Начинаем загрузку за 600px (1.5 экрана) до появления
    );

    observer.observe(demoContainerRef.current);

    return () => observer.disconnect();
  }, [shouldLoadDemo]);

  // Duel Pass logic moved to LandingDuelPassSection
  // Auto-rotate game modes (DISABLED - теперь используем интерактивное демо)
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setActiveGameMode((prev) => (prev === 'pvp' ? 'race' : 'pvp'));
  //   }, 4000); // Switch every 4 seconds
  //   return () => clearInterval(interval);
  // }, []);

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
      sectionTitle: 'Почему Skily лучше зубрежки билетов?',
      sectionSubtitle: 'Развеиваем мифы о подготовке к экзамену ГИБДД.',
      categories: [
        {
          id: 'money',
          title: 'Экономия и Законы',
          questions: [
            {
              q: 'Можно ли сдать теорию DGT самостоятельно?',
              a: 'Да! Многие сдают с первого раза, готовясь самостоятельно. Skily даёт структурированную подготовку с AI-объяснениями, что эффективнее обычной зубрежки тысяч вопросов.',
              icon: School
            },
            {
              q: 'Сколько времени нужно на подготовку?',
              a: 'С умным алгоритмом Skily — от 2 недель. AI определяет твои слабые места и фокусирует на них внимание. Без зубрежки, только понимание логики.',
              icon: Timer
            },
            {
              q: 'Что делать с вопросами-ловушками?',
              a: 'В DGT любят подвохи в формулировках. Skily AI разбирает каждую ловушку и объясняет, на что обратить внимание. Ты научишься их видеть.',
              icon: Target
            }
          ]
        },
        {
          id: 'lang',
          title: 'Технологии',
          questions: [
            {
              q: 'Как AI помогает учить ПДД?',
              a: 'AI не просто показывает правильный ответ. Он объясняет ПОЧЕМУ это правильно, разбирает дорожную ситуацию и показывает логику. Как персональный репетитор 24/7.',
              icon: Brain
            },
            {
              q: 'Насколько актуальны вопросы?',
              a: 'Мы обновляем базу при каждом изменении в ПДД. Если вчера DGT обновила билет — сегодня он уже в Skily с AI-объяснением.',
              icon: Sparkles
            }
          ]
        },
        {
          id: 'process',
          title: 'Стоимость',
          questions: [
            {
              q: 'Сколько стоит подготовка?',
              a: 'Базовая версия бесплатна. Premium с полным AI и без рекламы — 299₽/месяц. Это в 10 раз дешевле репетитора и доступно 24/7.',
              icon: Coins
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
  }, [referrerInfo?.photo_url]);
  const navigate = useNavigate();

  // KRITIKO: Russia landing ВСЕГДА показывает RU, независимо от выбора пользователя
  // Переходящие со Spain landing с es/en → переключаем на Russian (ru)
  const effectiveLanguage = 'ru' as Language;
  React.useEffect(() => {
    if (language !== 'ru') {
      setLanguage('ru');
      console.log('[LandingRussia] Forced to RU (RUB prices only)');
    }
  }, [language, setLanguage]);

  const copy = landingTranslations[effectiveLanguage];
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);



  const handleStartEngine = () => {
    // Для мобильных устройств (touch + small screen) редирект на /login
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
    <div className="relative min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{ backgroundImage: 'url("/noise.svg")' }}
      ></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>
      {/* Ambient Grid Echo Overlay (Masked Top-Left) */}
      <div
        className={`fixed inset-0 bg-[linear-gradient(to_right,#22d3ee30_1px,transparent_1px),linear-gradient(to_bottom,#22d3ee30_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0 opacity-0 ${isEchoActive ? 'animate-[grid-echo_0.6s_ease-out_forwards]' : ''}`}
        style={{
          WebkitMaskImage: 'radial-gradient(circle at 120px 40px, black 0%, transparent 70%)',
          maskImage: 'radial-gradient(circle at 120px 40px, black 0%, transparent 70%)'
        }}
      ></div>

      <nav 
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] transition-all duration-300 px-6",
          scrolled ? "py-4 bg-[#020617]/80 backdrop-blur-md border-b border-white/5" : "py-8"
        )}
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <LandingLogo theme="dark" variant="bold" />
            <div className="hidden lg:flex items-center gap-6 ml-8">
              {copy.footer.menu.slice(0, 3).map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.href)}
                  className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <CountrySelector />
            </div>
            {/* LanguageSelector is hidden for Russia locale by logic in Landing.tsx, 
                but we manually exclude it here too for safety */}
            <button
              onClick={handleEnter}
              className="bg-white text-black px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 whitespace-nowrap"
            >
              {copy.controls.studentAccess}
            </button>
          </div>
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
                onClick={() => {
                  if (isTouchDevice) {
                    navigate('/login');
                  } else {
                    handleEnter();
                  }
                }}
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
                onClick={() => {
                  if (isTouchDevice) {
                    navigate('/login');
                  } else {
                    handleEnter();
                  }
                }}
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
      <section className="relative z-10 px-6 py-20 md:py-32 max-w-[1400px] mx-auto flex flex-col items-center justify-center text-center min-h-[600px] h-auto">
        {/* Badge с электрическим синим */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[9px] sm:text-[10px] font-bold tracking-[0.25em] uppercase mb-5 sm:mb-6 animate-fade-in relative z-20">
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          {selectedCountry.code === 'RU' ? `ГИБДД ${examYear} · Официальные билеты` : `DGT Approved · ${examYear}`}
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
          <div className={`scale-75 md:scale-90 transform-gpu will-change-transform ${isEchoActive ? "animate-[button-echo_0.8s_ease-in-out_forwards]" : ""}`}>
            <StartEngineButton
              onClick={handleStartEngine}
              isIgniting={isStarting}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-slate-500 animate-engine-idle" style={{ animationDelay: '0.3s' }}></div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 animate-engine-idle">
              {copy.hero.pressStart}
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-slate-500 animate-engine-idle" style={{ animationDelay: '0.3s' }}></div>
          </div>
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
            {DEMO_VARIANTS[effectiveLanguage][demoVariantIndex].title}
          </h2>
          <p style={{ textWrap: 'balance' }} className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-8 min-h-[3.5em] animate-fade-in">
            {DEMO_VARIANTS[effectiveLanguage][demoVariantIndex].text}
          </p>

          <div className="flex flex-wrap justify-center gap-3 md:gap-6 animate-fade-in mb-8">
            {FEATURE_PILLS[effectiveLanguage].map((pill, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300 text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors cursor-default">
                <pill.icon className={cn("w-3.5 h-3.5", pill.color)} />
                {pill.text}
              </div>
            ))}
          </div>
        </div>

        <div ref={quizDemoContainerRef} className="relative z-10 min-h-[500px]">
          {shouldLoadQuizDemo ? (
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
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2.5rem] relative overflow-hidden">
              {/* Background icon */}
              <div className="absolute top-4 right-4 opacity-5">
                <Brain size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <Brain className="text-amber-400" size={24} />
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
              {copy.comparison.rows.slice(1).map((row, i) => (
                <div key={i} className="flex flex-col items-center justify-center min-h-[4rem] text-center">
                  <span className="flex items-center gap-3 text-white font-black text-xl tracking-tight drop-shadow-lg">
                    {row.skily} <CheckCircle size={24} className="text-indigo-400 fill-indigo-400/20" />
                  </span>
                  {row.skilyDesc && (
                    <span className="text-sm font-medium text-indigo-100/80 mt-1.5 block">
                      {row.skilyDesc}
                    </span>
                  )}             </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* Games Demo - Show, Don't Tell */}
      <section className="relative z-10 px-6 py-16 md:py-20 max-w-[1400px] mx-auto">

        <div ref={demoContainerRef} className="min-h-[600px] flex items-center justify-center relative">
          {shouldLoadDemo ? (
            <React.Suspense fallback={
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin"></div>
                <div className="text-slate-500 text-sm font-bold animate-pulse">Загрузка арены...</div>
              </div>
            }>
              <LandingDuelPassSection language={language === 'ru' ? 'ru' : 'en'} copy={copy} />
            </React.Suspense>
          ) : (
            <div className="text-slate-800 text-sm italic opacity-0 transition-opacity duration-700">Загрузка интерактивного блока...</div>
          )}
        </div>
      </section>

      {/* --- DUEL PASS PROGRESS RAIL --- */}
      <section className="relative z-10 py-16 max-w-[1400px] mx-auto">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative pt-8 pb-12 px-8 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 relative z-10">
              <div>
                <h4 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter italic">Duel Pass <span className="text-orange-500">Season 1</span></h4>
                <p className="text-sm text-slate-400 max-w-sm">
                  {language === 'ru'
                    ? 'Играй в дуэли, копи опыт и забирай эксклюзивные награды каждый сезон.'
                    : 'Play duels, gain XP, and claim exclusive rewards every season.'}
                </p>
              </div>
              <div className="flex items-center gap-5 bg-white/5 p-3 rounded-2xl border border-white/10">
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Current Level</div>
                  <div className="text-2xl font-black text-white leading-none">12</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Star className="text-white w-6 h-6 fill-white/20" />
                </div>
              </div>
            </div>

            {/* The Rail */}
            <div className="relative h-4 bg-slate-800/80 rounded-full mb-10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] border border-white/5">
              <div className="absolute top-0 left-0 h-full w-[65%] bg-gradient-to-r from-orange-500 via-indigo-500 to-cyan-500 shadow-[0_0_20px_rgba(99,102,241,0.4)] rounded-full transition-all duration-1000 ease-out"></div>

              {/* Level Markers */}
              <div className="absolute inset-x-0 -top-1 bottom-0 flex justify-between items-center px-1">
                {[1, 5, 10, 15, 20].map((level) => (
                  <div key={level} className="relative flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 border-slate-900 transition-colors duration-500 ${level <= 12 ? 'bg-white shadow-[0_0_15px_#fff]' : 'bg-slate-700'}`}></div>
                    <div className={`absolute -bottom-8 text-[10px] font-black transition-colors ${level <= 12 ? 'text-white' : 'text-slate-500'}`}>LVL {level}</div>

                    {/* Rewards */}
                    {level === 5 && (
                      <div className="absolute -top-12 w-10 h-10 rounded-xl bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)] flex items-center justify-center text-white rotate-6 hover:rotate-0 transition-transform cursor-help group">
                        <Zap size={16} />
                        <div className="absolute -top-10 scale-0 group-hover:scale-100 bg-white text-black text-[9px] font-black px-2 py-1 rounded shadow-xl transition-transform uppercase whitespace-nowrap">XP Boost x2</div>
                      </div>
                    )}
                    {level === 15 && (
                      <div className="absolute -top-12 w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 -rotate-6 grayscale group">
                        <Gift size={16} />
                        <div className="absolute -top-10 scale-0 group-hover:scale-100 bg-white text-black text-[9px] font-black px-2 py-1 rounded shadow-xl transition-transform uppercase whitespace-nowrap">Secret Reward</div>
                      </div>
                    )}
                    {level === 20 && (
                      <div className="absolute -top-14 w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-600 shadow-[0_0_25px_rgba(251,191,36,0.6)] flex items-center justify-center text-white scale-110 animate-bounce group">
                        <Crown size={22} />
                        <div className="absolute -top-10 scale-0 group-hover:scale-100 bg-white text-black text-[9px] font-black px-2 py-1 rounded shadow-xl transition-transform uppercase whitespace-nowrap">Elite Skin</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Countdown / Hint */}
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
                  {language === 'ru' ? 'НОВЫЙ СЕЗОН СТАРТУЕТ ЧЕРЕЗ 5 ДНЕЙ' : 'NEW SEASON STARTS IN 5 DAYS'}
                </span>
              </div>
            </div>

            {/* Background Glows */}
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px]"></div>
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-orange-600/5 rounded-full blur-[80px]"></div>
          </div>
        </div>
      </section>
      <React.Suspense fallback={<div className="h-[400px]" />}>
        <LandingGameModesShowcase language={language} />
      </React.Suspense>

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
        <InfiniteMarquee />
      </React.Suspense>

      <section className="relative z-10 px-6 py-20 pb-32 max-w-[1500px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">{copy.pricing.title}</h2>
          <p className="text-slate-400">{copy.pricing.description}</p>
        </div>

        <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-y-12 sm:gap-x-4 items-stretch pt-12 pb-8 -mx-6 px-6 sm:mx-0 sm:px-0 scrollbar-none snap-x snap-mandatory">
          {Object.entries(copy.pricing.plans).map(([key, plan], index) => {
            const isPremium = key !== 'cadet';
            const isHighlighted = key === 'biannual'; // 'ХИТ' or 'Popular'

            return (
              <div
                key={key}
                className={cn(
                  "flex flex-col p-6 rounded-[2rem] transition-all duration-300 relative group min-w-[280px] sm:min-w-0 snap-center",
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
                  onClick={() => navigate('/login')}
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

      {/* TESTIMONIALS SECTION */}
      <section className="relative z-10 px-6 py-20 max-w-[1400px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
            Они уже сдали с первого раза
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Реальные отзывы студентов, которые подготовились к ГИБДД с помощью Skily
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Отзыв 1 - Алексей */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-indigo-500/30 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                А
              </div>
              <div>
                <div className="font-bold text-white">Алексей</div>
                <div className="text-xs text-slate-500">Москва</div>
              </div>
            </div>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(i => (
                <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
              ))}
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Думал, что выучить 800 вопросов нереально. В Skily это как залипнуть в игру. Сдал теорию за 4 минуты без единой ошибки. AI объяснял каждую ловушку.
            </p>
          </div>

          {/* Отзыв 2 - Дарья */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-indigo-500/30 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-bold text-lg">
                Д
              </div>
              <div>
                <div className="font-bold text-white">Дарья</div>
                <div className="text-xs text-slate-500">Санкт-Петербург</div>
              </div>
            </div>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(i => (
                <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
              ))}
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              В ГИБДД вопросы часто с подвохом. Приложение научило меня видеть эти ловушки. Skily AI разбирал каждую ситуацию простым языком. Лучшее вложение 299 рублей.
            </p>
          </div>

          {/* Отзыв 3 - Тимур */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-indigo-500/30 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                Т
              </div>
              <div>
                <div className="font-bold text-white">Тимур</div>
                <div className="text-xs text-slate-500">Казань</div>
              </div>
            </div>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(i => (
                <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
              ))}
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Готовился 2 недели по вечерам. Challenge Bank сам подсказывал, какие темы повторить. Сдал с первого раза на 20/20. Теперь рекомендую всем друзьям.
            </p>
          </div>
        </div>
      </section>
      {/* FAQ SECTION */}
      <section className="relative z-10 px-6 py-24 max-w-[1400px] mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
            {faqContent[effectiveLanguage].sectionTitle}
          </h2>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
            {faqContent[effectiveLanguage].sectionSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {faqContent[effectiveLanguage].categories.flatMap(cat =>
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
            "mainEntity": faqContent[effectiveLanguage].categories.flatMap(cat =>
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

      <footer className="relative z-10 border-t border-slate-800 bg-[#0f172a]">
        <div className="px-6 py-16 max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">

            {/* Brand Column */}
            <div className="lg:col-span-4 space-y-6">
              <div className="scale-75 origin-top-left -ml-2">
                <LandingLogo theme="dark" variant="footer" />
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
                  {copy.footer.menu.filter(i => !i.href.includes('terms') && !i.href.includes('privacy') && !i.href.includes('refund') && !i.href.includes('subscription')).map((item) => (
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
                  {copy.footer.menu.filter(i => i.href.includes('terms') || i.href.includes('privacy') || i.href.includes('refund') || i.href.includes('subscription')).map((item) => (
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
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500 uppercase tracking-widest">
            <p>{copy.footer.note}</p>
            <div className="flex items-center gap-2">
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
    </div >
  );
};
