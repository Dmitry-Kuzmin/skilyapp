import { useState } from "react";
import {
  Brain, Zap, Swords, Gamepad2, BookOpen, Smartphone,
  Globe, Shield, Target, Trophy, Crown, Clock,
  Sparkles, ArrowRight, Heart, CheckCircle2, Users,
  MessageCircle, Shuffle, Flame, CreditCard, AlertTriangle,
  Star, BarChart3, Wifi, FileText, MapPin
} from "lucide-react";

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ── Content (ES only) ── */
const c = {
  badge: "Funciones de Skily",
  heroTitle: "Todo para aprobar\na la primera",
  heroSub: "Tutor IA, 8 modos de juego, duelos PvP y tests adaptativos — en una sola app. España y Rusia.",
  cta: "Probar gratis",
  ctaSub: "Sin tarjeta • Acceso gratuito para siempre",
  sections: {
    ai:       { title: "Skily AI",          sub: "IA que explica las normas como el mejor instructor" },
    tests:    { title: "Tests inteligentes", sub: "9 modos de test para cada estilo de aprendizaje" },
    games:    { title: "Zona de juego",      sub: "Aprender jugando, no memorizando" },
    duels:    { title: "Duelos PvP",         sub: "Lucha contra jugadores reales por ranking y premios" },
    learning: { title: "Aprendizaje",        sub: "Base completa de señales, términos y reglas" },
    platform: { title: "Plataforma",         sub: "Funciona en cualquier lugar — navegador, Telegram, móvil" },
  },
  finalCta:    "¿Listo para aprobar?",
  finalCtaSub: "Únete a miles de alumnos que ya tienen su carnet con Skily.",
  startFree:   "Empezar gratis",
  noCard:      "Sin tarjeta de crédito",
};

const fd = {
  ai: {
    pills: [
      { icon: Zap,           label: "Respuesta instantánea" },
      { icon: Clock,         label: "Disponible 24/7" },
      { icon: Globe,         label: "Traducción a tu idioma" },
      { icon: MessageCircle, label: "Explica como un tutor" },
    ],
    highlights: [
      "Explica cada pregunta en lenguaje sencillo",
      "Traduce el lenguaje burocrático de la DGT",
      "Identifica tus puntos débiles",
      "Funciona al instante — sin esperas",
    ],
  },
  tests: [
    { icon: Shuffle,       label: "Test aleatorio",      desc: "Selección adaptativa de preguntas" },
    { icon: Clock,         label: "Examen DGT",           desc: "Simulación completa del examen real" },
    { icon: Zap,           label: "Blitz",                desc: "20 preguntas en 5 minutos" },
    { icon: Flame,         label: "Maratón",              desc: "Todas las preguntas seguidas" },
    { icon: Target,        label: "Non-stop",             desc: "800 preguntas con guardado" },
    { icon: AlertTriangle, label: "Top 50 trampas",       desc: "Las preguntas más difíciles" },
    { icon: BookOpen,      label: "Por temas",            desc: "Elige un capítulo y practica" },
    { icon: Star,          label: "Banco de errores",     desc: "Repasa lo que fallaste" },
    { icon: Heart,         label: "Favoritos",            desc: "Preguntas para repasar" },
  ],
  games: [
    { icon: Swords,       label: "Duelo",       gradient: "from-violet-600 to-purple-600" },
    { icon: Zap,          label: "Carrera",     gradient: "from-cyan-600 to-blue-600" },
    { icon: CreditCard,   label: "Flashcards",  gradient: "from-emerald-600 to-teal-600" },
    { icon: AlertTriangle,label: "Cruces",      gradient: "from-orange-600 to-red-600" },
    { icon: Brain,        label: "Léxico",      gradient: "from-indigo-600 to-pink-600" },
    { icon: Shield,       label: "Señales",     gradient: "from-rose-600 to-red-600" },
  ],
  duel: {
    features: [
      "Aleatorio o con amigos",
      "Apuestas de monedas",
      "Ranking global",
      "Duel Pass de temporada",
      "Boosts y skins exclusivos",
      "Combos por rachas de victorias",
    ],
  },
  learning: [
    { icon: Shield,   label: "Señales de tráfico",   desc: "Base completa con categorías" },
    { icon: Globe,    label: "Diccionario DGT",        desc: "Todos los términos del examen" },
    { icon: BookOpen, label: "Manual de conducción",   desc: "Capítulos interactivos" },
    { icon: BarChart3,label: "Analítica de progreso",  desc: "Seguimiento del aprendizaje" },
  ],
  platform: [
    { icon: Smartphone,    label: "PWA",              desc: "Se instala como app nativa" },
    { icon: MessageCircle, label: "Telegram Mini App", desc: "Estudia directamente en el mensajero" },
    { icon: Wifi,          label: "Modo offline",      desc: "Funciona sin internet" },
    { icon: Globe,         label: "3 idiomas",         desc: "Español • Ruso • English" },
    { icon: Users,         label: "España + Rusia",    desc: "Adaptado a cada país" },
    { icon: Crown,         label: "Gamificación",      desc: "XP, bonos, premios, logros" },
  ],
};

