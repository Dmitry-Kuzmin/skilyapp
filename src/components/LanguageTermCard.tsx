import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Languages, Volume2 } from "lucide-react";

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

interface LanguageTermCardProps {
  term: LanguageTerm;
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return 'bg-green-500';
    case 'medium': return 'bg-amber-500';
    case 'hard': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

export const LanguageTermCard = ({ term }: LanguageTermCardProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-lg transition-all group">
          <CardContent className="p-4">
            {term.image_url && (
              <div className="aspect-video relative mb-3 bg-muted rounded-lg overflow-hidden">
                <img 
                  src={term.image_url} 
                  alt={term.term_es}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
              </div>
            )}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold text-sm line-clamp-2">{term.term_es}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{term.term_ru}</p>
              </div>
              <Languages className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={getDifficultyColor(term.difficulty)}>
              {term.difficulty}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {term.image_url && (
            <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
              <img 
                src={term.image_url} 
                alt={term.term_es}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <Tabs defaultValue="es" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="es">Español</TabsTrigger>
              <TabsTrigger value="ru">Русский</TabsTrigger>
            </TabsList>
            
            <TabsContent value="es" className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{term.term_es}</h3>
                  {term.audio_url && (
                    <button 
                      onClick={() => new Audio(term.audio_url!).play()}
                      className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <p className="text-muted-foreground leading-relaxed">{term.description_es}</p>
              </div>
            </TabsContent>
            
            <TabsContent value="ru" className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{term.term_ru}</h3>
                  {term.audio_url && (
                    <button 
                      onClick={() => new Audio(term.audio_url!).play()}
                      className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <p className="text-muted-foreground leading-relaxed">{term.description_ru}</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};