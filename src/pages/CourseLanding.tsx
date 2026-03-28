import { useState, useEffect } from "react";
import { SeoHead } from "@/components/seo/SeoHead";
import {
  CheckCircle2,
  Car,
  Clock,
  Users,
  MessageCircle,
  Shield,
  Star,
  Phone,
  ChevronDown,
  MapPin,
  Globe,
  Sparkles,
  BookOpen,
  Target,
  Award,
  ArrowRight,
  Play,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

// ===== DATA =====

const HERO_STATS = [
  { value: "94%", label: "сдают с первого раза" },
  { value: "500+", label: "выпускников" },
  { value: "5★", label: "средняя оценка" },
];

const PAIN_POINTS = [
  {
    icon: Globe,
    title: "Языковой барьер",
    desc: "Теория DGT — 900 страниц на испанском. Специфическая лексика, которую не знают даже переводчики.",
  },
  {
    icon: BookOpen,
    title: "Непонятная система",
    desc: "Испанская автошкола стоит €800–1200, а процедура запутанная — от cita previa до самого экзамена.",
  },
  {
    icon: Clock,
    title: "Нет времени",
    desc: "Работа, семья, быт. Нужна чёткая система подготовки, а не «просто порешать тесты».",
  },
];

const COURSE_INCLUDES = [
  {
    icon: Target,
    title: "Персональный план",
    desc: "Индивидуальная стратегия подготовки с учётом твоего уровня и сроков",
  },
  {
    icon: MessageCircle,
    title: "Живые онлайн-уроки",
    desc: "Разбор теории на русском языке с объяснением испанской терминологии",
  },
  {
    icon: Sparkles,
    title: "Доступ к Skily Premium",
    desc: "Полный доступ к приложению: AI-репетитор, 5000+ тестов, дуэли, карточки",
  },
  {
    icon: Phone,
    title: "Поддержка в WhatsApp",
    desc: "Чат с преподавателем — задавай вопросы в любое время между уроками",
  },
  {
    icon: BookOpen,
    title: "Материалы на русском",
    desc: "Конспекты, шпаргалки, разбор самых каверзных вопросов DGT",
  },
  {
    icon: Shield,
    title: "Гарантия результата",
    desc: "Если не сдашь теорию — продолжаем заниматься бесплатно до сдачи",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Бесплатная консультация",
    desc: "Обсуждаем твою ситуацию, уровень и сроки. 15 минут — без обязательств.",
  },
  {
    num: "02",
    title: "Индивидуальный план",
    desc: "Составляем график занятий и план подготовки под тебя.",
  },
  {
    num: "03",
    title: "Онлайн-занятия",
    desc: "Проходим теорию по темам. Разбираем ошибки. Готовимся к экзамену.",
  },
  {
    num: "04",
    title: "Сдаёшь экзамен!",
    desc: "Идёшь на экзамен уверенным и сдаёшь с первого раза.",
  },
];

const TESTIMONIALS = [
  {
    name: "Анна К.",
    city: "Барселона",
    text: "Сдала теорию с первой попытки! До курса даже не понимала, как записаться на экзамен. Дима всё разложил по полочкам.",
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
    text: "Больше всего ценю поддержку в WhatsApp. Когда перед экзаменом были вопросы — получила ответ за 5 минут.",
    rating: 5,
  },
];

const FAQ_DATA = [
  {
    q: "Для какой категории прав подходит курс?",
    a: "Курс подготовки к теоретическому экзамену DGT подходит для категории B (легковые авто). Вопросы на теории одинаковые.",
  },
  {
    q: "Как проходят занятия?",
    a: "Онлайн через Zoom/Google Meet. Занимаемся 1-2 раза в неделю по 60 минут. Запись каждого урока остаётся у тебя.",
  },
  {
    q: "Сколько времени нужно на подготовку?",
    a: "В среднем 3-4 недели при занятиях 2 раза в неделю + самостоятельная работа в приложении Skily каждый день.",
  },
  {
    q: "Я живу не в крупном городе, это подходит?",
    a: "Да! Курс полностью онлайн. Занимайся из любой точки Испании (и мира).",
  },
  {
    q: "А если я уже проваливал экзамен?",
    a: "Тем более подходит. Разберём твои ошибки и закроем пробелы. Многие наши ученики сдали после 2-3 неудачных попыток.",
  },
  {
    q: "Какая гарантия?",
    a: "Если после курса не сдашь теоретический экзамен — продолжаем заниматься бесплатно до результата.",
  },
];

// ===== COMPONENTS =====

const CourseLanding = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleCTA = () => {
    const el = document.getElementById("signup-form");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <SeoHead
        title="Курс подготовки к экзамену DGT на русском языке — Skily"
        description="Онлайн-курс для русскоговорящих в Испании. 94% сдают с первого раза. Живые уроки, AI-тесты, поддержка в WhatsApp. Бесплатная консультация."
        canonicalUrl="https://skilyapp.com/curso"
      />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />

        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
          {/* Badge */}
          <div className={cn(
            "flex justify-center mb-6 transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
              <MapPin className="w-4 h-4" />
              Для русскоговорящих в Испании
            </div>
          </div>

          {/* Headline */}
          <h1 className={cn(
            "text-center text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 transition-all duration-700 delay-100",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            Сдай теорию DGT
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              с первого раза
            </span>
          </h1>

          <p className={cn(
            "text-center text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-8 transition-all duration-700 delay-200",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            Онлайн-курс на русском языке. Живые занятия с преподавателем + доступ к AI-платформе Skily с 5000+ вопросами.
          </p>

          {/* CTA */}
          <div className={cn(
            "flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 transition-all duration-700 delay-300",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <button
              onClick={handleCTA}
              className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Записаться на консультацию
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <span className="text-sm text-zinc-500">Бесплатно · 15 минут · Без обязательств</span>
          </div>

          {/* Stats */}
          <div className={cn(
            "grid grid-cols-3 gap-4 max-w-lg mx-auto transition-all duration-700 delay-[400ms]",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            {HERO_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white">{s.value}</div>
                <div className="text-xs sm:text-sm text-zinc-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PAIN POINTS ===== */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-center text-2xl sm:text-3xl font-bold mb-3">
          Знакомо?
        </h2>
        <p className="text-center text-zinc-400 mb-12 max-w-xl mx-auto">
          Главные проблемы русскоговорящих при сдаче теории DGT в Испании
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {PAIN_POINTS.map((p) => (
            <div
              key={p.title}
              className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-blue-500/20 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                <p.icon className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== WHAT'S INCLUDED ===== */}
      <section className="relative py-16">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/[0.03] to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4">
          <h2 className="text-center text-2xl sm:text-3xl font-bold mb-3">
            Что входит в курс
          </h2>
          <p className="text-center text-zinc-400 mb-12">
            Всё, что нужно для успешной сдачи — в одном месте
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COURSE_INCLUDES.map((item) => (
              <div
                key={item.title}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-blue-500/20 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3 group-hover:bg-blue-500/20 transition-colors">
                  <item.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-center text-2xl sm:text-3xl font-bold mb-12">
          Как это работает
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, i) => (
            <div key={step.num} className="relative">
              <div className="text-5xl font-black text-blue-500/10 mb-2">{step.num}</div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-8 -right-3 text-zinc-700">
                  <ArrowRight className="w-6 h-6" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="relative py-16">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/[0.05] to-transparent" />
        <div className="relative max-w-lg mx-auto px-4">
          <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] p-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm mb-6">
              <Award className="w-4 h-4" />
              Полный курс
            </div>
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-5xl font-bold">€250</span>
            </div>
            <p className="text-zinc-400 text-sm mb-6">
              Разовая оплата · Без скрытых платежей
            </p>
            <ul className="text-left space-y-3 mb-8">
              {[
                "6–8 живых онлайн-уроков",
                "Skily Premium на 3 месяца",
                "Материалы и конспекты на русском",
                "Поддержка в WhatsApp до сдачи",
                "Гарантия: не сдал — учим бесплатно",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={handleCTA}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-[0.98]"
            >
              Начать с консультации
            </button>
            <p className="text-xs text-zinc-500 mt-3">
              Оплата только после консультации. Рассрочка возможна.
            </p>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-center text-2xl sm:text-3xl font-bold mb-12">
          Отзывы учеников
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
            >
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed mb-4">
                «{t.text}»
              </p>
              <div className="text-sm">
                <span className="font-medium">{t.name}</span>
                <span className="text-zinc-500"> · {t.city}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="max-w-2xl mx-auto px-4 py-16">
        <h2 className="text-center text-2xl sm:text-3xl font-bold mb-12">
          Частые вопросы
        </h2>
        <div className="space-y-3">
          {FAQ_DATA.map((faq, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full text-left p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-zinc-500 shrink-0 transition-transform",
                    openFaq === i && "rotate-180"
                  )}
                />
              </div>
              {openFaq === i && (
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                  {faq.a}
                </p>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ===== SIGNUP FORM ===== */}
      <section id="signup-form" className="relative py-16">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/[0.05] to-transparent" />
        <div className="relative max-w-lg mx-auto px-4">
          <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] p-8">
            <h2 className="text-2xl font-bold text-center mb-2">
              Запишись на бесплатную консультацию
            </h2>
            <p className="text-center text-zinc-400 text-sm mb-8">
              15 минут — обсудим твою ситуацию и составим план подготовки
            </p>
            <form
              action="https://formspree.io/f/PLACEHOLDER"
              method="POST"
              className="space-y-4"
              onSubmit={(e) => {
                // Track conversion for Google Ads
                if (typeof window !== "undefined" && (window as any).gtag) {
                  (window as any).gtag("event", "conversion", {
                    send_to: "AW-CONVERSION_ID/CONVERSION_LABEL",
                  });
                }
              }}
            >
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Имя</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Как тебя зовут?"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Телефон или WhatsApp</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="+34 ..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Город в Испании</label>
                <input
                  type="text"
                  name="city"
                  placeholder="Мадрид, Барселона, Валенсия..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                Записаться на консультацию
              </button>
              <p className="text-xs text-zinc-500 text-center">
                Нажимая кнопку, ты соглашаешься с{" "}
                <a href="/legal/privacy" className="underline hover:text-zinc-400">
                  политикой конфиденциальности
                </a>
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          Не откладывай — начни сегодня
        </h2>
        <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
          Каждый день без подготовки — это лишние месяцы без прав.
          Запишись на бесплатную консультацию и узнай, как сдать теорию быстро и уверенно.
        </p>
        <button
          onClick={handleCTA}
          className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-[0.98]"
        >
          Записаться бесплатно
        </button>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/[0.06] py-8 text-center text-sm text-zinc-500">
        <div className="max-w-5xl mx-auto px-4">
          <a href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
            Skily
          </a>{" "}
          — платформа подготовки к экзамену DGT
          <div className="mt-2">
            © {new Date().getFullYear()} Skily. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CourseLanding;
