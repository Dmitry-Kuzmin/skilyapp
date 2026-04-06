import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "@/components/optimized/Motion";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { SkilyPartnersFooter } from "@/components/ui/motion-footer";
import {
  Link as LinkIcon,
  Tag,
  Megaphone,
  Gift,
  Send,
  TrendingUp,
  BookOpen,
  Smartphone,
  ChevronRight,
  ChevronDown,
  Users,
  Brain,
  Zap,
  CheckCircle2,
} from "lucide-react";

/* ── Animated number in calculator ── */
function AnimatedEuro({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    const start = performance.now();
    const duration = 350;
    const raf = requestAnimationFrame(function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * ease));
      if (p < 1) requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span>€{display.toLocaleString("ru")}</span>;
}

/* ── Calculator config ── */
const PRODUCTS = {
  platform: { label: "Платформа (6 мес.)", price: 40, commission: 0.3 },
  course:   { label: "Курс DGT",            price: 300, commission: 0.2 },
} as const;
type ProductKey = keyof typeof PRODUCTS;
const PRESET_STUDENTS = [2, 5, 10, 20];

/* ── Partnership types ── */
const PARTNER_TYPES = [
  {
    icon: LinkIcon,
    title: "Реф. ссылка",
    color: "from-blue-500/20 to-blue-600/5",
    border: "border-blue-500/20",
    glow: "bg-blue-500/10",
    desc: "Делись уникальной ссылкой. С каждой покупки платформы — 30%, с курса — 20%. Выплаты раз в месяц.",
    tags: ["30% с доступа", "20% с курса"],
  },
  {
    icon: Tag,
    title: "Промокод",
    color: "from-violet-500/20 to-violet-600/5",
    border: "border-violet-500/20",
    glow: "bg-violet-500/10",
    desc: "Твоя аудитория получает скидку 15%, ты — комиссию с каждой оплаты. Промокод = твой бренд.",
    tags: ["15% скидка аудитории", "Комиссия тебе"],
  },
  {
    icon: Megaphone,
    title: "Кросс-промо",
    color: "from-emerald-500/20 to-emerald-600/5",
    border: "border-emerald-500/20",
    glow: "bg-emerald-500/10",
    desc: "Мы размещаем твой баннер / упоминание внутри платформы. 10 000+ активных студентов видят тебя каждый день.",
    tags: ["10 000+ студентов", "Внутри приложения"],
  },
  {
    icon: Gift,
    title: "Бартер",
    color: "from-amber-500/20 to-amber-600/5",
    border: "border-amber-500/20",
    glow: "bg-amber-500/10",
    desc: "Идеально для микро-каналов. Получи Premium-ключи для розыгрыша — твоя аудитория в восторге, ты в плюсе.",
    tags: ["Бесплатные Premium-ключи", "Для каналов 1–5k"],
  },
];

/* ── Content ideas ── */
const CONTENT_IDEAS = [
  {
    platform: "Telegram",
    icon: Send,
    idea: "Пост «Как я готовлюсь к DGT»",
    template:
      "Готовлюсь к экзамену по вождению в Испании 🇪🇸 Нашёл(а) крутое приложение — Skily. Тест, флэшкарты, AI-тьютор. Первый месяц бесплатно по моей ссылке 👇",
  },
  {
    platform: "Instagram",
    icon: Smartphone,
    idea: "Stories «1 вопрос в день»",
    template:
      "Серия из 7 сторис: каждый день — один вопрос с экзамена DGT. В последней — оффер со скидкой по твоему промокоду.",
  },
  {
    platform: "YouTube",
    icon: BookOpen,
    idea: "Влог «Как я сдал DGT»",
    template:
      "В описании видео или в пинкоменте — ссылка на Skily. Органически упомяни в процессе рассказа о подготовке.",
  },
];

/* ── Partnership rules ── */
const RULES = [
  { q: "Размер комиссии", a: "30% с каждой покупки доступа к платформе (€40). 20% с продажи полного курса (€300). Комиссия начисляется после 14-дневного периода для отмены платежа." },
  { q: "Когда и как выплачивается", a: "Выплаты раз в месяц — до 5-го числа следующего месяца. Минимальная сумма: €20. Способ: PayPal, SEPA-перевод или Revolut — по договорённости." },
  { q: "Срок действия реф. куки", a: "30 дней. Если пользователь перешёл по твоей ссылке и совершил покупку в течение 30 дней — комиссия твоя." },
  { q: "Что запрещено", a: "Использовать собственную реф. ссылку для личных покупок. Спам и агрессивный маркетинг. Платный трафик без предварительного согласования с нами. Дезинформация о продукте." },
  { q: "Статистика и трекинг", a: "Все конверсии отображаются в реальном времени в кабинете партнёра. Уведомление в Telegram при каждой продаже." },
  { q: "Реквизиты и договор", a: "Партнёрский договор-оферта оформляется при первой выплате. Данные для оплаты указываются в кабинете партнёра." },
  { q: "Расторжение", a: "Любая сторона может прекратить сотрудничество с уведомлением за 7 дней. Накопленная комиссия выплачивается в полном объёме." },
];

