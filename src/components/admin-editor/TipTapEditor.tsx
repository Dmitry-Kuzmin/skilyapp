import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Code2,
} from 'lucide-react';

interface TiptapEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  onEditorReady?: (editor: any) => void;
  placeholder?: string;
  materialId?: string;
  editable?: boolean;
  height?: number;
}

export const TiptapEditor = ({
  content = '',
  onChange,
  onEditorReady,
  placeholder = 'Начните вводить текст...',
  materialId,
  editable = true,
  height = 600,
}: TiptapEditorProps) => {
  const [showHtmlDialog, setShowHtmlDialog] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-md my-4',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse w-full my-4',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      if (!materialId) {
        throw new Error('Material ID is required for image upload');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Размер изображения не должен превышать 5MB');
      }
      if (!file.type.startsWith('image/')) {
        throw new Error('Разрешены только изображения');
      }
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `materials/images/${materialId}/${fileName}`;
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
      const {
        data: { publicUrl },
      } = supabase.storage.from('materials').getPublicUrl(filePath);
      if (editor) {
        editor.chain().focus().setImage({ src: publicUrl }).run();
      }
      toast.success('Изображение загружено');
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Ошибка загрузки изображения');
      throw error;
    }
  }, [materialId, editor]);

  const handleImageInput = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await handleImageUpload(file);
      }
    };
    input.click();
  }, [handleImageUpload]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Введите URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const addTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const handleInsertHtml = useCallback(() => {
    if (!editor || !htmlContent) return;
    editor.commands.insertContent(htmlContent, {
      parseOptions: {
        preserveWhitespace: 'full',
      },
    });
    setHtmlContent('');
    setShowHtmlDialog(false);
    toast.success('HTML вставлен');
  }, [editor, htmlContent]);

  if (!editor) {
    return <div className="border border-border rounded-lg p-4">Загрузка редактора...</div>;
  }

  return (
    <div className="w-full border border-border rounded-lg overflow-hidden bg-background">
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
      {editable && (
        <div className="border-b border-border p-2 flex flex-wrap gap-1 bg-muted/50">
          <div className="flex gap-1 border-r border-border pr-2 mr-2">
            <Button
              type="button"
              variant={editor.isActive('bold') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className="h-8 w-8 p-0"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('italic') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className="h-8 w-8 p-0"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('strike') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className="h-8 w-8 p-0"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('code') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className="h-8 w-8 p-0"
            >
              <Code className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1 border-r border-border pr-2 mr-2">
            <Button
              type="button"
              variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className="h-8 w-8 p-0"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className="h-8 w-8 p-0"
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className="h-8 w-8 p-0"
            >
              <Heading3 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1 border-r border-border pr-2 mr-2">
            <Button
              type="button"
              variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className="h-8 w-8 p-0"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className="h-8 w-8 p-0"
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('codeBlock') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className="h-8 w-8 p-0"
            >
              <Code2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1 border-r border-border pr-2 mr-2">
            <Button
              type="button"
              variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className="h-8 w-8 p-0"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className="h-8 w-8 p-0"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className="h-8 w-8 p-0"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1 border-r border-border pr-2 mr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addLink}
              className="h-8 w-8 p-0"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleImageInput}
              className="h-8 w-8 p-0"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addTable}
              className="h-8 w-8 p-0"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="h-8 w-8 p-0"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="h-8 w-8 p-0"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <div style={{ minHeight: `${height}px`, maxHeight: `${height}px`, overflowY: 'auto' }}>
        <EditorContent editor={editor} />
      </div>
      <style>{`
        .ProseMirror {
          outline: none;
          padding: 16px;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin: 16px 0;
        }
        .ProseMirror table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }
        .ProseMirror table td,
        .ProseMirror table th {
          border: 1px solid hsl(var(--border));
          padding: 12px;
        }
        .ProseMirror table th {
          background: hsl(var(--muted));
          font-weight: 600;
        }
        .ProseMirror blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 16px;
          margin: 16px 0;
          color: hsl(var(--muted-foreground));
        }
        .ProseMirror code {
          background: hsl(var(--muted));
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }
        .ProseMirror pre {
          background: hsl(var(--muted));
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
        }
        .ProseMirror a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};
