import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { TelegramUser } from "@/types/window";
import { getTelegramUser, getPlatform, initTelegram } from "@/core/TelegramInit";
import { isTelegramMiniApp } from "@/lib/telegram";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface UserContextType {
  user: TelegramUser | null;
  supabaseUser: User | null;
  session: Session | null;
  platform: 'telegram' | 'web';
  isAuthenticated: boolean;
  login: (userData: TelegramUser) => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [platform, setPlatform] = useState<'telegram' | 'web'>('web');
  const [isLoading, setIsLoading] = useState(true);

  // Supabase auth listener for web users
  useEffect(() => {
    console.log('[UserContext] Setting up Supabase auth listener');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('[UserContext] Auth state changed:', event, newSession?.user?.email);
        setSession(newSession);
        setSupabaseUser(newSession?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      console.log('[UserContext] Existing session:', existingSession?.user?.email);
      setSession(existingSession);
      setSupabaseUser(existingSession?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Initialize Telegram user
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
      // Determine the correct platform
      const actualPlatform = platform === 'telegram' ? 'telegram' : 'web';
      
      // Save to backend using Supabase client (works in all environments)
      console.log('[UserContext] Saving to backend with platform:', actualPlatform);
      console.log('[UserContext] User data:', { 
        id: userData.id, 
        first_name: userData.first_name,
        platform: actualPlatform 
      });
      
      const { data: result, error } = await supabase.functions.invoke('telegram-auth', {
        body: {
          user: userData,
          platform: actualPlatform,
        },
      });

      if (error) {
        console.error('[UserContext] Backend error:', error);
        throw error;
      }

      console.log('[UserContext] Backend response:', result);

      // Store token if provided
      if (result?.token) {
        localStorage.setItem('telegram_token', result.token);
      }
      
      console.log('[UserContext] User saved to backend successfully');
    } catch (error) {
      console.error('[UserContext] Backend save error:', error);
      // Don't throw - user is already set locally
      // This ensures UI works even if backend is down
    }
  };

  const logout = async () => {
    console.log('[UserContext] Logging out');
    
    // Sign out from Supabase if web platform
    if (platform === 'web' && session) {
      await supabase.auth.signOut();
    }
    
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
    window.puzzleUser = null;
    window.puzzleCodeData = {
      PLATFORM: platform
    };
    localStorage.removeItem('telegram_token');
    localStorage.removeItem('puzzle_user');
    console.log('[UserContext] User logged out');
  };

  // Determine if user is authenticated (either Telegram or Supabase)
  const isAuthenticated = !!(user || supabaseUser);

  return (
    <UserContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        platform,
        isAuthenticated,
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
