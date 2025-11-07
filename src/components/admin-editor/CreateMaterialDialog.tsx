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
import { materialApi } from "@/utils/materialApi";
import { toast } from "sonner";
import { useUserContext } from "@/contexts/UserContext";

interface CreateMaterialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subtopicId: string;
  onSuccess: (materialId: string) => void;
}

export const CreateMaterialDialog = ({
  isOpen,
  onClose,
  subtopicId,
  onSuccess,
}: CreateMaterialDialogProps) => {
  const { profileId } = useUserContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title_ru: "",
    title_es: "",
    title_en: "",
    type: "theory" as "theory" | "test" | "terms",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title_ru || !formData.title_es || !formData.title_en) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    try {
      setLoading(true);
      const material = await materialApi.create({
        subtopic_id: subtopicId,
        ...formData,
        updated_by: profileId || null,
      });
      toast.success("Материал создан");
      onSuccess(material.id);
      onClose();
      // Reset form
      setFormData({
        title_ru: "",
        title_es: "",
        title_en: "",
        type: "theory",
      });
    } catch (error: any) {
      console.error("Error creating material:", error);
      toast.error(`Ошибка создания материала: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Создать новый материал</DialogTitle>
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
                <SelectItem value="theory">Теория</SelectItem>
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

