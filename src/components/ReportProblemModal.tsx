import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Languages,
  XCircle,
  Image as ImageIcon,
  HelpCircle,
  MessageSquare,
  Send,
  Loader2,
  X
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserContext } from "@/contexts/UserContext";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";

interface ReportProblemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string;
  questionText?: string;
}

type ReportType = "wrong_translation" | "wrong_answer" | "wrong_image" | "unclear_question" | "other";

const reportTypes: { id: ReportType; icon: any; label: { es: string; ru: string } }[] = [
  { id: "wrong_translation", icon: Languages,    label: { es: "Traducción", ru: "Перевод"   } },
  { id: "wrong_answer",      icon: XCircle,      label: { es: "Respuesta",  ru: "Ответ"     } },
  { id: "wrong_image",       icon: ImageIcon,    label: { es: "Imagen",     ru: "Картинка"  } },
  { id: "unclear_question",  icon: HelpCircle,   label: { es: "Confuso",    ru: "Непонятно" } },
  { id: "other",             icon: MessageSquare,label: { es: "Otro",       ru: "Другое"    } },
];

const REPORT_LABELS: Record<ReportType, { es: string; ru: string }> = {
  wrong_translation: { es: "Traducción incorrecta",  ru: "Неправильный перевод"    },
  wrong_answer:      { es: "Respuesta incorrecta",   ru: "Неправильный ответ"      },
  wrong_image:       { es: "Imagen incorrecta",      ru: "Неправильное изображение" },
  unclear_question:  { es: "Pregunta confusa",       ru: "Непонятный вопрос"       },
  other:             { es: "Otro problema",           ru: "Другая проблема"         },
};

export function ReportProblemModal({ open, onOpenChange, questionId, questionText }: ReportProblemModalProps) {
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { language } = useLanguage();
  const { profileId } = useUserContext();
  const lang = language === "es" ? "es" : "ru";

  useEffect(() => {
    if (open) {
      setReportType(null);
      setComment("");
      setIsSubmitting(false);
      setIsSuccess(false);
    }
  }, [open]);

  const canSubmit = reportType !== null && (reportType !== "other" || comment.trim().length >= 5);

  const handleSubmit = async () => {
    if (!reportType || !canSubmit || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const supabase = await getSupabaseClient();

      // description = label + optional user comment + question snippet
      const parts: string[] = [REPORT_LABELS[reportType][lang]];
      if (comment.trim()) parts.push(comment.trim());
      if (questionText) parts.push(`"${questionText.substring(0, 200)}"`);
      const description = parts.join(" — ");

      const { error } = await supabase
        .from("question_reports")
        .insert({
          question_id: questionId,
          user_id: profileId!,
          report_type: reportType,
          description,
          status: "pending",
        });

      if (error) console.error("[ReportProblemModal] Insert error:", error);
    } catch (err) {
      console.error("[ReportProblemModal] Unexpected error:", err);
    } finally {
      setIsSubmitting(false);
    }

    setIsSuccess(true);
    setTimeout(() => {
      onOpenChange(false);
      setTimeout(() => {
        setIsSuccess(false);
        setReportType(null);
        setComment("");
      }, 500);
    }, 1800);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={null}
      description={null}
      hideCloseButton={true}
      className="sm:max-w-[550px] p-0 overflow-hidden border-none bg-transparent shadow-none"
      contentClassName="p-0 overflow-hidden flex flex-col h-auto max-h-[85vh] bg-[#121214] border border-white/10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.9)] rounded-[32px] ring-1 ring-white/5"
    >
      {/* Ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-orange-500/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="flex flex-col h-full w-full relative min-h-[350px]">

        {/* Success overlay */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-[#121214] flex flex-col items-center justify-center text-center p-8"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent opacity-50" />
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 ring-1 ring-emerald-500/30 shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                {language === "es" ? "¡Recibido!" : "Получено!"}
              </h3>
              <p className="text-zinc-400 max-w-[280px] text-sm leading-relaxed">
                {language === "es"
                  ? "Tu reporte nos ayuda a mejorar. Gracias."
                  : "Ваш отчет помогает нам стать лучше. Спасибо."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="relative px-6 pt-6 pb-2 shrink-0 z-10 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {language === "es" ? "Reportar problema" : "Сообщить о проблеме"}
            </h2>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              {language === "es" ? "¿Qué sucede con esta pregunta?" : "Что не так с этим вопросом?"}
            </p>
          </div>
          {!isSuccess && (
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all active:scale-95 border border-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="relative px-6 py-4 overflow-y-auto custom-scrollbar flex-1 z-10 space-y-4">

          {/* Question snippet */}
          {questionText && (
            <div className="bg-zinc-900/40 rounded-xl p-3 border border-white/5">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2 italic font-medium">
                  "{questionText}"
                </p>
              </div>
            </div>
          )}

          {/* Type grid */}
          <div className="grid grid-cols-5 gap-2">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = reportType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-2 p-2 h-20 rounded-xl border transition-all duration-300 group",
                    isSelected
                      ? "bg-white border-white shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] -translate-y-0.5 z-10"
                      : "bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60 hover:border-white/10"
                  )}
                >
                  <Icon className={cn("w-5 h-5 transition-colors duration-300", isSelected ? "text-black" : "text-zinc-500 group-hover:text-zinc-300")} />
                  <span className={cn(
                    "text-[9px] font-bold leading-none text-center uppercase tracking-wider transition-colors duration-300",
                    isSelected ? "text-black" : "text-zinc-600 group-hover:text-zinc-400"
                  )}>
                    {type.label[lang].substring(0, 10)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Comment textarea — animates in after type selection */}
          <AnimatePresence>
            {reportType && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="overflow-hidden space-y-3"
              >
                <div className="relative">
                  <Textarea
                    placeholder={
                      reportType === "other"
                        ? (language === "es" ? "Describe el problema..." : "Опишите проблему...")
                        : (language === "es" ? "Añadir detalles (opcional)..." : "Добавить детали (необязательно)...")
                    }
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[90px] resize-none rounded-2xl text-sm p-4 pb-8 bg-zinc-900/50 border-white/5 focus:bg-zinc-900 focus:border-white/20 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none text-zinc-200 placeholder:text-zinc-600"
                  />
                  {/* char counter */}
                  <span className="absolute bottom-3 right-3 text-[10px] font-mono text-zinc-600 pointer-events-none">
                    {comment.length}{reportType === "other" ? " / 5" : ""}
                  </span>
                </div>

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className={cn(
                    "w-full h-12 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2",
                    canSubmit && !isSubmitting
                      ? "bg-white text-black hover:bg-zinc-100 shadow-[0_0_30px_-5px_rgba(255,255,255,0.15)]"
                      : "bg-zinc-800/50 text-zinc-600 border border-white/5 cursor-not-allowed opacity-50"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{language === "es" ? "Enviando..." : "Отправка..."}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{language === "es" ? "Enviar reporte" : "Отправить"}</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </ResponsiveModal>
  );
}
