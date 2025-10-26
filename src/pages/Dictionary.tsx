import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LanguageTermCard } from "@/components/LanguageTermCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2 } from "lucide-react";

interface LanguageTerm {
  id: string;
  term_es: string;
  term_ru: string;
  description_es: string;
  description_ru: string;
  difficulty: string;
  image_url: string | null;
  audio_url: string | null;
}

export default function Dictionary() {
  const [terms, setTerms] = useState<LanguageTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      const { data, error } = await supabase
        .from('language_terms')
        .select('*')
        .order('term_es');
      
      if (error) throw error;
      setTerms(data || []);
    } catch (error) {
      console.error('Error fetching language terms:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTerms = terms.filter(term => {
    const matchesSearch = 
      term.term_es.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.term_ru.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.description_es.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDifficulty = selectedDifficulty === "all" || term.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesDifficulty;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Diccionario de Términos</h1>
        <p className="text-muted-foreground">Vocabulario esencial para la conducción</p>
      </header>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar términos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">Todos</TabsTrigger>
            <TabsTrigger value="easy" className="flex-1">Fácil</TabsTrigger>
            <TabsTrigger value="medium" className="flex-1">Medio</TabsTrigger>
            <TabsTrigger value="hard" className="flex-1">Difícil</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTerms.map(term => (
          <LanguageTermCard key={term.id} term={term} />
        ))}
      </div>

      {filteredTerms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No se encontraron términos</p>
        </div>
      )}
    </div>
  );
}