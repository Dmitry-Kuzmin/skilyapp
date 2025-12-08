// @ts-nocheck
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  onStudentAdded: () => void;
}

export function AddStudentDialog({ open, onOpenChange, partnerId, onStudentAdded }: AddStudentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    studentGroup: "",
    enrollmentDate: new Date().toISOString().split('T')[0],
    expectedExamDate: "",
    notes: "",
  });

  const handleAddStudent = async () => {
    if (!formData.email.trim()) {
      toast.error("Введите email студента");
      return;
    }

    try {
      setLoading(true);

      // Найти пользователя по email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', formData.email.trim().toLowerCase())
        .single();

      if (profileError || !profileData) {
        toast.error("Пользователь с таким email не найден", {
          description: "Студент должен сначала зарегистрироваться в приложении",
        });
        return;
      }

      // Добавить студента через RPC функцию
      const { data, error } = await supabase.rpc('add_student_to_autoschool', {
        p_partner_id: partnerId,
        p_user_id: profileData.id,
        p_student_group: formData.studentGroup.trim() || null,
        p_enrollment_date: formData.enrollmentDate || null,
        p_notes: formData.notes.trim() || null,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success("Студент добавлен!", {
          description: `${profileData.full_name || profileData.email} добавлен в вашу автошколу`,
        });

        // Очистить форму
        setFormData({
          email: "",
          studentGroup: "",
          enrollmentDate: new Date().toISOString().split('T')[0],
          expectedExamDate: "",
          notes: "",
        });

        onOpenChange(false);
        onStudentAdded();
      }
    } catch (error: any) {
      console.error('[AddStudentDialog] Error:', error);
      toast.error("Ошибка добавления студента", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Добавить студента
          </DialogTitle>
          <DialogDescription>
            Студент должен быть уже зарегистрирован в приложении
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email студента */}
          <div className="space-y-2">
            <Label htmlFor="email">Email студента *</Label>
            <Input
              id="email"
              type="email"
              placeholder="student@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-slate-800/50 border-slate-700"
            />
            <p className="text-xs text-slate-500">
              Студент должен быть зарегистрирован в Skily
            </p>
          </div>

          {/* Группа */}
          <div className="space-y-2">
            <Label htmlFor="group">Группа обучения</Label>
            <Input
              id="group"
              placeholder="Группа А, Вечерняя, и т.д."
              value={formData.studentGroup}
              onChange={(e) => setFormData({ ...formData, studentGroup: e.target.value })}
              className="bg-slate-800/50 border-slate-700"
            />
          </div>

          {/* Дата зачисления */}
          <div className="space-y-2">
            <Label htmlFor="enrollment">Дата зачисления</Label>
            <Input
              id="enrollment"
              type="date"
              value={formData.enrollmentDate}
              onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
              className="bg-slate-800/50 border-slate-700"
            />
          </div>

          {/* Планируемая дата экзамена */}
          <div className="space-y-2">
            <Label htmlFor="exam">Планируемая дата экзамена (опционально)</Label>
            <Input
              id="exam"
              type="date"
              value={formData.expectedExamDate}
              onChange={(e) => setFormData({ ...formData, expectedExamDate: e.target.value })}
              className="bg-slate-800/50 border-slate-700"
            />
          </div>

          {/* Заметки */}
          <div className="space-y-2">
            <Label htmlFor="notes">Заметки (опционально)</Label>
            <Textarea
              id="notes"
              placeholder="Дополнительная информация о студенте..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-slate-800/50 border-slate-700"
              rows={3}
            />
          </div>

          {/* Инфо */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-blue-300">
              💡 После добавления вы сможете отслеживать прогресс студента и его готовность к экзамену DGT
            </p>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-slate-700"
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleAddStudent}
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Добавление...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Добавить студента
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
















