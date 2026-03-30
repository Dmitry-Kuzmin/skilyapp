"use client";

import React from "react";

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const sizeMap = {
  sm: { width: "150px", height: "184px", depth: "12px", spineWidth: "24px" },
  default: { width: "196px", height: "240px", depth: "16px", spineWidth: "32px" },
  lg: { width: "300px", height: "368px", depth: "22px", spineWidth: "44px" },
};

interface PerspectiveBookProps {
  size?: "sm" | "default" | "lg";
  className?: string;
  children: React.ReactNode;
  spineContent?: React.ReactNode;
  backCoverColor?: string;
}

export function PerspectiveBook({
  size = "default",
  className = "",
  children,
  spineContent,
  backCoverColor = "#1a1a2e",
}: PerspectiveBookProps) {
  const { width, height, depth, spineWidth } = sizeMap[size];

  return (
    <div
      className="group"
      style={{ perspective: "900px", width, height, display: "inline-block" }}
    >
      <div
        style={{
          width,
          height,
          position: "relative",
          transformStyle: "preserve-3d",
          transform: "rotateY(-25deg) rotateX(6deg)",
          transition: "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
        className="group-hover:[transform:rotateY(-8deg)_rotateX(2deg)_scale(1.04)]"
      >
        {/* Front Cover */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translateZ(${depth})`,
            borderRadius: "3px 5px 5px 3px",
            overflow: "hidden",
          }}
          className={cn(
            "after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit]",
            "after:shadow-[0_2px_4px_rgba(0,0,0,.1),_0_12px_24px_rgba(0,0,0,.15),_inset_0_-1px_rgba(0,0,0,.15),_inset_0_2px_2px_rgba(255,255,255,.1),_inset_4px_0_4px_rgba(0,0,0,.1)]",
            "after:border-[rgba(0,0,0,0.08)] after:border after:border-solid",
            className,
          )}
        >
          {/* Spine lighting effect */}
          <div
            className="absolute left-0 top-0 h-full pointer-events-none opacity-40 z-10"
            style={{
              width: "12%",
              background:
                "linear-gradient(90deg, hsla(0,0%,100%,0) 0%, hsla(0,0%,100%,0) 12%, hsla(0,0%,100%,.25) 29%, hsla(0,0%,100%,0) 50%, hsla(0,0%,100%,0) 75%, hsla(0,0%,100%,.25) 91%, hsla(0,0%,100%,0) 100%), linear-gradient(90deg, rgba(0,0,0,.03) 0%, rgba(0,0,0,.1) 12%, transparent 30%, rgba(0,0,0,.02) 50%, rgba(0,0,0,.2) 73%, rgba(0,0,0,.5) 75%, rgba(0,0,0,.15) 85%, transparent 100%)",
            }}
          />
          <div className="relative z-20 h-full w-full">{children}</div>
        </div>

        {/* Spine (left side) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: spineWidth,
            transform: `rotateY(-90deg) translateX(-${parseInt(depth)}px) translateZ(${parseInt(spineWidth) / 2}px)`,
            transformOrigin: "left center",
            borderRadius: "2px 0 0 2px",
            overflow: "hidden",
            background: "linear-gradient(to right, #0a0a14, #12122a)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-white/5" />
          {spineContent && (
            <div className="relative z-10 h-full flex items-center justify-center">
              {spineContent}
            </div>
          )}
        </div>

        {/* Pages (right side) */}
        <div
          style={{
            position: "absolute",
            top: "2%",
            bottom: "2%",
            right: 0,
            width: parseInt(depth) * 1.5 + "px",
            transform: `rotateY(90deg) translateX(${parseInt(depth) * 0.75}px) translateZ(${parseInt(width) - parseInt(depth) * 0.75}px)`,
            transformOrigin: "right center",
            backgroundImage:
              "repeating-linear-gradient(to right, transparent, transparent 1px, rgba(0,0,0,0.04) 1px, rgba(0,0,0,0.04) 2px)",
            backgroundColor: "#e8e0d4",
          }}
        />

        {/* Back Cover */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translateZ(-${depth})`,
            borderRadius: "3px 5px 5px 3px",
            backgroundColor: backCoverColor,
            boxShadow: "0 15px 50px -10px rgba(0,0,0,0.8)",
          }}
        />
      </div>
    </div>
  );
}
