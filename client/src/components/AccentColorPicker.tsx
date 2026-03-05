import { useEffect, useState } from "react";
import { Lock, Palette, Sparkles, Wand2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useTheme, extractAccentColorFromBackground } from "@/contexts/ThemeContext";
import { useBackground } from "@/components/BackgroundSelector";

const ACCENT_PRESETS = [
  { name: "Purple", value: "265 70% 60%", hex: "#8b5cf6" },
  { name: "Blue", value: "210 70% 60%", hex: "#3b82f6" },
  { name: "Indigo", value: "240 70% 60%", hex: "#6366f1" },
  { name: "Teal", value: "174 70% 60%", hex: "#2dd4bf" },
  { name: "Green", value: "142 70% 50%", hex: "#22c55e" },
  { name: "Orange", value: "25 90% 55%", hex: "#f97316" },
  { name: "Red", value: "0 70% 60%", hex: "#ef4444" },
  { name: "Pink", value: "330 70% 60%", hex: "#ec4899" },
  { name: "Rose", value: "350 80% 65%", hex: "#fb7185" },
  { name: "Amber", value: "38 92% 50%", hex: "#f59e0b" },
  { name: "Cyan", value: "190 80% 55%", hex: "#06b6d4" },
  { name: "Lime", value: "82 80% 45%", hex: "#84cc16" },
];

interface AccentColorPickerProps {
  isProMember: boolean;
}

export default function AccentColorPicker({ isProMember }: AccentColorPickerProps) {
  const { settings, updateSettings } = useTheme();
  const { selectedBackground } = useBackground();
  const [isExtracting, setIsExtracting] = useState(false);

  // Auto-extract accent color from the selected background when in auto mode
  useEffect(() => {
    if (settings.accentColorMode !== "auto") return;

    const extractColor = async () => {
      if (!selectedBackground?.image) {
        // Default background — keep default purple
        updateSettings({ accentColor: "265 70% 60%" });
        return;
      }

      setIsExtracting(true);
      try {
        const extracted = await extractAccentColorFromBackground(selectedBackground.image);
        // Boost saturation and adjust lightness for better accent vibrancy
        const parts = extracted.split(" ");
        if (parts.length === 3) {
          const h = parseInt(parts[0]);
          let s = parseInt(parts[1]);
          let l = parseInt(parts[2]);
          // Ensure the color is vibrant enough for an accent
          s = Math.max(s, 55);
          l = Math.min(Math.max(l, 45), 65);
          updateSettings({ accentColor: `${h} ${s}% ${l}%` });
        } else {
          updateSettings({ accentColor: extracted });
        }
      } catch {
        // Keep current on failure
      } finally {
        setIsExtracting(false);
      }
    };

    extractColor();
  }, [settings.accentColorMode, selectedBackground?.id]);

  // Locked state for free tier
  if (!isProMember) {
    return (
      <div className="relative">
        <div className="pointer-events-none opacity-50 select-none">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Accent Color</Label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_PRESETS.slice(0, 8).map((color) => (
                <div
                  key={color.value}
                  className="w-8 h-8 rounded-full border-2 border-foreground/10"
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-foreground/15 shadow-lg">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">PRO Feature</span>
          </div>
        </div>
      </div>
    );
  }

  const isAuto = settings.accentColorMode === "auto";

  return (
    <div className="space-y-4">
      {/* Auto from background toggle */}
      <div className="flex items-center justify-between rounded-xl border border-foreground/10 p-3">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">Auto from background</p>
            <p className="text-xs text-muted-foreground">
              Pick accent color from your background
            </p>
          </div>
        </div>
        <Switch
          checked={isAuto}
          onCheckedChange={(checked) =>
            updateSettings({ accentColorMode: checked ? "auto" : "manual" })
          }
        />
      </div>

      {/* Auto mode indicator */}
      {isAuto && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div
            className="w-10 h-10 rounded-full border-2 border-primary/30 shadow-inner flex-shrink-0"
            style={{ backgroundColor: `hsl(${settings.accentColor})` }}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium flex items-center gap-1.5">
              {isExtracting ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 animate-spin text-primary" />
                  Extracting…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Color matched to background
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              hsl({settings.accentColor})
            </p>
          </div>
        </div>
      )}

      {/* Manual color selection */}
      {!isAuto && (
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            Choose Accent Color
          </Label>
          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((color) => {
              const isSelected = settings.accentColor === color.value;
              return (
                <button
                  key={color.value}
                  onClick={() => updateSettings({ accentColor: color.value })}
                  className={cn(
                    "w-9 h-9 rounded-full border-2 transition-all duration-200 relative",
                    isSelected
                      ? "border-foreground scale-110 shadow-lg"
                      : "border-foreground/10 hover:border-foreground/30 hover:scale-105",
                  )}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                >
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Current accent preview */}
          <div className="flex items-center gap-2 pt-1">
            <div
              className="w-6 h-6 rounded-full border border-foreground/15"
              style={{ backgroundColor: `hsl(${settings.accentColor})` }}
            />
            <span className="text-xs text-muted-foreground font-mono">
              hsl({settings.accentColor})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
