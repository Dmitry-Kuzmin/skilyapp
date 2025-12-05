import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
  attribute?: "class" | "data-theme" | "data-mode";
  defaultTheme?: string;
  enableSystem?: boolean;
}

export function ThemeProvider({ children, attribute, defaultTheme, enableSystem }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      attribute={attribute} 
      defaultTheme={defaultTheme} 
      enableSystem={enableSystem}
      // КРИТИЧНО: suppressHydrationWarning предотвращает ошибки при SSG/prerender
      // next-themes генерирует inline скрипт, который может вызвать ошибки до загрузки React
      suppressHydrationWarning
    >
      {children}
    </NextThemesProvider>
  );
}
