/**
 * LandingUserContext - Легкий контекст для лендинга БЕЗ Supabase
 * Используется только для проверки Telegram авторизации
 * Supabase загружается динамически только когда нужен (через referralService)
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { TelegramUser } from "@/types/window";
import { getTelegramUser, getPlatform, initTelegram } from "@/core/TelegramInit";
import { isTelegramMiniApp } from "@/lib/telegram";

interface LandingUserContextType {
  user: TelegramUser | null;
  platform: 'telegram' | 'web';
  isAuthenticated: boolean;
  isLoading: boolean;
}

const LandingUserContext = createContext<LandingUserContextType | undefined>(undefined);

export function LandingUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [platform, setPlatform] = useState<'telegram' | 'web'>('web');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Telegram user (без Supabase)
  useEffect(() => {
    const initializeAuth = async () => {
      // Проверяем, является ли Telegram WebApp моком
      const isMockTelegram = window.Telegram?.WebApp?.initData === 'mock_init_data' ||
                            window.Telegram?.WebApp?.initData?.startsWith('mock_') ||
                            (window.Telegram?.WebApp?.initDataUnsafe?.user?.id === 123456789 && 
                             window.Telegram?.WebApp?.initDataUnsafe?.user?.username === 'test_user');
      
      if (isMockTelegram) {
        setIsLoading(false);
        return;
      }
      
      // Multiple attempts to get Telegram user data
      let telegramUser = initTelegram();
      
      // Retry mechanism for Telegram WebApp initialization
      if (!telegramUser && window.Telegram?.WebApp && !isMockTelegram) {
        await new Promise(resolve => setTimeout(resolve, 300));
        telegramUser = getTelegramUser();
        
        if (telegramUser && (telegramUser.id === 123456789 || telegramUser.username === 'test_user')) {
          telegramUser = null;
        }
        
        if (!telegramUser) {
          await new Promise(resolve => setTimeout(resolve, 500));
          telegramUser = getTelegramUser();
          
          if (telegramUser && (telegramUser.id === 123456789 || telegramUser.username === 'test_user')) {
            telegramUser = null;
          }
        }
        
        if (!telegramUser) {
          await new Promise(resolve => setTimeout(resolve, 800));
          telegramUser = getTelegramUser();
          
          if (telegramUser && (telegramUser.id === 123456789 || telegramUser.username === 'test_user')) {
            telegramUser = null;
          }
        }
      }
      
      // Fallback to window.puzzleUser or localStorage
      if (!telegramUser) {
        if (window.puzzleUser) {
          if (window.puzzleUser.id === 123456789 || window.puzzleUser.username === 'test_user') {
            // Mock user, skip
          } else {
            telegramUser = window.puzzleUser;
          }
        } else {
          const storedUserStr = localStorage.getItem('puzzle_user');
          if (storedUserStr) {
            try {
              const parsedUser = JSON.parse(storedUserStr);
              if (parsedUser.id === 123456789 || parsedUser.username === 'test_user') {
                // Mock user, skip
              } else {
                telegramUser = parsedUser;
              }
            } catch (err) {
              console.error('[LandingUserContext] Failed to parse stored user:', err);
            }
          }
        }
      }
      
      const detectedPlatform = getPlatform();
      const isTelegramEnv = isTelegramMiniApp();
      
      setPlatform(detectedPlatform);
      
      // Auto-login for Telegram Mini App (только если не мок)
      if (telegramUser && telegramUser.id !== 123456789 && telegramUser.username !== 'test_user') {
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
        
        localStorage.setItem('puzzle_user', JSON.stringify(telegramUser));
      }
      
      setIsLoading(false);
    };
    
    initializeAuth();
  }, []);

  const isAuthenticated = !!user;

  return (
    <LandingUserContext.Provider value={{ user, platform, isAuthenticated, isLoading }}>
      {children}
    </LandingUserContext.Provider>
  );
}

export function useLandingUserContext() {
  const context = useContext(LandingUserContext);
  if (context === undefined) {
    throw new Error('useLandingUserContext must be used within LandingUserProvider');
  }
  return context;
}

