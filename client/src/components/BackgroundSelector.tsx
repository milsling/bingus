import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type BackgroundVariant = "aurora" | "midnight" | "cosmic";

const BACKGROUNDS: Record<BackgroundVariant, { name: string; preview: string; css: string }> = {
  aurora: {
    name: "Aurora",
    preview: "linear-gradient(135deg, #3d2066 0%, #1a1a2e 50%, #0f0f1a 100%)",
    css: `
      radial-gradient(ellipse at 50% 50%, rgba(168, 85, 247, 0.35) 0%, transparent 40%),
      radial-gradient(ellipse at 30% 30%, rgba(139, 69, 180, 0.4) 0%, transparent 45%),
      radial-gradient(ellipse at 70% 70%, rgba(59, 130, 246, 0.35) 0%, transparent 45%),
      radial-gradient(ellipse at 20% 80%, rgba(236, 72, 153, 0.25) 0%, transparent 40%),
      radial-gradient(ellipse at 80% 20%, rgba(99, 102, 241, 0.3) 0%, transparent 40%),
      radial-gradient(ellipse at center, #3d2066 0%, #1a1a2e 35%, #0f0f1a 100%)
    `
  },
  midnight: {
    name: "Midnight",
    preview: "linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 50%, #050510 100%)",
    css: `
      radial-gradient(ellipse at 50% 40%, rgba(88, 28, 135, 0.25) 0%, transparent 50%),
      radial-gradient(ellipse at 30% 70%, rgba(55, 48, 107, 0.2) 0%, transparent 45%),
      radial-gradient(ellipse at 70% 30%, rgba(49, 46, 129, 0.2) 0%, transparent 45%),
      radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1a 40%, #050510 100%)
    `
  },
  cosmic: {
    name: "Cosmic",
    preview: "linear-gradient(135deg, #4a1d6e 0%, #2d1b4e 50%, #0f0f1a 100%)",
    css: `
      radial-gradient(ellipse at 50% 50%, rgba(168, 85, 247, 0.5) 0%, transparent 35%),
      radial-gradient(ellipse at 25% 25%, rgba(192, 132, 252, 0.35) 0%, transparent 40%),
      radial-gradient(ellipse at 75% 75%, rgba(124, 58, 237, 0.4) 0%, transparent 40%),
      radial-gradient(ellipse at 40% 80%, rgba(139, 92, 246, 0.3) 0%, transparent 45%),
      radial-gradient(ellipse at 60% 20%, rgba(167, 139, 250, 0.3) 0%, transparent 45%),
      radial-gradient(ellipse at center, #4a1d6e 0%, #2d1b4e 30%, #0f0f1a 100%)
    `
  }
};

const STORAGE_KEY = "orphanbars-background";

export function useBackground() {
  const [variant, setVariant] = useState<BackgroundVariant>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(STORAGE_KEY) as BackgroundVariant) || "aurora";
    }
    return "aurora";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, variant);
    document.body.style.background = BACKGROUNDS[variant].css;
    document.body.style.backgroundAttachment = "fixed";
  }, [variant]);

  return { variant, setVariant, backgrounds: BACKGROUNDS };
}

interface BackgroundSelectorProps {
  variant: BackgroundVariant;
  onSelect: (variant: BackgroundVariant) => void;
}

export function BackgroundSelector({ variant, onSelect }: BackgroundSelectorProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-white/70">Background Theme</h4>
      <div className="flex gap-3">
        {(Object.keys(BACKGROUNDS) as BackgroundVariant[]).map((key) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={cn(
              "relative w-20 h-14 rounded-xl overflow-hidden border-2 transition-all",
              variant === key 
                ? "border-primary ring-2 ring-primary/30" 
                : "border-white/10 hover:border-white/30"
            )}
            data-testid={`background-${key}`}
          >
            <div 
              className="absolute inset-0" 
              style={{ background: BACKGROUNDS[key].preview }}
            />
            {variant === key && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Check className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="absolute bottom-1 left-0 right-0 text-[9px] text-white/80 text-center font-medium">
              {BACKGROUNDS[key].name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
