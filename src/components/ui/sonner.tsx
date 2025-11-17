import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useSafeArea } from "@/hooks/useSafeArea";
import { isTelegramMiniApp } from "@/lib/telegram";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const safeArea = useSafeArea();
  const isTelegram = isTelegramMiniApp();

  // Вычисляем отступ сверху с учетом safe area для Telegram
  // Учитываем высоту нативной навигации Telegram (кнопка Назад и т.д.)
  const TELEGRAM_NAV_HEIGHT = 110; // Высота встроенной навигации Telegram WebApp
  const topOffset = isTelegram 
    ? safeArea.top + safeArea.contentTop + TELEGRAM_NAV_HEIGHT + 16
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
