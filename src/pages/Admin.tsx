import { useState } from "react";
import { Upload, FileSpreadsheet, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Admin = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [terms, setTerms] = useState<any[]>([]);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls")) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, загрузите файл Excel (.xlsx или .xls)",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    // Preview the data
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        setTerms(jsonData);
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось прочитать файл Excel",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || terms.length === 0) return;

    setIsUploading(true);

    try {
      // Clear existing terms
      const { error: deleteError } = await supabase.from("terms").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteError) throw deleteError;

      // Insert new terms
      const formattedTerms = terms.map((term: any) => ({
        spanish: term.spanish || term.Spanish || term.Испанский || "",
        russian: term.russian || term.Russian || term.Русский || "",
        category: term.category || term.Category || term.Категория || null,
        difficulty: term.difficulty || term.Difficulty || term.Сложность || "Средняя",
      }));

      const { error: insertError } = await supabase.from("terms").insert(formattedTerms);

      if (insertError) throw insertError;

      toast({
        title: "Успешно!",
        description: `Загружено ${terms.length} терминов`,
      });

      setFile(null);
      setTerms([]);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm("Вы уверены, что хотите удалить все термины из базы данных?")) return;

    try {
      const { error } = await supabase.from("terms").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "База данных очищена",
      });

      setTerms([]);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось очистить базу данных",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Админ-панель</h1>
          <p className="text-muted-foreground text-lg">
            Управление базой данных терминов
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Формат Excel файла: столбцы должны называться "spanish" (или "Испанский"), "russian" (или "Русский"), 
            опционально "category" (или "Категория") и "difficulty" (или "Сложность": Лёгкая, Средняя, Сложная)
          </AlertDescription>
        </Alert>

        <Card className="p-6 gradient-card">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="excel-file">Загрузить Excel файл</Label>
              <div className="flex gap-4">
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Button
                  onClick={handleUpload}
                  disabled={!file || isUploading || terms.length === 0}
                  className="min-w-[120px]"
                >
                  {isUploading ? (
                    "Загрузка..."
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Загрузить
                    </>
                  )}
                </Button>
              </div>
              {file && (
                <p className="text-sm text-muted-foreground">
                  Выбран файл: {file.name} ({terms.length} терминов)
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={handleClearDatabase}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Очистить базу данных
              </Button>
            </div>
          </div>
        </Card>

        {terms.length > 0 && (
          <Card className="p-6 gradient-card">
            <h3 className="text-xl font-bold mb-4">Предпросмотр данных</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Испанский</TableHead>
                    <TableHead>Русский</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Сложность</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terms.slice(0, 10).map((term, index) => (
                    <TableRow key={index}>
                      <TableCell>{term.spanish || term.Spanish || term.Испанский}</TableCell>
                      <TableCell>{term.russian || term.Russian || term.Русский}</TableCell>
                      <TableCell>{term.category || term.Category || term.Категория || "-"}</TableCell>
                      <TableCell>{term.difficulty || term.Difficulty || term.Сложность || "Средняя"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {terms.length > 10 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Показано 10 из {terms.length} терминов
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Admin;