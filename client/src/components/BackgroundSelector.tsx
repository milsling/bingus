import { useState, useEffect } from "react";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";

import abstractWaves from '@/assets/backgrounds/abstract-waves.webp';
import purpleCosmos from '@/assets/backgrounds/purple-cosmos.jpeg';
import retroSun from '@/assets/backgrounds/retro-sun.jpeg';
import neonLeaves from '@/assets/backgrounds/neon-leaves.jpeg';
import cityNight from '@/assets/backgrounds/city-night.jpeg';
import holographicMoney from '@/assets/backgrounds/holographic-money.jpeg';
import rainAlley from '@/assets/backgrounds/rain-alley.jpeg';
import nowhereStation from '@/assets/backgrounds/nowhere-station.jpeg';
import neonSign from '@/assets/backgrounds/neon-sign.jpeg';
import neonFace from '@/assets/backgrounds/neon-face.jpeg';
import cyberSkull from '@/assets/backgrounds/cyber-skull.jpeg';
import vaporwaveStatue from '@/assets/backgrounds/vaporwave-statue.jpeg';

export interface Background {
  id: string;
  name: string;
  image: string | null;
  unlockLevel: number;
  unlockDescription?: string;
  fallbackGradient?: string;
}

export const IMAGE_BACKGROUNDS: Background[] = [
  { 
    id: 'default', 
    name: 'Default', 
    image: null, 
    unlockLevel: 0,
    fallbackGradient: 'radial-gradient(ellipse at 50% 50%, rgba(168, 85, 247, 0.35) 0%, transparent 40%), radial-gradient(ellipse at center, #3d2066 0%, #1a1a2e 35%, #0f0f1a 100%)'
  },
  { id: 'abstract-waves', name: 'Abstract Waves', image: abstractWaves, unlockLevel: 0 },
  { id: 'purple-cosmos', name: 'Purple Cosmos', image: purpleCosmos, unlockLevel: 0 },
  { id: 'retro-sun', name: 'Retro Sun', image: retroSun, unlockLevel: 0 },
  { id: 'neon-leaves', name: 'Neon Leaves', image: neonLeaves, unlockLevel: 3, unlockDescription: 'Level 3' },
  { id: 'city-night', name: 'City Night', image: cityNight, unlockLevel: 5, unlockDescription: 'Level 5' },
  { id: 'holographic-money', name: 'Holographic', image: holographicMoney, unlockLevel: 7, unlockDescription: 'Level 7' },
  { id: 'rain-alley', name: 'Rain Alley', image: rainAlley, unlockLevel: 10, unlockDescription: 'Level 10' },
  { id: 'nowhere-station', name: 'Nowhere', image: nowhereStation, unlockLevel: 12, unlockDescription: 'Level 12' },
  { id: 'neon-sign', name: 'Neon Sign', image: neonSign, unlockLevel: 15, unlockDescription: 'Level 15' },
  { id: 'neon-face', name: 'Neon Face', image: neonFace, unlockLevel: 18, unlockDescription: 'Level 18' },
  { id: 'cyber-skull', name: 'Cyber Skull', image: cyberSkull, unlockLevel: 20, unlockDescription: 'Level 20' },
  { id: 'vaporwave-statue', name: 'Vaporwave', image: vaporwaveStatue, unlockLevel: 25, unlockDescription: 'Level 25' },
];

const STORAGE_KEY = "orphanbars-background";

export function useBackground() {
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || "default";
    }
    return "default";
  });

  const selectedBackground = IMAGE_BACKGROUNDS.find(bg => bg.id === selectedId) || IMAGE_BACKGROUNDS[0];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedId);
    
    const existingBgElement = document.getElementById('app-background-image');
    if (existingBgElement) {
      existingBgElement.remove();
    }

    if (selectedBackground.image) {
      const bgElement = document.createElement('div');
      bgElement.id = 'app-background-image';
      bgElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: -1;
        background-image: url(${selectedBackground.image});
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
        filter: blur(8px) brightness(0.6);
        transform: scale(1.1);
      `;
      document.body.prepend(bgElement);
      document.body.style.background = '#0a0a0f';
    } else {
      document.body.style.background = selectedBackground.fallbackGradient || '#0a0a0f';
      document.body.style.backgroundAttachment = 'fixed';
    }
  }, [selectedId, selectedBackground]);

  const setBackground = (id: string) => {
    setSelectedId(id);
  };

  const isUnlocked = (background: Background, userLevel: number) => {
    return userLevel >= background.unlockLevel;
  };

  return { 
    selectedId, 
    selectedBackground, 
    setBackground, 
    isUnlocked,
    backgrounds: IMAGE_BACKGROUNDS 
  };
}

export function BackgroundSelector() {
  const { selectedId, setBackground, isUnlocked, backgrounds } = useBackground();
  const { currentUser } = useBars();
  const userLevel = currentUser?.level || 1;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-white/90 mb-1">Background Wallpaper</h4>
        <p className="text-xs text-white/50">Unlock more as you level up</p>
      </div>
      
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
        {backgrounds.map((bg) => {
          const unlocked = isUnlocked(bg, userLevel);
          const isSelected = selectedId === bg.id;
          
          return (
            <button
              key={bg.id}
              onClick={() => unlocked && setBackground(bg.id)}
              disabled={!unlocked}
              className={cn(
                "relative aspect-[3/4] rounded-xl overflow-hidden transition-all duration-200",
                "border-2",
                isSelected 
                  ? "border-purple-500 ring-2 ring-purple-500/40 scale-[1.03]" 
                  : unlocked 
                    ? "border-white/15 hover:border-white/30 hover:scale-[1.02]"
                    : "border-white/10 opacity-50 cursor-not-allowed grayscale",
              )}
              data-testid={`background-${bg.id}`}
            >
              {bg.image ? (
                <img 
                  src={bg.image} 
                  alt={bg.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div 
                  className="w-full h-full"
                  style={{ background: bg.fallbackGradient }}
                />
              )}
              
              {!unlocked && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-0.5">
                  <Lock className="w-4 h-4 text-white/50" />
                  <span className="text-[9px] text-white/50 font-medium">
                    {bg.unlockDescription}
                  </span>
                </div>
              )}
              
              {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 pt-4">
                <span className="text-[9px] text-white/90 font-medium truncate block text-center">
                  {bg.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
