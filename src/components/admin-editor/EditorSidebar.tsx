import { useState, useEffect } from "react";
import { Search, Plus, ChevronRight, ChevronDown, FileText, BookOpen, Languages } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface Topic {
  id: string;
  number: number;
  order_index: number;
  title_ru: string;
  subtopics?: Subtopic[];
}

export interface Subtopic {
  id: string;
  topic_id: string;
  title_ru: string;
  order_index: number;
  type: "material" | "test" | "terms";
  materials?: Material[];
}

export interface Material {
  id: string;
  subtopic_id: string;
  title_ru: string;
  is_published: boolean;
}

interface EditorSidebarProps {
  onSelectTopic?: (topicId: string) => void;
  onSelectSubtopic?: (subtopicId: string) => void;
  onSelectMaterial?: (materialId: string) => void;
  selectedTopicId?: string;
  selectedSubtopicId?: string;
  selectedMaterialId?: string;
  onAddTopic?: () => void;
  onAddSubtopic?: (topicId: string) => void;
  onAddMaterial?: (subtopicId: string) => void;
  filter?: "all" | "drafts" | "published";
  onFilterChange?: (filter: "all" | "drafts" | "published") => void;
  refreshTrigger?: number; // Add refresh trigger
}

export const EditorSidebar = ({
  onSelectTopic,
  onSelectSubtopic,
  onSelectMaterial,
  selectedTopicId,
  selectedSubtopicId,
  selectedMaterialId,
  onAddTopic,
  onAddSubtopic,
  onAddMaterial,
  filter = "all",
  onFilterChange,
  refreshTrigger = 0,
}: EditorSidebarProps) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedSubtopics, setExpandedSubtopics] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopics();
  }, [filter, refreshTrigger]);

  const loadTopics = async () => {
    try {
      setLoading(true);

      // Load topics
      const { data: topicsData, error: topicsError } = await supabase
        .from("topics")
        .select("*")
        .order("order_index", { ascending: true });

      if (topicsError) throw topicsError;

      // Load subtopics for each topic
      const topicsWithSubtopics = await Promise.all(
        (topicsData || []).map(async (topic) => {
          const { data: subtopicsData } = await supabase
            .from("subtopics")
            .select("*")
            .eq("topic_id", topic.id)
            .order("order_index", { ascending: true });

          // Load materials for each subtopic
          const subtopicsWithMaterials = await Promise.all(
            (subtopicsData || []).map(async (subtopic) => {
              let materialsQuery = supabase
                .from("materials")
                .select("*")
                .eq("subtopic_id", subtopic.id)
                .order("created_at", { ascending: false });

              // Apply filter
              if (filter === "drafts") {
                materialsQuery = materialsQuery.eq("is_published", false);
              } else if (filter === "published") {
                materialsQuery = materialsQuery.eq("is_published", true);
              }

              const { data: materialsData } = await materialsQuery;

              return {
                ...subtopic,
                materials: materialsData || [],
              };
            })
          );

          return {
            ...topic,
            subtopics: subtopicsWithMaterials,
          };
        })
      );

      setTopics(topicsWithSubtopics);

      // Auto-expand selected topic/subtopic
      if (selectedTopicId) {
        setExpandedTopics(new Set([selectedTopicId]));
        if (selectedSubtopicId) {
          setExpandedSubtopics(new Set([selectedSubtopicId]));
        }
      }
    } catch (error) {
      console.error("Error loading topics:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const toggleSubtopic = (subtopicId: string) => {
    const newExpanded = new Set(expandedSubtopics);
    if (newExpanded.has(subtopicId)) {
      newExpanded.delete(subtopicId);
    } else {
      newExpanded.add(subtopicId);
    }
    setExpandedSubtopics(newExpanded);
  };

  const getSubtopicIcon = (type: Subtopic["type"]) => {
    switch (type) {
      case "material":
        return BookOpen;
      case "test":
        return FileText;
      case "terms":
        return Languages;
      default:
        return FileText;
    }
  };

  const filteredTopics = topics.filter((topic) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      topic.title_ru.toLowerCase().includes(query) ||
      topic.subtopics?.some(
        (subtopic) =>
          subtopic.title_ru.toLowerCase().includes(query) ||
          subtopic.materials?.some((material) =>
            material.title_ru.toLowerCase().includes(query)
          )
      )
    );
  });

  if (loading) {
    return (
      <div className="w-80 border-r border-border bg-card p-4">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="w-80 border-r border-border bg-card/95 backdrop-blur-sm flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Редактор</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddTopic}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => onFilterChange?.("all")}
            className="flex-1 text-xs"
          >
            Все
          </Button>
          <Button
            variant={filter === "drafts" ? "default" : "ghost"}
            size="sm"
            onClick={() => onFilterChange?.("drafts")}
            className="flex-1 text-xs"
          >
            Черновики
          </Button>
          <Button
            variant={filter === "published" ? "default" : "ghost"}
            size="sm"
            onClick={() => onFilterChange?.("published")}
            className="flex-1 text-xs"
          >
            Опубликовано
          </Button>
        </div>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredTopics.map((topic) => {
            const isExpanded = expandedTopics.has(topic.id);
            const isSelected = selectedTopicId === topic.id;

            return (
              <div key={topic.id} className="space-y-1">
                {/* Topic */}
                <div
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                    isSelected && "bg-primary/10 text-primary"
                  )}
                  onClick={() => {
                    toggleTopic(topic.id);
                    onSelectTopic?.(topic.id);
                  }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTopic(topic.id);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <span className="text-sm font-semibold flex-1">{topic.title_ru}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddSubtopic?.(topic.id);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {/* Subtopics */}
                {isExpanded && topic.subtopics && (
                  <div className="ml-6 space-y-1">
                    {topic.subtopics.map((subtopic) => {
                      const isSubtopicExpanded = expandedSubtopics.has(subtopic.id);
                      const isSubtopicSelected = selectedSubtopicId === subtopic.id;
                      const SubtopicIcon = getSubtopicIcon(subtopic.type);

                      return (
                        <div key={subtopic.id} className="space-y-1">
                          {/* Subtopic */}
                          <div
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                              isSubtopicSelected && "bg-primary/10 text-primary"
                            )}
                            onClick={() => {
                              toggleSubtopic(subtopic.id);
                              onSelectSubtopic?.(subtopic.id);
                            }}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSubtopic(subtopic.id);
                              }}
                            >
                              {isSubtopicExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            <SubtopicIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm flex-1">{subtopic.title_ru}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddMaterial?.(subtopic.id);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Materials */}
                          {isSubtopicExpanded && subtopic.materials && (
                            <div className="ml-6 space-y-1">
                              {subtopic.materials.map((material) => {
                                const isMaterialSelected = selectedMaterialId === material.id;

                                return (
                                  <div
                                    key={material.id}
                                    className={cn(
                                      "flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                                      isMaterialSelected && "bg-primary/10 text-primary"
                                    )}
                                    onClick={() => onSelectMaterial?.(material.id)}
                                  >
                                    <FileText className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs flex-1 truncate">
                                      {material.title_ru}
                                    </span>
                                    {!material.is_published && (
                                      <span className="text-xs text-muted-foreground">(черновик)</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

