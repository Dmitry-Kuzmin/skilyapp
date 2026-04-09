import { TestimonialsColumn, type Testimonial } from "@/components/ui/testimonials-columns";

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
  badge?: string;
  title?: string;
  subtitle?: string;
}

export function TestimonialsSection({
  testimonials,
  badge,
  title,
  subtitle,
}: TestimonialsSectionProps) {
  const col1 = testimonials.slice(0, 3);
  const col2 = testimonials.slice(3, 6);
  const col3 = testimonials.slice(6, 9);

  return (
    <section className="relative z-10 py-20 px-4 max-w-[1400px] mx-auto">
      {(badge || title || subtitle) && (
        <div className="text-center mb-12">
          {badge && (
            <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/15 text-yellow-400 text-xs font-bold uppercase tracking-widest mb-4">
              {badge}
            </div>
          )}
          {title && (
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 tracking-tight px-2 text-center">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto font-light px-4 text-center">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden px-4">
        <TestimonialsColumn testimonials={col1} duration={25} />
        <TestimonialsColumn testimonials={col2} duration={30} className="hidden md:block" />
        <TestimonialsColumn testimonials={col3} duration={20} className="hidden lg:block" />
      </div>
    </section>
  );
}
