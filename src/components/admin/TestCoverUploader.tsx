import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, Image as ImageIcon, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TestCoverUploaderProps {
  topicId: string;
  topicNumber: number;
  currentCoverUrl?: string;
  onUploadComplete?: (url: string) => void;
}

export const TestCoverUploader = ({
  topicId,
  topicNumber,
  currentCoverUrl,
  onUploadComplete,
}: TestCoverUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(currentCoverUrl || null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }

    // Validate file size (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 5MB');
      return;
    }

    setFile(selectedFile);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Пожалуйста, выберите файл');
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      // Generate file name: topic-{number}-{timestamp}.{ext}
      const fileExt = file.name.split('.').pop();
      const fileName = `topic-${topicNumber}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('test-covers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('test-covers')
        .getPublicUrl(filePath);

      setProgress(100);

      // Update topic cover_image in database
      const { error: updateError } = await supabase
        .from('topics')
        .update({ cover_image: publicUrl })
        .eq('id', topicId);

      if (updateError) throw updateError;

      toast.success('Обложка успешно загружена!');
      setPreview(publicUrl);
      setFile(null);
      onUploadComplete?.(publicUrl);
    } catch (error: any) {
      console.error('Error uploading cover:', error);
      toast.error(`Ошибка загрузки: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemove = async () => {
    if (!currentCoverUrl) return;

    try {
      // Extract file name from URL
      const urlParts = currentCoverUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('test-covers')
        .remove([fileName]);

      if (deleteError) throw deleteError;

      // Update topic to remove cover_image
      const { error: updateError } = await supabase
        .from('topics')
        .update({ cover_image: null })
        .eq('id', topicId);

      if (updateError) throw updateError;

      toast.success('Обложка удалена');
      setPreview(null);
      setFile(null);
      onUploadComplete?.('');
    } catch (error: any) {
      console.error('Error removing cover:', error);
      toast.error(`Ошибка удаления: ${error.message || 'Неизвестная ошибка'}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Обложка теста
        </CardTitle>
        <CardDescription>
          Загрузите изображение для обложки теста (макс. 5MB, JPG/PNG/WEBP)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview */}
        {preview && (
          <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border bg-muted">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {currentCoverUrl && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemove}
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* File Input */}
        <div className="space-y-2">
          <Label htmlFor="cover-upload">Выберите изображение</Label>
          <Input
            id="cover-upload"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
            className="cursor-pointer"
          />
        </div>

        {/* Progress */}
        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground text-center">
              Загрузка... {progress}%
            </p>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Загрузка...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Загрузить обложку
            </>
          )}
        </Button>

        {/* Current Cover Info */}
        {currentCoverUrl && !preview && (
          <p className="text-xs text-muted-foreground text-center">
            Текущая обложка: {currentCoverUrl.split('/').pop()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

