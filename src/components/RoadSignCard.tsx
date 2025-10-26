import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Languages } from "lucide-react";

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
    case 'warning': return 'bg-amber-500';
    case 'mandatory': return 'bg-blue-500';
    case 'priority': return 'bg-red-500';
    case 'information': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

export const RoadSignCard = ({ sign }: RoadSignCardProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-lg transition-all group">
          <CardContent className="p-4">
            <div className="aspect-square relative mb-3 bg-muted rounded-lg overflow-hidden">
              <img 
                src={sign.image_url} 
                alt={sign.name_es}
                className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform"
              />
            </div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm line-clamp-2">{sign.name_es}</h3>
              <Languages className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
            </div>
            {sign.sign_number && (
              <p className="text-xs text-muted-foreground mt-1">{sign.sign_number}</p>
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={getSignTypeBadgeColor(sign.sign_type)}>
              {sign.sign_type}
            </Badge>
            {sign.sign_number && (
              <span className="text-sm text-muted-foreground">{sign.sign_number}</span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
            <img 
              src={sign.image_url} 
              alt={sign.name_es}
              className="w-full h-full object-contain p-8"
            />
          </div>
          
          <Tabs defaultValue="es" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="es">Español</TabsTrigger>
              <TabsTrigger value="ru">Русский</TabsTrigger>
            </TabsList>
            
            <TabsContent value="es" className="space-y-3">
              <div>
                <h3 className="font-bold text-lg mb-2">{sign.name_es}</h3>
                <p className="text-muted-foreground leading-relaxed">{sign.description_es}</p>
              </div>
            </TabsContent>
            
            <TabsContent value="ru" className="space-y-3">
              <div>
                <h3 className="font-bold text-lg mb-2">{sign.name_ru}</h3>
                <p className="text-muted-foreground leading-relaxed">{sign.description_ru}</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};