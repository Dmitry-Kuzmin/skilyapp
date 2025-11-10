import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $insertNodes, $createParagraphNode, $createTextNode, EditorState, LexicalEditor, createCommand, COMMAND_PRIORITY_EDITOR } from 'lexical';

// Создаем собственный ImageNode
import { DecoratorNode, DOMConversionMap, DOMExportOutput, LexicalNode, NodeKey, SerializedLexicalNode, Spread } from 'lexical';

export type SerializedImageNode = Spread<
  {
    src: string;
    altText: string;
    width?: number;
    height?: number;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width: 'inherit' | number;
  __height: 'inherit' | number;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__key,
    );
  }

  constructor(
    src: string,
    altText: string,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width || 'inherit';
    this.__height = height || 'inherit';
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img');
    element.setAttribute('src', this.__src);
    element.setAttribute('alt', this.__altText);
    if (this.__width !== 'inherit') {
      element.setAttribute('width', this.__width.toString());
    }
    if (this.__height !== 'inherit') {
      element.setAttribute('height', this.__height.toString());
    }
    element.style.maxWidth = '100%';
    element.style.height = 'auto';
    return { element };
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { src, altText, width, height } = serializedNode;
    const node = $createImageNode({ src, altText, width, height });
    return node;
  }

  exportJSON(): SerializedImageNode {
    return {
      src: this.getSrc(),
      altText: this.getAltText(),
      width: this.__width === 'inherit' ? undefined : this.__width,
      height: this.__height === 'inherit' ? undefined : this.__height,
      type: 'image',
      version: 1,
    };
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  setWidthAndHeight(width: 'inherit' | number, height: 'inherit' | number): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    return span;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <img
        src={this.__src}
        alt={this.__altText}
        style={{
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          margin: '16px 0',
          borderRadius: '8px',
        }}
      />
    );
  }
}

export function $createImageNode({
  altText,
  height,
  src,
  width,
  key,
}: {
  altText: string;
  height?: 'inherit' | number;
  src: string;
  width?: 'inherit' | number;
  key?: NodeKey;
}): ImageNode {
  return new ImageNode(src, altText, width, height, key);
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}

export const INSERT_IMAGE_COMMAND = createCommand<{ src: string; altText: string }>('INSERT_IMAGE_COMMAND');
import { useEffect, useState, useCallback } from 'react';
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
import { TableActionMenu } from './TableActionMenu';

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
  },
  list: {
    nested: {
      listitem: 'list-none',
    },
    ol: 'list-decimal ml-6',
    ul: 'list-disc ml-6',
    listitem: 'my-1',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'bg-muted px-1 py-0.5 rounded font-mono text-sm',
  },
  link: 'text-primary underline',
  quote: 'border-l-4 border-primary pl-4 italic my-4',
  code: 'bg-muted p-4 rounded font-mono text-sm overflow-x-auto',
};

function SetInitialContentPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!content || initialized) return;

    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(content, 'text/html');
      const nodes = $generateNodesFromDOM(editor, dom);
      $getRoot().clear();
      $getRoot().select();
      $insertNodes(nodes);
      setInitialized(true);
    });
  }, [content, editor, initialized]);

  return null;
}

function ImagePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      (payload: { src: string; altText: string }) => {
        const imageNode = $createImageNode(payload);
        $insertNodes([imageNode]);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

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

  const initialConfig = {
    namespace: 'LexicalEditor',
    theme,
    onError: (error: Error) => {
      console.error('Lexical error:', error);
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
      ImageNode,
    ],
    editable,
  };

  const handleChange = useCallback(
    (editorState: EditorState, editor: LexicalEditor) => {
      editorState.read(() => {
        const htmlString = $generateHtmlFromNodes(editor, null);
        onChange?.(htmlString);
      });
    },
    [onChange]
  );

  const handleImageUpload = useCallback(
    async (file: File): Promise<string> => {
      try {
        if (!materialId) {
          toast.error('Material ID отсутствует. Сначала сохраните материал.');
          throw new Error('Material ID is required for image upload');
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Размер изображения не должен превышать 5MB');
        }
        if (!file.type.startsWith('image/')) {
          throw new Error('Разрешены только изображения');
        }
        
        toast.loading('Загрузка изображения...');
        
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
        
        toast.dismiss();
        toast.success('Изображение загружено');
        
        return publicUrl;
      } catch (error: any) {
        console.error('Error uploading image:', error);
        toast.dismiss();
        toast.error(error.message || 'Ошибка загрузки изображения');
        throw error;
      }
    },
    [materialId]
  );

  const handleInsertHtml = useCallback(() => {
    if (!htmlContent) return;
    setHtmlContent('');
    setShowHtmlDialog(false);
    toast.success('HTML вставлен');
  }, [htmlContent]);

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

      <LexicalComposer initialConfig={initialConfig}>
        <div className="editor-container relative" style={{ minHeight: `${height}px`, maxHeight: `${height}px`, overflowY: 'auto' }}>
          {editable && <LexicalToolbar onImageUpload={handleImageUpload} />}
          <div className="editor-inner relative">
            {editable && <TableActionMenu />}
            <RichTextPlugin
              contentEditable={<ContentEditable className="editor-input min-h-[400px] p-4 focus:outline-none" />}
              placeholder={<div className="editor-placeholder absolute top-4 left-4 text-muted-foreground pointer-events-none">{placeholder}</div>}
              ErrorBoundary={LexicalErrorBoundary}
            />
            <OnChangePlugin onChange={handleChange} />
            <SetInitialContentPlugin content={content} />
            <ImagePlugin />
            <HistoryPlugin />
            <AutoFocusPlugin />
            <LinkPlugin />
            <ListPlugin />
            <TablePlugin hasCellMerge={true} hasCellBackgroundColor={true} />
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
        }
        .editor-input:focus {
          outline: none;
        }
        .editor-placeholder {
          color: hsl(var(--muted-foreground));
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
          position: relative;
        }
        .editor-input table td,
        .editor-input table th {
          border: 1px solid hsl(var(--border));
          padding: 12px;
          min-width: 80px;
          position: relative;
        }
        .editor-input table th {
          background: hsl(var(--muted));
          font-weight: 600;
        }
        .editor-input table td:hover,
        .editor-input table th:hover {
          background: hsl(var(--accent));
        }
        /* Table cell resizer styles */
        .TableNode__resizer {
          position: absolute;
          right: -4px;
          top: 0;
          bottom: 0;
          width: 8px;
          cursor: col-resize;
          z-index: 10;
        }
        .TableNode__resizer:hover {
          background: hsl(var(--primary));
        }
        .editor-input blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 16px;
          margin: 16px 0;
          color: hsl(var(--muted-foreground));
        }
        .editor-input code {
          background: hsl(var(--muted));
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }
        .editor-input pre {
          background: hsl(var(--muted));
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
        }
        .editor-input a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};
