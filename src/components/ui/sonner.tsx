import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { isTelegramMiniApp } from "@/lib/telegram";
import { useEffect } from "react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isTelegram = isTelegramMiniApp();

  // Для Telegram WebApp применяем специальные стили
  useEffect(() => {
    if (isTelegram && typeof document !== 'undefined') {
      // Добавляем класс для Telegram WebApp
      document.documentElement.classList.add('telegram-webapp');
      document.body.classList.add('telegram-webapp');
      
      // Убеждаемся, что toast контейнер имеет правильный z-index
      const style = document.createElement('style');
      style.textContent = `
        [data-sonner-toaster] {
          z-index: 999999 !important;
          position: fixed !important;
        }
        [data-sonner-toast] {
          z-index: 999999 !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [isTelegram]);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={isTelegram ? "top-center" : "top-center"}
      // Для Telegram используем расширенный offset сверху
      offset={isTelegram ? "20px" : undefined}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
        // Для Telegram увеличиваем размер и делаем более заметным
        style: isTelegram ? { 
          zIndex: 999999,
          fontSize: '16px',
          padding: '16px',
          minWidth: '300px'
        } : undefined,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
