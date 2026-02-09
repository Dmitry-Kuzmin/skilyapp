import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Languages,
  XCircle,
  Image as ImageIcon,
  HelpCircle,
  MessageSquare,
  Send,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserContext } from "@/contexts/UserContext";
import { isTelegramMiniApp } from "@/lib/telegram";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ReportProblemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string;
  questionText?: string;
}

type ReportType = "wrong_translation" | "wrong_answer" | "wrong_image" | "unclear_question" | "other";

const reportTypes: { id: ReportType; icon: any; label: { es: string; ru: string } }[] = [
  {
    id: "wrong_translation",
    icon: Languages,
    label: { es: "Traducción", ru: "Перевод" }
  },
  {
    id: "wrong_answer",
    icon: XCircle,
    label: { es: "Respuesta", ru: "Ответ" }
  },
  {
    id: "wrong_image",
    icon: ImageIcon,
    label: { es: "Imagen", ru: "Картинка" }
  },
  {
    id: "unclear_question",
    icon: HelpCircle,
    label: { es: "Confuso", ru: "Непонятно" }
  },
  {
    id: "other",
    icon: MessageSquare,
    label: { es: "Otro", ru: "Другое" }
  }
];

export function ReportProblemModal({ open, onOpenChange, questionId, questionText }: ReportProblemModalProps) {
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { language } = useLanguage();
  const { profileId } = useUserContext();
  const lang = language === "es" ? "es" : "ru";
  const isTelegramApp = isTelegramMiniApp();

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setReportType(null);
      setDescription("");
      setIsSuccess(false);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!reportType || !description.trim()) return;

    setIsSubmitting(true);

    try {
      if (!profileId) {
        throw new Error(language === "es"
          ? "Debes iniciar sesión"
          : "Необходима авторизация");
      }

      console.log('[ReportProblemModal] Submitting report:', {
        profileId,
        questionId,
        reportType,
        description: description.trim().substring(0, 50),
        isTelegramApp
      });

      const { error } = await supabase
        .from("question_reports")
        .insert({
          user_id: profileId,
          question_id: questionId,
          report_type: reportType,
          description: description.trim(),
          status: "pending"
        });

      if (error) throw error;

      setIsSuccess(true);

      // Auto close after success animation
      setTimeout(() => {
        handleClose();
        setTimeout(() => {
          // Reset internal state after close animation
          setIsSuccess(false);
          setReportType(null);
          setDescription("");
        }, 500);
      }, 2500);

    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast.error(language === "es" ? "Error al enviar el reporte" : "Ошибка при отправке отчета");
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={null}
      description={null}
      hideCloseButton={true}
      className="sm:max-w-[550px] p-0 overflow-hidden border-none bg-transparent shadow-none"
      contentClassName="p-0 overflow-hidden flex flex-col h-auto max-h-[85vh] bg-zinc-950 border border-zinc-800 shadow-2xl rounded-[24px]"
    >
      {/* Background Gradient Mesh - Very Subtle */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-zinc-950 pointer-events-none" />

      <div className="flex flex-col h-full w-full relative min-h-[350px]">
        {/* Success Overlay */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center text-center p-8"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent opacity-50" />

              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 ring-1 ring-emerald-500/50 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]"
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
            <h2 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
              {language === "es" ? "Reportar problema" : "Сообщить о проблеме"}
            </h2>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              {language === "es" ? "¿Qué sucede con esta pregunta?" : "Что не так с этим вопросом?"}
            </p>
          </div>
          {!isSubmitting && !isSuccess && (
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-all active:scale-95 border border-transparent hover:border-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="relative px-6 py-4 overflow-y-auto custom-scrollbar flex-1 z-10 space-y-6">

          {/* Context Widget (Optional but helpful) */}
          {questionText && (
            <div className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-800/50">
              <div className="flex items-start gap-3">
                <div className="shrink-0 pt-0.5">
                  <HelpCircle className="w-3.5 h-3.5 text-zinc-600" />
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 italic font-medium">
                  "{questionText}"
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Report Type Grid */}
          <div className="space-y-3">
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
                        ? "bg-zinc-100 border-zinc-100 shadow-xl shadow-zinc-900/20 translate-y-[-2px]"
                        : "bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-800/60 hover:border-zinc-700 hover:translate-y-[-1px]"
                    )}
                  >
                    <Icon className={cn("w-5 h-5 transition-colors", isSelected ? "text-zinc-900" : "text-zinc-500 group-hover:text-zinc-300")} />
                    <span className={cn(
                      "text-[9px] font-bold leading-none text-center uppercase tracking-wider transition-colors",
                      isSelected ? "text-zinc-900" : "text-zinc-600 group-hover:text-zinc-400"
                    )}>
                      {type.label[lang].substring(0, 10)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Description (Animated) */}
          <AnimatePresence>
            {reportType && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="overflow-hidden space-y-4 pt-1 pb-2"
              >
                <div className="relative group">
                  <Textarea
                    placeholder={language === "es" ? "Describe el error aquí..." : "Опишите ошибку здесь..."}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={cn(
                      "min-h-[120px] resize-none rounded-2xl text-sm p-4 pr-4 pb-8 transition-all duration-300 placeholder:text-zinc-600",
                      "bg-zinc-900/50 border-zinc-700/50 focus:bg-zinc-900 focus:border-orange-500/30 focus:ring-1 focus:ring-orange-500/30 text-zinc-200"
                    )}
                  />
                  {/* Modern Character Counter */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-none">
                    <motion.div
                      animate={{ scale: description.length >= 10 ? [1, 1.2, 1] : 1 }}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-colors duration-300",
                        description.length >= 10 ? "bg-emerald-500" : "bg-zinc-700"
                      )}
                    />
                    <span className={cn(
                      "text-[10px] font-mono leading-none transition-colors duration-300",
                      description.length >= 10 ? "text-zinc-400" : "text-zinc-600"
                    )}>
                      {description.length} / 10
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="">
                  <Button
                    onClick={(e) => handleSubmit(e)}
                    disabled={isSubmitting || description.trim().length < 10}
                    className={cn(
                      "w-full h-12 rounded-xl text-sm font-bold tracking-wide shadow-lg transition-all duration-500",
                      description.trim().length >= 10
                        ? "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-orange-900/20 translate-y-0 opacity-100"
                        : "bg-zinc-800 text-zinc-600 border border-transparent shadow-none opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{language === "es" ? "Enviando..." : "Отправка..."}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className={cn("w-4 h-4 transition-transform duration-300", description.trim().length >= 10 ? "translate-x-0" : "-translate-x-1 opacity-0")} />
                        <span>{language === "es" ? "Enviar Reporte" : "Отправить"}</span>
                      </div>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ResponsiveModal>
  );
}
