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
import { cn } from "@/lib/utils";
import { LanguageSelector } from "./LanguageSelector";
import { CountrySelector } from "./CountrySelector";
const LandingQuizDemo = React.lazy(() => import("./LandingQuizDemo").then(m => ({ default: m.LandingQuizDemo })));
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useCountry } from "@/contexts/CountryContext";
import { PartnershipExpansionPortal } from "./PartnershipExpansionPortal";
import { FAQItem } from "./FAQItem";
import { examYear } from "@/utils/dateUtils";
import {
  landingTranslations,
  LANGUAGE_OPTIONS,
} from "@/translations/landing";

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

interface AiStudioLandingProps {
  onRequestAccess: () => void;
  referrerInfo?: ReferrerInfo | null;
  loadingReferrer?: boolean;
  partnerInfo?: PartnerInfo | null;
  loadingPartner?: boolean;
}

export const AiStudioLanding: React.FC<AiStudioLandingProps> = ({
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [shouldLoadDemo, setShouldLoadDemo] = useState(false);
  const demoContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!demoContainerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !shouldLoadDemo) {
            setShouldLoadDemo(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0, rootMargin: '600px' }
    );
    observer.observe(demoContainerRef.current);
    return () => observer.disconnect();
  }, [shouldLoadDemo]);

  const handleSpotlightMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 15));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [activeGameMode, setActiveGameMode] = useState<'pvp' | 'race'>('pvp');

  // Auto-rotate game modes
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveGameMode((prev) => (prev === 'pvp' ? 'race' : 'pvp'));
    }, 4000); // Switch every 4 seconds
    return () => clearInterval(interval);
  }, []);

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
  const copy = landingTranslations[language];


  const handleStartEngine = () => {
    if (isMobile) {
      playEngineSound();
      setTimeout(() => navigate('/login'), 300);
      return;
    }
    if (isStarting) return; // избегаем двойного триггера во время анимации
    setIsStarting(true);
    playEngineSound();
    setTimeout(() => {
      onRequestAccess();
      // сбрасываем состояние, чтобы повторные нажатия снова открывали модалку
      setIsStarting(false);
    }, 1500);
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
          {/* Language selector hidden for Russia (always Russian) */}
          {selectedCountry.code !== 'ru' && (
            <LanguageSelector
              language={language}
              onSelect={handleLanguageChange}
              label={copy.controls.languageLabel}
            />
          )}

          <button
            onClick={handleEnter}
            className="px-4 md:px-6 py-2 md:py-2.5 rounded-full bg-white text-slate-900 text-xs md:text-sm font-bold hover:bg-white/90 transition-all duration-300 hover:scale-105 relative whitespace-nowrap shadow-lg shadow-white/20"
          >
            {referrerInfo ? (
              <>
                {copy.controls.studentAccess}
                <span className="ml-2 text-amber-500 inline-flex items-center gap-1">
                  +50 <Coins className="h-4 w-4 inline" />
                </span>
              </>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          <div className="grid grid-rows-2 gap-6">
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col justify-center relative overflow-hidden">
              {/* Background icon */}
              <div className="absolute top-4 right-4 opacity-5">
                <Bookmark size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <Bookmark className="text-amber-400" size={24} />
                  <h3 className="font-bold text-xl">{copy.aiSection.challengeBank}</h3>
                </div>
                <p className="text-slate-400">{copy.aiSection.challengeBankDescription}</p>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] flex items-center justify-between relative overflow-hidden group hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => window.open("https://t.me/skilyapp_bot", "_blank")}>
              <div className="relative z-10 max-w-[65%]">
                <h3 className="font-bold text-xl mb-1">{copy.aiSection.telegramTitle}</h3>
                <p className="text-slate-400 text-sm mb-3">{copy.aiSection.telegramDescription}</p>
                <div className="inline-flex items-center gap-1 text-sm font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  {copy.aiSection.telegramCTA} <ChevronRight size={14} />
                </div>
              </div>

              {/* Phone Mockup */}
              <div className="absolute bottom-[-20%] right-4 w-24 h-40 bg-slate-800 rounded-t-[1.5rem] border-x-4 border-t-4 border-slate-700 shadow-2xl flex flex-col items-center pt-3 opacity-90 group-hover:translate-y-[-10px] transition-transform duration-500">
                <div className="w-6 h-1 bg-slate-600 rounded-full mb-3"></div>
                <div className="w-full flex-1 bg-slate-900/50 px-2 pt-2 space-y-2">
                  <div className="flex gap-1.5 items-end">
                    <div className="w-full h-8 bg-indigo-500/20 rounded-lg rounded-bl-sm"></div>
                  </div>
                  <div className="flex gap-1.5 justify-end">
                    <div className="w-3/4 h-8 bg-slate-700/30 rounded-lg rounded-br-sm"></div>
                  </div>
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
                  )}
                </div>
              ))}
            </div>
          </div>
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
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-24 mb-24 relative mt-16 px-4">

          {/* LEFT CONTROLLER: PvP */}
          <div
            className={`flex-1 text-center lg:text-right cursor-pointer group transition-all duration-500 ${activeGameMode === 'pvp' ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-100 blur-[2px] hover:blur-0'}`}
            onClick={() => setActiveGameMode('pvp')}
          >
            <div className="inline-flex items-center gap-2 mb-4 justify-center lg:justify-end">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border ${activeGameMode === 'pvp' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                Multiplayer
              </span>
            </div>
            <h3 className={`text-4xl lg:text-5xl font-black mb-6 leading-tight transition-colors duration-300 ${activeGameMode === 'pvp' ? 'text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]' : 'text-slate-700 group-hover:text-slate-500'}`}>
              PvP Arena
            </h3>
            <p className={`text-lg mb-8 lg:ml-auto max-w-sm transition-colors duration-300 ${activeGameMode === 'pvp' ? 'text-indigo-200' : 'text-slate-600'}`}>
              {language === 'ru' ? 'Вызови соперника на дуэль. Кто быстрее и точнее — забирает банк.' : 'Challenge an opponent. Fastest and most accurate takes the pot.'}
            </p>

            {/* Active Indicator Line */}
            <div className="flex justify-center lg:justify-end">
              <div className={`h-1 rounded-full bg-gradient-to-r from-transparent via-orange-500 to-transparent transition-all duration-700 ${activeGameMode === 'pvp' ? 'w-full opacity-100 shadow-[0_0_10px_#f97316]' : 'w-0 opacity-0'}`}></div>
            </div>
          </div>

          {/* CENTER: PHONE MOCKUP (High-Fidelity) */}
          <div className="relative z-10 shrink-0 transform transition-transform duration-700 hover:scale-[1.02]">

            {/* Floating Badge 1 (Win Pot) */}
            <div className="absolute top-16 -left-6 lg:-left-28 animate-[float_6s_ease-in-out_infinite] z-30">
              <div className="bg-slate-900/60 backdrop-blur-xl p-4 pr-6 rounded-2xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-4 hover:border-yellow-500/30 transition-colors">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center border border-yellow-500/30 shadow-[inset_0_0_15px_rgba(234,179,8,0.2)]">
                  <Coins className="text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" size={24} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Win Pot</div>
                  <div className="text-xl font-black text-white px-0.5 drop-shadow-lg">+500</div>
                </div>
              </div>
            </div>

            {/* Floating Badge 2 (Rank) */}
            <div className="absolute bottom-24 -right-6 lg:-right-28 animate-[float_5s_ease-in-out_infinite_1s] z-30">
              <div className="bg-slate-900/60 backdrop-blur-xl p-4 pr-6 rounded-2xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-4 hover:border-purple-500/30 transition-colors">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400/20 to-indigo-500/20 flex items-center justify-center border border-purple-500/30 shadow-[inset_0_0_15px_rgba(168,85,247,0.2)]">
                  <Trophy className="text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]" size={24} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Season Rank</div>
                  <div className="text-xl font-black text-white px-0.5 drop-shadow-lg">#1 Champion</div>
                </div>
              </div>
            </div>

            {/* THE DEVICE */}
            <div className="w-[340px] h-[700px] bg-slate-950 rounded-[3.5rem] border-[14px] border-slate-900 shadow-[0_0_0_2px_rgba(255,255,255,0.1),0_20px_50px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden ring-1 ring-white/20">
              {/* Dynamic Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-3xl z-40 flex items-center justify-center">
                <div className="w-12 h-1 rounded-full bg-slate-800/50"></div>
              </div>

              {/* GAME SCREEN CONTAINER */}
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-slate-950 to-black flex flex-col">

                {/* --- PVP MODE SCREEN --- */}
                <div className={`absolute inset-0 transition-all duration-700 ease-in-out flex flex-col ${activeGameMode === 'pvp' ? 'opacity-100 translate-x-0 bg-slate-950' : 'opacity-0 -translate-x-full bg-slate-950'}`}>
                  {/* Top Bar with Neon Glow */}
                  <div className="h-24 bg-gradient-to-b from-slate-900 to-transparent flex items-end justify-between px-6 pb-6 border-b border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-red-500 to-transparent opacity-50"></div>
                    <div className="flex gap-1.5">
                      {[1, 2, 3].map(i => <div key={i} className="w-8 h-1.5 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444]"></div>)}
                    </div>
                    <div className="text-white font-black font-mono tracking-widest drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">VS POPAL</div>
                  </div>

                  {/* 3D Arena */}
                  <div className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/20 via-slate-950 to-slate-950 perspective-1000">
                    {/* Grid Floor */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [transform:perspective(600px)_rotateX(70deg)_translateY(-100px)] origin-bottom opacity-40 animate-[gridMove_20s_linear_infinite]"></div>

                    {/* Avatars */}
                    <div className="absolute top-[20%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-10 w-full">
                      {/* Opponent (Floating) */}
                      <div className="relative animate-[bounce_2s_infinite]">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-600 border-4 border-slate-900 shadow-[0_0_50px_rgba(239,68,68,0.6)] flex items-center justify-center z-10 relative">
                          <Swords className="text-white w-10 h-10 drop-shadow-lg" />
                        </div>
                        <div className="absolute -inset-4 bg-red-500/30 blur-xl rounded-full -z-10 animate-pulse"></div>
                      </div>

                      {/* VS Lightning */}
                      <div className="relative">
                        <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 italic skew-x-[-10deg] animate-pulse drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">VS</div>
                      </div>

                      {/* You (Card) */}
                      <div className="w-64 h-32 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center gap-4 p-4 transform perspective-1000 rotate-x-10 hover:rotate-x-0 transition-transform cursor-pointer group">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Target className="text-white w-8 h-8" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Player</div>
                          <div className="text-xl font-bold text-white">YOU</div>
                          <div className="text-xs text-slate-400">Lvl 12</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- RACE MODE SCREEN --- */}
                <div className={`absolute inset-0 transition-all duration-700 ease-in-out flex flex-col ${activeGameMode === 'race' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
                  {/* Top Bar - Neon Timer */}
                  <div className="pt-14 pb-6 text-center bg-gradient-to-b from-slate-950 to-transparent">
                    <div className="inline-block px-6 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 backdrop-blur-md">
                      <div className="text-5xl font-black font-mono text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)] animate-pulse tabular-nums">
                        00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                      </div>
                    </div>
                  </div>

                  {/* Track & Speedometer */}
                  <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-end pb-12">
                    {/* Road Effect (Perspective) */}
                    <div className="absolute inset-x-0 top-0 bottom-0 bg-gradient-to-b from-indigo-950/50 via-slate-950 to-slate-950 flex justify-center perspective-1000">
                      <div className="w-[120%] h-full bg-slate-900/50 [transform:perspective(500px)_rotateX(60deg)_scaleY(2)] border-x-[40px] border-slate-950 origin-bottom flex justify-center">
                        {/* Lane Markers */}
                        <div className="w-2 h-full bg-dashed border-l-2 border-dashed border-white/20 animate-[roadMove_1s_linear_infinite]"></div>
                      </div>
                    </div>

                    {/* Speedometer Gauge (CSS Art) */}
                    <div className="relative z-10 mb-8">
                      <div className="w-40 h-40 rounded-full border-[6px] border-slate-800 border-t-cyan-500 border-r-cyan-500 rotate-[135deg] flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.2)] bg-slate-950/80 backdrop-blur-sm">
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-4xl font-black text-white drop-shadow-md">124</span>
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">km/h</span>
                      </div>
                    </div>

                    {/* Answer Buttons (Glass) */}
                    <div className="w-full px-6 space-y-3 z-10">
                      <div className="w-full py-4 rounded-xl bg-cyan-500/20 border border-cyan-400/50 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer hover:bg-cyan-500/30 transition-colors">
                        <span className="text-cyan-100 font-bold text-lg">STOP</span>
                      </div>
                      <div className="w-full py-4 rounded-xl bg-slate-800/40 border border-white/5 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                        <span className="text-slate-400 font-bold text-lg">YIELD</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* RIGHT CONTROLLER: Race */}
          <div
            className={`flex-1 text-center lg:text-left cursor-pointer group transition-all duration-500 ${activeGameMode === 'race' ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-100 blur-[2px] hover:blur-0'}`}
            onClick={() => setActiveGameMode('race')}
          >
            <div className="inline-flex items-center gap-2 mb-4 justify-center lg:justify-start">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border ${activeGameMode === 'race' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                Speed Run
              </span>
            </div>
            <h3 className={`text-4xl lg:text-5xl font-black mb-6 leading-tight transition-colors duration-300 ${activeGameMode === 'race' ? 'text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]' : 'text-slate-700 group-hover:text-slate-500'}`}>
              Blitz Mode
            </h3>
            <p className={`text-lg mb-8 max-w-sm transition-colors duration-300 ${activeGameMode === 'race' ? 'text-cyan-200' : 'text-slate-600'}`}>
              {language === 'ru' ? '15 секунд на вопрос. Никаких прав на ошибку. Только хардкор.' : '15 seconds per question. No room for error. Pure hardcore.'}
            </p>

            {/* Active Indicator Line */}
            <div className="flex justify-center lg:justify-start">
              <div className={`h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent transition-all duration-700 ${activeGameMode === 'race' ? 'w-full opacity-100 shadow-[0_0_10px_#06b6d4]' : 'w-0 opacity-0'}`}></div>
            </div>
          </div>
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

      <section className="relative z-10 px-6 py-20 pb-32 max-w-[1500px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">{copy.pricing.title}</h2>
          <p className="text-slate-400">{copy.pricing.description}</p>
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
        <script type="application/ld+json">
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
    </div>
  );
};