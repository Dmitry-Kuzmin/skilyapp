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
import { Label } from "@/components/ui/label";
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

    if (!reportType) {
      toast.error(language === "es" ? "Selecciona un tipo de problema" : "Выберите тип проблемы");
      return;
    }

    if (!description.trim()) {
      toast.error(language === "es" ? "Describe el problema" : "Опишите проблему");
      return;
    }

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
        toast.success(language === "es" ? "¡Gracias! Reporte enviado." : "Спасибо! Отчет отправлен.");
      }, 2500); // Slightly longer to show the animation

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
      hideCloseButton={true} // Hide default close button to avoid duplicates
      className="sm:max-w-[600px] p-0 overflow-hidden border-none bg-transparent shadow-none"
      contentClassName="p-0 overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[85vh] bg-zinc-950 border border-zinc-800 shadow-2xl rounded-[24px]"
    >
      {/* Background Gradient Mesh - Subtle */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-blue-500/5 pointer-events-none" />

      {/* Internal Layout Container */}
      <div className="flex flex-col h-full w-full relative">

        {/* Success Overlay - Full Cover */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center text-center p-6"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent" />

              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                className="w-24 h-24 rounded-full bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center mb-8 shadow-2xl shadow-orange-500/20"
              >
                <CheckCircle2 className="w-10 h-10 text-white stroke-[3]" />
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold text-white mb-3"
              >
                {language === "es" ? "¡Reporte enviado!" : "Отчет отправлен!"}
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-zinc-400 max-w-[300px] leading-relaxed"
              >
                {language === "es"
                  ? "Gracias por ayudarnos a ser mejores. Revisaremos tu reporte lo antes posible."
                  : "Спасибо, что помогаете нам стать лучше. Мы рассмотрим ваш отчет как можно скорее."}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="relative px-6 pt-6 pb-2 shrink-0 z-10 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              {language === "es" ? "Reportar problema" : "Сообщить о проблеме"}
            </h2>
            <p className="text-sm text-zinc-400">
              {language === "es" ? "Describe el error que encontraste" : "Опишите найденную ошибку"}
            </p>
          </div>

          {!isSubmitting && !isSuccess && (
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="relative px-6 py-6 overflow-y-auto custom-scrollbar flex-1 z-10 space-y-6">

          {/* Question Preview */}
          {questionText && (
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <p className="text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3 h-3" />
                {language === "es" ? "Contexto" : "Контекст"}
              </p>
              <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                {questionText}
              </p>
            </div>
          )}

          {/* Report Type Grid */}
          <div className="space-y-3">
            <Label className="text-xs uppercase text-zinc-500 font-bold tracking-wider">
              {language === "es" ? "Tipo de problema" : "Тип проблемы"}
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = reportType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setReportType(type.id)}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200 group aspect-square",
                      isSelected
                        ? "bg-white text-zinc-950 border-white shadow-lg scale-[1.02]"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", isSelected ? "text-orange-500 stroke-[2.5]" : "text-current")} />
                    <span className={cn(
                      "text-[9px] font-bold leading-none text-center uppercase tracking-wide",
                      isSelected ? "text-zinc-900" : "text-zinc-500 group-hover:text-zinc-400"
                    )}>
                      {type.label[lang].substring(0, 9)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <Label className="text-xs uppercase text-zinc-500 font-bold tracking-wider">
              {language === "es" ? "Descripción detallada" : "Подробное описание"} <span className="text-orange-500">*</span>
            </Label>
            <div className="relative group">
              <Textarea
                placeholder={language === "es" ? "Por favor explica el problema..." : "Пожалуйста, объясните проблему..."}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] resize-none bg-zinc-900 border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 rounded-xl text-sm p-4 placeholder:text-zinc-600 text-zinc-200 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        {!isSuccess && (
          <div className="p-6 pt-2 border-t border-transparent bg-gradient-to-t from-zinc-950 to-transparent z-20">
            <Button
              onClick={() => handleSubmit()}
              disabled={isSubmitting || !reportType || description.trim().length < 10}
              className={cn(
                "w-full h-14 rounded-xl text-base font-bold shadow-xl transition-all duration-300",
                "bg-white text-black hover:bg-zinc-200 border-0",
                (isSubmitting || !reportType || description.trim().length < 10) && "opacity-30 cursor-not-allowed bg-zinc-800 text-zinc-500"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Send className="w-5 h-5 mr-2" />
              )}
              {language === "es" ? "Enviar reporte" : "Отправить"}
            </Button>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}
