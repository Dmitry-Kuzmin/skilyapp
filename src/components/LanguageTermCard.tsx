import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Languages, Volume2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <Card className="group cursor-pointer bg-slate-900/40 border-slate-800/50 hover:border-success/40 transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl hover:shadow-success/10 overflow-hidden h-full flex flex-col backdrop-blur-sm">
          {/* Subtle patterns/glows */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-success/10 transition-colors" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full -ml-12 -mb-12" />

          <CardContent className="relative p-6 space-y-5 h-full flex flex-col z-10">
            {/* Visual Element (Icon instead of Image) */}
            <div className="relative aspect-[16/10] rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/30 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-success/20 transition-all">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative group-hover:scale-110 transition-transform duration-500">
                <div className="absolute inset-0 blur-xl bg-success/20 rounded-full" />
                <BookOpen className="w-12 h-12 text-success/80 relative" />
              </div>

              {/* Badge for difficulty inside the "visual" area */}
              <div className="absolute top-3 right-3">
                <Badge className={cn(
                  "px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest border-0 shadow-lg",
                  term.difficulty === 'easy' ? "bg-emerald-500/20 text-emerald-400 shadow-emerald-500/10" :
                    term.difficulty === 'medium' ? "bg-amber-500/20 text-amber-400 shadow-amber-500/10" :
                      "bg-rose-500/20 text-rose-400 shadow-rose-500/10"
                )}>
                  {getDifficultyLabel(term.difficulty)}
                </Badge>
              </div>
            </div>

            {/* Content Area */}
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-black text-xl leading-tight group-hover:text-success transition-colors break-words">
                  {term.term_es}
                </h3>
                <p className="text-sm font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                  {term.term_ru}
                </p>
              </div>

              {/* Description Preview */}
              <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                {term.description_es}
              </p>
            </div>

            {/* Interactive Hint */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success/50 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                  Explorar
                </span>
              </div>
              <Languages className="w-4 h-4 text-slate-600 group-hover:text-success transition-colors" />
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
                      onClick={() => {
                        const audio = new Audio(term.audio_url!);
                        audio.play().catch((e) => {
                          console.warn('[LanguageTermCard] ⚠️ Audio blocked:', e);
                        });
                      }}
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
                      onClick={() => {
                        const audio = new Audio(term.audio_url!);
                        audio.play().catch((e) => {
                          console.warn('[LanguageTermCard] ⚠️ Audio blocked:', e);
                        });
                      }}
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
