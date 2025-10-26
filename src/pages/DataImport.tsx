import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { importRoadSigns, importLanguageTerms } from "@/utils/importData";
import { Loader2, FileUp, CheckCircle } from "lucide-react";

export default function DataImport() {
  const [loadingRoadSigns, setLoadingRoadSigns] = useState(false);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [roadSignsImported, setRoadSignsImported] = useState(false);
  const [termsImported, setTermsImported] = useState(false);
  const { toast } = useToast();

  const handleImportRoadSigns = async () => {
    setLoadingRoadSigns(true);
    try {
      const response = await fetch('/src/data/road_signs_rows.csv');
      const csvText = await response.text();
      await importRoadSigns(csvText);
      setRoadSignsImported(true);
      toast({
        title: "Éxito",
        description: "Señales de tráfico importadas correctamente",
      });
    } catch (error) {
      console.error('Error importing road signs:', error);
      toast({
        title: "Error",
        description: "Error al importar señales de tráfico",
        variant: "destructive",
      });
    } finally {
      setLoadingRoadSigns(false);
    }
  };

  const handleImportTerms = async () => {
    setLoadingTerms(true);
    try {
      const response = await fetch('/src/data/language_terms_rows.csv');
      const csvText = await response.text();
      await importLanguageTerms(csvText);
      setTermsImported(true);
      toast({
        title: "Éxito",
        description: "Términos del diccionario importados correctamente",
      });
    } catch (error) {
      console.error('Error importing language terms:', error);
      toast({
        title: "Error",
        description: "Error al importar términos del diccionario",
        variant: "destructive",
      });
    } finally {
      setLoadingTerms(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Importar Datos</h1>
        <p className="text-muted-foreground">Carga los datos de señales y términos a la base de datos</p>
      </header>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {roadSignsImported ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <FileUp className="w-5 h-5" />
              )}
              Señales de Tráfico
            </CardTitle>
            <CardDescription>
              Importar todas las señales de tráfico desde el archivo CSV
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleImportRoadSigns}
              disabled={loadingRoadSigns || roadSignsImported}
              className="w-full"
            >
              {loadingRoadSigns ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : roadSignsImported ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Importado
                </>
              ) : (
                "Importar Señales"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {termsImported ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <FileUp className="w-5 h-5" />
              )}
              Diccionario de Términos
            </CardTitle>
            <CardDescription>
              Importar todos los términos del diccionario desde el archivo CSV
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleImportTerms}
              disabled={loadingTerms || termsImported}
              className="w-full"
            >
              {loadingTerms ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : termsImported ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Importado
                </>
              ) : (
                "Importar Términos"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}