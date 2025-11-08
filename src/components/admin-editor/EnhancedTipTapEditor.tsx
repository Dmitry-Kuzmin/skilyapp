import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Mention } from "@tiptap/extension-mention";
import CharacterCount from "@tiptap/extension-character-count";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { cn } from "@/lib/utils";
import { useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface EnhancedTipTapEditorProps {
  content?: any;
  onChange?: (content: any) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  onUpdate?: (content: any) => void;
  onImageUpload?: (file: File) => Promise<string>;
  onEditorReady?: (editor: any) => void;
}

// Custom Image extension with resizing capability
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width,
            style: `width: ${attributes.width}px; max-width: 100%; height: auto;`,
          };
        },
      },
      height: {
        default: null,
        renderHTML: attributes => {
          if (!attributes.height) {
            return {};
          }
          return {
            height: attributes.height,
            style: `height: ${attributes.height}px; max-height: 100%; width: auto;`,
          };
        },
      },
      align: {
        default: 'left',
        renderHTML: attributes => {
          if (!attributes.align) {
            return {};
          }
          return {
            style: `float: ${attributes.align};`,
          };
        },
      },
    };
  },
});

// Mention suggestion configuration
const mentionSuggestion = {
  char: "@",
  allowSpaces: false,
  allowedPrefixes: [" "],
  startOfLine: false,
  decorationTag: "span",
  decorationClass: "mention",
  command: ({ editor, range, props }: any) => {
    editor
      .chain()
      .focus()
      .insertContentAt(range, [
        {
          type: "text",
          marks: [
            {
              type: "mention",
              attrs: {
                id: props.id,
                label: props.label,
              },
            },
          ],
          text: props.label,
        },
        {
          type: "text",
          text: " ",
        },
      ])
      .run();
  },
};

export const EnhancedTipTapEditor = ({
  content,
  onChange,
  placeholder = "Начните вводить текст или нажмите / для команд...",
  editable = true,
  className,
  onUpdate,
  onImageUpload,
  onEditorReady,
}: EnhancedTipTapEditorProps) => {
  const editor = useEditor({
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange?.(json);
      onUpdate?.(json);
    },
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      ResizableImage.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary hover:underline",
        },
      }),
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          class: "border-collapse table-auto w-full my-4",
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: "border-b border-border",
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: "border border-border bg-muted px-4 py-2 text-left font-semibold",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-border px-4 py-2",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention bg-primary/10 text-primary px-1 rounded",
        },
        suggestion: mentionSuggestion as any,
      }),
      CharacterCount,
    ],
    content: content || null,
    editable,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none",
          "prose-headings:font-bold prose-headings:text-foreground",
          "prose-p:text-foreground prose-p:leading-relaxed",
          "prose-strong:text-foreground prose-strong:font-bold",
          "prose-em:text-foreground",
          "prose-ul:text-foreground prose-ol:text-foreground",
          "prose-li:text-foreground",
          "prose-blockquote:text-foreground prose-blockquote:border-l-primary",
          "prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:rounded",
          "prose-pre:text-foreground prose-pre:bg-muted",
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
          "prose-img:rounded-lg prose-img:shadow-md prose-img:max-w-full",
          "prose-table:w-full prose-table:border-collapse",
          "min-h-[500px] p-6"
        ),
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0] && onImageUpload) {
          const file = event.dataTransfer.files[0];
          
          // Check if it's an image
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            
            // Show loading toast
            const loadingToast = toast.loading('Загрузка изображения...');
            
            // Upload and insert image at drop position
            onImageUpload(file).then((imageUrl) => {
              const { schema } = view.state;
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              
              if (coordinates) {
                const imageNode = schema.nodes.image.create({ src: imageUrl });
                const transaction = view.state.tr.insert(coordinates.pos, imageNode);
                view.dispatch(transaction);
              }
              
              toast.success('Изображение загружено', { id: loadingToast });
            }).catch((error) => {
              console.error('Error uploading image:', error);
              toast.error('Ошибка загрузки изображения: ' + (error.message || 'Неизвестная ошибка'), { id: loadingToast });
            });
            
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event, slice) => {
        if (onImageUpload && event.clipboardData) {
          const items = Array.from(event.clipboardData.items);
          const imageItem = items.find(item => item.type.startsWith('image/'));
          
          if (imageItem) {
            event.preventDefault();
            const file = imageItem.getAsFile();
            
            if (file) {
              // Show loading toast
              const loadingToast = toast.loading('Загрузка изображения...');
              
              onImageUpload(file).then((imageUrl) => {
                const { schema } = view.state;
                const imageNode = schema.nodes.image.create({ src: imageUrl });
                const transaction = view.state.tr.replaceSelectionWith(imageNode);
                view.dispatch(transaction);
                toast.success('Изображение загружено', { id: loadingToast });
              }).catch((error) => {
                console.error('Error uploading image:', error);
                toast.error('Ошибка загрузки изображения: ' + (error.message || 'Неизвестная ошибка'), { id: loadingToast });
              });
            }
            
            return true;
          }
        }
        return false;
      },
    },
  });

  // Keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + O for link
      if ((event.metaKey || event.ctrlKey) && event.key === 'o') {
        event.preventDefault();
        const url = window.prompt('Введите URL ссылки:');
        if (url) {
          editor.chain().focus().setLink({ href: url }).run();
        }
      }

      // Cmd/Ctrl + K for command palette - handled by parent component
      // We don't handle it here to avoid conflicts

      // Escape to remove link
      if (event.key === 'Escape' && editor.isActive('link')) {
        editor.chain().focus().unsetLink().run();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor]);

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Update content when prop changes
  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className={cn("flex items-center justify-center min-h-[500px] p-6", className)}>
        <div className="text-muted-foreground">Загрузка редактора...</div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <EditorContent editor={editor} />
      {editable && (
        <div className="mt-4 text-xs text-muted-foreground text-right">
          {editor.storage.characterCount.characters()} символов
        </div>
      )}
    </div>
  );
};

