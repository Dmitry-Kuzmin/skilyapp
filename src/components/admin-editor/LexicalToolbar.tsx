import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, UNDO_COMMAND, REDO_COMMAND } from 'lexical';
import { $isHeadingNode, $createHeadingNode } from '@lexical/rich-text';
import { $isListNode, ListNode, $createListNode, $createListItemNode } from '@lexical/list';
import { $createQuoteNode, $isQuoteNode } from '@lexical/rich-text';
import { $createCodeNode, $isCodeNode } from '@lexical/code';
import { $setBlocksType } from '@lexical/selection';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';
import { $createParagraphNode, $getRoot } from 'lexical';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
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
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
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
  const [blockType, setBlockType] = useState<string>('paragraph');

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            setIsBold(selection.hasFormat('bold'));
            setIsItalic(selection.hasFormat('italic'));
            setIsUnderline(selection.hasFormat('underline'));
            setIsStrikethrough(selection.hasFormat('strikethrough'));

            const anchorNode = selection.anchor.getNode();
            let element =
              anchorNode.getKey() === 'root'
                ? anchorNode
                : $findMatchingParent(anchorNode, (e) => {
                    const parent = e.getParent();
                    return parent !== null && $getRoot() !== parent;
                  });

            if (element === null) {
              element = anchorNode.getTopLevelElementOrThrow();
            }

            const elementKey = element.getKey();
            const elementDOM = editor.getElementByKey(elementKey);

            if (elementDOM !== null) {
              if ($isListNode(element)) {
                const parentList = $findMatchingParent(anchorNode, $isListNode);
                const type = parentList ? parentList.getListType() : element.getListType();
                setBlockType(type);
              } else {
                const type = $isHeadingNode(element) ? element.getTag() : element.getType();
                if (type in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
                  setBlockType(type);
                } else if ($isQuoteNode(element)) {
                  setBlockType('quote');
                } else if ($isCodeNode(element)) {
                  setBlockType('code');
                } else {
                  setBlockType('paragraph');
                }
              }
            }
          }
        });
      })
    );
  }, [editor]);

  const formatText = useCallback(
    (format: string) => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    [editor]
  );

  const formatHeading = useCallback(
    (headingSize: 'h1' | 'h2' | 'h3') => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(headingSize));
        }
      });
    },
    [editor]
  );

  const formatParagraph = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  }, [editor]);

  const formatBulletList = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const listNode = $createListNode('bullet');
        const listItemNode = $createListItemNode();
        listNode.append(listItemNode);
        selection.insertNodes([listNode]);
      }
    });
  }, [editor]);

  const formatNumberedList = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const listNode = $createListNode('number');
        const listItemNode = $createListItemNode();
        listNode.append(listItemNode);
        selection.insertNodes([listNode]);
      }
    });
  }, [editor]);

  const formatQuote = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
  }, [editor]);

  const formatCode = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createCodeNode());
      }
    });
  }, [editor]);

  const formatAlign = useCallback(
    (align: 'left' | 'center' | 'right') => {
      editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align);
    },
    [editor]
  );

  const handleImageClick = useCallback(() => {
    if (!onImageUpload) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const url = await onImageUpload(file);
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              // Insert image as HTML
              const root = $getRoot();
              const paragraph = $createParagraphNode();
              paragraph.append($createParagraphNode().append($createParagraphNode()));
              // For now, we'll use HTML insertion for images
              // This is a simplified version - in production you'd want a proper image node
              selection.insertText(`<img src="${url}" alt="Uploaded image" />`);
            }
          });
        } catch (error) {
          console.error('Error inserting image:', error);
        }
      }
    };
    input.click();
  }, [editor, onImageUpload]);

  const handleLink = useCallback(() => {
    const url = window.prompt('Введите URL:');
    if (url) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          // Lexical link handling would go here
          // For now, this is a placeholder
          selection.insertText(url);
        }
      });
    }
  }, [editor]);

  const undo = useCallback(() => {
    editor.dispatchCommand(UNDO_COMMAND, undefined);
  }, [editor]);

  const redo = useCallback(() => {
    editor.dispatchCommand(REDO_COMMAND, undefined);
  }, [editor]);

  return (
    <div className="border-b border-border p-2 flex flex-wrap gap-1 bg-muted/50">
      <div className="flex gap-1 border-r border-border pr-2 mr-2">
        <Button
          type="button"
          variant={isBold ? 'default' : 'ghost'}
          size="sm"
          onClick={() => formatText('bold')}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={isItalic ? 'default' : 'ghost'}
          size="sm"
          onClick={() => formatText('italic')}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={isUnderline ? 'default' : 'ghost'}
          size="sm"
          onClick={() => formatText('underline')}
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={isStrikethrough ? 'default' : 'ghost'}
          size="sm"
          onClick={() => formatText('strikethrough')}
          className="h-8 w-8 p-0"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-1 border-r border-border pr-2 mr-2">
        <Button
          type="button"
          variant={blockType === 'h1' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => formatHeading('h1')}
          className="h-8 w-8 p-0"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={blockType === 'h2' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => formatHeading('h2')}
          className="h-8 w-8 p-0"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={blockType === 'h3' ? 'default' : 'ghost'}
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
          variant={blockType === 'bullet' ? 'default' : 'ghost'}
          size="sm"
          onClick={formatBulletList}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={blockType === 'number' ? 'default' : 'ghost'}
          size="sm"
          onClick={formatNumberedList}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={blockType === 'quote' ? 'default' : 'ghost'}
          size="sm"
          onClick={formatQuote}
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={blockType === 'code' ? 'default' : 'ghost'}
          size="sm"
          onClick={formatCode}
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
          onClick={() => formatAlign('left')}
          className="h-8 w-8 p-0"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatAlign('center')}
          className="h-8 w-8 p-0"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatAlign('right')}
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
          onClick={handleLink}
          className="h-8 w-8 p-0"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleImageClick}
          className="h-8 w-8 p-0"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={undo}
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={redo}
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

