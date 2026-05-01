import { useState, useEffect, useMemo, useTransition, useDeferredValue, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoadSignCard } from "@/components/RoadSignCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { PageLoader } from "@/components/PageLoader";

interface RoadSign {
  id: string;
  name_es: string;
  name_ru: string;
  description_es: string;
  description_ru: string;
  sign_type: string;
  sign_number: string;
  image_url: string;
  mastery_level?: number;
  times_practiced?: number;
}

export default function RoadSigns() {
  const { profileId } = useUserContext();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const [signs, setSigns] = useState<RoadSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedType, setSelectedType] = useState("all");
  const [visibleCount, setVisibleCount] = useState(60);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ОПТИМИЗАЦИЯ: useTransition для неблокирующих обновлений UI
  const [isPending, startTransition] = useTransition();

  // ОПТИМИЗАЦИЯ: useDeferredValue для отложенных обновлений поиска
  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    const abortController = new AbortController();
    fetchSigns(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, []);

  // Debounce search term с useTransition
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        // Обновление происходит в transition для плавности
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, startTransition]);

  const fetchSigns = async (signal?: AbortSignal) => {
    try {
      // Получаем знаки
      const { data: signsData, error: signsError } = await supabase
        .from('road_signs')
        .select('*')
        .order('name_es')
        .abortSignal(signal);

      if (signsError) {
        if (signsError.name === 'AbortError') return; // Игнорируем отмененные запросы
        throw signsError;
      }

      // Если запрос был отменен, не обновляем состояние
      if (signal?.aborted) return;

      // Если пользователь авторизован, получаем его прогресс
      if (profileId) {
        const { data: progressData } = await supabase
          .from('user_sign_progress')
          .select('sign_id, mastery_level, times_practiced')
          .eq('user_id', profileId)
          .abortSignal(signal);

        if (signal?.aborted) return;

        // Объединяем данные
        const signsWithProgress = signsData?.map(sign => {
          const progress = progressData?.find(p => p.sign_id === sign.id);
          return {
            ...sign,
            mastery_level: progress?.mastery_level || 0,
            times_practiced: progress?.times_practiced || 0,
          };
        }) || [];

        setSigns(signsWithProgress);
      } else {
        setSigns(signsData || []);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === '20' || error?.message?.includes('AbortError')) return;
      if (import.meta.env.DEV) {
        console.error('Error fetching road signs:', error);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  // Improved filtering with word-based search and relevance scoring
  // ОПТИМИЗАЦИЯ: Используем deferredSearchTerm для плавной фильтрации
  const filteredSigns = useMemo(() => {
    if (!deferredSearchTerm.trim() && selectedType === "all") {
      return signs;
    }

    const searchWords = deferredSearchTerm
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);

    const filtered = signs
      .map(sign => {
        // Type filter
        const matchesType = selectedType === "all" || sign.sign_type === selectedType;
        if (!matchesType) return null;

        // If no search term, return sign with score 0
        if (searchWords.length === 0) {
          return { sign, score: 0 };
        }

        // Calculate relevance score
        let score = 0;
        const nameEs = (sign.name_es || "").toLowerCase();
        const nameRu = (sign.name_ru || "").toLowerCase();
        const signNumber = (sign.sign_number || "").toLowerCase();
        const descEs = (sign.description_es || "").toLowerCase();
        const descRu = (sign.description_ru || "").toLowerCase();

        // Check if all search words match
        const allWordsMatch = searchWords.every(word =>
          nameEs.includes(word) ||
          nameRu.includes(word) ||
          signNumber.includes(word) ||
          descEs.includes(word) ||
          descRu.includes(word)
        );

        if (!allWordsMatch) return null;

        // Calculate score based on match position and field
        searchWords.forEach(word => {
          // Exact match in name (highest priority)
          if (nameEs === word || nameRu === word) score += 100;
          // Starts with word in name
          else if (nameEs.startsWith(word) || nameRu.startsWith(word)) score += 50;
          // Contains word in name
          else if (nameEs.includes(word) || nameRu.includes(word)) score += 30;

          // Match in sign number
          if (signNumber.includes(word)) score += 20;

          // Match in description
          if (descEs.includes(word)) score += 10;
          if (descRu.includes(word)) score += 10;
        });

        return { sign, score };
      })
      .filter((item): item is { sign: RoadSign; score: number } => item !== null)
      .sort((a, b) => b.score - a.score) // Sort by relevance
      .map(item => item.sign);

    return filtered;
  }, [signs, deferredSearchTerm, selectedType]);

  const signTypes = [...new Set(signs.map(s => s.sign_type))];

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setVisibleCount(60);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setVisibleCount(60);
  };

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    handleSearchChange("");
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
        <div className="container mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-end justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Señales de Tráfico
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="text-primary font-medium">{filteredSigns.length}</span>
                {" "}{deferredSearchTerm || selectedType !== "all" ? "encontradas" : "señales"}
                {(deferredSearchTerm || selectedType !== "all") && (
                  <span className="text-muted-foreground/60"> de {signs.length}</span>
                )}
                {isPending && <span className="ml-1 opacity-50">·· </span>}
              </p>
            </div>

            {/* Search icon → expanding input */}
            <div className={`flex items-center gap-2 transition-all duration-300 ease-in-out ${searchOpen ? "flex-1 max-w-sm" : "flex-none"}`}>
              {searchOpen ? (
                <div className="relative w-full flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Nombre, número..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 pr-9 h-10 text-sm rounded-xl border-border/60 focus:border-primary/50 bg-card/60 backdrop-blur-sm"
                  />
                  <button
                    onClick={closeSearch}
                    className="absolute right-2 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={openSearch}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-card/60 border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-card backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95"
                  aria-label="Buscar"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <Tabs value={selectedType} onValueChange={(value) => {
              startTransition(() => { handleTypeChange(value); });
            }} className="w-full">
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                <TabsList className="h-auto p-1.5 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm inline-flex min-w-max gap-0.5">
                  <TabsTrigger
                    value="all"
                    className="rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 bg-transparent text-muted-foreground hover:text-foreground data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground data-[state=active]:!font-semibold whitespace-nowrap flex-shrink-0"
                  >
                    Todas
                  </TabsTrigger>
                  {signTypes.map(type => (
                    <TabsTrigger
                      key={type}
                      value={type}
                      className="capitalize rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 bg-transparent text-muted-foreground hover:text-foreground data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground data-[state=active]:!font-semibold whitespace-nowrap flex-shrink-0"
                    >
                      {type}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </Tabs>
          </div>

          {/* Signs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredSigns.slice(0, visibleCount).map((sign, index) => (
              <div
                key={sign.id}
                className="animate-fade-in"
                style={{ animationDelay: `${Math.min(index, 20) * 0.03}s`, willChange: 'opacity, transform' }}
              >
                <RoadSignCard sign={sign} />
              </div>
            ))}
          </div>

          {/* Load More */}
          {filteredSigns.length > visibleCount && (
            <div className="flex flex-col items-center gap-2 mt-10">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setVisibleCount(v => v + 60)}
                className="px-8"
              >
                Mostrar más ({filteredSigns.length - visibleCount} restantes)
              </Button>
            </div>
          )}

          {/* Empty State */}
          {filteredSigns.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No se encontraron señales</h3>
              <p className="text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}