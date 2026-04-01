"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowRight, Link, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
}

export default function RadialOrbitalTimeline({
  timelineData,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const requestRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false;
        }
      });

      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);

        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);
        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }

      return newState;
    });
  };

  // ОПТИМИЗАЦИЯ: Вращение через requestAnimationFrame (60 FPS) вместо setInterval
  useEffect(() => {
    const animate = (time: number) => {
      if (lastUpdateRef.current !== undefined) {
        if (autoRotate) {
          setRotationAngle((prev) => (prev + 0.25) % 360);
        }
      }
      lastUpdateRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [autoRotate]);

  const centerViewOnNode = (nodeId: number) => {
    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    if (nodeIndex === -1) return;
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;
    setRotationAngle(270 - targetAngle);
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  return (
    <div
      className="w-full relative h-[650px] md:h-[750px] flex flex-col items-center justify-center bg-transparent overflow-hidden touch-none"
      ref={containerRef}
      onClick={handleContainerClick}
      style={{ contain: 'layout paint' }} // Оптимизация отрисовки браузером
    >
      {/* Header */}
      <div className="absolute top-10 text-center z-10 pointer-events-none px-4 w-full">
        <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/15 text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">
          План действий
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 tracking-tight text-center">
          Этапы получения прав
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto text-center font-light mb-12">
          Простой путь от первого урока до заветных прав
        </p>
      </div>

      <div className="relative w-full max-w-4xl h-full flex items-center justify-center mt-16 md:mt-12">
        {/* Orbit Area */}
        <div
          className="absolute w-full h-full flex items-center justify-center transform-gpu"
          ref={orbitRef}
          style={{
            perspective: "1200px",
            backfaceVisibility: "hidden",
          }}
        >
          {/* Central Logo - Оптимизированный Glow */}
          <div 
            className="absolute w-20 h-20 md:w-24 md:h-24 rounded-full bg-blue-600/20 flex items-center justify-center z-10 cursor-pointer transition-transform duration-500 group"
            onClick={(e) => {
              e.stopPropagation();
              if (timelineData.length > 0) toggleItem(timelineData[0].id);
            }}
          >
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-2xl animate-pulse" />
            <div className="absolute -inset-4 rounded-full border border-blue-400/10 animate-[ping_3s_linear_infinite]" />
            <div className="absolute -inset-8 rounded-full border border-blue-400/5 animate-[ping_4s_linear_infinite]" />
            
            <img 
              src="/android-chrome-512x512.png" 
              alt="Skily Logo" 
              className="w-14 h-14 md:w-16 md:h-16 rounded-full object-contain relative z-20 transition-transform group-hover:scale-110 will-change-transform"
            />
          </div>

          {/* Main Orbit Ring */}
          <div className="absolute w-[320px] h-[320px] md:w-[400px] md:h-[400px] rounded-full border border-white/5 pointer-events-none" />

          {/* Nodes */}
          {timelineData.map((item, index) => {
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            // Расчет позиции - используем translate3d для GPU ускорения
            const total = timelineData.length;
            const angle = ((index / total) * 360 + rotationAngle) % 360;
            const radian = (angle * Math.PI) / 180;
            const radius = typeof window !== 'undefined' && window.innerWidth < 768 ? 160 : 200;
            
            const x = radius * Math.cos(radian);
            const y = radius * Math.sin(radian);
            const zIndex = Math.round(100 + 50 * Math.cos(radian));
            const opacity = isExpanded ? 1 : Math.max(0.4, Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2)));

            return (
              <div
                key={item.id}
                ref={(el) => (nodeRefs.current[item.id] = el)}
                className="absolute will-change-transform" // ПОДСКАЗКА БРАУЗЕРУ: этот элемент будет анимироваться
                style={{
                  transform: `translate3d(${x}px, ${y}px, 0)`,
                  zIndex: isExpanded ? 200 : zIndex,
                  opacity: opacity,
                  backfaceVisibility: "hidden", // УБИРАЕТ МЫЛО
                  WebkitFontSmoothing: "antialiased",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                {/* Energy Pulse Aura */}
                <div
                  className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${isPulsing ? "opacity-100" : "opacity-0"}`}
                  style={{
                    width: `${item.energy * 0.8 + 60}px`,
                    height: `${item.energy * 0.8 + 60}px`,
                    background: `radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)`,
                    pointerEvents: "none",
                  }}
                />

                {/* Node Circle */}
                <div
                  className={`
                    relative w-14 md:w-16 h-14 md:h-16 rounded-full flex items-center justify-center cursor-pointer
                    transition-all duration-500 ease-out
                    ${isExpanded ? "bg-white text-black scale-125" : "bg-zinc-900 text-white"}
                    border-2 
                    ${isExpanded ? "border-white shadow-[0_0_25px_rgba(255,255,255,0.4)]" : "border-white/10"}
                    ${isRelated ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" : ""}
                    hover:border-white/40
                  `}
                >
                  <Icon className={`w-6 h-6 md:w-7 md:h-7 transition-transform ${isExpanded ? 'scale-110' : ''}`} />
                  
                  {/* Energy ring indicator */}
                  <div className="absolute inset-[-4px] rounded-full border border-white/5" />
                </div>

                {/* Label */}
                <div
                  className={`
                    absolute top-16 md:top-20 left-1/2 -translate-x-1/2 whitespace-nowrap
                    text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase
                    transition-all duration-300
                    ${isExpanded ? "text-white scale-110 opacity-100" : "text-white/40 opacity-80"}
                  `}
                >
                  {item.title}
                </div>

                {/* Info Card */}
                {isExpanded && (
                  <Card className="absolute top-24 left-1/2 -translate-x-1/2 w-[290px] md:w-80 bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                    <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                    <CardHeader className="pb-2 px-5 pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <Badge className="bg-blue-500/10 text-blue-400 border-none text-[9px] uppercase font-black tracking-widest h-5">
                          ЭТАП {item.id}
                        </Badge>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                          {item.date}
                        </span>
                      </div>
                      <CardTitle className="text-lg font-black text-white">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 py-4 pt-0 text-sm text-zinc-400 leading-relaxed">
                      <p>{item.content}</p>

                      {item.relatedIds.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <h4 className="text-[9px] uppercase tracking-[0.2em] font-black text-zinc-600 mb-3">
                            Следующий шаг
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {item.relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find((i) => i.id === relatedId);
                              return (
                                <button
                                  key={relatedId}
                                  className="flex items-center gap-2 h-8 px-3 text-[10px] font-bold rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all border border-white/5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItem(relatedId);
                                  }}
                                >
                                  {relatedItem?.title}
                                  <ArrowRight size={10} className="text-zinc-500" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
