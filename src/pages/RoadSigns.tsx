import { useState, useEffect, useMemo, useTransition, useDeferredValue } from "react";
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
      if (error?.name === 'AbortError') return; // Игнорируем отмененные запросы
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

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
        <div className="container mx-auto px-4 py-12">
          {/* Premium Header */}
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary shadow-primary mb-4 animate-pulse-slow">
              <Search className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              Señales de Tráfico
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Aprende todas las señales de tráfico en España con explicaciones en español y ruso
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {filteredSigns.length} {deferredSearchTerm || selectedType !== "all" ? "señales encontradas" : "señales disponibles"}
                {isPending && <span className="ml-2 text-xs opacity-70">(buscando...)</span>}
              </span>
              {(deferredSearchTerm || selectedType !== "all") && (
                <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                  de {signs.length} total
                </span>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-6 max-w-4xl mx-auto">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar por nombre, número o descripción..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-12 pr-12 h-14 text-lg border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-lg hover:bg-muted"
                  onClick={() => handleSearchChange("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <Tabs value={selectedType} onValueChange={(value) => {
              startTransition(() => { handleTypeChange(value); });
            }} className="w-full">
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                <TabsList className="w-full md:w-auto h-auto p-2 bg-card/50 backdrop-blur-sm border-2 border-border/50 rounded-xl shadow-sm inline-flex min-w-max md:min-w-0">
                  <TabsTrigger
                    value="all"
                    className="rounded-lg px-4 py-2 md:px-6 md:py-3 text-sm md:text-base font-medium transition-all duration-300 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 data-[state=active]:!bg-gradient-primary data-[state=active]:!text-foreground data-[state=active]:!shadow-primary data-[state=active]:!font-bold whitespace-nowrap flex-shrink-0"
                  >
                    Todas
                  </TabsTrigger>
                  {signTypes.map(type => (
                    <TabsTrigger
                      key={type}
                      value={type}
                      className="capitalize rounded-lg px-4 py-2 md:px-6 md:py-3 text-sm md:text-base font-medium transition-all duration-300 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 data-[state=active]:!bg-gradient-primary data-[state=active]:!text-foreground data-[state=active]:!shadow-primary data-[state=active]:!font-bold whitespace-nowrap flex-shrink-0"
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