/* ══════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════ */
export default function Partners() {
  const [product, setProduct]           = useState<ProductKey>("platform");
  const [students, setStudents]         = useState(5);
  const [copiedTemplate, setCopied]     = useState<number | null>(null);
  const [rulesOpen, setRulesOpen]       = useState(false);
  const [openRule, setOpenRule]         = useState<number | null>(null);

  const selected      = PRODUCTS[product];
  const earningPerSale = selected.price * selected.commission;
  const monthly        = Math.round(earningPerSale * students);
  const yearly         = monthly * 12;

  function handleCopy(text: string, idx: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-[#060a14] text-white overflow-x-hidden">
      <style>{`
        .partners-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .glow-card { position: relative; transition: border-color 0.3s; }
        .glow-card:hover { border-color: rgba(99,102,241,0.35); }
        .calc-toggle { transition: all 0.25s ease; }
        @keyframes partners-pulse {
          0%,100% { opacity: 0.6; transform: scale(1); }
          50%     { opacity: 1;   transform: scale(1.05); }
        }
        .badge-pulse { animation: partners-pulse 3s ease-in-out infinite; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(99,102,241,0.6);
        }
        input[type=range]::-moz-range-thumb {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(99,102,241,0.6);
        }
      `}</style>

      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="partners-grid absolute inset-0" />
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[140px]" />
        <div className="absolute top-[30%] right-[-5%] w-[400px] h-[400px] rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[350px] h-[350px] rounded-full bg-indigo-600/8 blur-[120px]" />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <Link to="/"><LandingLogo size="sm" /></Link>
        <a
          href="https://t.me/guapo_pub"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-white/70 hover:text-white hover:border-white/20 transition-all"
        >
          <Send className="w-3.5 h-3.5" />Написать
        </a>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-0 space-y-20">

        {/* ══ 1. HERO ══ */}
        <section className="pt-6 pb-2 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-medium mb-6 badge-pulse">
              <TrendingUp className="w-3 h-3" />Партнёрская программа
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] mb-5">
              Рекомендуй Skily —{" "}
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
                зарабатывай
              </span>
            </h1>

            <p className="text-white/55 text-lg sm:text-xl max-w-xl mx-auto mb-8 leading-relaxed">
              Миллионы людей сдают DGT каждый год. Помоги им — и получай комиссию с каждой продажи.
            </p>

            {/* Stat badges — проценты */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {[
                { label: "20%",  sub: "комиссия с курса",       detail: "€300 × 20% = €60" },
                { label: "30%",  sub: "комиссия с доступа",     detail: "€40 × 30% = €12" },
                { label: "15%",  sub: "скидка для подписчиков", detail: "по промокоду" },
              ].map((s) => (
                <div
                  key={s.label}
                  title={s.detail}
                  className="flex flex-col items-center px-5 py-3 rounded-xl border border-white/8 bg-white/[0.03] backdrop-blur-sm"
                >
                  <span className="text-2xl font-bold text-white">{s.label}</span>
                  <span className="text-xs text-white/45 mt-0.5">{s.sub}</span>
                </div>
              ))}
            </div>

            <a
              href="https://t.me/guapo_pub"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-white text-black font-semibold text-base hover:bg-white/90 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)]"
            >
              <Send className="w-4 h-4" />Написать в Telegram
            </a>
          </motion.div>
        </section>

        {/* ══ 2. О НАС ══ */}
        <section id="about">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
            <div className="grid sm:grid-cols-2 gap-0">
              {/* Left — description */}
              <div className="p-8 sm:p-10 border-b sm:border-b-0 sm:border-r border-white/[0.06]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Кто мы</span>
                </div>
                <h2 className="text-xl font-bold mb-3 leading-snug">
                  Первая платформа для подготовки к DGT в Telegram
                </h2>
                <p className="text-white/50 text-sm leading-relaxed">
                  Skily работает как Telegram Mini App — никакой регистрации, никаких установок. Открыл — и учишься. Геймифицированные тесты, PvP-дуэли с друзьями, AI-тьютор, флэшкарты и полная база вопросов DGT.
                </p>
                <p className="text-white/35 text-sm mt-3 leading-relaxed">
                  Мы — команда из Испании, которая лично знает каждый вопрос экзамена. Рекомендуя нас, ты помогаешь людям реально сдать с первого раза.
                </p>
              </div>

              {/* Right — stats */}
              <div className="p-8 sm:p-10 grid grid-cols-1 gap-6 content-center">
                {[
                  { icon: Users,  value: "10 000+", label: "активных студентов" },
                  { icon: Brain,  value: "3 500+",  label: "вопросов DGT с объяснениями" },
                  { icon: Zap,    value: "AI 24/7", label: "тьютор объясняет каждый ответ" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.value} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <div className="text-xl font-extrabold">{stat.value}</div>
                        <div className="text-white/40 text-xs">{stat.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ══ 3. ПРОДУКТЫ ══ */}
        <section>
          <h2 className="text-2xl font-bold text-center mb-3">Что ты продвигаешь</h2>
          <p className="text-white/45 text-center text-sm mb-8">Два продукта — выбирай сам(а) или оба</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="glow-card rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mb-4">
                <Smartphone className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-3xl font-extrabold">€40</span>
                <span className="text-white/40 text-sm mb-1">/ 6 месяцев</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Платформа Skily</h3>
              <p className="text-white/45 text-sm leading-relaxed mb-4">
                Тесты DGT, AI-тьютор, флэшкарты, геймификация. Работает в Telegram — никаких установок.
              </p>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 w-fit">
                <span className="text-blue-300 text-sm font-semibold">Твоя комиссия: 30% = €12</span>
              </div>
            </div>

            <div className="glow-card rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mb-4">
                <BookOpen className="w-5 h-5 text-violet-400" />
              </div>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-3xl font-extrabold">€300</span>
                <span className="text-white/40 text-sm mb-1">/ полный курс</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Курс DGT</h3>
              <p className="text-white/45 text-sm leading-relaxed mb-4">
                Полная программа подготовки к экзамену: видеоуроки, материалы, живые сессии и поддержка.
              </p>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 w-fit">
                <span className="text-violet-300 text-sm font-semibold">Твоя комиссия: 20% = €60</span>
              </div>
            </div>
          </div>
        </section>

        {/* ══ 4. КАЛЬКУЛЯТОР ══ */}
        <section>
          <h2 className="text-2xl font-bold text-center mb-3">Посчитай свой доход</h2>
          <p className="text-white/45 text-center text-sm mb-8">Двигай ползунок — смотри цифры</p>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-7 sm:p-9">
            {/* Product toggle */}
            <div className="flex gap-2 mb-8 p-1 rounded-xl bg-white/5 border border-white/[0.07] w-fit mx-auto">
              {(Object.keys(PRODUCTS) as ProductKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setProduct(key)}
                  className={`calc-toggle px-5 py-2 rounded-lg text-sm font-medium ${
                    product === key ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {PRODUCTS[key].label}
                </button>
              ))}
            </div>

            {/* Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-white/50 text-sm">Покупок в месяц</span>
                <span className="text-white font-bold text-lg">{students}</span>
              </div>
              <input
                type="range" min={1} max={30} value={students}
                onChange={(e) => setStudents(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((students - 1) / 29) * 100}%, rgba(255,255,255,0.1) ${((students - 1) / 29) * 100}%, rgba(255,255,255,0.1) 100%)`,
                }}
              />
              <div className="flex gap-2 mt-3 flex-wrap">
                {PRESET_STUDENTS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setStudents(n)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${
                      students === n
                        ? "border-indigo-400/60 bg-indigo-500/20 text-indigo-300"
                        : "border-white/10 text-white/40 hover:text-white/60"
                    }`}
                  >
                    {n} чел.
                  </button>
                ))}
              </div>
            </div>

            {/* Output */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
                <div className="text-3xl font-extrabold text-emerald-400">
                  <AnimatedEuro value={monthly} />
                </div>
                <div className="text-white/45 text-xs mt-1">в месяц</div>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
                <div className="text-3xl font-extrabold text-emerald-400">
                  <AnimatedEuro value={yearly} />
                </div>
                <div className="text-white/45 text-xs mt-1">в год</div>
              </div>
            </div>
            <p className="text-white/30 text-xs text-center mt-4">
              Комиссия: {Math.round(selected.commission * 100)}% с каждой продажи · Выплаты ежемесячно · Мин. сумма €20
            </p>
          </div>
        </section>

        {/* ══ 5. ТИПЫ СОТРУДНИЧЕСТВА ══ */}
        <section>
          <h2 className="text-2xl font-bold text-center mb-3">Как мы работаем вместе</h2>
          <p className="text-white/45 text-center text-sm mb-8">Выбери формат — или комбинируй</p>

          <div className="grid sm:grid-cols-2 gap-4">
            {PARTNER_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.title} className={`glow-card rounded-2xl border ${t.border} bg-gradient-to-br ${t.color} backdrop-blur-sm p-6`}>
                  <div className={`w-9 h-9 rounded-lg ${t.glow} border ${t.border} flex items-center justify-center mb-4`}>
                    <Icon className="w-4 h-4 text-white/70" />
                  </div>
                  <h3 className="font-bold mb-2">{t.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed mb-4">{t.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {t.tags.map((tag) => (
                      <span key={tag} className={`text-xs px-2 py-0.5 rounded-full border ${t.border} text-white/60`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-white/35 text-sm mt-6">
            Есть другая идея?{" "}
            <a href="https://t.me/guapo_pub" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Напиши нам
            </a>{" "}
            — мы открыты к любому формату.
          </p>
        </section>

        {/* ══ 6. ИДЕИ ДЛЯ КОНТЕНТА ══ */}
        <section>
          <h2 className="text-2xl font-bold text-center mb-3">Идеи для публикаций</h2>
          <p className="text-white/45 text-center text-sm mb-8">Готовые шаблоны — бери и публикуй</p>

          <div className="grid sm:grid-cols-3 gap-4">
            {CONTENT_IDEAS.map((idea, idx) => {
              const Icon = idea.icon;
              const copied = copiedTemplate === idx;
              return (
                <div key={idea.platform} className="glow-card rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-white/50" />
                    <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">{idea.platform}</span>
                  </div>
                  <h3 className="font-semibold mb-3 text-sm">{idea.idea}</h3>
                  <p className="text-white/40 text-xs leading-relaxed italic flex-1 mb-4">"{idea.template}"</p>
                  <button
                    onClick={() => handleCopy(idea.template, idx)}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mt-auto"
                  >
                    <ChevronRight className="w-3 h-3" />
                    {copied ? "Скопировано!" : "Скопировать текст"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══ 7. ПРАВИЛА ПАРТНЁРСТВА ══ */}
        <section id="rules">
          <button
            onClick={() => setRulesOpen(!rulesOpen)}
            className="w-full flex items-center justify-between px-6 py-5 rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm hover:border-white/[0.12] transition-all"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold">Правила партнёрства</span>
              <span className="text-xs text-white/35 ml-1">— условия, выплаты, ограничения</span>
            </div>
            <ChevronDown className={`w-5 h-5 text-white/40 transition-transform duration-300 ${rulesOpen ? "rotate-180" : ""}`} />
          </button>

          {rulesOpen && (
            <div className="mt-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.05]">
              {RULES.map((rule, idx) => (
                <div key={idx}>
                  <button
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/[0.02] transition-colors"
                    onClick={() => setOpenRule(openRule === idx ? null : idx)}
                  >
                    <span className="text-sm font-medium text-white/80">{rule.q}</span>
                    <ChevronDown className={`w-4 h-4 text-white/30 flex-shrink-0 ml-4 transition-transform duration-200 ${openRule === idx ? "rotate-180" : ""}`} />
                  </button>
                  {openRule === idx && (
                    <div className="px-6 pb-4">
                      <p className="text-white/50 text-sm leading-relaxed">{rule.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ══ 8. ФИНАЛЬНЫЙ CTA (перед footer) ══ */}
        <section className="pb-0">
          <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-blue-600/10 via-violet-600/5 to-transparent p-10 sm:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 rounded-full bg-indigo-500/10 blur-[80px]" />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">Готов(а) начать?</h2>
              <p className="text-white/50 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                Напиши нам в Telegram — всё настроим за 24 часа. Реф. ссылка, промокод, материалы — всё сразу.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a
                  href="https://t.me/guapo_pub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-white text-black font-semibold text-base hover:bg-white/90 transition-all shadow-[0_0_50px_rgba(255,255,255,0.12)]"
                >
                  <Send className="w-4 h-4" />Написать в Telegram
                </a>
                <a
                  href="https://t.me/skilyapp_bot/skilyapp?startapp=partner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full border border-white/15 bg-white/5 text-white font-semibold text-base hover:bg-white/10 transition-all"
                >
                  Открыть кабинет партнёра
                </a>
              </div>
            </div>
          </div>
        </section>

      </div>{/* /main content */}

      {/* ══ CINEMATIC FOOTER ══ */}
      <SkilyPartnersFooter />
    </div>
  );
}
