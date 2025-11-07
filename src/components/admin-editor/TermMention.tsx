import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Term {
  id: string;
  term_es: string;
  term_ru: string;
  description_es: string;
  description_ru: string;
}

interface TermMentionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (term: Term) => void;
}

export const TermMention = ({ isOpen, onClose, onSelect }: TermMentionProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTerms();
    }
  }, [isOpen, searchQuery]);

  const loadTerms = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("language_terms")
        .select("*")
        .order("term_es")
        .limit(50);

      if (searchQuery) {
        query = query.or(
          `term_es.ilike.%${searchQuery}%,term_ru.ilike.%${searchQuery}%,description_es.ilike.%${searchQuery}%,description_ru.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      setTerms(data || []);
    } catch (error: any) {
      console.error("Error loading terms:", error);
      toast.error("Ошибка загрузки терминов");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (term: Term) => {
    onSelect(term);
    setSearchQuery("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Вставить термин</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск терминов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Terms List */}
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Загрузка...
              </div>
            ) : terms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Термины не найдены
              </div>
            ) : (
              <div className="space-y-2">
                {terms.map((term) => (
                  <div
                    key={term.id}
                    className={cn(
                      "p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                    )}
                    onClick={() => handleSelect(term)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{term.term_es}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {term.term_ru}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {term.description_es}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

