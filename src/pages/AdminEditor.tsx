import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Mention } from "@tiptap/extension-mention";
import CharacterCount from "@tiptap/extension-character-count";
import { Save, Eye, History as HistoryIcon, Loader2, FileText, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { EditorSidebar } from "@/components/admin-editor/EditorSidebar";
import { TipTapEditor } from "@/components/admin-editor/TipTapEditor";
import { EditorToolbar } from "@/components/admin-editor/EditorToolbar";
import { ImageUpload } from "@/components/admin-editor/ImageUpload";
import { TermMention } from "@/components/admin-editor/TermMention";
import { MaterialPreview } from "@/components/admin-editor/MaterialPreview";
import { VersionHistory } from "@/components/admin-editor/VersionHistory";
import { CreateTopicDialog } from "@/components/admin-editor/CreateTopicDialog";
import { CreateSubtopicDialog } from "@/components/admin-editor/CreateSubtopicDialog";
import { CreateMaterialDialog } from "@/components/admin-editor/CreateMaterialDialog";
import { materialApi, uploadImage, searchTerms } from "@/utils/materialApi";
import { useAutoSave } from "@/utils/editor";
import { revertToVersion } from "@/utils/materialVersioning";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AdminEditor = () => {
  const navigate = useNavigate();
  const { toast: toastHook } = useToast();
  const { profileId } = useUserContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
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
  const [editorContent, setEditorContent] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showTermMention, setShowTermMention] = useState(false);
  const [filter, setFilter] = useState<"all" | "drafts" | "published">("all");
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [showCreateSubtopic, setShowCreateSubtopic] = useState(false);
  const [showCreateMaterial, setShowCreateMaterial] = useState(false);
  const [selectedTopicIdForSubtopic, setSelectedTopicIdForSubtopic] = useState<string | null>(null);
  const [selectedSubtopicIdForMaterial, setSelectedSubtopicIdForMaterial] = useState<string | null>(null);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);

  // Auto-save hook
  const { triggerSave, immediateSave } = useAutoSave(async () => {
    if (!selectedMaterialId || !editorContent || !profileId) return;
    await saveMaterial(false);
  }, 10000);

  // Handle content change
  const handleContentChange = useCallback((content: any) => {
    setEditorContent(content);
    setSaveStatus("unsaved");
    // Trigger save after a delay
    setTimeout(() => {
      if (selectedMaterialId && content && profileId) {
        triggerSave();
      }
    }, 100);
  }, [selectedMaterialId, profileId, triggerSave]);

  // Editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Оставляем history включенным в StarterKit, не добавляем отдельно
        link: false, // Отключаем link из StarterKit, используем отдельно
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Начните вводить текст...",
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention bg-primary/10 text-primary px-1 rounded",
        },
      }),
      CharacterCount,
    ],
    content: editorContent || null,
    editable: true,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      handleContentChange(json);
    },
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (selectedMaterialId) {
      loadMaterial(selectedMaterialId);
    } else {
      // Reset state when no material selected
      setMaterial(null);
      setMaterialTitle("");
      setEditorContent(null);
      setSaveStatus("saved");
      if (editor) {
        editor.commands.setContent(null);
      }
    }
  }, [selectedMaterialId, editor]);

  // Handle editor content changes when material loads
  useEffect(() => {
    if (editor && material && material.content) {
      const currentContent = editor.getJSON();
      const materialContent = material.content;
      if (JSON.stringify(currentContent) !== JSON.stringify(materialContent)) {
        editor.commands.setContent(materialContent);
        setEditorContent(materialContent);
      }
    }
  }, [material, editor]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Auth error:", userError);
        toastHook({
          title: "Access denied",
          description: "Please log in.",
          variant: "destructive",
        });
        navigate("/");
        setAuthLoading(false);
        return;
      }

      const { data: isAdminData, error: adminError } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      // Also check for editor role
      const { data: isEditorData, error: editorError } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "editor",
      });

      console.log("Admin check:", { isAdminData, adminError, isEditorData, editorError });

      if ((adminError || !isAdminData) && (!isEditorData || editorError)) {
        toastHook({
          title: "Access denied",
          description: "Admin or editor privileges required.",
          variant: "destructive",
        });
        navigate("/");
        setAuthLoading(false);
        return;
      }

      setIsAdmin(true);
      setAuthLoading(false);
    } catch (error) {
      console.error("Error checking admin access:", error);
      toastHook({
        title: "Error",
        description: "Failed to check access. Please try again.",
        variant: "destructive",
      });
      setAuthLoading(false);
    }
  };

  const loadMaterial = async (materialId: string) => {
    try {
      setLoading(true);
      const materialData = await materialApi.getById(materialId);

      setMaterial(materialData);
      setMaterialTitle(materialData.title_ru || "");
      setMaterialType(materialData.type || "theory");
      setIsPublished(materialData.is_published || false);
      setEditorContent(materialData.content || null);
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

  const handleImageUpload = async (imageUrl: string) => {
    if (!editor) return;

    editor.chain().focus().setImage({ src: imageUrl }).run();
  };

  const handleTermSelect = (term: any) => {
    if (!editor) return;

    // Insert term mention
    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: "text",
          marks: [
            {
              type: "mention",
              attrs: {
                id: term.id,
                label: term.term_es,
              },
            },
          ],
          text: `@${term.term_es}`,
        },
        {
          type: "text",
          text: " ",
        },
      ])
      .run();
  };

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

  if (authLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <p className="text-muted-foreground">Проверка доступа...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Доступ запрещен. Требуются права администратора или редактора.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
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
                <div className="flex-1 flex flex-col overflow-hidden bg-background">
                    <EditorToolbar
                    editor={editor}
                    onImageUpload={() => {
                      // Trigger image upload dialog
                      const imageUploadButton = document.querySelector('[data-image-upload]') as HTMLElement;
                      imageUploadButton?.click();
                    }}
                    onLinkInsert={() => {
                      const url = window.prompt("Введите URL ссылки:");
                      if (url && editor) {
                        editor.chain().focus().setLink({ href: url }).run();
                      }
                    }}
                    onTermInsert={() => setShowTermMention(true)}
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                  />
                  {/* Hidden Image Upload Button */}
                  {selectedMaterialId && (
                    <div className="hidden">
                      <ImageUpload
                        materialId={selectedMaterialId}
                        onUploadComplete={handleImageUpload}
                      />
                    </div>
                  )}
                  <div className="flex-1 overflow-auto">
                    {editor && (
                      <div className="h-full">
                        <div className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-strong:font-bold prose-em:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground prose-blockquote:text-foreground prose-blockquote:border-l-primary prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-pre:text-foreground prose-pre:bg-muted prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-md min-h-[500px] p-6">
                          <EditorContent editor={editor} />
                        </div>
                        <div className="mt-4 text-xs text-muted-foreground text-right px-6 pb-4">
                          {editor.storage.characterCount.characters()} символов
                        </div>
                      </div>
                    )}
                  </div>
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
          <div className="hidden">
            <ImageUpload
              materialId={selectedMaterialId}
              onUploadComplete={handleImageUpload}
            />
          </div>
          <TermMention
            isOpen={showTermMention}
            onClose={() => setShowTermMention(false)}
            onSelect={handleTermSelect}
          />
          <MaterialPreview
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            content={editorContent}
            title={materialTitle}
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
    </Layout>
  );
};

export default AdminEditor;

