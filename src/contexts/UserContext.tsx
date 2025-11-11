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
  profileId: string | null; // ID профиля из таблицы profiles
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
  const [profileId, setProfileId] = useState<string | null>(null);

  // Load profile ID when user changes with optimistic loading and retry
  useEffect(() => {
    const loadProfileId = async () => {
      if (supabaseUser) {
        // For web users - get profile by user_id
        console.log('[UserContext] Loading profile for Supabase user:', supabaseUser.id);
        
        // Check cache first
        const cachedId = localStorage.getItem(`profile_${supabaseUser.id}`);
        if (cachedId) {
          console.log('[UserContext] Using cached profileId:', cachedId);
          setProfileId(cachedId);
        }
        
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', supabaseUser.id)
          .maybeSingle();
        
        if (data?.id) {
          setProfileId(data.id);
          localStorage.setItem(`profile_${supabaseUser.id}`, data.id);
          console.log('[UserContext] Loaded profile ID for web user:', data.id);
        }
      } else if (user) {
        // For Telegram users - get profile by telegram_id with retry
        console.log('[UserContext] Loading profile for Telegram user:', user.id);
        
        // Check cache first for instant load
        const cachedId = localStorage.getItem(`profile_${user.id}`);
        if (cachedId) {
          console.log('[UserContext] Using cached profileId:', cachedId);
          setProfileId(cachedId);
        }
        
        const queryProfile = async (attempt: number = 1): Promise<void> => {
          const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('telegram_id', user.id)
            .maybeSingle();

          if (error) {
            console.error('[UserContext] Error loading profile:', error);
          } else if (data?.id) {
            console.log('[UserContext] Loaded profile ID for Telegram user:', data.id);
            setProfileId(data.id);
            localStorage.setItem(`profile_${user.id}`, data.id);
          } else if (attempt < 5) {
            // Retry if profile not found yet (might be creating)
            console.log(`[UserContext] Profile not found, retry ${attempt}/5 in 500ms...`);
            setTimeout(() => queryProfile(attempt + 1), 500);
          } else {
            console.log('[UserContext] No profile found after 5 retries');
          }
        };

        queryProfile();
      } else {
        setProfileId(null);
      }
    };

    loadProfileId();
  }, [user, supabaseUser]);

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

  // Initialize Telegram user with enhanced fallbacks
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[UserContext] Initializing...');
      
      // Multiple attempts to get Telegram user data
      let telegramUser = initTelegram();
      
      // Retry mechanism for Telegram WebApp initialization
      if (!telegramUser && window.Telegram?.WebApp) {
        console.log('[UserContext] First attempt failed, retrying...');
        await new Promise(resolve => setTimeout(resolve, 300));
        telegramUser = getTelegramUser();
        
        if (!telegramUser) {
          await new Promise(resolve => setTimeout(resolve, 500));
          telegramUser = getTelegramUser();
        }
        
        // Additional retry with longer delay
        if (!telegramUser) {
          await new Promise(resolve => setTimeout(resolve, 800));
          telegramUser = getTelegramUser();
        }
      }
      
      // Fallback to window.puzzleUser or localStorage
      if (!telegramUser) {
        console.log('[UserContext] Checking fallback sources...');
        if (window.puzzleUser) {
          console.log('[UserContext] Using window.puzzleUser');
          telegramUser = window.puzzleUser;
        } else {
          const storedUserStr = localStorage.getItem('puzzle_user');
          if (storedUserStr) {
            try {
              console.log('[UserContext] Using stored user from localStorage');
              telegramUser = JSON.parse(storedUserStr);
            } catch (err) {
              console.error('[UserContext] Failed to parse stored user:', err);
            }
          }
        }
      }
      
      // Check platform after initialization
      const detectedPlatform = getPlatform();
      const isTelegramEnv = isTelegramMiniApp();

      console.log('[UserContext] Detected platform:', detectedPlatform);
      console.log('[UserContext] Is Telegram Mini App:', isTelegramEnv);
      console.log('[UserContext] Telegram User from init:', telegramUser);
      console.log('[UserContext] WebApp initDataUnsafe:', window.Telegram?.WebApp?.initDataUnsafe);

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
        
        // Persist to localStorage
        localStorage.setItem('puzzle_user', JSON.stringify(telegramUser));
        
        // Save to backend asynchronously (don't block UI)
        login(telegramUser).catch(err => {
          console.error('[UserContext] Auto-login failed:', err);
        });
      } else {
        // Check for stored token
        const token = localStorage.getItem('telegram_token');
        
        if (!token) {
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
    
    // Determine the actual platform based on current environment
    const isTelegramEnv = isTelegramMiniApp();
    const actualPlatform = isTelegramEnv ? 'telegram' : 'web';
    
    // Set platform immediately
    setPlatform(actualPlatform);
    
    window.puzzleCodeData = {
      ...window.puzzleCodeData,
      FIRST_NAME: userData.first_name,
      LAST_NAME: userData.last_name,
      USERNAME: userData.username,
      ID: userData.id,
      LANGUAGE: userData.language_code,
      PLATFORM: actualPlatform
    };
    
    // Store in localStorage for persistence
    localStorage.setItem('puzzle_user', JSON.stringify(userData));

    try {
      console.log('[UserContext] Saving to backend with platform:', actualPlatform);
      
      // Check for referral code from deep link
      const referralCode = sessionStorage.getItem('referral_code');
      if (referralCode) {
        console.log('[UserContext] Found referral code:', referralCode);
      }
      
      console.log('[UserContext] User data:', { 
        id: userData.id, 
        first_name: userData.first_name,
        platform: actualPlatform,
        hasReferralCode: !!referralCode
      });
      
      const { data: result, error } = await supabase.functions.invoke('telegram-auth', {
        body: {
          user: userData,
          platform: actualPlatform,
          referred_by_code: referralCode || undefined,
        },
      });

      if (error) {
        console.error('[UserContext] Backend error:', error);
        throw error;
      }

      console.log('[UserContext] Backend response:', result);

      // If we got profile data back, immediately set profileId
      if (result?.profile?.id) {
        console.log('[UserContext] Setting profileId from backend response:', result.profile.id);
        setProfileId(result.profile.id);
        localStorage.setItem(`profile_${userData.id}`, result.profile.id);
      }

      // Store token if provided
      if (result?.token) {
        localStorage.setItem('telegram_token', result.token);
      }
      
      // Clear referral code after successful use
      if (referralCode) {
        sessionStorage.removeItem('referral_code');
        console.log('[UserContext] Referral code cleared from session');
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
        profileId,
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
