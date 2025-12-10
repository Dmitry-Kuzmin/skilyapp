import { useState } from "react";
import { Key, CheckCircle2, XCircle, Gift } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserContext } from "@/contexts/UserContext";
import { usePremium } from "@/hooks/usePremium";

interface ActivatePremiumKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivatePremiumKeyModal({ open, onOpenChange }: ActivatePremiumKeyModalProps) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const { profileId } = useUserContext();
  const { refresh: refreshPremium } = usePremium();

  const handleActivate = async () => {
    if (!key.trim()) {
      toast.error("Введите ключ");
      return;
    }

    if (!profileId) {
      toast.error("Необходима авторизация");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("activate-premium-key", {
        body: {
          key: key.trim().toUpperCase(),
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("🎉 Premium Forever активирован!", {
          description: data.message,
          duration: 5000,
        });
        setKey("");
        onOpenChange(false);
        // Refresh premium status
        refreshPremium();
      } else {
        toast.error("Ошибка активации", {
          description: data.message || "Неверный ключ",
        });
      }
    } catch (error: any) {
      console.error("[ActivatePremiumKeyModal] Error:", error);
      toast.error("Ошибка активации ключа", {
        description: error.message || "Попробуйте позже",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      modalRouteKey="activate-key"
      title="Активация Premium Forever"
      description="Введите ключ, полученный от партнера"
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-5 w-5 text-amber-500" />
            <span className="font-semibold">Premium Forever</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Активируй ключ и получи пожизненный доступ ко всем функциям приложения!
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="premium-key">Ключ активации</Label>
          <Input
            id="premium-key"
            placeholder="PREMIUM-XXXX-XXXX-XXXX"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                handleActivate();
              }
            }}
            disabled={loading}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Формат: PREMIUM-XXXX-XXXX-XXXX
          </p>
        </div>

        <Button
          onClick={handleActivate}
          disabled={loading || !key.trim()}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Активация...
            </>
          ) : (
            <>
              <Key className="h-4 w-4 mr-2" />
              Активировать ключ
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>Получил ключ от партнера?</p>
          <p>Введи его здесь и получи Premium Forever!</p>
        </div>
      </div>
    </UnifiedModal>
  );
}
