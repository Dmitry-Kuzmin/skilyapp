import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from '@clerk/clerk-react';
import { ruRU } from '@clerk/localizations';
import { ThemeProvider } from "./components/ThemeProvider";
import { UserProvider } from "./contexts/UserContext";
import App from "./App.tsx";
import "./index.css";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider 
      publishableKey={clerkPubKey}
      localization={ruRU}
      afterSignOutUrl="/"
    >
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <UserProvider>
          <App />
        </UserProvider>
      </ThemeProvider>
    </ClerkProvider>
  </StrictMode>
);
