import { createContext, useContext, useState, ReactNode } from "react";

interface PreviewSkin {
  id: string;
  name_ru: string;
  metadata: {
    color?: string;
    effect?: string;
    animated?: boolean;
  };
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface PreviewBadge {
  id: string;
  name_ru: string;
  metadata: {
    icon?: string;
    color?: string;
    animated?: boolean;
  };
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface PreviewSticker {
  id: string;
  name_ru: string;
  metadata: {
    emoji?: string;
    effect?: string;
  };
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface CosmeticsPreviewContextType {
  previewSkin: PreviewSkin | null;
  previewBadges: PreviewBadge[];
  previewSticker: PreviewSticker | null;
  setPreviewSkin: (skin: PreviewSkin | null) => void;
  setPreviewBadges: (badges: PreviewBadge[]) => void;
  setPreviewSticker: (sticker: PreviewSticker | null) => void;
  clearPreview: () => void;
}

const CosmeticsPreviewContext = createContext<CosmeticsPreviewContextType | undefined>(undefined);

export function CosmeticsPreviewProvider({ children }: { children: ReactNode }) {
  const [previewSkin, setPreviewSkin] = useState<PreviewSkin | null>(null);
  const [previewBadges, setPreviewBadges] = useState<PreviewBadge[]>([]);
  const [previewSticker, setPreviewSticker] = useState<PreviewSticker | null>(null);

  const clearPreview = () => {
    setPreviewSkin(null);
    setPreviewBadges([]);
    setPreviewSticker(null);
  };

  return (
    <CosmeticsPreviewContext.Provider
      value={{
        previewSkin,
        previewBadges,
        previewSticker,
        setPreviewSkin,
        setPreviewBadges,
        setPreviewSticker,
        clearPreview,
      }}
    >
      {children}
    </CosmeticsPreviewContext.Provider>
  );
}

export function useCosmeticsPreview() {
  const context = useContext(CosmeticsPreviewContext);
  if (context === undefined) {
    throw new Error("useCosmeticsPreview must be used within a CosmeticsPreviewProvider");
  }
  return context;
}

export type { PreviewSkin, PreviewBadge, PreviewSticker };

