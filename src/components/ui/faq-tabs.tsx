import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQProps {
  id?: string;
  title?: string;
  subtitle?: string;
  categories: Record<string, string>;
  faqData: Record<string, { question: string; answer: string }[]>;
  className?: string;
}

export const FAQ = ({ 
  title = "Ответы на вопросы",
  subtitle = "FAQ",
  categories,
  faqData,
  className,
  ...props 
}: FAQProps) => {
  const categoryKeys = Object.keys(categories);
  const [selectedCategory, setSelectedCategory] = useState(categoryKeys[0]);

  return (
    <div 
      className={cn(
        "relative bg-transparent px-4 py-24 text-white",
        className
      )}
      {...props}
    >
      <FAQHeader title={title} subtitle={subtitle} />
      <FAQTabs 
        categories={categories}
        selected={selectedCategory} 
        setSelected={setSelectedCategory} 
      />
      <FAQList 
        faqData={faqData}
        selected={selectedCategory} 
      />
    </div>
  );
};

const FAQHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="relative z-10 flex flex-col items-center justify-center text-center">
    <span className="mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text font-bold tracking-widest text-transparent uppercase text-xs md:text-sm">
      {subtitle}
    </span>
    <h2 className="mb-10 text-3xl md:text-5xl font-bold tracking-tight text-white/95">{title}</h2>
    <span className="absolute -top-[250px] left-[50%] z-0 h-[400px] w-[500px] -translate-x-[50%] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
  </div>
);

const FAQTabs = ({ 
  categories, 
  selected, 
  setSelected 
}: { 
  categories: Record<string, string>; 
  selected: string; 
  setSelected: (k: string) => void;
}) => (
  <div className="relative z-10 flex w-full justify-start md:justify-center mb-12">
    <div className="flex items-center gap-2 overflow-x-auto pb-4 md:pb-0 px-4 md:px-0 max-w-full snap-x scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
      {Object.entries(categories).map(([key, label]) => (
        <button
          key={key}
          onClick={() => setSelected(key)}
          className={cn(
            "relative overflow-hidden whitespace-nowrap rounded-full border px-5 py-2 text-sm font-semibold transition-colors duration-500 shrink-0 snap-center md:snap-start",
            selected === key
              ? "border-blue-500/50 text-white"
              : "border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.05]"
          )}
        >
          <span className="relative z-10">{label}</span>
          <AnimatePresence>
            {selected === key && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 z-0 bg-blue-500/20 backdrop-blur-sm"
              />
            )}
          </AnimatePresence>
        </button>
      ))}
    </div>
  </div>
);

const FAQList = ({ 
  faqData, 
  selected 
}: { 
  faqData: Record<string, { question: string; answer: string }[]>; 
  selected: string; 
}) => (
  <div className="mx-auto max-w-3xl">
    <AnimatePresence mode="wait">
      {Object.entries(faqData).map(([category, questions]) => {
        if (selected === category) {
          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-3"
            >
              {questions.map((faq, index) => (
                <FAQItem key={index} {...faq} />
              ))}
            </motion.div>
          );
        }
        return null;
      })}
    </AnimatePresence>
  </div>
);

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      animate={isOpen ? "open" : "closed"}
      className={cn(
        "rounded-2xl border transition-all duration-300 overflow-hidden",
        isOpen ? "bg-white/[0.04] border-blue-500/30 shadow-lg shadow-blue-500/5" : "bg-white/[0.02] border-white/5 hover:border-white/10"
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <span
          className={cn(
            "text-[15px] font-medium transition-colors",
            isOpen ? "text-white" : "text-white/90"
          )}
        >
          {question}
        </span>
        <motion.span
          variants={{
            open: { rotate: "45deg" },
            closed: { rotate: "0deg" },
          }}
          transition={{ duration: 0.2 }}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/5"
        >
          <Plus
            className={cn(
              "h-4 w-4 transition-colors",
              isOpen ? "text-blue-400" : "text-zinc-400"
            )}
          />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="px-5"
          >
            <p className="text-sm text-zinc-400 pb-5 leading-relaxed whitespace-pre-line">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
