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

    if (!reportType) return;
    if (reportType === 'other' && !description.trim()) return;

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
      }, 2000);

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
      contentClassName="p-0 overflow-hidden flex flex-col h-auto max-h-[85vh] bg-[#121214] border border-white/10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.9)] rounded-[32px] ring-1 ring-white/5"
    >
      {/* Background Gradient Mesh - Dynamic Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-orange-500/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="flex flex-col h-full w-full relative min-h-[350px]">
        {/* Success Overlay */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-[#121214] flex flex-col items-center justify-center text-center p-8 backdrop-blur-3xl"
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
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all active:scale-95 border border-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="relative px-6 py-4 overflow-y-auto custom-scrollbar flex-1 z-10 space-y-6">

          {/* Context Widget (Optional but helpful) */}
          {questionText && (
            <div className="bg-zinc-900/40 rounded-xl p-3 border border-white/5 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="shrink-0 pt-0.5">
                  <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2 italic font-medium">
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
                        ? "bg-white border-white shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] translate-y-[-2px] z-10"
                        : "bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60 hover:border-white/10 hover:translate-y-[-1px]"
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
          </div>

          {/* Step 2: Description (Animated) */}
          <AnimatePresence>
            {reportType && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="overflow-hidden space-y-4 pt-1 pb-2"
              >
                <div className="relative group">
                  <Textarea
                    placeholder={
                      reportType === 'other'
                        ? (language === "es" ? "Por favor describe el problema..." : "Пожалуйста, опишите проблему...")
                        : (language === "es" ? "Añadir detalles (opcional)..." : "Добавить детали (необязательно)...")
                    }
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={cn(
                      "min-h-[100px] resize-none rounded-2xl text-sm p-4 pr-4 pb-8 transition-all duration-300 placeholder:text-zinc-600",
                      "bg-zinc-900/50 border-white/5 focus:bg-zinc-900 focus:border-white/20 focus:ring-1 focus:ring-white/20 text-zinc-200"
                    )}
                  />
                  {/* Modern Character Counter - Only show count if user is typing or if required */}
                  {(reportType === 'other' || description.length > 0) && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-none">
                      <motion.div
                        animate={{
                          scale: (reportType !== 'other' || description.length >= 5) ? [1, 1.2, 1] : 1,
                          backgroundColor: (reportType !== 'other' || description.length >= 5) ? "#10b981" : "#3f3f46"
                        }}
                        className="h-1.5 w-1.5 rounded-full transition-colors duration-300"
                      />
                      <span className={cn(
                        "text-[10px] font-mono leading-none transition-colors duration-300",
                        (reportType !== 'other' || description.length >= 5) ? "text-zinc-400" : "text-zinc-600"
                      )}>
                        {description.length} {reportType === 'other' ? '/ 5' : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="">
                  <Button
                    onClick={(e) => handleSubmit(e)}
                    disabled={isSubmitting || (reportType === 'other' && description.trim().length < 5)}
                    className={cn(
                      "w-full h-12 rounded-xl text-sm font-bold tracking-wide transition-all duration-500",
                      (reportType !== 'other' || description.trim().length >= 5)
                        ? "bg-white text-black hover:bg-zinc-200 shadow-[0_0_30px_-5px_rgba(255,255,255,0.15)] translate-y-0 opacity-100"
                        : "bg-zinc-800/50 text-zinc-600 border border-white/5 shadow-none opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{language === "es" ? "Enviando..." : "Отправка..."}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className={cn("w-4 h-4 transition-transform duration-300", (reportType !== 'other' || description.trim().length >= 5) ? "translate-x-0" : "-translate-x-1 opacity-0")} />
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
