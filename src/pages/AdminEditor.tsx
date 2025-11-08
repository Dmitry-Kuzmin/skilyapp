import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Eye, History as HistoryIcon, Loader2, FileText, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { EditorSidebar } from "@/components/admin-editor/EditorSidebar";
import { TinyMCEEditor } from "@/components/admin-editor/TinyMCEEditor";
import { MaterialPreview } from "@/components/admin-editor/MaterialPreview";
import { VersionHistory } from "@/components/admin-editor/VersionHistory";
import { CreateTopicDialog } from "@/components/admin-editor/CreateTopicDialog";
import { CreateSubtopicDialog } from "@/components/admin-editor/CreateSubtopicDialog";
import { CreateMaterialDialog } from "@/components/admin-editor/CreateMaterialDialog";
import { materialApi } from "@/utils/materialApi";
import { useAutoSave } from "@/utils/editor";
import { revertToVersion } from "@/utils/materialVersioning";
import { generateHTMLPreview } from "@/utils/editor";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AdminEditor = () => {
  const navigate = useNavigate();
  const { toast: toastHook } = useToast();
  const { profileId } = useUserContext();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");

  // Material state
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [material, setMaterial] = useState<any>(null);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialType, setMaterialType] = useState<"theory" | "test" | "terms">("theory");
  const [isPublished, setIsPublished] = useState(false);

  // Editor state
  const [editorContent, setEditorContent] = useState<string>(""); // HTML content
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [filter, setFilter] = useState<"all" | "drafts" | "published">("all");
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [showCreateSubtopic, setShowCreateSubtopic] = useState(false);
  const [showCreateMaterial, setShowCreateMaterial] = useState(false);
  const [selectedTopicIdForSubtopic, setSelectedTopicIdForSubtopic] = useState<string | null>(null);
  const [selectedSubtopicIdForMaterial, setSelectedSubtopicIdForMaterial] = useState<string | null>(null);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const editorRef = useRef<any>(null);

  // Auto-save hook
  const { triggerSave, immediateSave } = useAutoSave(async () => {
    if (!selectedMaterialId || !editorContent || !profileId) return;
    await saveMaterial(false);
  }, 10000);

  // Handle content change (HTML string from TinyMCE)
  const handleContentChange = useCallback((content: string) => {
    setEditorContent(content);
    setSaveStatus("unsaved");
    // Trigger save after a delay
    setTimeout(() => {
      if (selectedMaterialId && content && profileId) {
        triggerSave();
      }
    }, 100);
  }, [selectedMaterialId, profileId, triggerSave]);



  useEffect(() => {
    if (selectedMaterialId) {
      loadMaterial(selectedMaterialId);
    } else {
      // Reset state when no material selected
      setMaterial(null);
      setMaterialTitle("");
      setEditorContent("");
      setSaveStatus("saved");
    }
  }, [selectedMaterialId]);

  const loadMaterial = async (materialId: string) => {
    try {
      setLoading(true);
      const materialData = await materialApi.getById(materialId);

      setMaterial(materialData);
      setMaterialTitle(materialData.title_ru || "");
      setMaterialType(materialData.type || "theory");
      setIsPublished(materialData.is_published || false);
      
      // Извлекаем HTML из content
      // content может быть объектом с полем html (новый формат) или старым JSON (TipTap)
      let htmlContent = "";
      if (materialData.content) {
        if (typeof materialData.content === 'string') {
          htmlContent = materialData.content;
        } else if (materialData.content.html) {
          htmlContent = materialData.content.html;
        } else if (materialData.html_preview) {
          // Если есть html_preview, используем его
          htmlContent = materialData.html_preview;
        } else {
          // Старый формат TipTap JSON - конвертируем в HTML
          htmlContent = generateHTMLPreview(materialData.content);
        }
      }
      
      setEditorContent(htmlContent);
      setSaveStatus("saved");
    } catch (error: any) {
      console.error("Error loading material:", error);
      toast.error("Ошибка загрузки материала");
    } finally {
      setLoading(false);
    }
  };

  const saveMaterial = async (showToast: boolean = true) => {
    if (!selectedMaterialId || !editorContent || !profileId) return;

    try {
      setSaving(true);
      setSaveStatus("saving");

      await materialApi.update(selectedMaterialId, {
        title_ru: materialTitle,
        content: editorContent,
        type: materialType,
        is_published: isPublished,
        updated_by: profileId,
      });

      setSaveStatus("saved");
      if (showToast) {
        toast.success("Материал сохранен");
      }
    } catch (error: any) {
      console.error("Error saving material:", error);
      setSaveStatus("unsaved");
      toast.error(`Ошибка сохранения: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Get editor instance from TinyMCE
  const handleEditorReady = useCallback((editor: any) => {
    editorRef.current = editor;
  }, []);

  const handleRevertVersion = async (version: any) => {
    if (!selectedMaterialId || !profileId) return;

    try {
      await revertToVersion(selectedMaterialId, version.id, profileId);
      await loadMaterial(selectedMaterialId);
      toast.success("Версия откачена");
    } catch (error: any) {
      console.error("Error reverting version:", error);
      toast.error("Ошибка отката версии");
    }
  };

  const handleAddTopic = () => {
    setShowCreateTopic(true);
  };

  const handleAddSubtopic = (topicId: string) => {
    setSelectedTopicIdForSubtopic(topicId);
    setShowCreateSubtopic(true);
  };

  const handleAddMaterial = (subtopicId: string) => {
    setSelectedSubtopicIdForMaterial(subtopicId);
    setShowCreateMaterial(true);
  };

  const handleTopicCreated = () => {
    setSidebarRefreshTrigger((prev) => prev + 1);
    toast.success("Тема создана успешно");
  };

  const handleSubtopicCreated = () => {
    setSidebarRefreshTrigger((prev) => prev + 1);
    toast.success("Подтема создана успешно");
  };

  const handleMaterialCreated = (materialId: string) => {
    setSelectedMaterialId(materialId);
    toast.success("Материал создан успешно");
  };

  return (
    <>
    <div className={cn("flex h-[calc(100vh-80px)] bg-background", isFullscreen && "fixed inset-0 z-50")}>
        {/* Sidebar */}
        <EditorSidebar
          onSelectMaterial={(materialId) => setSelectedMaterialId(materialId)}
          selectedMaterialId={selectedMaterialId || undefined}
          onAddTopic={handleAddTopic}
          onAddSubtopic={handleAddSubtopic}
          onAddMaterial={handleAddMaterial}
          filter={filter}
          onFilterChange={setFilter}
          refreshTrigger={sidebarRefreshTrigger}
        />

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedMaterialId ? (
            <>
              {/* Header */}
              <div className="border-b border-border bg-card/95 backdrop-blur-sm p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={materialTitle}
                      onChange={(e) => setMaterialTitle(e.target.value)}
                      placeholder="Название материала..."
                      className="text-lg font-semibold border-none focus-visible:ring-0 p-0 h-auto"
                    />
                    <div className="flex items-center gap-4">
                      <Select value={materialType} onValueChange={(value: any) => setMaterialType(value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="theory">Теория</SelectItem>
                          <SelectItem value="test">Тест</SelectItem>
                          <SelectItem value="terms">Термины</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="published"
                          checked={isPublished}
                          onCheckedChange={setIsPublished}
                        />
                        <Label htmlFor="published" className="text-sm">
                          Опубликовано
                        </Label>
                      </div>
                      {!isPublished && (
                        <Badge variant="outline" className="text-xs">
                          Черновик
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Save Status */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {saveStatus === "saved" && (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Сохранено</span>
                        </>
                      )}
                      {saveStatus === "saving" && (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span>Сохранение...</span>
                        </>
                      )}
                      {saveStatus === "unsaved" && (
                        <>
                          <Circle className="h-4 w-4 text-warning" />
                          <span>Не сохранено</span>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowVersionHistory(true)}
                    >
                      <HistoryIcon className="h-4 w-4 mr-2" />
                      Версии
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(true)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Предпросмотр
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveMaterial(true)}
                      disabled={saving || saveStatus === "saved"}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Сохранение...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Сохранить
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Editor */}
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden bg-background p-4">
                  <TinyMCEEditor
                    content={editorContent}
                    onChange={handleContentChange}
                    placeholder="Начните вводить текст..."
                    materialId={selectedMaterialId || undefined}
                    editable={true}
                    height={isFullscreen ? window.innerHeight - 200 : 600}
                    onEditorReady={handleEditorReady}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto" />
                <h3 className="text-xl font-semibold">Выберите материал для редактирования</h3>
                <p className="text-muted-foreground">
                  Выберите материал из списка слева или создайте новый
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

    {/* Modals */}
    {selectedMaterialId && (
      <>
        <MaterialPreview
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          content={editorContent}
          title={materialTitle || "Предпросмотр"}
        />
        <VersionHistory
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          materialId={selectedMaterialId}
          onRevert={handleRevertVersion}
        />
      </>
    )}

    {/* Create Dialogs */}
    <CreateTopicDialog
      isOpen={showCreateTopic}
      onClose={() => setShowCreateTopic(false)}
      onSuccess={handleTopicCreated}
    />
    {selectedTopicIdForSubtopic && (
      <CreateSubtopicDialog
        isOpen={showCreateSubtopic}
        onClose={() => {
          setShowCreateSubtopic(false);
          setSelectedTopicIdForSubtopic(null);
        }}
        topicId={selectedTopicIdForSubtopic}
        onSuccess={handleSubtopicCreated}
      />
    )}
    {selectedSubtopicIdForMaterial && (
      <CreateMaterialDialog
        isOpen={showCreateMaterial}
        onClose={() => {
          setShowCreateMaterial(false);
          setSelectedSubtopicIdForMaterial(null);
        }}
        subtopicId={selectedSubtopicIdForMaterial}
        onSuccess={handleMaterialCreated}
      />
    )}
    </>
  );
};

export default AdminEditor;

