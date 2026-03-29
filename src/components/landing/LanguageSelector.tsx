import React, { useEffect, useRef } from "react";
import { Language } from "@/contexts/LanguageContext";
import { LANGUAGE_OPTIONS } from "@/translations/landing";
import { ChevronDown } from "lucide-react";

interface LanguageSelectorProps {
  language: Language;
  onSelect: (lang: Language) => void;
  label: string;
  options?: Array<{ code: Language; label: string }>;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  language,
  onSelect,
  label,
}) => {
  const [open, setOpen] = React.useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggle = () => setOpen((prev) => !prev);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={toggle}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900/70 border border-slate-800/70 text-[11px] font-bold uppercase tracking-[0.35em] text-slate-300 hover:text-white transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {language.toUpperCase()}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-28 rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-xl z-50">
          <div className="px-3 py-2 text-[10px] uppercase tracking-[0.35em] text-slate-500">
            {label}
          </div>
          <div className="divide-y divide-slate-800/60">
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.code}
                onClick={() => {
                  onSelect(option.code);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  option.code === language
                    ? "text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

