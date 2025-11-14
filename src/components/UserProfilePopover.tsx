import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileModal } from "@/components/ProfileModal";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { isTelegramMiniApp } from "@/lib/telegram";
import { 
  Settings, 
  Gift, 
  HelpCircle, 
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  Crown,
  Languages,
  Zap,
  Pencil
} from "lucide-react";
import { toast } from "sonner";

const generateAvatarColor = (userId: string) => {
  const colors = [
    'hsl(270, 70%, 65%)',
    'hsl(340, 75%, 65%)',
    'hsl(200, 90%, 60%)',
    'hsl(160, 70%, 55%)',
    'hsl(30, 90%, 60%)',
    'hsl(280, 60%, 50%)',
    'hsl(180, 70%, 70%)',
    'hsl(350, 80%, 70%)',
  ];
  
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export function UserProfilePopover() {
  const { user, profileId, logout, supabaseUser, platform } = useUserContext();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const isMiniApp = isTelegramMiniApp();

  useEffect(() => {
    if (profileId && open) {
      loadProfile();
    }
  }, [profileId, open]);

  const loadProfile = async () => {
    if (!profileId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('[UserProfilePopover] Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const avatarColor = generateAvatarColor(profileId || '');
  const initials = getInitials(profile?.first_name || user?.first_name);
  
  // Calculate XP
  const xp = profile?.xp || 0;
  const nextLevelXp = 5000;
  const xpProgress = Math.min((xp % nextLevelXp) / nextLevelXp * 100, 100);
  const subscription = profile?.subscription_status || 'free';


  const handleLogout = () => {
    logout();
    setOpen(false);
    toast.success(t('loggedOut') || 'Вы вышли из аккаунта');
  };

  const handleLanguageChange = async (lang: 'ru' | 'en' | 'es') => {
    setLanguage(lang);
    
    if (profileId) {
      await supabase
        .from('profiles')
        .update({
          settings: {
            ...(profile?.settings || {}),
            language: lang
          }
        })
        .eq('id', profileId);
      toast.success(lang === 'ru' ? 'Язык изменен' : lang === 'en' ? 'Language changed' : 'Idioma cambiado');
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button 
            type="button"
            className="relative group z-10"
            style={{ pointerEvents: 'auto' }}
          >
            <Avatar className="h-10 w-10 ring-2 ring-border hover:ring-primary transition-all cursor-pointer">
              <AvatarImage 
                src={profile?.photo_url || user?.photo_url} 
                alt={profile?.first_name || user?.first_name} 
              />
              <AvatarFallback 
                className="text-white font-bold text-sm"
                style={{ backgroundColor: avatarColor }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0" 
          align="end"
          sideOffset={8}
        >
          <div className="p-4 space-y-4">
            {/* Header - кликабельный для редактирования */}
            <button
              onClick={() => {
                setOpen(false);
                setProfileModalOpen(true);
              }}
              className="w-full flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.photo_url || user?.photo_url} />
                <AvatarFallback 
                  className="text-white font-bold text-sm"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate">
                    {profile?.first_name || user?.first_name || 'User'}
                  </h3>
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </div>
                {supabaseUser?.email && (
                  <p className="text-xs text-muted-foreground truncate">
                    {supabaseUser.email}
                  </p>
                )}
              </div>
            </button>

            {/* XP Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">XP</span>
                <span className="text-sm text-muted-foreground">{xp.toLocaleString()} / {nextLevelXp.toLocaleString()}</span>
              </div>
              <Progress value={xpProgress} className="h-1.5" />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary" />
                Experience points
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-9 text-sm"
                onClick={() => {
                  setOpen(false);
                  setProfileModalOpen(true);
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="outline"
                className="h-9 text-sm"
                onClick={() => {
                  setOpen(false);
                  navigate('/referrals');
                }}
              >
                <Gift className="h-4 w-4 mr-2" />
                Invite
              </Button>
            </div>

            {/* Subscription Status */}
            {subscription === 'pro' && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">PRO</span>
              </div>
            )}

            <Separator />

            {/* Edit Profile */}
            <button
              onClick={() => {
                setOpen(false);
                setProfileModalOpen(true);
              }}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
            >
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-muted-foreground" />
                <span>Edit Profile</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>


            {/* Quick Actions */}
            <div className="space-y-1">
              <button
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  <span>Help Center</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              
              {/* Language Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm">
                    <div className="flex items-center gap-2">
                      <Languages className="h-4 w-4 text-muted-foreground" />
                      <span>Language</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {
                      handleLanguageChange('ru');
                    }}
                    className={language === 'ru' ? 'bg-accent' : ''}
                  >
                    <span className="mr-2">🇷🇺</span>
                    Русский
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      handleLanguageChange('en');
                    }}
                    className={language === 'en' ? 'bg-accent' : ''}
                  >
                    <span className="mr-2">🇬🇧</span>
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      handleLanguageChange('es');
                    }}
                    className={language === 'es' ? 'bg-accent' : ''}
                  >
                    <span className="mr-2">🇪🇸</span>
                    Español
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Theme Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm">
                    <div className="flex items-center gap-2">
                      {theme === 'dark' ? (
                        <Moon className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Sun className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>Appearance</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {
                      setTheme('light');
                      if (profileId) {
                        supabase
                          .from('profiles')
                          .update({
                            settings: {
                              ...(profile?.settings || {}),
                              theme: 'light'
                            }
                          })
                          .eq('id', profileId);
                      }
                      toast.success('Тема изменена');
                    }}
                    className={theme === 'light' ? 'bg-accent' : ''}
                  >
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setTheme('dark');
                      if (profileId) {
                        supabase
                          .from('profiles')
                          .update({
                            settings: {
                              ...(profile?.settings || {}),
                              theme: 'dark'
                            }
                          })
                          .eq('id', profileId);
                      }
                      toast.success('Тема изменена');
                    }}
                    className={theme === 'dark' ? 'bg-accent' : ''}
                  >
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setTheme('system');
                      if (profileId) {
                        supabase
                          .from('profiles')
                          .update({
                            settings: {
                              ...(profile?.settings || {}),
                              theme: 'system'
                            }
                          })
                          .eq('id', profileId);
                      }
                      toast.success('Тема изменена');
                    }}
                    className={theme === 'system' ? 'bg-accent' : ''}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Sign Out - только для веб */}
            {!isMiniApp && (
              <>
                <Separator />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-destructive/10 transition-colors text-sm text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t('logout') || 'Sign out'}</span>
                </button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Profile Modal для расширенных настроек */}
      <ProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
    </>
  );
}
