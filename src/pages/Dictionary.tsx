import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LanguageTermCard } from "@/components/LanguageTermCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, X } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import Layout from "@/components/Layout";

interface LanguageTerm {
  id: string;
  term_es: string;
  term_ru: string;
  description_es: string;
  description_ru: string;
  difficulty: string;
  image_url: string | null;
  audio_url: string | null;
  mastery_level?: number;
  times_practiced?: number;
}

export default function Dictionary() {
  const { profileId } = useUserContext();
  const [terms, setTerms] = useState<LanguageTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    fetchTerms();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchTerms = async () => {
    try {
      // Получаем термины
      const { data: termsData, error: termsError } = await supabase
        .from('language_terms')
        .select('*')
        .order('term_es');
      
      if (termsError) throw termsError;

      // Если пользователь авторизован, получаем его прогресс
      if (profileId) {
        const { data: progressData } = await supabase
          .from('user_term_progress')
          .select('term_id, mastery_level, times_practiced')
          .eq('user_id', profileId);

        // Объединяем данные
        const termsWithProgress = termsData?.map(term => {
          const progress = progressData?.find(p => p.term_id === term.id);
          return {
            ...term,
            mastery_level: progress?.mastery_level || 0,
            times_practiced: progress?.times_practiced || 0,
          };
        }) || [];

        setTerms(termsWithProgress);
      } else {
        setTerms(termsData || []);
      }
    } catch (error) {
      console.error('Error fetching language terms:', error);
    } finally {
      setLoading(false);
    }
  };

  // Improved filtering with word-based search and relevance scoring
  const filteredTerms = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return terms;
    }

    const searchWords = debouncedSearchTerm
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);

    const filtered = terms
      .map(term => {
        // Calculate relevance score
        let score = 0;
        const termEs = (term.term_es || "").toLowerCase();
        const termRu = (term.term_ru || "").toLowerCase();
        const descEs = (term.description_es || "").toLowerCase();
        const descRu = (term.description_ru || "").toLowerCase();

        // Check if all search words match
        const allWordsMatch = searchWords.every(word => 
          termEs.includes(word) ||
          termRu.includes(word) ||
          descEs.includes(word) ||
          descRu.includes(word)
        );

        if (!allWordsMatch) return null;

        // Calculate score based on match position and field
        searchWords.forEach(word => {
          // Exact match in term (highest priority)
          if (termEs === word || termRu === word) score += 100;
          // Starts with word in term
          else if (termEs.startsWith(word) || termRu.startsWith(word)) score += 50;
          // Contains word in term
          else if (termEs.includes(word) || termRu.includes(word)) score += 30;
          
          // Match in description
          if (descEs.includes(word)) score += 10;
          if (descRu.includes(word)) score += 10;
        });
    
        return { term, score };
      })
      .filter((item): item is { term: LanguageTerm; score: number } => item !== null)
      .sort((a, b) => b.score - a.score) // Sort by relevance
      .map(item => item.term);

    return filtered;
  }, [terms, debouncedSearchTerm]);

  if (loading) {
    return (
      <Layout>
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
      </Layout>
    );
  }

  return (
    <Layout>
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-success/5">
      <div className="container mx-auto px-4 py-12">
        {/* Premium Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-success shadow-primary mb-4 animate-pulse-slow">
            <Search className="w-10 h-10 text-success-foreground" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-success via-primary to-success bg-clip-text text-transparent">
            Diccionario de Términos
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Vocabulario esencial para la conducción con traducción al ruso
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="px-3 py-1 rounded-full bg-success/10 text-success font-medium">
              {filteredTerms.length} {debouncedSearchTerm ? "términos encontrados" : "términos disponibles"}
            </span>
            {debouncedSearchTerm && (
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                de {terms.length} total
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-8 max-w-4xl mx-auto">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-success transition-colors" />
            <Input
              placeholder="Buscar por término o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-12 h-14 text-lg border-2 focus:border-success focus:ring-2 focus:ring-success/20 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-lg hover:bg-muted"
                onClick={() => setSearchTerm("")}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Terms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTerms.map((term, index) => (
            <div
              key={term.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <LanguageTermCard term={term} />
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTerms.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No se encontraron términos</h3>
            <p className="text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
}