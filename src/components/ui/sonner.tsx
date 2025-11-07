import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { isTelegramMiniApp } from "@/lib/telegram";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isTelegram = isTelegramMiniApp();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      // Увеличиваем z-index для Telegram мини-аппа
      style={isTelegram ? { zIndex: 999999 } : undefined}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
        // Увеличиваем z-index для toast в Telegram
        style: isTelegram ? { zIndex: 999999 } : undefined,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
