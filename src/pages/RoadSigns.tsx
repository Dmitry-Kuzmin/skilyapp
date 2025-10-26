import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoadSignCard } from "@/components/RoadSignCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2 } from "lucide-react";

interface RoadSign {
  id: string;
  name_es: string;
  name_ru: string;
  description_es: string;
  description_ru: string;
  sign_type: string;
  sign_number: string;
  image_url: string;
}

export default function RoadSigns() {
  const [signs, setSigns] = useState<RoadSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  useEffect(() => {
    fetchSigns();
  }, []);

  const fetchSigns = async () => {
    try {
      const { data, error } = await supabase
        .from('road_signs')
        .select('*')
        .order('name_es');
      
      if (error) throw error;
      setSigns(data || []);
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
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Señales de Tráfico</h1>
        <p className="text-muted-foreground">Aprende todas las señales de tráfico en España</p>
      </header>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar señales..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="w-full flex-wrap h-auto">
            <TabsTrigger value="all">Todas</TabsTrigger>
            {signTypes.map(type => (
              <TabsTrigger key={type} value={type} className="capitalize">
                {type}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredSigns.map(sign => (
          <RoadSignCard key={sign.id} sign={sign} />
        ))}
      </div>

      {filteredSigns.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No se encontraron señales</p>
        </div>
      )}
    </div>
  );
}