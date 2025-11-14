import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileModal } from "@/components/ProfileModal";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

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
  const { user, profileId } = useUserContext();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    console.log('[UserProfilePopover] State changed - open:', open, 'user:', user, 'profileId:', profileId);
  }, [open, user, profileId]);

  useEffect(() => {
    if (profileId) {
      loadProfile();
    }
  }, [profileId]);

  const loadProfile = async () => {
    if (!profileId) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const avatarColor = generateAvatarColor(profileId || '');
  const initials = getInitials(profile?.first_name || user?.first_name);

  // Use ProfileModal everywhere for consistency
  return (
    <>
      <button 
        type="button"
        className="relative group z-10"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('[UserProfilePopover] Button clicked, current open:', open, 'user:', user);
          setOpen(true);
          console.log('[UserProfilePopover] Set open to true');
        }}
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
      <ProfileModal open={open} onOpenChange={(newOpen) => {
        console.log('[UserProfilePopover] ProfileModal onOpenChange called with:', newOpen);
        setOpen(newOpen);
      }} />
    </>
  );
}
