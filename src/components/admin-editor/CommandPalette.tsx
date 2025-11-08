import { useState, useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import { Search, Heading1, Heading2, Heading3, List, ListOrdered, Image as ImageIcon, Link, Table, Quote, Code, FileText } from "lucide-react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  editor: Editor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageUpload?: () => void;
}

const commands = [
  {
    id: "heading1",
    label: "Заголовок 1",
    icon: Heading1,
    action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "heading2",
    label: "Заголовок 2",
    icon: Heading2,
    action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "heading3",
    label: "Заголовок 3",
    icon: Heading3,
    action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bulletList",
    label: "Маркированный список",
    icon: List,
    action: (editor: Editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "orderedList",
    label: "Нумерованный список",
    icon: ListOrdered,
    action: (editor: Editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "blockquote",
    label: "Цитата",
    icon: Quote,
    action: (editor: Editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "codeBlock",
    label: "Блок кода",
    icon: Code,
    action: (editor: Editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "table",
    label: "Таблица",
    icon: Table,
    action: (editor: Editor) => {
      try {
        console.log('CommandPalette: Attempting to insert table...');
        if (!editor.view) {
          console.error('Editor view not available');
          return;
        }
        const result = editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        console.log('CommandPalette: Table insertion result:', result);
        if (!result) {
          console.warn('Table insertion returned false');
        }
      } catch (error: any) {
        console.error('Failed to insert table:', error);
      }
    },
  },
  {
    id: "link",
    label: "Ссылка",
    icon: Link,
    action: (editor: Editor) => {
      const url = window.prompt("Введите URL ссылки:");
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      }
    },
  },
  {
    id: "image",
    label: "Изображение",
    icon: ImageIcon,
    action: (editor: Editor, onImageUpload?: () => void) => {
      if (onImageUpload) {
        onImageUpload();
      }
    },
  },
];

export const CommandPalette = ({ editor, open, onOpenChange, onImageUpload }: CommandPaletteProps) => {
  const [search, setSearch] = useState("");

  const handleSelect = (command: typeof commands[0]) => {
    if (command.id === "image" && onImageUpload) {
      onImageUpload();
      onOpenChange(false);
      setSearch("");
      return;
    }
    
    if (!editor) return;
    
    command.action(editor);
    onOpenChange(false);
    setSearch("");
  };

  const filteredCommands = commands.filter((command) =>
    command.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Введите команду..." value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>Команда не найдена</CommandEmpty>
        <CommandGroup heading="Форматирование">
          {filteredCommands
            .filter((cmd) => ["heading1", "heading2", "heading3", "bulletList", "orderedList", "blockquote", "codeBlock"].includes(cmd.id))
            .map((command) => {
              const Icon = command.icon;
              return (
                <CommandItem
                  key={command.id}
                  onSelect={() => handleSelect(command)}
                  className="cursor-pointer"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {command.label}
                </CommandItem>
              );
            })}
        </CommandGroup>
        <CommandGroup heading="Вставка">
          {filteredCommands
            .filter((cmd) => ["table", "link", "image"].includes(cmd.id))
            .map((command) => {
              const Icon = command.icon;
              return (
                <CommandItem
                  key={command.id}
                  onSelect={() => handleSelect(command)}
                  className="cursor-pointer"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {command.label}
                </CommandItem>
              );
            })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

