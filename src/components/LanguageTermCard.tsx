import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Languages, Volume2, BookOpen } from "lucide-react";

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
    case 'easy': return 'bg-success/10 text-success border-success/30';
    case 'medium': return 'bg-warning/10 text-warning border-warning/30';
    case 'hard': return 'bg-destructive/10 text-destructive border-destructive/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getDifficultyLabel = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return 'Fácil';
    case 'medium': return 'Medio';
    case 'hard': return 'Difícil';
    default: return difficulty;
  }
};

export const LanguageTermCard = ({ term }: LanguageTermCardProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="group cursor-pointer gradient-card border-border/50 hover:border-success/30 transition-all duration-500 hover:scale-105 hover:shadow-primary overflow-hidden h-full">
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <CardContent className="relative p-5 space-y-4 h-full flex flex-col">
            {term.image_url && (
              <div className="aspect-video rounded-xl bg-gradient-to-br from-muted to-muted/50 overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                <img 
                  src={term.image_url} 
                  alt={term.term_es}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg line-clamp-2 group-hover:text-success transition-colors">
                  {term.term_es}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {term.term_ru}
                </p>
              </div>
              <Badge className={`${getDifficultyColor(term.difficulty)} shrink-0`}>
                {getDifficultyLabel(term.difficulty)}
              </Badge>
            </div>

            {/* Description Preview */}
            <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
              {term.description_es}
            </p>

            {/* Footer */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Click para ver más</span>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto gradient-card">
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
            <Badge className={getDifficultyColor(term.difficulty)}>
              Dificultad: {getDifficultyLabel(term.difficulty)}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-6">
          {term.image_url && (
            <div className="relative rounded-2xl bg-gradient-to-br from-muted to-muted/50 overflow-hidden shadow-lg">
              <img 
                src={term.image_url} 
                alt={term.term_es}
                className="w-full h-auto max-h-80 object-cover"
              />
            </div>
          )}
          
          <Tabs defaultValue="es" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="es">Español</TabsTrigger>
              <TabsTrigger value="ru">Русский</TabsTrigger>
            </TabsList>
            
            <TabsContent value="es" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-success">
                  <BookOpen className="w-5 h-5" />
                  <h4 className="font-bold text-lg">Descripción</h4>
                </div>
                <Separator className="bg-gradient-to-r from-success/50 to-transparent" />
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-2xl">{term.term_es}</h3>
                  {term.audio_url && (
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={() => new Audio(term.audio_url!).play()}
                      className="hover:bg-success/10"
                    >
                      <Volume2 className="w-5 h-5" />
                    </Button>
                  )}
                </div>
                <p className="text-base leading-relaxed text-foreground/90">
                  {term.description_es}
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="ru" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-success">
                  <BookOpen className="w-5 h-5" />
                  <h4 className="font-bold text-lg">Описание</h4>
                </div>
                <Separator className="bg-gradient-to-r from-success/50 to-transparent" />
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-2xl">{term.term_ru}</h3>
                  {term.audio_url && (
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={() => new Audio(term.audio_url!).play()}
                      className="hover:bg-success/10"
                    >
                      <Volume2 className="w-5 h-5" />
                    </Button>
                  )}
                </div>
                <p className="text-base leading-relaxed text-foreground/90">
                  {term.description_ru}
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Both Languages Card */}
          <Card className="p-5 gradient-card border-success/20">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-success">
                <Languages className="w-4 h-4" />
                Traducción completa
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">ESPAÑOL</div>
                  <div className="space-y-1">
                    <p className="font-bold text-lg">{term.term_es}</p>
                    <p className="text-sm text-foreground/80">{term.description_es}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">РУССКИЙ</div>
                  <div className="space-y-1">
                    <p className="font-bold text-lg">{term.term_ru}</p>
                    <p className="text-sm text-foreground/80">{term.description_ru}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
