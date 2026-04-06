import * as React from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Send, ArrowUp } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ── Styles ── */
const STYLES = `
@keyframes skily-footer-breathe {
  0%   { transform: translate(-50%, -50%) scale(1);    opacity: 0.4; }
  100% { transform: translate(-50%, -50%) scale(1.18); opacity: 0.75; }
}
@keyframes skily-footer-marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes skily-footer-heartbeat {
  0%,100% { transform: scale(1); }
  15%,45% { transform: scale(1.35); }
  30%     { transform: scale(1); }
}

.skily-footer-aurora {
  background: radial-gradient(
    circle at 50% 50%,
    rgba(99,102,241,0.18) 0%,
    rgba(139,92,246,0.12) 40%,
    transparent 70%
  );
  animation: skily-footer-breathe 9s ease-in-out infinite alternate;
}

.skily-footer-grid {
  background-size: 56px 56px;
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
}

.skily-footer-bg-text {
  font-size: 30vw;
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.06em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(255,255,255,0.04);
  background: linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 55%);
  -webkit-background-clip: text;
  background-clip: text;
  white-space: nowrap;
}

.skily-footer-marquee-track {
  animation: skily-footer-marquee 45s linear infinite;
}

.skily-footer-heading {
  background: linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.35) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 30px rgba(255,255,255,0.1));
}

.skily-footer-pill {
  background: linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
}
.skily-footer-pill:hover {
  background: linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 100%);
  border-color: rgba(255,255,255,0.28);
  box-shadow: 0 8px 32px rgba(99,102,241,0.2);
}

.skily-footer-pill-sm {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: all 0.3s ease;
}
.skily-footer-pill-sm:hover {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.16);
  color: white;
}

.animate-skily-heartbeat {
  animation: skily-footer-heartbeat 2s cubic-bezier(0.25,1,0.5,1) infinite;
}
`;

/* ── Marquee row ── */
function MarqueeItem() {
  return (
    <div className="flex items-center space-x-10 px-6 text-white/35 font-bold tracking-[0.25em] uppercase text-xs">
      <span>10 000+ студентов</span><span>✦</span>
      <span>AI-тьютор 24/7</span><span>✦</span>
      <span>3 500+ вопросов DGT</span><span>✦</span>
      <span>Партнёрская программа</span><span>✦</span>
      <span>Испания · Россия · Латам</span><span>✦</span>
    </div>
  );
}

/* ── Main export ── */
export function SkilyPartnersFooter() {
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const bgTextRef   = useRef<HTMLDivElement>(null);
  const headingRef  = useRef<HTMLHeadingElement>(null);
  const linksRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !wrapperRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        bgTextRef.current,
        { y: "12vh", scale: 0.85, opacity: 0 },
        {
          y: "0vh", scale: 1, opacity: 1,
          ease: "power1.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 80%",
            end:   "bottom bottom",
            scrub: 1.2,
          },
        }
      );

      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { y: 55, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.18,
          ease: "power3.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 45%",
            end:   "bottom bottom",
            scrub: 1,
          },
        }
      );
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Curtain-reveal wrapper */}
      <div
        ref={wrapperRef}
        className="relative w-full"
        style={{ height: "100svh", clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
      >
        <footer className="fixed bottom-0 left-0 flex h-screen w-full flex-col justify-between overflow-hidden bg-[#060a14] text-white">

          {/* Aurora glow */}
          <div className="skily-footer-aurora absolute left-1/2 top-1/2 h-[65vh] w-[85vw] -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-[90px] pointer-events-none z-0" />

          {/* Grid */}
          <div className="skily-footer-grid absolute inset-0 z-0 pointer-events-none" />

          {/* Giant background text */}
          <div
            ref={bgTextRef}
            className="skily-footer-bg-text absolute -bottom-[4vh] left-1/2 -translate-x-1/2 z-0 pointer-events-none select-none"
          >
            SKILY
          </div>

          {/* Marquee strip */}
          <div className="absolute top-10 left-0 w-full overflow-hidden border-y border-white/[0.05] bg-white/[0.015] backdrop-blur-md py-3.5 z-10 -rotate-[1.5deg] scale-110">
            <div className="flex w-max skily-footer-marquee-track">
              <MarqueeItem />
              <MarqueeItem />
            </div>
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 mt-16 w-full max-w-4xl mx-auto">

            <h2
              ref={headingRef}
              className="skily-footer-heading text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter mb-10 text-center"
            >
              Начнём вместе?
            </h2>

            <div ref={linksRef} className="flex flex-col items-center gap-5 w-full">

              {/* Primary CTAs */}
              <div className="flex flex-wrap justify-center gap-4">
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
                  className="skily-footer-pill px-8 py-4 rounded-full font-bold text-sm text-white/80 hover:text-white"
                >
                  Открыть Skily
                </a>
              </div>

              {/* Secondary links */}
              <div className="flex flex-wrap justify-center gap-2.5 mt-1">
                {[
                  { label: "Правила партнёрства", href: "#rules" },
                  { label: "Материалы", href: "https://t.me/skilyapp_bot/skilyapp?startapp=partner_materials", external: true },
                  { label: "Написать нам", href: "https://t.me/guapo_pub", external: true },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="skily-footer-pill-sm px-5 py-2.5 rounded-full text-white/45 font-medium text-xs"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="relative z-20 w-full pb-7 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-white/25 text-[10px] font-semibold tracking-widest uppercase order-2 md:order-1">
              © 2025 Skily · Подготовка к DGT
            </div>

            <div className="skily-footer-pill-sm px-5 py-2.5 rounded-full flex items-center gap-2 order-1 md:order-2">
              <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Сделано с</span>
              <span className="animate-skily-heartbeat inline-block text-red-400 text-sm">❤</span>
              <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">в Испании</span>
            </div>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="w-10 h-10 rounded-full skily-footer-pill-sm flex items-center justify-center text-white/35 hover:text-white order-3 transition-colors"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
