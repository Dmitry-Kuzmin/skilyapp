import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { cn } from "@/lib/utils";

interface MaterialPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  content: any; // JSON TipTap content
  title?: string;
}

export const MaterialPreview = ({
  isOpen,
  onClose,
  content,
  title = "Предпросмотр",
}: MaterialPreviewProps) => {
  // Generate HTML from TipTap JSON
  const html = content
    ? generateHTML(content, [
        StarterKit,
        Image,
        Link.configure({
          openOnClick: false,
        }),
      ])
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div
            className={cn(
              "prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto",
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
              "p-6"
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

