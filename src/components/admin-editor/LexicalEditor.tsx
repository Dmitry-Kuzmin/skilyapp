import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $getSelection, $isRangeSelection, LexicalEditor } from 'lexical';
import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { Code2 } from 'lucide-react';
import { LexicalToolbar } from './LexicalToolbar';

interface LexicalEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  onEditorReady?: (editor: LexicalEditor) => void;
  placeholder?: string;
  materialId?: string;
  editable?: boolean;
  height?: number;
}

const theme = {
  paragraph: 'mb-2',
  heading: {
    h1: 'text-3xl font-bold mb-4',
    h2: 'text-2xl font-bold mb-3',
    h3: 'text-xl font-bold mb-2',
    h4: 'text-lg font-bold mb-2',
    h5: 'text-base font-bold mb-1',
    h6: 'text-sm font-bold mb-1',
  },
  list: {
    nested: {
      listitem: 'list-none',
    },
    ol: 'list-decimal ml-6 mb-2',
    ul: 'list-disc ml-6 mb-2',
    listitem: 'my-1',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'bg-muted px-1 py-0.5 rounded font-mono text-sm',
  },
  link: 'text-primary underline cursor-pointer',
  quote: 'border-l-4 border-primary pl-4 italic my-4 text-muted-foreground',
  code: 'bg-muted p-4 rounded font-mono text-sm overflow-x-auto my-4',
};

function OnChangePlugin({ onChange }: { onChange: (html: string) => void }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const htmlString = $generateHtmlFromNodes(editor, null);
        onChange(htmlString);
      });
    });
  }, [editor, onChange]);
  return null;
}

function InitialContentPlugin({ content, editorRef }: { content: string; editorRef: React.MutableRefObject<LexicalEditor | null> }) {
  const [editor] = useLexicalComposerContext();
  const contentInitialized = useRef(false);

  useEffect(() => {
    if (editor && !contentInitialized.current && content) {
      contentInitialized.current = true;
      editorRef.current = editor;
      editor.update(() => {
        const root = $getRoot();
        const rootChildren = root.getChildren();
        // Only set initial content if editor is empty
        if (rootChildren.length === 0 || (rootChildren.length === 1 && rootChildren[0].getTextContent().trim() === '')) {
          try {
            const parser = new DOMParser();
            const dom = parser.parseFromString(content, 'text/html');
            const nodes = $generateNodesFromDOM(editor, dom);
            root.clear();
            if (nodes.length > 0) {
              root.append(...nodes);
            }
          } catch (error) {
            console.error('Error parsing initial content:', error);
          }
        }
      }, { discrete: true });
    }
  }, [editor, content, editorRef]);

  return null;
}

export const LexicalEditor = ({
  content = '',
  onChange,
  onEditorReady,
  placeholder = 'Начните вводить текст...',
  materialId,
  editable = true,
  height = 600,
}: LexicalEditorProps) => {
  const [showHtmlDialog, setShowHtmlDialog] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const editorRef = useRef<LexicalEditor | null>(null);

  const initialConfig = {
    namespace: 'LexicalEditor',
    theme,
    onError: (error: Error) => {
      console.error('Lexical error:', error);
      toast.error('Ошибка редактора: ' + error.message);
    },
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
    ],
    editable,
  };

  const handleChange = useCallback(
    (html: string) => {
      onChange?.(html);
    },
    [onChange]
  );

  const handleEditorReady = useCallback(
    (editor: LexicalEditor) => {
      editorRef.current = editor;
      onEditorReady?.(editor);
    },
    [onEditorReady]
  );

  const handleImageUpload = useCallback(
    async (file: File): Promise<string> => {
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

  const handleInsertHtml = useCallback(() => {
    const editor = editorRef.current;
    if (editor && htmlContent) {
      editor.update(() => {
        try {
          const parser = new DOMParser();
          const dom = parser.parseFromString(htmlContent, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          const selection = $getSelection();
          if (selection && $isRangeSelection(selection)) {
            selection.insertNodes(nodes);
          } else {
            const root = $getRoot();
            root.append(...nodes);
          }
          setHtmlContent('');
          setShowHtmlDialog(false);
          toast.success('HTML вставлен');
        } catch (error) {
          console.error('Error inserting HTML:', error);
          toast.error('Ошибка вставки HTML');
        }
      });
    }
  }, [htmlContent]);

  return (
    <div className="w-full border border-border rounded-lg overflow-hidden bg-background flex flex-col">
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

      <LexicalComposer initialConfig={initialConfig}>
        <div className="flex flex-col flex-1 overflow-hidden">
          {editable && <LexicalToolbar onImageUpload={handleImageUpload} />}
          <div className="editor-container flex-1 overflow-auto" style={{ minHeight: `${height - 100}px`, maxHeight: `${height - 100}px` }}>
            <div className="editor-inner relative">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable className="editor-input min-h-[400px] p-4 focus:outline-none" />
                }
                placeholder={
                  <div className="editor-placeholder absolute top-4 left-4 text-muted-foreground pointer-events-none select-none">
                    {placeholder}
                  </div>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
              <OnChangePlugin onChange={handleChange} />
              <HistoryPlugin />
              {editable && <AutoFocusPlugin />}
              <LinkPlugin />
              <ListPlugin />
              <MarkdownShortcutPlugin />
              <InitialContentPlugin content={content} editorRef={editorRef} />
              <EditorReadyPlugin onReady={handleEditorReady} />
            </div>
          </div>
        </div>
      </LexicalComposer>

      <style>{`
        .editor-input {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: hsl(var(--foreground));
          background: hsl(var(--background));
          outline: none;
        }
        .editor-input:focus {
          outline: none;
        }
        .editor-placeholder {
          color: hsl(var(--muted-foreground));
          user-select: none;
          pointer-events: none;
        }
        .editor-input img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin: 16px 0;
        }
        .editor-input table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          border: 1px solid hsl(var(--border));
        }
        .editor-input table td,
        .editor-input table th {
          border: 1px solid hsl(var(--border));
          padding: 12px;
        }
        .editor-input table th {
          background: hsl(var(--muted));
          font-weight: 600;
        }
        .editor-input blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 16px;
          margin: 16px 0;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }
        .editor-input code {
          background: hsl(var(--muted));
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
        }
        .editor-input pre {
          background: hsl(var(--muted));
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 16px 0;
        }
        .editor-input pre code {
          background: transparent;
          padding: 0;
        }
        .editor-input a {
          color: hsl(var(--primary));
          text-decoration: underline;
          cursor: pointer;
        }
        .editor-input a:hover {
          text-decoration: none;
        }
      `}</style>
    </div>
  );
};

function EditorReadyPlugin({ onReady }: { onReady: (editor: LexicalEditor) => void }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    onReady(editor);
  }, [editor, onReady]);
  return null;
}

