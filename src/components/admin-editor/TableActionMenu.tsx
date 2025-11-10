import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection } from 'lexical';
import { 
  $getTableCellNodeFromLexicalNode,
  $getTableRowIndexFromTableCellNode,
  $getTableColumnIndexFromTableCellNode,
  $insertTableRow__EXPERIMENTAL,
  $insertTableColumn__EXPERIMENTAL,
  $deleteTableRow__EXPERIMENTAL,
  $deleteTableColumn__EXPERIMENTAL,
  TableCellNode,
} from '@lexical/table';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Plus, Trash } from 'lucide-react';

export const TableActionMenu = () => {
  const [editor] = useLexicalComposerContext();
  const [isInTable, setIsInTable] = useState(false);
  const [cellNode, setCellNode] = useState<TableCellNode | null>(null);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();
          const cell = $getTableCellNodeFromLexicalNode(anchorNode);
          setIsInTable(cell !== null);
          setCellNode(cell);
        } else {
          setIsInTable(false);
          setCellNode(null);
        }
      });
    });
  }, [editor]);

  const insertRowAbove = () => {
    editor.update(() => {
      if (cellNode) {
        $insertTableRow__EXPERIMENTAL(false);
      }
    });
  };

  const insertRowBelow = () => {
    editor.update(() => {
      if (cellNode) {
        $insertTableRow__EXPERIMENTAL(true);
      }
    });
  };

  const insertColumnLeft = () => {
    editor.update(() => {
      if (cellNode) {
        $insertTableColumn__EXPERIMENTAL(false);
      }
    });
  };

  const insertColumnRight = () => {
    editor.update(() => {
      if (cellNode) {
        $insertTableColumn__EXPERIMENTAL(true);
      }
    });
  };

  const deleteRow = () => {
    editor.update(() => {
      if (cellNode) {
        $deleteTableRow__EXPERIMENTAL();
      }
    });
  };

  const deleteColumn = () => {
    editor.update(() => {
      if (cellNode) {
        $deleteTableColumn__EXPERIMENTAL();
      }
    });
  };

  if (!isInTable) return null;

  return (
    <div className="absolute top-2 right-2 z-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="h-7 w-7 p-0">
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={insertRowAbove}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            Вставить строку выше
          </DropdownMenuItem>
          <DropdownMenuItem onClick={insertRowBelow}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            Вставить строку ниже
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={insertColumnLeft}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            Вставить столбец слева
          </DropdownMenuItem>
          <DropdownMenuItem onClick={insertColumnRight}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            Вставить столбец справа
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={deleteRow} className="text-destructive">
            <Trash className="h-3.5 w-3.5 mr-2" />
            Удалить строку
          </DropdownMenuItem>
          <DropdownMenuItem onClick={deleteColumn} className="text-destructive">
            <Trash className="h-3.5 w-3.5 mr-2" />
            Удалить столбец
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

