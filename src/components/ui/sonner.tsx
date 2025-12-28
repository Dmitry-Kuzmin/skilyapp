import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useSafeArea } from "@/hooks/useSafeArea";
import { isTelegramMiniApp } from "@/lib/telegram";
import { useIsMobile } from "@/hooks/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const safeArea = useSafeArea();
  const isTelegram = isTelegramMiniApp();
  const isMobile = useIsMobile();

  // Центрируем уведомления если это Telegram или мобильное устройство
  const shouldCenter = isTelegram || isMobile;

  // Вычисляем отступ сверху с учетом safe area для Telegram
  // Учитываем высоту нативной навигации Telegram (кнопка Назад и т.д.)
  const TELEGRAM_NAV_HEIGHT = 50; // Уменьшено с 110, так как было слишком много
  const topOffset = isTelegram
    ? safeArea.top + safeArea.contentTop + TELEGRAM_NAV_HEIGHT
    : 16;

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={shouldCenter ? "top-center" : "top-right"}
      richColors
      expand={true}
      // Важно: z-index должен быть МАКСИМАЛЬНЫМ (таким же как у модалок проекта)
      containerAriaLabel="Уведомления"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-950/80 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-zinc-200 group-[.toaster]:border-white/10 group-[.toaster]:shadow-2xl font-medium rounded-2xl group-[.toaster]:z-[2147483647] group-[.toaster]:ring-1 group-[.toaster]:ring-white/5",
          description: "group-[.toast]:text-zinc-400 group-[.toast]:text-xs",
          actionButton: "group-[.toast]:bg-white group-[.toast]:text-black group-[.toast]:rounded-lg group-[.toast]:hover:bg-zinc-200 transition-colors",
          cancelButton: "group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-300 group-[.toast]:rounded-lg",
        },
      }}
      style={{
        top: `${topOffset}px`,
        // Если в Telegram или на мобильном, центрируем через transform, иначе отступ справа
        left: shouldCenter ? '50%' : 'auto',
        right: shouldCenter ? 'auto' : `${safeArea.right + 16}px`,
        transform: shouldCenter ? 'translateX(-50%)' : 'none',
        zIndex: 2147483647,
        position: 'fixed',
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
