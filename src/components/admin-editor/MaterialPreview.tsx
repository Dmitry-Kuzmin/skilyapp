import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MaterialPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  content: string | any; // HTML string from TinyMCE or JSON from TipTap (legacy)
  title?: string;
}

export const MaterialPreview = ({
  isOpen,
  onClose,
  content,
  title = "Предпросмотр",
}: MaterialPreviewProps) => {
  // Extract HTML content
  // content can be:
  // 1. HTML string (new format from TinyMCE)
  // 2. Object with html property { html: "..." }
  // 3. TipTap JSON object (legacy format - will show message)
  let html = "";
  
  try {
    if (!content) {
      html = "";
    } else if (typeof content === 'string') {
      // HTML string from TinyMCE
      html = content;
    } else if (content.html) {
      // Object with html property
      html = content.html;
    } else {
      // Legacy TipTap JSON - try to convert (this is a fallback)
      html = "<p>Контент в старом формате. Пожалуйста, откройте материал для редактирования.</p>";
    }
  } catch (error: any) {
    console.error("Error processing preview content:", error);
    html = `<div class="text-destructive p-4">Ошибка при обработке контента: ${error.message}</div>`;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div
            className={cn(
              "prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto max-w-none",
              "prose-headings:font-bold prose-headings:text-foreground",
              "prose-p:text-foreground prose-p:leading-relaxed",
              "prose-strong:text-foreground prose-strong:font-bold",
              "prose-em:text-foreground",
              "prose-ul:text-foreground prose-ol:text-foreground",
              "prose-li:text-foreground",
              "prose-blockquote:text-foreground prose-blockquote:border-l-primary prose-blockquote:pl-4",
              "prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:text-sm",
              "prose-pre:text-foreground prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg",
              "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
              "prose-img:rounded-lg prose-img:shadow-md prose-img:max-w-full prose-img:my-4",
              "prose-table:w-full prose-table:border-collapse prose-table:my-4",
              "prose-table:border prose-table:border-border",
              "prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-4 prose-th:py-2 prose-th:font-semibold",
              "prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-2",
              "p-6"
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
