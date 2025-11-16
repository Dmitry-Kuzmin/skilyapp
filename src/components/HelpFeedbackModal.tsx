import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserContext } from "@/contexts/UserContext";
import { Loader2, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

interface HelpFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  subsectionId?: string;
  helpful: boolean;
}

export function HelpFeedbackModal({
  open,
  onOpenChange,
  sectionId,
  subsectionId,
  helpful,
}: HelpFeedbackModalProps) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user, supabaseUser, profileId, isAuthenticated } = useUserContext();

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Get user_id from supabaseUser if available, otherwise null for anonymous feedback
      const userId = supabaseUser?.id || null;
      
      const { error } = await supabase.from("help_feedback").insert({
        user_id: userId,
        profile_id: profileId || null,
        section_id: sectionId,
        subsection_id: subsectionId || null,
        helpful,
        feedback_text: feedback.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Спасибо!",
        description: "Ваш отзыв отправлен",
      });

      setFeedback("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить отзыв",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {helpful ? "Спасибо за отзыв!" : "Расскажите, что можно улучшить"}
          </DialogTitle>
          <DialogDescription>
            {helpful
              ? "Ваш отзыв помогает нам улучшать документацию. Хотите добавить комментарий?"
              : "Ваше мнение очень важно для нас. Пожалуйста, опишите, что можно улучшить."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="feedback">Ваш отзыв (необязательно)</Label>
            <Textarea
              id="feedback"
              placeholder={
                helpful
                  ? "Что вам особенно понравилось или что было полезно?"
                  : "Опишите, что можно улучшить или что было непонятно..."
              }
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {feedback.length}/1000
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setFeedback("");
                onOpenChange(false);
              }}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                "Отправить"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

