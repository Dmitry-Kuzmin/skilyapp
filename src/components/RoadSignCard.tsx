import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Languages, Info } from "lucide-react";
import { LazyImage } from "@/components/LazyImage";

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

interface RoadSignCardProps {
  sign: RoadSign;
}

const getSignTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'warning': return 'bg-warning/10 text-warning border-warning/30';
    case 'mandatory': return 'bg-primary/10 text-primary border-primary/30';
    case 'priority': return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'information': return 'bg-success/10 text-success border-success/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const RoadSignCard = memo(({ sign }: RoadSignCardProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="group cursor-pointer gradient-card border-border/50 hover:border-primary/30 transition-all duration-500 hover:scale-105 hover:shadow-primary overflow-hidden">
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <CardContent className="relative p-4 space-y-3">
            {/* Image Container */}
            <div className="aspect-square rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
              <LazyImage 
                src={sign.image_url} 
                alt={sign.name_es}
                className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors flex-1">
                  {sign.name_es}
                </h3>
                <Languages className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {sign.sign_number && (
                  <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
                    {sign.sign_number}
                  </Badge>
                )}
                <Badge className={`text-xs capitalize ${getSignTypeBadgeColor(sign.sign_type)}`}>
                  {sign.sign_type}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto gradient-card">
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getSignTypeBadgeColor(sign.sign_type)}>
                {sign.sign_type}
              </Badge>
              {sign.sign_number && (
                <Badge variant="outline" className="bg-primary/10 border-primary/30">
                  Nº {sign.sign_number}
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="relative group rounded-2xl bg-gradient-to-br from-muted to-muted/50 p-8 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <LazyImage 
                src={sign.image_url} 
                alt={sign.name_es}
                className="w-full h-auto max-h-80 object-contain relative z-10 drop-shadow-2xl"
                priority={true}
              />
            </div>
          </div>

          {/* Content Section */}
          <div className="space-y-6">
            <Tabs defaultValue="es" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="es">Español</TabsTrigger>
                <TabsTrigger value="ru">Русский</TabsTrigger>
              </TabsList>
              
              <TabsContent value="es" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Info className="w-5 h-5" />
                    <h4 className="font-bold text-lg">Descripción</h4>
                  </div>
                  <Separator className="bg-gradient-to-r from-primary/50 to-transparent" />
                  <h3 className="font-bold text-2xl">{sign.name_es}</h3>
                  <p className="text-base leading-relaxed text-foreground/90">
                    {sign.description_es}
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="ru" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Info className="w-5 h-5" />
                    <h4 className="font-bold text-lg">Описание</h4>
                  </div>
                  <Separator className="bg-gradient-to-r from-primary/50 to-transparent" />
                  <h3 className="font-bold text-2xl">{sign.name_ru}</h3>
                  <p className="text-base leading-relaxed text-foreground/90">
                    {sign.description_ru}
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Both Languages Card */}
            <Card className="p-4 gradient-card border-primary/20">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Languages className="w-4 h-4" />
                  Nombre en ambos idiomas
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">ES:</span>{' '}
                    <span className="text-foreground">{sign.name_es}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">RU:</span>{' '}
                    <span className="text-foreground">{sign.name_ru}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
