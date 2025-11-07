import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Mention } from "@tiptap/extension-mention";
import CharacterCount from "@tiptap/extension-character-count";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export interface TipTapEditorProps {
  content?: any; // JSON TipTap content
  onChange?: (content: any) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  onUpdate?: (content: any) => void;
}

// Mention suggestion configuration
const mentionSuggestion = {
  char: "@",
  allowSpaces: false,
  allowedPrefixes: [" "],
  startOfLine: false,
  decorationTag: "span",
  decorationClass: "mention",
  command: ({ editor, range, props }: any) => {
    // Insert mention
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

export const TipTapEditor = ({
  content,
  onChange,
  placeholder = "Начните вводить текст...",
  editable = true,
  className,
  onUpdate,
}: TipTapEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Оставляем history включенным в StarterKit, не добавляем отдельно
        link: false, // Отключаем link из StarterKit, используем отдельно
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary hover:underline",
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
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange?.(json);
      onUpdate?.(json);
    },
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
          "prose-img:rounded-lg prose-img:shadow-md",
          "min-h-[500px] p-6"
        ),
      },
    },
  });

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

