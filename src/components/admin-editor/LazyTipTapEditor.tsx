'use client';

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
  Underline,
  Quote,
  List,
  ListOrdered,
  Image as ImageIcon,
  Link as LinkIcon,
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Type,
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { loadTiptap } from '@/utils/lazyTiptap';

interface TipTapEditorProps {
  content?: any;
  onChange?: (content: any) => void;
  placeholder?: string;
  editable?: boolean;
}

export const LazyTipTapEditor = ({ content, onChange, placeholder, editable = true }: TipTapEditorProps) => {
  const [editor, setEditor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tiptapModules, setTiptapModules] = useState<any>(null);

  useEffect(() => {
    const loadEditor = async () => {
      try {
        setIsLoading(true);
        const modules = await loadTiptap();
        setTiptapModules(modules);
      } catch (error) {
        console.error('Failed to load Tiptap editor:', error);
        toast.error('Не удалось загрузить редактор');
      } finally {
        setIsLoading(false);
      }
    };

    loadEditor();
  }, []);

  useEffect(() => {
    if (!tiptapModules?.react || !editable) return;

    let editorInstance: any = null;

    const initializeEditor = async () => {
      try {
        const { Editor } = tiptapModules.react;
        const { StarterKit } = tiptapModules.starterKit;
        const { Image } = tiptapModules.extensions.image;
        const { Link } = tiptapModules.extensions.link;
        const { Table } = tiptapModules.extensions.table;
        const { TableRow } = tiptapModules.extensions.tableRow;
        const { TableCell } = tiptapModules.extensions.tableCell;
        const { TableHeader } = tiptapModules.extensions.tableHeader;
        const { TextAlign } = await import('@tiptap/extension-text-align');
        const { TextStyle } = await import('@tiptap/extension-text-style');
        const { Color } = await import('@tiptap/extension-color');

        editorInstance = new Editor({
          extensions: [
            StarterKit,
            Image.configure({
              inline: true,
              allowBase64: true,
            }),
            Link.configure({
              openOnClick: false,
            }),
            Table.configure({
              resizable: true,
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
          content: content || '',
          editable,
          onUpdate: ({ editor }: any) => {
            onChange?.(editor.getJSON());
          },
        });

        setEditor(editorInstance);
      } catch (error) {
        console.error('Failed to initialize editor:', error);
      }
    };

    initializeEditor();

    return () => {
      if (editorInstance) {
        editorInstance.destroy();
      }
    };
  }, [tiptapModules, content, editable, onChange]);

  const addImage = useCallback(async () => {
    if (!editor) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const { data, error } = await supabase.storage
          .from('editor-images')
          .upload(`public/${Date.now()}-${file.name}`, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('editor-images')
          .getPublicUrl(data.path);

        editor.chain().focus().setImage({ src: publicUrl }).run();
        toast.success('Изображение добавлено');
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error('Ошибка загрузки изображения');
      }
    };

    input.click();
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const url = prompt('Введите URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  if (isLoading) {
    return (
      <div className="border rounded-md p-4 min-h-[200px] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Загрузка редактора...</div>
      </div>
    );
  }

  if (!tiptapModules) {
    return (
      <div className="border rounded-md p-4 min-h-[200px] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Не удалось загрузить редактор</div>
      </div>
    );
  }

  const { EditorContent } = tiptapModules.react;

  return (
    <div className="border rounded-md">
      {editable && (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b">
          {/* Toolbar buttons - аналогично оригинальному редактору */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={editor?.isActive('bold')}
                onPressedChange={() => editor?.chain().focus().toggleBold().run()}
              >
                <Bold className="h-4 w-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Жирный</TooltipContent>
          </Tooltip>

          {/* Остальные кнопки тулбара */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={editor?.isActive('italic')}
                onPressedChange={() => editor?.chain().focus().toggleItalic().run()}
              >
                <Italic className="h-4 w-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Курсив</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={addImage}>
                <ImageIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Добавить изображение</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={setLink}>
                <LinkIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Добавить ссылку</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={editor?.isActive('bulletList')}
                onPressedChange={() => editor?.chain().focus().toggleBulletList().run()}
              >
                <List className="h-4 w-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Маркированный список</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={editor?.isActive('orderedList')}
                onPressedChange={() => editor?.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className="h-4 w-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Нумерованный список</TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};