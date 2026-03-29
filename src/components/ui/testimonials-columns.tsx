import React from "react";
import { motion } from "framer-motion";

export interface Testimonial {
  text: string;
  image: string;
  name: string;
  role: string;
}

/**
 * Infinite auto-scrolling testimonials column.
 *
 * Critical for smooth looping:
 *  - Content is duplicated exactly once (2 copies).
 *  - Animation translates to -50% so the second copy aligns perfectly with start.
 *  - `gap` and `pb` MUST be equal so there's no jump at the loop point.
 */
export const TestimonialsColumn = ({
  className,
  testimonials,
  duration = 15,
}: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        // gap and pb MUST match for seamless loop
        className="flex flex-col gap-6 pb-6"
      >
        {[0, 1].map((copyIdx) => (
          <React.Fragment key={copyIdx}>
            {testimonials.map(({ text, image, name, role }, i) => (
              <div
                key={`${copyIdx}-${i}`}
                className="p-8 rounded-3xl border border-white/[0.08] bg-white/[0.03] shadow-lg shadow-black/20 backdrop-blur-sm max-w-xs w-full"
              >
                <p className="text-sm text-zinc-300 leading-relaxed">{text}</p>
                <div className="flex items-center gap-3 mt-5">
                  <img
                    width={40}
                    height={40}
                    src={image}
                    alt={name}
                    className="h-10 w-10 rounded-full object-cover border border-white/10 flex-shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-white leading-5 truncate">{name}</span>
                    <span className="text-xs text-zinc-500 leading-5 truncate">{role}</span>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
};
