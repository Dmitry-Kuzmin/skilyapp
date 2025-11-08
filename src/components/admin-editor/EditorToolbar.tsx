import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link,
  Image as ImageIcon,
  Undo,
  Redo,
  Maximize,
  Minimize,
  Table,
  Code,
  Trash2,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  editor: Editor | null;
  onImageUpload?: () => void;
  onLinkInsert?: () => void;
  onTermInsert?: () => void;
  onTableInsert?: () => void;
  onCommandPalette?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// Safe wrapper for editor commands
const safeEditorCommand = (editor: Editor | null, command: () => void) => {
  if (!editor || !editor.view) {
    return;
  }
  try {
    command();
  } catch (error) {
    console.warn('Editor command failed:', error);
  }
};

// Safe check if editor can execute command
const canExecute = (editor: Editor | null, check: () => boolean): boolean => {
  if (!editor || !editor.view) {
    return false;
  }
  try {
    return check();
  } catch {
    return false;
  }
};

// Safe check if editor is active
const isActive = (editor: Editor | null, name: string, options?: any): boolean => {
  if (!editor || !editor.view) {
    return false;
  }
  try {
    return editor.isActive(name, options);
  } catch {
    return false;
  }
};

export const EditorToolbar = ({
  editor,
  onImageUpload,
  onLinkInsert,
  onTermInsert,
  onTableInsert,
  onCommandPalette,
  isFullscreen = false,
  onToggleFullscreen,
}: EditorToolbarProps) => {
  // Check if editor is ready and view is available
  if (!editor || !editor.view) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 p-2 border-b border-border/50 bg-card/95 backdrop-blur-sm sticky top-0 z-10 flex-wrap shadow-sm">
      {/* Text Formatting */}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => safeEditorCommand(editor, () => editor.chain().focus().toggleBold().run())}
          disabled={!canExecute(editor, () => editor.can().chain().focus().toggleBold().run())}
          className={cn(
            "h-8 w-8 p-0",
            isActive(editor, "bold") && "bg-primary/10 text-primary"
          )}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => safeEditorCommand(editor, () => editor.chain().focus().toggleItalic().run())}
          disabled={!canExecute(editor, () => editor.can().chain().focus().toggleItalic().run())}
          className={cn(
            "h-8 w-8 p-0",
            isActive(editor, "italic") && "bg-primary/10 text-primary"
          )}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => safeEditorCommand(editor, () => editor.chain().focus().toggleStrike().run())}
          disabled={!canExecute(editor, () => editor.can().chain().focus().toggleStrike().run())}
          className={cn(
            "h-8 w-8 p-0",
            isActive(editor, "strike") && "bg-primary/10 text-primary"
          )}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Headings */}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => safeEditorCommand(editor, () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
          className={cn(
            "h-8 w-8 p-0",
            isActive(editor, "heading", { level: 1 }) && "bg-primary/10 text-primary"
          )}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => safeEditorCommand(editor, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
          className={cn(
            "h-8 w-8 p-0",
            isActive(editor, "heading", { level: 2 }) && "bg-primary/10 text-primary"
          )}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => safeEditorCommand(editor, () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
          className={cn(
            "h-8 w-8 p-0",
            isActive(editor, "heading", { level: 3 }) && "bg-primary/10 text-primary"
          )}
        >
          <Heading3 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Lists */}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => safeEditorCommand(editor, () => editor.chain().focus().toggleBulletList().run())}
          className={cn(
            "h-8 w-8 p-0",
            isActive(editor, "bulletList") && "bg-primary/10 text-primary"
          )}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => safeEditorCommand(editor, () => editor.chain().focus().toggleOrderedList().run())}
          className={cn(
            "h-8 w-8 p-0",
            isActive(editor, "orderedList") && "bg-primary/10 text-primary"
          )}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => safeEditorCommand(editor, () => editor.chain().focus().toggleBlockquote().run())}
          className={cn(
            "h-8 w-8 p-0",
            isActive(editor, "blockquote") && "bg-primary/10 text-primary"
          )}
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => safeEditorCommand(editor, () => editor.chain().focus().toggleCodeBlock().run())}
          className={cn(
            "h-8 w-8 p-0",
            isActive(editor, "codeBlock") && "bg-primary/10 text-primary"
          )}
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Insert */}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onImageUpload}
          className="h-8 w-8 p-0"
          title="Вставить изображение (или перетащите файл)"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onLinkInsert}
          className={cn(
            "h-8 w-8 p-0",
            isActive(editor, "link") && "bg-primary/10 text-primary"
          )}
          title="Вставить ссылку (Cmd/Ctrl+O)"
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onTableInsert}
          className={cn(
            "h-8 w-8 p-0",
            isActive(editor, "table") && "bg-primary/10 text-primary"
          )}
          title="Вставить таблицу"
        >
          <Table className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onTermInsert}
          className="h-8 w-8 p-0"
          title="Вставить термин"
        >
          <span className="text-xs font-semibold">@</span>
        </Button>
        {onCommandPalette && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCommandPalette}
            className="h-8 px-2 text-xs"
            title="Командная палитра (Cmd/Ctrl+K)"
          >
            <span className="text-xs">⌘K</span>
          </Button>
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Table Controls - Only show when in table */}
      {isActive(editor, "table") && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => safeEditorCommand(editor, () => editor.chain().focus().addColumnBefore().run())}
              disabled={!canExecute(editor, () => editor.can().addColumnBefore())}
              className="h-8 w-8 p-0"
              title="Добавить колонку слева"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => safeEditorCommand(editor, () => editor.chain().focus().addColumnAfter().run())}
              disabled={!canExecute(editor, () => editor.can().addColumnAfter())}
              className="h-8 w-8 p-0"
              title="Добавить колонку справа"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => safeEditorCommand(editor, () => editor.chain().focus().deleteColumn().run())}
              disabled={!canExecute(editor, () => editor.can().deleteColumn())}
              className="h-8 w-8 p-0"
              title="Удалить колонку"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => safeEditorCommand(editor, () => editor.chain().focus().addRowBefore().run())}
              disabled={!canExecute(editor, () => editor.can().addRowBefore())}
              className="h-8 w-8 p-0"
              title="Добавить строку сверху"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => safeEditorCommand(editor, () => editor.chain().focus().addRowAfter().run())}
              disabled={!canExecute(editor, () => editor.can().addRowAfter())}
              className="h-8 w-8 p-0"
              title="Добавить строку снизу"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => safeEditorCommand(editor, () => editor.chain().focus().deleteRow().run())}
              disabled={!canExecute(editor, () => editor.can().deleteRow())}
              className="h-8 w-8 p-0"
              title="Удалить строку"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => safeEditorCommand(editor, () => editor.chain().focus().deleteTable().run())}
              disabled={!canExecute(editor, () => editor.can().deleteTable())}
              className="h-8 w-8 p-0 text-destructive"
              title="Удалить таблицу"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      <Separator orientation="vertical" className="h-6" />

      {/* History */}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => safeEditorCommand(editor, () => editor.chain().focus().undo().run())}
          disabled={!canExecute(editor, () => editor.can().chain().focus().undo().run())}
          className="h-8 w-8 p-0"
          title="Отменить (Cmd/Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => safeEditorCommand(editor, () => editor.chain().focus().redo().run())}
          disabled={!canExecute(editor, () => editor.can().chain().focus().redo().run())}
          className="h-8 w-8 p-0"
          title="Повторить (Cmd/Ctrl+Shift+Z)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Fullscreen */}
      {onToggleFullscreen && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className="h-8 w-8 p-0"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
        </>
      )}
    </div>
  );
};
