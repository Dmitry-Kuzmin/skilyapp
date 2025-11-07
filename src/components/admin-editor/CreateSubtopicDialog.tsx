import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { subtopicApi } from "@/utils/materialApi";
import { toast } from "sonner";

interface CreateSubtopicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  onSuccess: () => void;
}

export const CreateSubtopicDialog = ({
  isOpen,
  onClose,
  topicId,
  onSuccess,
}: CreateSubtopicDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title_ru: "",
    title_es: "",
    title_en: "",
    order_index: 1,
    type: "material" as "material" | "test" | "terms",
    is_required: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title_ru || !formData.title_es || !formData.title_en) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    try {
      setLoading(true);
      await subtopicApi.create({
        topic_id: topicId,
        ...formData,
      });
      toast.success("Подтема создана");
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        title_ru: "",
        title_es: "",
        title_en: "",
        order_index: 1,
        type: "material",
        is_required: true,
      });
    } catch (error: any) {
      console.error("Error creating subtopic:", error);
      toast.error(`Ошибка создания подтемы: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Создать новую подтему</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Тип</Label>
            <Select
              value={formData.type}
              onValueChange={(value: any) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="material">Материал</SelectItem>
                <SelectItem value="test">Тест</SelectItem>
                <SelectItem value="terms">Термины</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title_ru">Название (RU) *</Label>
            <Input
              id="title_ru"
              value={formData.title_ru}
              onChange={(e) =>
                setFormData({ ...formData, title_ru: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title_es">Название (ES) *</Label>
            <Input
              id="title_es"
              value={formData.title_es}
              onChange={(e) =>
                setFormData({ ...formData, title_es: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title_en">Название (EN) *</Label>
            <Input
              id="title_en"
              value={formData.title_en}
              onChange={(e) =>
                setFormData({ ...formData, title_en: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order_index">Порядок</Label>
            <Input
              id="order_index"
              type="number"
              value={formData.order_index}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  order_index: parseInt(e.target.value) || 1,
                })
              }
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                "Создать"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

