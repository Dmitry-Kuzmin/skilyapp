"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Link, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
    {}
  );
  const [viewMode, setViewMode] = useState<"orbital">("orbital");
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

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

  useEffect(() => {
    let rotationTimer: NodeJS.Timeout;

    if (autoRotate && viewMode === "orbital") {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.3) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
  }, [autoRotate, viewMode]);

  const centerViewOnNode = (nodeId: number) => {
    if (viewMode !== "orbital" || !nodeRefs.current[nodeId]) return;

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;

    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    // Adapt radius for mobile/desktop
    const isMobile = window.innerWidth < 768;
    const radius = isMobile ? 160 : 200;
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.4,
      Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2))
    );

    return { x, y, angle, zIndex, opacity };
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

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "text-white bg-black border-white";
      case "in-progress":
        return "text-black bg-white border-black";
      case "pending":
        return "text-white bg-black/40 border-white/50";
      default:
        return "text-white bg-black/40 border-white/50";
    }
  };

  return (
    <div
      className="w-full relative h-[650px] md:h-[750px] flex flex-col items-center justify-center bg-transparent overflow-hidden"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="absolute top-10 text-center z-10 pointer-events-none px-4 w-full">
        <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/15 text-blue-400 text-xs font-medium uppercase tracking-wider mb-4">
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
        <div
          className="absolute w-full h-full flex items-center justify-center transform scale-[0.9] md:scale-100"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          <div 
            className="absolute w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-indigo-500/20 via-blue-500/20 to-teal-500/20 animate-pulse-slow flex items-center justify-center z-10 shadow-[0_0_40px_rgba(59,130,246,0.3)] cursor-pointer hover:scale-105 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              if (timelineData.length > 0) {
                toggleItem(timelineData[0].id);
              }
            }}
          >
            <div className="absolute w-28 h-28 md:w-32 md:h-32 rounded-full border border-sky-400/20 animate-ping opacity-70 cursor-pointer"></div>
            <div
              className="absolute w-36 h-36 md:w-40 md:h-40 rounded-full border border-sky-400/10 animate-ping opacity-50 cursor-pointer"
              style={{ animationDelay: "0.5s" }}
            ></div>
            <img 
              src="/android-chrome-512x512.png" 
              alt="Skily Logo" 
              className="w-14 h-14 md:w-16 md:h-16 rounded-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] z-20"
            />
          </div>

          <div className="absolute w-80 h-80 md:w-96 md:h-96 rounded-full border border-white/10"></div>

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div
                key={item.id}
                ref={(el) => (nodeRefs.current[item.id] = el)}
                className="absolute transition-all duration-700 cursor-pointer"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                <div
                  className={`absolute rounded-full -inset-1 ${
                    isPulsing ? "animate-pulse duration-1000" : ""
                  }`}
                  style={{
                    background: `radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)`,
                    width: `${item.energy * 0.5 + 40}px`,
                    height: `${item.energy * 0.5 + 40}px`,
                    left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                    top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                  }}
                ></div>

                <div
                  className={`
                  w-14 md:w-16 h-14 md:h-16 rounded-full flex items-center justify-center
                  ${
                    isExpanded
                      ? "bg-white text-black"
                      : "bg-slate-900 text-white"
                  }
                  border-2 
                  ${
                    isExpanded
                      ? "border-white shadow-lg shadow-white/30"
                      : isRelated
                      ? "border-sky-400 animate-pulse shadow-[0_0_15px_rgba(56,189,248,0.5)]"
                      : "border-white/20"
                  }
                  transition-all duration-300 transform
                  ${isExpanded ? "scale-[1.3] md:scale-150" : ""}
                `}
                >
                  <Icon className="w-6 h-6 md:w-7 md:h-7" />
                </div>

                <div
                  className={`
                  absolute top-16 md:top-20 whitespace-nowrap
                  text-[11px] md:text-sm font-bold tracking-widest uppercase
                  transition-all duration-300
                  ${isExpanded ? "text-white scale-110 md:scale-125" : "text-white/70"}
                  left-1/2 -translate-x-1/2
                `}
                >
                  {item.title}
                </div>

                {isExpanded && (
                  <Card className="absolute top-20 left-1/2 -translate-x-1/2 w-[280px] md:w-80 bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-2xl shadow-sky-500/20 overflow-visible rounded-2xl">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-white/50"></div>
                    <CardHeader className="pb-2 px-5 pt-5 border-b border-white/10">
                      <div className="flex justify-between items-center mb-2">
                        <Badge
                          variant="outline"
                          className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] uppercase font-bold tracking-wider"
                        >
                          ШАГ {item.id}
                        </Badge>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-full">
                          {item.date}
                        </span>
                      </div>
                      <CardTitle className="text-xl font-bold bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 py-4 text-sm text-zinc-300 leading-relaxed font-medium">
                      <p>{item.content}</p>

                      {item.relatedIds.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="flex items-center mb-3">
                            <Link size={12} className="text-zinc-500 mr-1.5" />
                            <h4 className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                              Следующий этап
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find(
                                (i) => i.id === relatedId
                              );
                              return (
                                <button
                                  key={relatedId}
                                  className="flex items-center gap-1.5 h-7 px-3 text-[11px] font-bold rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all shadow-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItem(relatedId);
                                  }}
                                >
                                  {relatedItem?.title}
                                  <ArrowRight
                                    size={10}
                                    className="text-zinc-500"
                                  />
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
