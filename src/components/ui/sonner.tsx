import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useSafeArea } from "@/hooks/useSafeArea";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const safeArea = useSafeArea();

  // Вычисляем отступ сверху с учетом safe area для Telegram
  const topOffset = safeArea.platform === 'telegram' 
    ? safeArea.top + safeArea.contentTop + 16
    : 16;

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      style={{
        top: `${topOffset}px`,
        right: `${safeArea.right + 16}px`,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
