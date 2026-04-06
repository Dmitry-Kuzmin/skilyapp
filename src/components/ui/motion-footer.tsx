import { useEffect, useRef } from "react";
import { Send, ArrowUp } from "lucide-react";

/* ── Styles ── */
const STYLES = `
@keyframes skily-marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes skily-breathe {
  0%, 100% { opacity: 0.35; transform: translate(-50%, -50%) scale(1); }
  50%       { opacity: 0.6;  transform: translate(-50%, -50%) scale(1.15); }
}
@keyframes skily-heartbeat {
  0%, 100% { transform: scale(1); }
  15%, 45% { transform: scale(1.4); }
  30%      { transform: scale(1.05); }
}
@keyframes skily-fade-up {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
}

.skily-footer-aurora {
  animation: skily-breathe 8s ease-in-out infinite;
}
.skily-footer-marquee-track {
  animation: skily-marquee 40s linear infinite;
}
.skily-footer-pill {
  background: linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
}
.skily-footer-pill:hover {
  background: linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%);
  border-color: rgba(255,255,255,0.26);
  box-shadow: 0 6px 28px rgba(99,102,241,0.2);
}
.skily-footer-pill-sm {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  transition: all 0.25s ease;
}
.skily-footer-pill-sm:hover {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.15);
  color: white;
}
.skily-footer-heading {
  background: linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.4) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.skily-footer-grid {
  background-image:
    linear-gradient(to right,  rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 52px 52px;
  mask-image: radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%);
}
.skily-bg-text {
  font-size: clamp(120px, 28vw, 340px);
  line-height: 0.8;
  font-weight: 900;
  letter-spacing: -0.06em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(255,255,255,0.045);
  pointer-events: none;
  user-select: none;
}
.skily-footer-visible .skily-animate {
  animation: skily-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both;
}
.skily-footer-visible .skily-animate-2 {
  animation: skily-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) 0.12s both;
}
.skily-footer-visible .skily-animate-3 {
  animation: skily-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) 0.22s both;
}
.skily-heartbeat {
  animation: skily-heartbeat 2.2s ease-in-out infinite;
  display: inline-block;
}
`;

function MarqueeItem() {
  return (
    <div className="flex items-center gap-10 px-6 text-white/30 font-bold tracking-[0.22em] uppercase text-[11px] whitespace-nowrap">
      <span>10 000+ студентов</span><span>✦</span>
      <span>AI-тьютор 24/7</span><span>✦</span>
      <span>3 500+ вопросов DGT</span><span>✦</span>
      <span>Партнёрская программа</span><span>✦</span>
      <span>Испания · Россия · Латам</span><span>✦</span>
    </div>
  );
}

export function SkilyPartnersFooter() {
  const footerRef = useRef<HTMLElement>(null);

  /* One-shot entrance — IntersectionObserver, NO scroll tracking */
  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("skily-footer-visible");
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <footer
        ref={footerRef}
        className="relative w-full min-h-[90svh] bg-[#060a14] text-white overflow-hidden flex flex-col"
      >
        {/* Aurora glow */}
        <div
          className="skily-footer-aurora absolute left-1/2 top-1/2 w-[80vw] h-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-[100px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.12) 45%, transparent 70%)" }}
        />

        {/* Grid */}
        <div className="skily-footer-grid absolute inset-0 pointer-events-none" />

        {/* Huge background SKILY text */}
        <div
          className="skily-bg-text absolute left-1/2 -translate-x-1/2 bottom-0 select-none pointer-events-none"
          style={{ opacity: 0.6 }}
          aria-hidden
        >
          SKILY
        </div>

        {/* Marquee strip */}
        <div className="relative z-10 border-b border-white/[0.05] bg-white/[0.015] py-3.5 overflow-hidden mt-10">
          <div className="flex w-max skily-footer-marquee-track">
            <MarqueeItem />
            <MarqueeItem />
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">

          <h2 className="skily-animate skily-footer-heading text-5xl sm:text-7xl md:text-[88px] font-black tracking-tighter text-center mb-10 leading-none">
            Начнём вместе?
          </h2>

          {/* Primary CTAs */}
          <div className="skily-animate-2 flex flex-wrap justify-center gap-4 mb-5">
            <a
              href="https://t.me/skilyapp_bot/skilyapp?startapp=partner"
              target="_blank"
              rel="noopener noreferrer"
              className="skily-footer-pill px-8 py-4 rounded-full font-bold text-sm flex items-center gap-2.5 text-white"
            >
              <Send className="w-4 h-4" />
              Стать партнёром
            </a>
            <a
              href="https://t.me/skilyapp_bot/skilyapp"
              target="_blank"
              rel="noopener noreferrer"
              className="skily-footer-pill px-8 py-4 rounded-full font-bold text-sm text-white/70 hover:text-white"
            >
              Открыть Skily
            </a>
          </div>

          {/* Secondary links */}
          <div className="skily-animate-3 flex flex-wrap justify-center gap-2.5">
            {[
              { label: "Правила партнёрства", href: "#rules" },
              { label: "Материалы",            href: "https://t.me/skilyapp_bot/skilyapp?startapp=partner_materials", external: true },
              { label: "Написать нам",          href: "https://t.me/guapo_pub", external: true },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="skily-footer-pill-sm px-5 py-2.5 rounded-full text-white/40 font-medium text-xs"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 w-full pb-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-3 border-t border-white/[0.04]">
          <div className="text-white/20 text-[10px] font-semibold tracking-widest uppercase order-2 md:order-1">
            © 2025 Skily · Подготовка к DGT
          </div>

          <div className="skily-footer-pill-sm px-5 py-2 rounded-full flex items-center gap-2 order-1 md:order-2">
            <span className="text-white/25 text-[10px] font-bold uppercase tracking-widest">Сделано с</span>
            <span className="skily-heartbeat text-red-400 text-sm">❤</span>
            <span className="text-white/25 text-[10px] font-bold uppercase tracking-widest">в Испании</span>
          </div>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="w-9 h-9 rounded-full skily-footer-pill-sm flex items-center justify-center text-white/30 hover:text-white order-3 transition-colors"
            aria-label="Наверх"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </>
  );
}
