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
      }, 2000);

    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast.error(language === "es" ? "Error al enviar el reporte" : "Ошибка при отправке отчета");
    } finally {
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
      title={null} // We use custom header
      description={null}
      className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none"
      contentClassName="p-0 overflow-hidden flex flex-col h-full"
    >
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-blue-500/5 pointer-events-none" />

      {/* Internal Layout Container */}
      <div className="flex flex-col h-full w-full">

        {/* Header */}
        <div className="relative px-6 pt-6 pb-2 shrink-0 z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {language === "es" ? "Reportar problema" : "Сообщить о проблеме"}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground ml-1">
              {language === "es" ? "Ayúdanos a mejorar la calidad" : "Помогите нам улучшить качество"}
            </p>
          </div>

          {!isSubmitting && !isSuccess && (
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-muted/50 transition-colors -mr-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="relative px-6 py-4 overflow-y-auto custom-scrollbar flex-1 z-10">
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center py-10 text-center h-full min-h-[300px]"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                  className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30"
                >
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {language === "es" ? "¡Enviado!" : "Отправлено!"}
                </h3>
                <p className="text-muted-foreground max-w-[200px] text-sm leading-relaxed">
                  {language === "es"
                    ? "Gracias por tu ayuda. Revisaremos tu reporte pronto."
                    : "Спасибо за вашу помощь. Мы скоро рассмотрим ваш отчет."}
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 pb-20" // Extra padding for footer
              >
                {/* Question Preview (Compact) */}
                {questionText && (
                  <div className="bg-muted/40 rounded-2xl p-4 border border-border/40 backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/30 group-hover:bg-orange-500/50 transition-colors" />
                    <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-3 h-3" />
                      {language === "es" ? "Sobre la pregunta" : "О вопросе"}
                    </p>
                    <p className="text-sm text-foreground line-clamp-3 font-medium leading-relaxed">
                      {questionText}
                    </p>
                  </div>
                )}

                {/* Report Type Grid */}
                <div className="space-y-3">
                  <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider ml-1">
                    {language === "es" ? "Tipo de problema" : "Тип проблемы"}
                  </Label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {reportTypes.map((type) => {
                      const Icon = type.icon;
                      const isSelected = reportType === type.id;
                      return (
                        <button
                          key={type.id}
                          onClick={() => setReportType(type.id)}
                          className={cn(
                            "relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all duration-300 group overflow-hidden",
                            isSelected
                              ? "bg-gradient-to-br from-orange-500 to-red-600 border-transparent shadow-lg shadow-orange-500/25 scale-[1.02]"
                              : "bg-background/50 border-border/50 hover:bg-muted/50 hover:border-border text-muted-foreground hover:text-foreground hover:shadow-md"
                          )}
                        >
                          <div className={cn(
                            "p-2 rounded-xl transition-colors duration-300",
                            isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground"
                          )}>
                            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <span className={cn(
                            "text-[10px] sm:text-xs font-semibold leading-none text-center transition-colors",
                            isSelected ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                          )}>
                            {type.label[lang]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider ml-1">
                    {language === "es" ? "Descripción" : "Описание"} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Textarea
                      placeholder={language === "es" ? "Describe los detalles..." : "Опишите детали..."}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[120px] resize-none bg-background/50 border-border/50 focus:border-orange-500/50 focus:ring-orange-500/20 rounded-2xl text-sm p-4 placeholder:text-muted-foreground/50 transition-all shadow-sm focus:shadow-md"
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground font-medium pointer-events-none bg-background/80 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                      {description.length} / 10
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fixed Footer */}
        {!isSuccess && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/10 bg-gradient-to-t from-background via-background/95 to-transparent z-20 backdrop-blur-[2px]">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !reportType || description.trim().length < 10}
              className={cn(
                "w-full h-12 rounded-2xl text-base font-bold shadow-xl transition-all duration-300 transform",
                "bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 bg-[length:200%_100%] hover:bg-[100%_0] border-0 text-white",
                "hover:scale-[1.02] active:scale-[0.98]",
                (isSubmitting || !reportType || description.trim().length < 10) && "opacity-50 grayscale cursor-not-allowed hover:scale-100 shadow-none"
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
