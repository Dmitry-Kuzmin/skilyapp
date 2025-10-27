import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoadSignCard } from "@/components/RoadSignCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2 } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";

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
  const { user } = useUserContext();
  const [signs, setSigns] = useState<RoadSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  useEffect(() => {
    fetchSigns();
  }, []);

  const fetchSigns = async () => {
    try {
      // Получаем знаки
      const { data: signsData, error: signsError } = await supabase
        .from('road_signs')
        .select('*')
        .order('name_es');
      
      if (signsError) throw signsError;

      // Если пользователь авторизован, получаем его прогресс
      if (user) {
        // Получаем профиль для получения ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('telegram_id', user.id)
          .maybeSingle();

        if (profile) {
          const { data: progressData } = await supabase
            .from('user_sign_progress')
            .select('sign_id, mastery_level, times_practiced')
            .eq('user_id', profile.id);

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
      } else {
        setSigns(signsData || []);
      }
    } catch (error) {
      console.error('Error fetching road signs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSigns = signs.filter(sign => {
    const matchesSearch = 
      sign.name_es.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sign.name_ru.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sign.sign_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === "all" || sign.sign_type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const signTypes = [...new Set(signs.map(s => s.sign_type))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
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
              {signs.length} señales disponibles
            </span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-6 max-w-4xl mx-auto">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar señales por nombre o número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 text-lg border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md"
            />
          </div>

          <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
            <TabsList className="w-full h-auto p-2 bg-card/50 backdrop-blur-sm border-2 border-border/50 rounded-xl shadow-sm">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-primary rounded-lg px-6 py-3 text-base font-medium transition-all duration-300"
              >
                Todas
              </TabsTrigger>
              {signTypes.map(type => (
                <TabsTrigger 
                  key={type} 
                  value={type}
                  className="capitalize data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-primary rounded-lg px-6 py-3 text-base font-medium transition-all duration-300"
                >
                  {type}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Signs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredSigns.map((sign, index) => (
            <div
              key={sign.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <RoadSignCard sign={sign} />
            </div>
          ))}
        </div>

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
  );
}