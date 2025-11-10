import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Code2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface QuillEditorProps {
  content?: string; // HTML content
  onChange?: (content: string) => void;
  onEditorReady?: (editor: any) => void;
  placeholder?: string;
  materialId?: string;
  editable?: boolean;
  height?: number;
}

export const QuillEditor = ({
  content = '',
  onChange,
  onEditorReady,
  placeholder = 'Начните вводить текст...',
  materialId,
  editable = true,
  height = 600,
}: QuillEditorProps) => {
  const quillRef = useRef<ReactQuill>(null);
  const [showHtmlDialog, setShowHtmlDialog] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  // Handle image upload to Supabase Storage
  const handleImageUpload = useCallback(
    async (file: File): Promise<string> => {
      try {
        if (!materialId) {
          throw new Error('Material ID is required for image upload');
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Размер изображения не должен превышать 5MB');
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error('Разрешены только изображения');
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `materials/images/${materialId}/${fileName}`;

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from('materials')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          throw new Error(`Ошибка загрузки: ${uploadError.message}`);
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('materials').getPublicUrl(filePath);

        toast.success('Изображение загружено');
        return publicUrl;
      } catch (error: any) {
        console.error('Error uploading image:', error);
        toast.error(error.message || 'Ошибка загрузки изображения');
        throw error;
      }
    },
    [materialId]
  );

  // Custom image handler
  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        try {
          const url = await handleImageUpload(file);
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', url);
            quill.setSelection(range.index + 1);
          }
        } catch (error) {
          console.error('Error inserting image:', error);
        }
      }
    };
  }, [handleImageUpload]);

  // Quill modules configuration
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ align: [] }],
          ['link', 'image'],
          [{ color: [] }, { background: [] }],
          ['blockquote', 'code-block'],
          ['clean'],
        ],
        handlers: {
          image: imageHandler,
        },
      },
      clipboard: {
        matchVisual: false,
      },
    }),
    [imageHandler]
  );

  // Quill formats
  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'bullet',
    'align',
    'link',
    'image',
    'color',
    'background',
    'blockquote',
    'code-block',
  ];

  const handleChange = useCallback(
    (value: string) => {
      onChange?.(value);
    },
    [onChange]
  );

  const handleInsertHtml = useCallback(() => {
    const quill = quillRef.current?.getEditor();
    if (quill && htmlContent) {
      try {
        // Get current selection
        const range = quill.getSelection(true);
        const index = range ? range.index : quill.getLength();
        
        // Get Quill class from the editor instance
        const QuillClass = (quill as any).constructor;
        const Delta = QuillClass.import('delta');
        
        // Convert HTML to Delta format
        const delta = quill.clipboard.convert(htmlContent);
        
        // Create insert operation: retain current position, then insert new content
        const insertDelta = new Delta().retain(index).concat(delta);
        quill.updateContents(insertDelta, 'user');
        
        // Move cursor after inserted content
        const newLength = delta.length();
        quill.setSelection(index + newLength, 'user');
        
        setHtmlContent('');
        setShowHtmlDialog(false);
        toast.success('HTML вставлен');
      } catch (error) {
        console.error('Error inserting HTML:', error);
        // Fallback: simpler approach - just convert and update at current position
        try {
          const range = quill.getSelection(true);
          const index = range ? range.index : quill.getLength();
          const delta = quill.clipboard.convert(htmlContent);
          const QuillClass = (quill as any).constructor;
          const Delta = QuillClass.import('delta');
          quill.updateContents(new Delta().retain(index).concat(delta), 'user');
          setHtmlContent('');
          setShowHtmlDialog(false);
          toast.success('HTML вставлен');
        } catch (fallbackError) {
          console.error('Fallback error:', fallbackError);
          toast.error('Ошибка вставки HTML. Попробуйте вставить через обычную вставку (Ctrl+V)');
        }
      }
    }
  }, [htmlContent]);

  // Expose editor instance
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [onEditorReady]);

  return (
    <div className="w-full border border-border rounded-lg overflow-hidden bg-background">
      {/* Custom HTML Insert Button */}
      {editable && (
        <div className="border-b border-border p-2 flex justify-end bg-muted/50">
          <Dialog open={showHtmlDialog} onOpenChange={setShowHtmlDialog}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHtmlContent('')}
                className="h-8"
              >
                <Code2 className="h-4 w-4 mr-2" />
                Вставить HTML/CSS/JS
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Вставить HTML код</DialogTitle>
                <DialogDescription>
                  Вставьте HTML код с поддержкой CSS и JavaScript. Код будет вставлен как есть.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="<div style='color: red;'>Пример HTML</div>"
                className="min-h-[300px] font-mono text-sm"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowHtmlDialog(false)}>
                  Отмена
                </Button>
                <Button onClick={handleInsertHtml}>Вставить</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Quill Editor */}
      <div style={{ minHeight: `${height}px`, maxHeight: `${height}px`, overflowY: 'auto' }}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={content}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          readOnly={!editable}
          style={{
            height: `${height - 42}px`,
          }}
        />
      </div>

      {/* Custom styles */}
      <style>{`
        .ql-editor {
          min-height: ${height - 100}px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: hsl(var(--foreground));
          background: hsl(var(--background));
        }
        .ql-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin: 16px 0;
        }
        .ql-editor table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }
        .ql-editor table td,
        .ql-editor table th {
          border: 1px solid hsl(var(--border));
          padding: 12px;
        }
        .ql-editor table th {
          background: hsl(var(--muted));
          font-weight: 600;
        }
        .ql-editor blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 16px;
          margin: 16px 0;
          color: hsl(var(--muted-foreground));
        }
        .ql-editor code,
        .ql-editor pre {
          background: hsl(var(--muted));
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }
        .ql-editor pre {
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
        }
        .ql-editor a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        .ql-container {
          font-family: inherit;
        }
        .ql-toolbar {
          border-top: 1px solid hsl(var(--border));
          border-left: 1px solid hsl(var(--border));
          border-right: 1px solid hsl(var(--border));
          border-bottom: none;
          background: hsl(var(--background));
        }
        .ql-editor {
          border: 1px solid hsl(var(--border));
        }
        .ql-snow .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        .ql-snow .ql-fill {
          fill: hsl(var(--foreground));
        }
        .ql-snow .ql-picker-label {
          color: hsl(var(--foreground));
        }
      `}</style>
    </div>
  );
};

