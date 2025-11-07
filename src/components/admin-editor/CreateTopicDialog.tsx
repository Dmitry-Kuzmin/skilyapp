import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { topicApi } from "@/utils/materialApi";
import { toast } from "sonner";

interface CreateTopicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateTopicDialog = ({
  isOpen,
  onClose,
  onSuccess,
}: CreateTopicDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    number: 1,
    title_ru: "",
    title_es: "",
    title_en: "",
    description_ru: "",
    description_es: "",
    description_en: "",
    order_index: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title_ru || !formData.title_es || !formData.title_en) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    try {
      setLoading(true);
      await topicApi.create(formData);
      toast.success("Тема создана");
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        number: 1,
        title_ru: "",
        title_es: "",
        title_en: "",
        description_ru: "",
        description_es: "",
        description_en: "",
        order_index: 1,
      });
    } catch (error: any) {
      console.error("Error creating topic:", error);
      toast.error(`Ошибка создания темы: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Создать новую тему</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="number">Номер темы</Label>
            <Input
              id="number"
              type="number"
              value={formData.number}
              onChange={(e) =>
                setFormData({ ...formData, number: parseInt(e.target.value) || 1, order_index: parseInt(e.target.value) || 1 })
              }
              required
            />
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
            <Label htmlFor="description_ru">Описание (RU)</Label>
            <Input
              id="description_ru"
              value={formData.description_ru}
              onChange={(e) =>
                setFormData({ ...formData, description_ru: e.target.value })
              }
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