/* ── Sub-components ── */
function BentoCard({ children, className, glowColor = "blue" }: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  const glowMap: Record<string, string> = {
    blue:    "from-blue-500/20 via-indigo-500/20 to-cyan-500/20",
    purple:  "from-purple-500/20 via-violet-500/20 to-pink-500/20",
    amber:   "from-amber-500/20 via-orange-500/20 to-yellow-500/20",
    emerald: "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
  };
  return (
    <div className={cn("group relative", className)}>
      <div className={cn(
        "absolute -inset-1 bg-gradient-to-r rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none",
        glowMap[glowColor] || glowMap.blue,
      )} />
      <div className="relative bg-[#0B1120]/80 backdrop-blur-2xl border border-white/[0.06] rounded-[2rem] p-8 md:p-10 overflow-hidden h-full transition-all duration-500 group-hover:border-white/15">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, sub, color }: { icon: any; title: string; sub: string; color: string }) {
  return (
    <div className="mb-10 md:mb-14 text-center">
      <div className={cn("inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg mb-6", color)}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-black uppercase tracking-[0.2em] text-white/80">{title}</span>
      </div>
      <p className="text-slate-400 text-lg font-light max-w-xl mx-auto">{sub}</p>
    </div>
  );
}

/* ── Main ── */
export default function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-white font-sans overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-[0.015] bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[600px] bg-indigo-500/15 blur-[120px] rounded-full pointer-events-none opacity-60" />

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12 max-w-[1400px] mx-auto w-full">
        <a href="/" className="hover:opacity-80 transition-opacity font-black text-xl tracking-tight">
          Skily
        </a>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex gap-6 text-sm font-medium text-slate-300 mr-4">
            <a href="/pricing" className="hover:text-white transition-colors">Precios</a>
            <a href="/blog" className="hover:text-white transition-colors">Blog</a>
            <a href="https://t.me/skilyapp_bot" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Soporte</a>
          </div>
          <a
            href="/login"
            className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Entrar
          </a>
        </div>
      </nav>

      <main className="relative z-10 pt-20 pb-20 flex-1">
        {/* Hero */}
        <div className="text-center mb-32 space-y-8 max-w-4xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest">
            <Sparkles size={14} />
            <span>{c.badge}</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-[0.95] bg-gradient-to-b from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent tracking-tight whitespace-pre-line">
            {c.heroTitle}
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
            {c.heroSub}
          </p>
          <div className="flex flex-col items-center gap-4 pt-4">
            <a
              href="/login"
              className="group relative px-10 py-4 bg-white text-slate-900 rounded-2xl font-black text-lg hover:scale-105 transition-all duration-300 flex items-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              <span>{c.cta}</span>
              <div className="bg-slate-900 text-white rounded-full p-1.5 group-hover:translate-x-1 transition-transform">
                <ArrowRight size={16} />
              </div>
            </a>
            <p className="text-slate-500 text-xs font-medium">{c.ctaSub}</p>
          </div>
        </div>

        {/* 1. AI */}
        <section className="max-w-6xl mx-auto px-6 mb-32">
          <SectionHeader icon={Brain} title={c.sections.ai.title} sub={c.sections.ai.sub} color="text-blue-400" />
          <BentoCard glowColor="blue">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="relative rounded-3xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/10 p-8 md:p-10">
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Online</span>
                </div>
                <div className="mt-8 space-y-4">
                  <div className="flex justify-end">
                    <div className="bg-indigo-500/20 border border-indigo-500/20 rounded-2xl rounded-tr-md px-5 py-3 max-w-[280px]">
                      <p className="text-sm text-white/90">¿Por qué no puedo adelantar en un cruce?</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-md px-5 py-3 max-w-[320px]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                          <Sparkles className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-bold text-blue-400">Skily AI</span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        En cruces sin regulación, adelantar está prohibido porque la visibilidad es limitada y las trayectorias se cruzan. Norma Art. 88 RGC.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-3">
                  {fd.ai.pills.map((pill, i) => {
                    const PillIcon = pill.icon;
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <PillIcon className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="text-sm font-bold text-white/80">{pill.label}</span>
                      </div>
                    );
                  })}
                </div>
                <ul className="space-y-3">
                  {fd.ai.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1 w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-blue-400" />
                      </div>
                      <span className="text-sm text-slate-300">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </BentoCard>
        </section>

        {/* 2. Tests */}
        <section className="max-w-6xl mx-auto px-6 mb-32">
          <SectionHeader icon={Target} title={c.sections.tests.title} sub={c.sections.tests.sub} color="text-emerald-400" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fd.tests.map((test, i) => {
              const TestIcon = test.icon;
              return (
                <div key={i} className="group rounded-2xl bg-white/[0.02] border border-white/5 p-6 hover:border-white/15 hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-0.5">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <TestIcon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">{test.label}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{test.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Games */}
        <section className="max-w-6xl mx-auto px-6 mb-32">
          <SectionHeader icon={Gamepad2} title={c.sections.games.title} sub={c.sections.games.sub} color="text-purple-400" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {fd.games.map((game, i) => {
              const GameIcon = game.icon;
              return (
                <div key={i} className="group relative rounded-3xl p-6 flex flex-col items-center gap-4 text-center border border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-1">
                  <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500", game.gradient)}>
                    <GameIcon className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-sm font-bold text-white/90">{game.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Duels */}
        <section className="max-w-6xl mx-auto px-6 mb-32">
          <SectionHeader icon={Swords} title={c.sections.duels.title} sub={c.sections.duels.sub} color="text-amber-400" />
          <BentoCard glowColor="amber">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-64 h-64 md:w-80 md:h-80 rounded-[3rem] bg-gradient-to-br from-amber-400/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Swords className="w-32 h-32 md:w-40 md:h-40 text-amber-300/60" />
                  </div>
                  <div className="absolute -top-6 -right-6 p-4 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 backdrop-blur-xl border border-yellow-400/30 shadow-xl animate-bounce" style={{ animationDuration: "3s" }}>
                    <Trophy className="w-8 h-8 text-yellow-300" />
                  </div>
                  <div className="absolute -bottom-4 -left-4 p-4 rounded-2xl bg-gradient-to-br from-violet-400/20 to-purple-500/20 backdrop-blur-xl border border-violet-400/30 shadow-xl animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>
                    <Crown className="w-8 h-8 text-violet-300" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {fd.duel.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-amber-500/20 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-sm font-bold text-white/80">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </BentoCard>
        </section>

        {/* 5. Learning */}
        <section className="max-w-6xl mx-auto px-6 mb-32">
          <SectionHeader icon={BookOpen} title={c.sections.learning.title} sub={c.sections.learning.sub} color="text-teal-400" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fd.learning.map((item, i) => {
              const ItemIcon = item.icon;
              return (
                <BentoCard key={i} glowColor="emerald">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
                      <ItemIcon className="w-6 h-6 text-teal-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base mb-1">{item.label}</h4>
                      <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </BentoCard>
              );
            })}
          </div>
        </section>

        {/* 6. Platform */}
        <section className="max-w-6xl mx-auto px-6 mb-32">
          <SectionHeader icon={Smartphone} title={c.sections.platform.title} sub={c.sections.platform.sub} color="text-indigo-400" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fd.platform.map((item, i) => {
              const PlatIcon = item.icon;
              return (
                <div key={i} className="group rounded-2xl bg-white/[0.02] border border-white/5 p-6 hover:border-indigo-500/20 hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-0.5">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <PlatIcon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">{item.label}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-4xl mx-auto px-6">
          <div className="relative rounded-3xl py-14 px-8 md:px-16 text-center shadow-2xl overflow-hidden border-t border-white/20 mb-20">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-900" />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/30 blur-[80px] rounded-full mix-blend-overlay animate-pulse" style={{ animationDuration: "4s" }} />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/30 blur-[80px] rounded-full mix-blend-overlay animate-pulse" style={{ animationDuration: "6s" }} />
            <div className="relative z-10 flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest mb-6">
                <Sparkles size={12} className="text-yellow-300" />
                <span>{c.badge}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tighter leading-tight">{c.finalCta}</h2>
              <p className="text-white/80 text-lg font-light mb-8 max-w-xl mx-auto leading-relaxed">{c.finalCtaSub}</p>
              <a
                href="/login"
                className="group/btn relative px-8 py-3.5 bg-white text-slate-900 rounded-xl font-black text-base hover:scale-105 transition-all duration-300 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              >
                <span>{c.startFree}</span>
                <div className="bg-slate-900 text-white rounded-full p-1 group-hover/btn:translate-x-1 transition-transform">
                  <ArrowRight size={14} />
                </div>
              </a>
              <p className="mt-4 text-white/40 text-xs font-medium">{c.noCard}</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 bg-[#0f172a]">
        <div className="px-6 py-12 max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mb-10">
            <div>
              <h4 className="text-white font-bold mb-4 text-sm">Product</h4>
              <ul className="space-y-3">
                {[
                  { label: "Precios", href: "/pricing" },
                  { label: "Blog", href: "/blog" },
                  { label: "Test demo", href: "/demo-tests" },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-slate-400 hover:text-white text-sm transition-colors">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm">Legal</h4>
              <ul className="space-y-3">
                {[
                  { label: "Terms", href: "/legal/terms" },
                  { label: "Privacy", href: "/legal/privacy" },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-slate-400 hover:text-white text-sm transition-colors">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm">Contacto</h4>
              <address className="not-italic text-slate-400 text-sm space-y-3">
                <p>Barcelona, Spain</p>
                <a href="mailto:hello@skily.ai" className="text-indigo-400 hover:text-white transition-colors block">hello@skily.ai</a>
              </address>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-800 text-xs font-mono text-slate-500 uppercase tracking-widest">
            © {new Date().getFullYear()} Skily. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
