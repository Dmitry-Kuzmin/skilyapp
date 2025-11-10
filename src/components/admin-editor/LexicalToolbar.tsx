import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, UNDO_COMMAND, REDO_COMMAND } from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { INSERT_IMAGE_COMMAND } from './LexicalEditor';
import { $createHeadingNode, $createQuoteNode, HeadingTagType } from '@lexical/rich-text';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { $createCodeNode } from '@lexical/code';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline,
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
  AlignJustify,
  Minus,
  Eraser,
  Undo,
  Redo,
} from 'lucide-react';

interface LexicalToolbarProps {
  onImageUpload?: (file: File) => Promise<string>;
}

export const LexicalToolbar = ({ onImageUpload }: LexicalToolbarProps) => {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));
    }
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  const formatHeading = (tag: HeadingTagType) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(tag));
      }
    });
  };

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
  };

  const formatCodeBlock = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createCodeNode());
      }
    });
  };

  const insertLink = () => {
    const url = prompt('Введите URL:');
    if (url) {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'link');
    }
  };

  const handleImageInput = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && onImageUpload) {
        try {
          const imageUrl = await onImageUpload(file);
          
          // Вставляем изображение в редактор используя правильную команду
          editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
            src: imageUrl,
            altText: file.name || 'Uploaded image',
          });
        } catch (error) {
          console.error('Error inserting image:', error);
        }
      }
    };
    input.click();
  }, [onImageUpload, editor]);

  return (
    <div className="border-b border-border p-2 flex flex-wrap gap-1 bg-muted/50">
      <div className="flex gap-1 border-r border-border pr-2 mr-2">
        <Button
          type="button"
          variant={isBold ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={isItalic ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={isUnderline ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={isStrikethrough ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
          className="h-8 w-8 p-0"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={isCode ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
          className="h-8 w-8 p-0"
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-1 border-r border-border pr-2 mr-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatHeading('h1')}
          className="h-8 w-8 p-0"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatHeading('h2')}
          className="h-8 w-8 p-0"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatHeading('h3')}
          className="h-8 w-8 p-0"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-1 border-r border-border pr-2 mr-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatQuote}
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-1 border-r border-border pr-2 mr-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertLink}
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
          onClick={() => editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows: '3', columns: '3' })}
          className="h-8 w-8 p-0"
          title="Вставить таблицу 3x3"
        >
          <TableIcon className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-1 border-r border-border pr-2 mr-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'clear')}
          className="h-8 w-8 p-0"
          title="Очистить форматирование"
        >
          <Eraser className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                const hrNode = document.createElement('hr');
                const htmlString = hrNode.outerHTML;
                editor.dispatchCommand(FORMAT_TEXT_COMMAND as any, htmlString);
              }
            });
          }}
          className="h-8 w-8 p-0"
          title="Горизонтальная линия"
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
