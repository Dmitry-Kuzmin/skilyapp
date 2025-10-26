import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { TelegramUser } from "@/types/window";
import { getTelegramUser, getPlatform, initTelegram } from "@/core/TelegramInit";
import { isTelegramMiniApp } from "@/lib/telegram";

interface UserContextType {
  user: TelegramUser | null;
  platform: 'telegram' | 'web';
  isAuthenticated: boolean;
  login: (userData: TelegramUser) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [platform, setPlatform] = useState<'telegram' | 'web'>('web');

  useEffect(() => {
    console.log('[UserContext] Initializing...');
    
    // Initialize Telegram if available
    const telegramUser = initTelegram();
    const currentPlatform = isTelegramMiniApp() ? 'telegram' : 'web';

    console.log('[UserContext] Platform:', currentPlatform);
    console.log('[UserContext] Telegram User:', telegramUser);

    if (telegramUser) {
      setUser(telegramUser);
      setPlatform(currentPlatform);
    } else if (currentPlatform === 'web') {
      // For web, check if there's a stored user
      const storedUser = getTelegramUser();
      if (storedUser) {
        setUser(storedUser);
      }
      setPlatform('web');
    }
  }, []);

  const login = (userData: TelegramUser) => {
    setUser(userData);
    window.puzzleUser = userData;
    window.puzzleCodeData = {
      ...window.puzzleCodeData,
      FIRST_NAME: userData.first_name,
      LAST_NAME: userData.last_name,
      USERNAME: userData.username,
      ID: userData.id,
      LANGUAGE: userData.language_code,
    };
  };

  const logout = () => {
    setUser(null);
    window.puzzleUser = null;
    window.puzzleCodeData = {
      PLATFORM: platform
    };
  };

  return (
    <UserContext.Provider
      value={{
        user,
        platform,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}
