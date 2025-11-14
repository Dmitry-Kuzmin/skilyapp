import { useState, useEffect, useRef, useCallback } from "react";
import { AlertTriangle, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserContext } from "@/contexts/UserContext";
import { isTelegramMiniApp } from "@/lib/telegram";

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
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const [contentScrollTop, setContentScrollTop] = useState(0);
  const isClosingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const { toast } = useToast();
  const { language } = useLanguage();
  const { profileId } = useUserContext();
  const lang = language === "es" ? "es" : "ru";
  const isTelegramApp = isTelegramMiniApp();

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
      console.log('[ReportProblemModal] Submitting report:', {
        profileId,
        questionId,
        reportType,
        description: description.trim().substring(0, 50),
        isTelegramApp
      });

      // Используем profileId из UserContext (работает и для Telegram, и для веба)
      if (!profileId) {
        console.error('[ReportProblemModal] No profileId available');
        throw new Error(language === "es" 
          ? "Debes iniciar sesión para enviar un reporte" 
          : "Необходима авторизация для отправки отчета");
      }

      // Create report
      const { data: reportData, error: reportError } = await supabase
        .from("question_reports")
        .insert({
          user_id: profileId,
          question_id: questionId,
          report_type: reportType,
          description: description.trim(),
          status: "pending"
        })
        .select();

      console.log('[ReportProblemModal] Report insert result:', { reportData, reportError });

      if (reportError) {
        console.error('[ReportProblemModal] Report error details:', {
          message: reportError.message,
          code: reportError.code,
          details: reportError.details,
          hint: reportError.hint
        });
        throw reportError;
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setDescription("");
        setReportType("other");
        handleCloseModal();
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

  const handleCloseModal = useCallback(() => {
    if (isClosingRef.current || isSubmitting || isSuccess) return;
    
    isClosingRef.current = true;
    setIsClosing(true);
    setIsDragging(false);
    setDragStartY(0);
    setDragCurrentY(0);
    
    setTimeout(() => {
      setDescription("");
      setReportType("other");
      setIsClosing(false);
      isClosingRef.current = false;
      onOpenChange(false);
    }, 300);
  }, [isSubmitting, isSuccess, onOpenChange]);

  // Reset drag state when modal closes and prevent body scroll
  useEffect(() => {
    if (open) {
      // Блокируем скролл фона при открытом модальном окне
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      // Сбрасываем позицию скролла контента
      setContentScrollTop(0);
      isClosingRef.current = false;
    } else {
      // Разблокируем скролл при закрытии
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      setIsDragging(false);
      setIsClosing(false);
      setDragStartY(0);
      setDragCurrentY(0);
      setContentScrollTop(0);
      isClosingRef.current = false;
      
      // Отменяем анимацию если она была активна
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
    
    return () => {
      // Очистка при размонтировании
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [open]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting && !isSuccess && !isClosingRef.current) {
        handleCloseModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, isSubmitting, isSuccess, handleCloseModal]);

  const handleClose = () => {
    handleCloseModal();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isDragging && !isClosing && !isClosingRef.current && !isSubmitting && !isSuccess) {
            handleCloseModal();
          }
        }}
      />
      
      {/* Bottom Sheet */}
      <div 
        className={`fixed left-0 right-0 z-[100] bg-card border-t border-border rounded-t-2xl sm:rounded-t-3xl shadow-2xl ${
          !isDragging && !isClosing ? 'transition-transform duration-300 ease-out' : isClosing ? 'transition-transform duration-300 ease-in' : ''
        } ${
          !isClosing && !isDragging ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          bottom: '0px',
          height: '80vh',
          maxHeight: '80vh',
          transform: isDragging && dragCurrentY > dragStartY 
            ? `translateY(${dragCurrentY - dragStartY}px)` 
            : undefined
        }}
        onTouchStart={(e) => {
          if (isClosingRef.current || isClosing || isSubmitting || isSuccess) return;
          const touch = e.touches[0];
          if (touch) {
            // Начинаем драг только если свайп начинается с верхней части модального окна (drag handle или header)
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const touchY = touch.clientY;
            const touchX = touch.clientX;
            const relativeY = touchY - rect.top;
            
            // Проверяем, что касание в верхней части (drag handle + header, примерно 120px)
            // И что контент не прокручен (можно свайпать только когда контент вверху)
            if (relativeY < 120 && touchX > rect.left && touchX < rect.right && contentScrollTop === 0) {
              e.stopPropagation();
              setIsDragging(true);
              setDragStartY(touch.clientY);
              setDragCurrentY(touch.clientY);
            }
          }
        }}
        onTouchMove={(e) => {
          if (isDragging && !isClosingRef.current && !isClosing && !isSubmitting && !isSuccess) {
            e.preventDefault();
            e.stopPropagation();
            
            const touch = e.touches[0];
            if (touch) {
              const deltaY = touch.clientY - dragStartY;
              // Разрешаем свайп только вниз
              if (deltaY > 0) {
                // Используем requestAnimationFrame для плавности
                if (animationFrameRef.current !== null) {
                  cancelAnimationFrame(animationFrameRef.current);
                }
                
                animationFrameRef.current = requestAnimationFrame(() => {
                  setDragCurrentY(touch.clientY);
                });
              }
            }
          }
        }}
        onTouchEnd={(e) => {
          if (isDragging && !isClosingRef.current) {
            e.preventDefault();
            e.stopPropagation();
            
            // Отменяем анимацию
            if (animationFrameRef.current !== null) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
            
            const dragDistance = dragCurrentY - dragStartY;
            // Порог для закрытия: 80px или 20% высоты экрана
            const threshold = Math.max(80, window.innerHeight * 0.2);
            
            if (dragDistance > threshold) {
              handleCloseModal();
            } else {
              // Возвращаем на место с анимацией
              setIsDragging(false);
              setDragStartY(0);
              setDragCurrentY(0);
            }
          }
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="px-4 sm:px-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900/20">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold">
                  {language === "es" ? "Reportar problema" : "Сообщить о проблеме"}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {language === "es"
                    ? "Ayúdanos a mejorar. Describe el problema que encontraste."
                    : "Помогите нам улучшиться. Опишите проблему, которую вы нашли."}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!isClosingRef.current && !isSubmitting && !isSuccess) {
                  handleCloseModal();
                }
              }}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label={language === "es" ? "Cerrar" : "Закрыть"}
              disabled={isSubmitting || isClosingRef.current}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div 
          className="overflow-y-auto px-4 sm:px-6 py-4" 
          style={{ maxHeight: 'calc(80vh - 120px)' }}
          onScroll={(e) => {
            // Отслеживаем позицию скролла контента
            setContentScrollTop(e.currentTarget.scrollTop);
          }}
          onTouchStart={(e) => {
            // Предотвращаем начало свайпа при скролле контента
            if (isDragging) {
              e.stopPropagation();
            }
          }}
        >
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 rounded-full bg-emerald-100 p-4 dark:bg-emerald-900/20">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                {language === "es" ? "¡Reporte enviado!" : "Отчет отправлен!"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === "es"
                  ? "Gracias por tu feedback. Revisaremos el problema lo antes posible."
                  : "Спасибо за обратную связь. Мы рассмотрим проблему как можно скорее."}
              </p>
            </div>
          ) : (
            <>
              {questionText && (
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3 mb-4">
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

                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2 pb-4">
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
        </div>
      </div>
    </>
  );
}

