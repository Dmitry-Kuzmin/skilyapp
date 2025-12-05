import { useState, useEffect } from "react";
import { Clock, RotateCcw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// ОПТИМИЗАЦИЯ: Импортируем только нужную функцию из date-fns
import { format } from "date-fns";
// ОПТИМИЗАЦИЯ: Импортируем только русскую локаль (tree-shaking работает)
import { ru } from "date-fns/locale/ru";

interface MaterialVersion {
  id: string;
  material_id: string;
  content: any;
  html_preview: string;
  version: number;
  updated_by: string | null;
  created_at: string;
  editor_name?: string;
}

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
  onRevert?: (version: MaterialVersion) => void;
}

export const VersionHistory = ({
  isOpen,
  onClose,
  materialId,
  onRevert,
}: VersionHistoryProps) => {
  const [versions, setVersions] = useState<MaterialVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<MaterialVersion | null>(null);

  useEffect(() => {
    if (isOpen && materialId) {
      loadVersions();
    }
  }, [isOpen, materialId]);

  const loadVersions = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("material_versions")
        .select("*")
        .eq("material_id", materialId)
        .order("version", { ascending: false })
        .limit(3);

      if (error) throw error;

      // Load editor names
      const versionsWithNames = await Promise.all(
        (data || []).map(async (version) => {
          if (version.updated_by) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("user_id", version.updated_by)
              .single();

            return {
              ...version,
              editor_name: profile
                ? `${profile.first_name} ${profile.last_name || ""}`.trim()
                : "Неизвестный",
            };
          }
          return { ...version, editor_name: "Неизвестный" };
        })
      );

      setVersions(versionsWithNames);
    } catch (error: any) {
      console.error("Error loading versions:", error);
      toast.error("Ошибка загрузки версий");
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (version: MaterialVersion) => {
    if (!onRevert) return;

    try {
      await onRevert(version);
      toast.success(`Откат на версию ${version.version} выполнен`);
      onClose();
    } catch (error: any) {
      console.error("Error reverting version:", error);
      toast.error("Ошибка отката версии");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>История версий</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Загрузка...
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Версии не найдены
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={cn(
                      "p-4 rounded-lg border border-border hover:border-primary transition-colors",
                      selectedVersion?.id === version.id && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Версия {version.version}</Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(version.created_at), "dd MMM yyyy, HH:mm", {
                              locale: ru,
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {version.editor_name || "Неизвестный"}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedVersion(version)}
                        >
                          Просмотр
                        </Button>
                        {onRevert && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevert(version)}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Откатить
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

