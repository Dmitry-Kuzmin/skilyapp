import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./components/ThemeProvider";
import { UserProvider } from "./contexts/UserContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <UserProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </UserProvider>
    </ThemeProvider>
  </StrictMode>
);
