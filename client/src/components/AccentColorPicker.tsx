import { useEffect, useRef, useState } from "react";
import { Lock, Palette, Sparkles, Wand2, Pipette, Blend } from "lucide-react";
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

const GRADIENT_PRESETS = [
  { name: "Sunset", from: "0 70% 60%", to: "38 92% 50%", angle: 135 },
  { name: "Ocean", from: "210 70% 60%", to: "174 70% 60%", angle: 135 },
  { name: "Berry", from: "265 70% 60%", to: "330 70% 60%", angle: 135 },
  { name: "Fire", from: "0 70% 60%", to: "25 90% 55%", angle: 135 },
  { name: "Aurora", from: "174 70% 60%", to: "265 70% 60%", angle: 135 },
  { name: "Peach", from: "350 80% 65%", to: "38 92% 50%", angle: 135 },
];

// Convert hex color to HSL string
function hexToHsl(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Convert HSL string to hex
function hslToHex(hslStr: string): string {
  const parts = hslStr.replace(/%/g, '').split(' ');
  if (parts.length < 3) return '#8b5cf6';
  const h = parseInt(parts[0]) / 360;
  const s = parseInt(parts[1]) / 100;
  const l = parseInt(parts[2]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

interface AccentColorPickerProps {
  isProMember: boolean;
}

export default function AccentColorPicker({ isProMember }: AccentColorPickerProps) {
  // Locked state for free tier - check BEFORE any hooks
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

  // All hooks must be called after early returns
  const { settings, updateSettings } = useTheme();
  const { selectedBackground } = useBackground();
  const [isExtracting, setIsExtracting] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

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

      {/* Solid / Gradient toggle */}
      {!isAuto && (
        <div className="flex items-center gap-2 rounded-xl border border-foreground/10 p-1">
          <button
            onClick={() => updateSettings({ accentType: 'solid' })}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              (settings.accentType || 'solid') === 'solid'
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            )}
          >
            <Palette className="h-3.5 w-3.5" />
            Solid
          </button>
          <button
            onClick={() => updateSettings({ accentType: 'gradient' })}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              settings.accentType === 'gradient'
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            )}
          >
            <Blend className="h-3.5 w-3.5" />
            Gradient
          </button>
        </div>
      )}

      {/* Gradient mode */}
      {!isAuto && settings.accentType === 'gradient' && (
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Blend className="h-3.5 w-3.5" />
            Gradient Presets
          </Label>
          <div className="flex flex-wrap gap-2">
            {GRADIENT_PRESETS.map((preset) => {
              const isSelected = settings.accentGradientFrom === preset.from && settings.accentGradientTo === preset.to;
              return (
                <button
                  key={preset.name}
                  onClick={() => {
                    updateSettings({
                      accentGradientFrom: preset.from,
                      accentGradientTo: preset.to,
                      accentGradientAngle: preset.angle,
                      accentColor: preset.from,
                    });
                  }}
                  className={cn(
                    "w-9 h-9 rounded-full border-2 transition-all duration-200 relative",
                    isSelected
                      ? "border-foreground scale-110 shadow-lg"
                      : "border-foreground/10 hover:border-foreground/30 hover:scale-105",
                  )}
                  style={{
                    background: `linear-gradient(${preset.angle}deg, hsl(${preset.from}), hsl(${preset.to}))`,
                  }}
                  title={preset.name}
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

          {/* Gradient preview */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
            <div
              className="w-full h-10 rounded-lg border border-foreground/10"
              style={{
                background: `linear-gradient(${settings.accentGradientAngle ?? 135}deg, hsl(${settings.accentGradientFrom || settings.accentColor}), hsl(${settings.accentGradientTo || '210 70% 60%'}))`,
              }}
            />

            {/* From color */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">From — Hue</label>
              <input
                type="range"
                min="0"
                max="360"
                value={parseInt((settings.accentGradientFrom || settings.accentColor).split(' ')[0] || '265')}
                onChange={(e) => {
                  const parts = (settings.accentGradientFrom || settings.accentColor).replace(/%/g, '').split(' ');
                  const s = parts[1] || '70';
                  const l = parts[2] || '60';
                  const newFrom = `${e.target.value} ${s}% ${l}%`;
                  updateSettings({ accentGradientFrom: newFrom, accentColor: newFrom });
                }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: "linear-gradient(to right, hsl(0 80% 60%), hsl(60 80% 60%), hsl(120 80% 60%), hsl(180 80% 60%), hsl(240 80% 60%), hsl(300 80% 60%), hsl(360 80% 60%))",
                }}
              />
            </div>

            {/* To color */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">To — Hue</label>
              <input
                type="range"
                min="0"
                max="360"
                value={parseInt((settings.accentGradientTo || '210 70% 60%').split(' ')[0] || '210')}
                onChange={(e) => {
                  const parts = (settings.accentGradientTo || '210 70% 60%').replace(/%/g, '').split(' ');
                  const s = parts[1] || '70';
                  const l = parts[2] || '60';
                  updateSettings({ accentGradientTo: `${e.target.value} ${s}% ${l}%` });
                }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: "linear-gradient(to right, hsl(0 80% 60%), hsl(60 80% 60%), hsl(120 80% 60%), hsl(180 80% 60%), hsl(240 80% 60%), hsl(300 80% 60%), hsl(360 80% 60%))",
                }}
              />
            </div>

            {/* Angle */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Angle ({settings.accentGradientAngle ?? 135}°)</label>
              <input
                type="range"
                min="0"
                max="360"
                value={settings.accentGradientAngle ?? 135}
                onChange={(e) => updateSettings({ accentGradientAngle: parseInt(e.target.value) })}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, hsl(${settings.accentGradientFrom || settings.accentColor}), hsl(${settings.accentGradientTo || '210 70% 60%'}))`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Manual color selection */}
      {!isAuto && (settings.accentType || 'solid') === 'solid' && (
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            Choose Accent Color
          </Label>
          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((color) => {
              const isSelected = settings.accentColor === color.value && !showCustomPicker;
              return (
                <button
                  key={color.value}
                  onClick={() => {
                    updateSettings({ accentColor: color.value });
                    setShowCustomPicker(false);
                  }}
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

            {/* Custom color picker trigger */}
            <button
              onClick={() => {
                setShowCustomPicker(true);
                // Small delay so the ref is available
                setTimeout(() => colorInputRef.current?.click(), 50);
              }}
              className={cn(
                "w-9 h-9 rounded-full border-2 transition-all duration-200 relative overflow-hidden",
                showCustomPicker
                  ? "border-foreground scale-110 shadow-lg"
                  : "border-foreground/10 hover:border-foreground/30 hover:scale-105",
              )}
              style={{
                background: showCustomPicker
                  ? `hsl(${settings.accentColor})`
                  : "conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
              }}
              title="Custom Color"
            >
              {showCustomPicker ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Pipette className="h-3.5 w-3.5 text-white drop-shadow-md" />
                </div>
              )}
            </button>

            {/* Hidden native color input */}
            <input
              ref={colorInputRef}
              type="color"
              className="sr-only"
              value={hslToHex(settings.accentColor)}
              onChange={(e) => {
                const hsl = hexToHsl(e.target.value);
                // Boost saturation for accent vibrancy
                const parts = hsl.split(' ');
                if (parts.length === 3) {
                  const h = parseInt(parts[0]);
                  let s = parseInt(parts[1]);
                  let l = parseInt(parts[2]);
                  s = Math.max(s, 40);
                  l = Math.min(Math.max(l, 35), 70);
                  updateSettings({ accentColor: `${h} ${s}% ${l}%` });
                } else {
                  updateSettings({ accentColor: hsl });
                }
                setShowCustomPicker(true);
              }}
            />
          </div>

          {/* Custom color fine-tuning (shown when custom picker is active) */}
          {showCustomPicker && (
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <Pipette className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium">Custom Color</span>
              </div>
              {/* Hue slider */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Hue</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={parseInt(settings.accentColor.split(' ')[0] || '265')}
                  onChange={(e) => {
                    const parts = settings.accentColor.replace(/%/g, '').split(' ');
                    const s = parts[1] || '70';
                    const l = parts[2] || '60';
                    updateSettings({ accentColor: `${e.target.value} ${s}% ${l}%` });
                  }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: "linear-gradient(to right, hsl(0 80% 60%), hsl(60 80% 60%), hsl(120 80% 60%), hsl(180 80% 60%), hsl(240 80% 60%), hsl(300 80% 60%), hsl(360 80% 60%))",
                  }}
                />
              </div>
              {/* Saturation slider */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Saturation</label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={parseInt(settings.accentColor.split(' ')[1] || '70')}
                  onChange={(e) => {
                    const parts = settings.accentColor.replace(/%/g, '').split(' ');
                    const h = parts[0] || '265';
                    const l = parts[2] || '60';
                    updateSettings({ accentColor: `${h} ${e.target.value}% ${l}%` });
                  }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, hsl(${parseInt(settings.accentColor.split(' ')[0] || '265')} 20% 60%), hsl(${parseInt(settings.accentColor.split(' ')[0] || '265')} 100% 60%))`,
                  }}
                />
              </div>
              {/* Lightness slider */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Lightness</label>
                <input
                  type="range"
                  min="30"
                  max="75"
                  value={parseInt(settings.accentColor.split(' ')[2] || '60')}
                  onChange={(e) => {
                    const parts = settings.accentColor.replace(/%/g, '').split(' ');
                    const h = parts[0] || '265';
                    const s = parts[1] || '70';
                    updateSettings({ accentColor: `${h} ${s}% ${e.target.value}%` });
                  }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, hsl(${parseInt(settings.accentColor.split(' ')[0] || '265')} ${parseInt(settings.accentColor.split(' ')[1] || '70')}% 30%), hsl(${parseInt(settings.accentColor.split(' ')[0] || '265')} ${parseInt(settings.accentColor.split(' ')[1] || '70')}% 75%))`,
                  }}
                />
              </div>
              {/* Pick from system button */}
              <button
                onClick={() => colorInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-foreground/10 text-xs font-medium hover:bg-foreground/[0.04] transition-colors"
              >
                <Pipette className="h-3.5 w-3.5" />
                Open Color Picker
              </button>
            </div>
          )}

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
