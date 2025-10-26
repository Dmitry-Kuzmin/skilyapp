import { useState } from "react";
import { User } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { SettingsDrawer } from "./SettingsDrawer";

export function UserProfileFab() {
  const [open, setOpen] = useState(false);
  const { user } = useUserContext();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full gradient-primary shadow-elegant flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        aria-label="Открыть профиль"
      >
        {user?.photo_url ? (
          <img 
            src={user.photo_url} 
            alt={user.first_name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <User className="w-6 h-6 text-primary-foreground" />
        )}
      </button>

      <SettingsDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
