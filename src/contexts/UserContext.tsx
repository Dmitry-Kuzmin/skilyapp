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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
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

      // Auto-login for Telegram Mini App with user data
      if (telegramUser) {
        console.log('[UserContext] Auto-logging in Telegram user:', telegramUser.first_name);
        
        // Set user immediately for instant UI feedback
        setUser(telegramUser);
        window.puzzleUser = telegramUser;
        window.puzzleCodeData = {
          FIRST_NAME: telegramUser.first_name,
          LAST_NAME: telegramUser.last_name,
          USERNAME: telegramUser.username,
          ID: telegramUser.id,
          LANGUAGE: telegramUser.language_code,
          PLATFORM: detectedPlatform
        };
        
        // Save to backend asynchronously
        try {
          await login(telegramUser);
          console.log('[UserContext] Auto-login successful');
        } catch (err) {
          console.error('[UserContext] Auto-login failed:', err);
          // User is already set locally, so UI still works
        }
      } else {
        // Check for stored token and user
        const token = localStorage.getItem('telegram_token');
        const storedUserStr = localStorage.getItem('puzzle_user');
        
        if (token && storedUserStr) {
          try {
            const storedUser = JSON.parse(storedUserStr);
            console.log('[UserContext] Restoring user from localStorage');
            setUser(storedUser);
            window.puzzleUser = storedUser;
          } catch (err) {
            console.error('[UserContext] Failed to restore user:', err);
            localStorage.removeItem('telegram_token');
            localStorage.removeItem('puzzle_user');
          }
        } else {
          console.log('[UserContext] No stored session - user needs to login');
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (userData: TelegramUser) => {
    console.log('[UserContext] Login started for:', userData.first_name);
    
    // Update local state immediately for instant UI feedback
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
    
    // Store in localStorage for persistence
    localStorage.setItem('puzzle_user', JSON.stringify(userData));

    try {
      // Save to backend asynchronously
      console.log('[UserContext] Saving to backend...');
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
            platform: platform || 'telegram',
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[UserContext] Backend error:', errorText);
        throw new Error(`Failed to authenticate: ${errorText}`);
      }

      const result = await response.json();
      console.log('[UserContext] Backend response:', result);

      // Store token if provided
      if (result.token) {
        localStorage.setItem('telegram_token', result.token);
      }
      
      console.log('[UserContext] User saved to backend successfully');
    } catch (error) {
      console.error('[UserContext] Backend save error:', error);
      // Don't throw - user is already set locally
      // This ensures UI works even if backend is down
    }
  };

  const logout = () => {
    setUser(null);
    window.puzzleUser = null;
    window.puzzleCodeData = {
      PLATFORM: platform
    };
    localStorage.removeItem('telegram_token');
    localStorage.removeItem('puzzle_user');
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
