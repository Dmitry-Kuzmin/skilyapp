import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { TelegramUser } from "@/types/window";
import { getTelegramUser, getPlatform, initTelegram } from "@/core/TelegramInit";
import { isTelegramMiniApp } from "@/lib/telegram";
import { supabase } from "@/integrations/supabase/client";

interface UserContextType {
  user: TelegramUser | null;
  platform: 'telegram' | 'web';
  isAuthenticated: boolean;
  login: (userData: TelegramUser) => Promise<void>;
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
    
    // Check platform after initialization
    const detectedPlatform = getPlatform();
    const isTelegramEnv = isTelegramMiniApp();

    console.log('[UserContext] Detected platform:', detectedPlatform);
    console.log('[UserContext] Is Telegram Mini App:', isTelegramEnv);
    console.log('[UserContext] Telegram User from init:', telegramUser);

    setPlatform(detectedPlatform);

    // Auto-login for Telegram Mini App
    if (telegramUser && detectedPlatform === 'telegram') {
      console.log('[UserContext] Auto-logging in Telegram user');
      login(telegramUser).catch(err => {
        console.error('[UserContext] Auto-login failed:', err);
      });
    } else {
      // Check if user data was set by initTelegram
      const storedUser = getTelegramUser();
      if (storedUser) {
        console.log('[UserContext] Setting user from stored data');
        setUser(storedUser);
      } else {
        console.log('[UserContext] No user found - web mode, need to login');
      }
    }
  }, []);

  const login = async (userData: TelegramUser) => {
    try {
      // Save to backend
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            user: userData,
            platform: platform,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to authenticate');
      }

      const { profile, token } = await response.json();

      // Update local state
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

      // Store token
      localStorage.setItem('telegram_token', token);
      
      console.log('[UserContext] User logged in:', userData.first_name);
    } catch (error) {
      console.error('[UserContext] Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    window.puzzleUser = null;
    window.puzzleCodeData = {
      PLATFORM: platform
    };
    localStorage.removeItem('telegram_token');
    console.log('[UserContext] User logged out');
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
