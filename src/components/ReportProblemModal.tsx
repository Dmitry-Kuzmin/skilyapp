import { useState } from "react";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReportProblemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string;
  questionText?: string;
}

type ReportType = "wrong_translation" | "wrong_answer" | "wrong_image" | "unclear_question" | "other";

const reportTypeLabels: Record<ReportType, { es: string; ru: string }> = {
  wrong_translation: {
    es: "Traducción incorrecta",
    ru: "Неправильный перевод"
  },
  wrong_answer: {
    es: "Respuesta incorrecta",
    ru: "Неправильный ответ"
  },
  wrong_image: {
    es: "Imagen incorrecta",
    ru: "Неправильное изображение"
  },
  unclear_question: {
    es: "Pregunta poco clara",
    ru: "Неясный вопрос"
  },
  other: {
    es: "Otro problema",
    ru: "Другая проблема"
  }
};

export function ReportProblemModal({ open, onOpenChange, questionId, questionText }: ReportProblemModalProps) {
  const [reportType, setReportType] = useState<ReportType>("other");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();
  const lang = language === "es" ? "es" : "ru";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast({
        title: language === "es" ? "Error" : "Ошибка",
        description: language === "es" 
          ? "Por favor, describe el problema" 
          : "Пожалуйста, опишите проблему",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Profile not found");
      }

      // Create report
      const { error: reportError } = await supabase
        .from("question_reports")
        .insert({
          user_id: profile.id,
          question_id: questionId,
          report_type: reportType,
          description: description.trim(),
          status: "pending"
        });

      if (reportError) {
        throw reportError;
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setDescription("");
        setReportType("other");
        onOpenChange(false);
        toast({
          title: language === "es" ? "¡Gracias!" : "Спасибо!",
          description: language === "es"
            ? "Tu reporte ha sido enviado. Lo revisaremos pronto."
            : "Ваш отчет отправлен. Мы рассмотрим его в ближайшее время.",
          duration: 3000
        });
      }, 1500);
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast({
        title: language === "es" ? "Error" : "Ошибка",
        description: error.message || (language === "es"
          ? "No se pudo enviar el reporte. Intenta de nuevo."
          : "Не удалось отправить отчет. Попробуйте еще раз."),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isSuccess) {
      setDescription("");
      setReportType("other");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-emerald-100 p-4 dark:bg-emerald-900/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <DialogTitle className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
              {language === "es" ? "¡Reporte enviado!" : "Отчет отправлен!"}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              {language === "es"
                ? "Gracias por tu feedback. Revisaremos el problema lo antes posible."
                : "Спасибо за обратную связь. Мы рассмотрим проблему как можно скорее."}
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900/20">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">
                    {language === "es" ? "Reportar problema" : "Сообщить о проблеме"}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {language === "es"
                      ? "Ayúdanos a mejorar. Describe el problema que encontraste."
                      : "Помогите нам улучшиться. Опишите проблему, которую вы нашли."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {questionText && (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {language === "es" ? "Pregunta:" : "Вопрос:"}
                </p>
                <p className="text-sm text-foreground line-clamp-2">{questionText}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="report-type">
                  {language === "es" ? "Tipo de problema" : "Тип проблемы"}
                </Label>
                <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                  <SelectTrigger id="report-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(reportTypeLabels).map(([key, labels]) => (
                      <SelectItem key={key} value={key}>
                        {labels[lang]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  {language === "es" ? "Descripción del problema" : "Описание проблемы"}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder={
                    language === "es"
                      ? "Describe detalladamente el problema que encontraste..."
                      : "Подробно опишите проблему, которую вы нашли..."
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="resize-none"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  {language === "es"
                    ? "Mínimo 10 caracteres"
                    : "Минимум 10 символов"}
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  {language === "es" ? "Cancelar" : "Отмена"}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || description.trim().length < 10}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {language === "es" ? "Enviando..." : "Отправка..."}
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      {language === "es" ? "Enviar reporte" : "Отправить отчет"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

