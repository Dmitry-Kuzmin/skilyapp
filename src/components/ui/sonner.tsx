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
  const TELEGRAM_NAV_HEIGHT = 50; // Уменьшено с 110, так как было слишком много
  const topOffset = isTelegram
    ? safeArea.top + safeArea.contentTop + TELEGRAM_NAV_HEIGHT
    : 16;

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={isTelegram ? "top-center" : "top-right"}
      richColors
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-900 group-[.toaster]:text-zinc-200 group-[.toaster]:border-zinc-800 group-[.toaster]:border-white/10 group-[.toaster]:shadow-lg font-medium rounded-xl",
          description: "group-[.toast]:text-zinc-400",
          actionButton: "group-[.toast]:bg-white group-[.toast]:text-black group-[.toast]:hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]",
          cancelButton: "group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-300",
        },
      }}
      style={{
        top: `${topOffset}px`,
        // Для top-center right не нужен, но оставим для совместимости если позиция изменится
        right: isTelegram ? 'auto' : `${safeArea.right + 16}px`,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
