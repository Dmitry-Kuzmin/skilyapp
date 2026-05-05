import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Search, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Sign {
  id: string;
  name_es: string;
  name_ru: string;
  sign_type: string;
  sign_number: string;
  image_url: string;
}

interface SignLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSign: (imageUrl: string) => void;
}

export function SignLibraryModal({ open, onOpenChange, onSelectSign }: SignLibraryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [signs, setSigns] = useState<Sign[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!open) return;

    const fetchSigns = async () => {
      setLoading(true);
      try {
        let query = supabase.from("road_signs").select("*").limit(50);
        
        if (debouncedQuery.trim()) {
          const q = `%${debouncedQuery.trim()}%`;
          // Supabase text search on multiple columns
          query = query.or(`sign_number.ilike.${q},name_ru.ilike.${q},name_es.ilike.${q}`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setSigns(data || []);
      } catch (err) {
        console.error("Error fetching signs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSigns();
  }, [debouncedQuery, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-[#09090b] border-zinc-800 text-zinc-100 max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-800 shrink-0">
          <DialogTitle className="text-xl">Библиотека знаков DGT</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Найдите знак по номеру (например, R-301) или названию, чтобы прикрепить его к вопросу.
          </DialogDescription>
          
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Поиск по номеру (R-1) или названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-indigo-500"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p>Загрузка знаков...</p>
            </div>
          ) : signs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-center">
              <p className="text-lg mb-2">Ничего не найдено</p>
              <p className="text-sm">Попробуйте изменить поисковой запрос.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {signs.map((sign) => (
                <div
                  key={sign.id}
                  onClick={() => {
                    onSelectSign(sign.image_url);
                    onOpenChange(false);
                  }}
                  className="group relative flex flex-col items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 cursor-pointer hover:bg-zinc-800 hover:border-indigo-500/50 transition-all text-center"
                >
                  <div className="w-20 h-20 mb-3 flex items-center justify-center">
                    <img 
                      src={sign.image_url} 
                      alt={sign.sign_number} 
                      className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-xs font-bold text-zinc-300 mb-1">{sign.sign_number || "Без номера"}</span>
                  <span className="text-[10px] text-zinc-500 line-clamp-2" title={sign.name_ru}>{sign.name_ru}</span>
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[1px] transition-all">
                    <div className="bg-indigo-500 text-white p-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
