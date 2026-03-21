import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from "@/contexts/ThemeContext";
import { defaultThemeSettings, extractAccentColorFromBackground } from "@/contexts/ThemeContext";
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Palette, Image, Trash2, Download, Globe } from 'lucide-react';
import ThemePresetSelector from './ThemePresetSelector';

// Helper functions to convert between hex and rgba
function hexFromRgba(rgba: string): string {
  if (!rgba || rgba.startsWith('#')) return rgba || '#ffffff';
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#ffffff';
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function rgbaFromHex(hex: string, opacity: number): string {
  if (!hex || !hex.startsWith('#')) return `rgba(255, 255, 255, ${opacity})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)})`;
}

function opacityFromRgba(rgba: string): number {
  if (!rgba) return 0.18;
  const match = rgba.match(/rgba?\([^)]+,\s*([\d.]+)\s*\)/);
  if (!match) return 0.18;
  return parseFloat(match[1]) || 0.18;
}

function hslTokenFromHex(hex: string): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return '0 0% 96%';

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  let h = 0;
  let s = 0;

  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hexFromHslToken(hslToken: string): string {
  const match = hslToken?.trim().match(/^(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!match) return '#f5f5f5';

  const hRaw = parseFloat(match[1]);
  const s = Math.max(0, Math.min(100, parseFloat(match[2]))) / 100;
  const l = Math.max(0, Math.min(100, parseFloat(match[3]))) / 100;

  const h = ((hRaw % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (h < 60) {
    r1 = c; g1 = x;
  } else if (h < 120) {
    r1 = x; g1 = c;
  } else if (h < 180) {
    g1 = c; b1 = x;
  } else if (h < 240) {
    g1 = x; b1 = c;
  } else if (h < 300) {
    r1 = x; b1 = c;
  } else {
    r1 = c; b1 = x;
  }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

interface ThemeSettingsProps {
  isOwner?: boolean;
}

export default function ThemeSettings({ isOwner = false }: ThemeSettingsProps) {
  // All hooks must be called unconditionally at the top level
  const { canCustomize, settings, updateSettings, addCustomBackground, removeCustomBackground } = useTheme();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Allow access if owner prop is true OR if canCustomize is true
  const hasAccess = isOwner || canCustomize;

  // Mutation for pushing theme to all users (owner only)
  const pushThemeMutation = useMutation({
    mutationFn: async (themeSettings: any) => {
      const res = await fetch("/api/backgrounds/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ themeSettings }),
      });
      if (!res.ok) throw new Error("Failed to save theme settings");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Theme pushed!", description: "All users will now see your theme settings." });
    },
    onError: (e: any) => {
      toast({ title: "Failed to push theme", description: e.message, variant: "destructive" });
    },
  });

  // Auto-extract accent color when background changes and mode is auto
  useEffect(() => {
    if (settings.accentColorMode === 'auto' && settings.backgroundValue) {
      // Extract from any background (custom, gradient, or default)
      if (settings.backgroundType === 'custom' && settings.backgroundValue) {
        extractAccentColorFromBackground(settings.backgroundValue).then((extractedColor) => {
          updateSettings({ accentColor: extractedColor });
        }).catch(() => {
          // Keep current color if extraction fails
        });
      } else if (settings.backgroundType === 'gradient' && settings.backgroundValue) {
        // Extract color from gradient - sample the first color stop
        const gradientMatch = settings.backgroundValue.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/);
        if (gradientMatch) {
          const hex = gradientMatch[0];
          const r = parseInt(hex.slice(1, 3), 16) / 255;
          const g = parseInt(hex.slice(3, 5), 16) / 255;
          const b = parseInt(hex.slice(5, 7), 16) / 255;
          
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
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
          
          const hslString = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
          updateSettings({ accentColor: hslString });
        }
      } else if (settings.backgroundType === 'default') {
        // For default background, use a complementary color based on the background
        updateSettings({ accentColor: '265 70% 60%' }); // Default purple
      }
    }
  }, [settings.backgroundValue, settings.backgroundType, settings.accentColorMode, updateSettings]);

  // Permission check after all hooks
  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">You don't have permission to customize themes.</p>
        </CardContent>
      </Card>
    );
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, GIF)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', file);

      // Upload to server (owner-only endpoint)
      const response = await fetch('/api/backgrounds', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Add to theme settings
      addCustomBackground({
        url: result.url,
        name: file.name,
      });

      toast({
        title: "Background uploaded",
        description: "Your custom background has been added successfully",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload background image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveBackground = (id: string, url: string) => {
    // Also remove from server (owner-only endpoint)
    fetch(`/api/admin/backgrounds/${id}`, {
      method: 'DELETE',
    }).catch(() => {
      // Continue even if server deletion fails
    });

    removeCustomBackground(id);
    toast({
      title: "Background removed",
      description: "The custom background has been removed",
    });
  };

  const presetBackgrounds = [
    { id: 'default', name: 'Default', type: 'default', value: '' },
    { id: 'gradient1', name: 'Ocean Blue', type: 'gradient', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'gradient2', name: 'Sunset', type: 'gradient', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 'gradient3', name: 'Forest', type: 'gradient', value: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)' },
    { id: 'gradient4', name: 'Galaxy', type: 'gradient', value: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="glass-surface-strong border-foreground/15">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Palette className="h-4 w-4 sm:h-5 sm:w-5" />
            Advanced Theme Editor
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="tints" className="w-full">
            <TabsList className="flex w-full overflow-x-auto gap-1 scrollbar-hide mb-4 h-auto flex-wrap sm:flex-nowrap">
              <TabsTrigger value="presets" className="text-[11px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">Presets</TabsTrigger>
              <TabsTrigger value="tints" className="text-[11px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">Tints</TabsTrigger>
              <TabsTrigger value="accent" className="text-[11px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">Accent</TabsTrigger>
              <TabsTrigger value="backgrounds" className="text-[11px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">Backgrounds</TabsTrigger>
              <TabsTrigger value="appearance" className="text-[11px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">Appearance</TabsTrigger>
            </TabsList>

            <TabsContent value="presets" className="mt-0">
              <ThemePresetSelector />
            </TabsContent>

            <TabsContent value="tints" className="space-y-6">
              <div className="grid gap-4">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground">
                    These tints are applied to glass surfaces throughout the app.
                    Each tint has its own color and opacity control.
                  </p>
                </div>

                <div>
                  <Label htmlFor="panel-tint">Panel Tint (Glass Surfaces)</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="panel-tint"
                      type="color"
                      value={hexFromRgba(settings.panelTint)}
                      onChange={(e) => {
                        const currentOpacity = opacityFromRgba(settings.panelTint);
                        updateSettings({ panelTint: rgbaFromHex(e.target.value, currentOpacity) });
                      }}
                      className="w-20 h-10"
                    />
                    <div className="flex-1">
                      <Slider
                        value={[opacityFromRgba(settings.panelTint) * 100]}
                        onValueChange={([value]) => updateSettings({ panelTint: rgbaFromHex(hexFromRgba(settings.panelTint), value / 100) })}
                        max={50}
                        min={5}
                        step={1}
                      />
                      <span className="text-[10px] text-muted-foreground">Opacity: {Math.round(opacityFromRgba(settings.panelTint) * 100)}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied to side panels and glass surfaces
                  </p>
                </div>

                <div>
                  <Label htmlFor="bar-card-tint">Bar Card Tint</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="bar-card-tint"
                      type="color"
                      value={hexFromRgba(settings.barCardTint)}
                      onChange={(e) => {
                        const currentOpacity = opacityFromRgba(settings.barCardTint);
                        updateSettings({ barCardTint: rgbaFromHex(e.target.value, currentOpacity) });
                      }}
                      className="w-20 h-10"
                    />
                    <div className="flex-1">
                      <Slider
                        value={[opacityFromRgba(settings.barCardTint) * 100]}
                        onValueChange={([value]) => updateSettings({ barCardTint: rgbaFromHex(hexFromRgba(settings.barCardTint), value / 100) })}
                        max={60}
                        min={10}
                        step={1}
                      />
                      <span className="text-[10px] text-muted-foreground">Opacity: {Math.round(opacityFromRgba(settings.barCardTint) * 100)}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied to bar cards and list items
                  </p>
                </div>

                <div>
                  <Label htmlFor="window-tint">Window/Dialog Tint</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="window-tint"
                      type="color"
                      value={hexFromRgba(settings.windowTint)}
                      onChange={(e) => {
                        const currentOpacity = opacityFromRgba(settings.windowTint);
                        updateSettings({ windowTint: rgbaFromHex(e.target.value, currentOpacity) });
                      }}
                      className="w-20 h-10"
                    />
                    <div className="flex-1">
                      <Slider
                        value={[opacityFromRgba(settings.windowTint) * 100]}
                        onValueChange={([value]) => updateSettings({ windowTint: rgbaFromHex(hexFromRgba(settings.windowTint), value / 100) })}
                        max={70}
                        min={15}
                        step={1}
                      />
                      <span className="text-[10px] text-muted-foreground">Opacity: {Math.round(opacityFromRgba(settings.windowTint) * 100)}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied to modal windows and dialogs
                  </p>
                </div>

                <div>
                  <Label htmlFor="top-bar-tint">Top Bar Tint</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="top-bar-tint"
                      type="color"
                      value={hexFromRgba(settings.topBarTint)}
                      onChange={(e) => {
                        const currentOpacity = opacityFromRgba(settings.topBarTint);
                        updateSettings({ topBarTint: rgbaFromHex(e.target.value, currentOpacity) });
                      }}
                      className="w-20 h-10"
                    />
                    <div className="flex-1">
                      <Slider
                        value={[opacityFromRgba(settings.topBarTint) * 100]}
                        onValueChange={([value]) => updateSettings({ topBarTint: rgbaFromHex(hexFromRgba(settings.topBarTint), value / 100) })}
                        max={60}
                        min={10}
                        step={1}
                      />
                      <span className="text-[10px] text-muted-foreground">Opacity: {Math.round(opacityFromRgba(settings.topBarTint) * 100)}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied to navigation bars and headers
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="accent" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Accent Color Mode</Label>
                  <Select
                    value={settings.accentColorMode}
                    onValueChange={(value: 'manual' | 'auto') => updateSettings({ accentColorMode: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Color</SelectItem>
                      <SelectItem value="auto">Auto from Background</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {settings.accentColorMode === 'auto' 
                      ? 'Automatically extract accent color from your background image'
                      : 'Choose a custom accent color for the theme'
                    }
                  </p>
                </div>

                {settings.accentColorMode === 'manual' && (
                  <div>
                    <Label htmlFor="accent-color">Accent Color</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="accent-color"
                        type="color"
                        value={`hsl(${settings.accentColor})`}
                        onChange={(e) => {
                          // Convert hex to HSL
                          const hex = e.target.value;
                          const r = parseInt(hex.slice(1, 3), 16) / 255;
                          const g = parseInt(hex.slice(3, 5), 16) / 255;
                          const b = parseInt(hex.slice(5, 7), 16) / 255;
                          
                          const max = Math.max(r, g, b);
                          const min = Math.min(r, g, b);
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
                          
                          const hslString = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
                          updateSettings({ accentColor: hslString });
                        }}
                        className="w-20 h-10"
                      />
                      <Input
                        value={settings.accentColor}
                        onChange={(e) => updateSettings({ accentColor: e.target.value })}
                        placeholder="265 70% 60%"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose the accent color used for buttons, links, and highlights throughout the site
                    </p>
                  </div>
                )}

                {settings.accentColorMode === 'auto' && (
                  <div>
                    <Label>Current Extracted Color</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <div 
                        className="w-10 h-10 rounded border-2 border-border"
                        style={{ backgroundColor: `hsl(${settings.accentColor})` }}
                      />
                      <span className="text-sm font-mono">{settings.accentColor}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This color is automatically extracted from your background
                    </p>
                  </div>
                )}

                {/* Preset accent colors */}
                <div>
                  <Label>Preset Colors</Label>
                  <div className="grid grid-cols-8 gap-2 mt-2">
                    {[
                      { name: 'Purple', value: '265 70% 60%' },
                      { name: 'Blue', value: '210 70% 60%' },
                      { name: 'Green', value: '142 70% 60%' },
                      { name: 'Red', value: '0 70% 60%' },
                      { name: 'Orange', value: '25 70% 60%' },
                      { name: 'Pink', value: '330 70% 60%' },
                      { name: 'Teal', value: '174 70% 60%' },
                      { name: 'Indigo', value: '240 70% 60%' },
                    ].map((color) => (
                      <button
                        key={color.value}
                        onClick={() => {
                          updateSettings({ 
                            accentColor: color.value,
                            accentColorMode: 'manual'
                          });
                        }}
                        className={`w-8 h-8 rounded border-2 transition-all ${
                          settings.accentColor === color.value && settings.accentColorMode === 'manual'
                            ? 'border-primary scale-110'
                            : 'border-border hover:border-primary/50'
                        }`}
                        style={{ backgroundColor: `hsl(${color.value})` }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="backgrounds" className="space-y-6">
              <div>
                <Label>Preset Backgrounds</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {presetBackgrounds.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => updateSettings({ 
                        backgroundType: bg.type as any, 
                        backgroundValue: bg.value 
                      })}
                      className={`relative h-20 rounded-lg border-2 transition-all ${
                        settings.backgroundType === bg.type && settings.backgroundValue === bg.value
                          ? 'border-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                      style={{
                        background: bg.type === 'gradient' ? bg.value : undefined,
                        backgroundColor: bg.type === 'default' ? 'hsl(var(--background))' : undefined,
                      }}
                    >
                      <span className="absolute bottom-1 left-1 text-xs bg-background/80 px-1 rounded">
                        {bg.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Custom Backgrounds</Label>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    size="sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {settings.customBackgrounds.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {settings.customBackgrounds.map((bg) => (
                      <div
                        key={bg.id}
                        className={`relative group h-20 rounded-lg border-2 transition-all cursor-pointer ${
                          settings.backgroundType === 'custom' && settings.backgroundValue === bg.url
                            ? 'border-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => updateSettings({ 
                          backgroundType: 'custom', 
                          backgroundValue: bg.url 
                        })}
                      >
                        <img
                          src={bg.url}
                          alt={bg.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                          <span className="text-xs bg-background/80 px-1 rounded truncate">
                            {bg.name}
                          </span>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveBackground(bg.id, bg.url);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm mt-2">
                    No custom backgrounds uploaded yet
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="site-text-color">Site Font Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="site-text-color"
                      type="color"
                      value={hexFromHslToken(settings.siteTextColor)}
                      onChange={(e) => updateSettings({ siteTextColor: hslTokenFromHex(e.target.value) })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.siteTextColor}
                      onChange={(e) => updateSettings({ siteTextColor: e.target.value })}
                      placeholder="0 0% 96%"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sets the global text color token for readability across the site.
                  </p>
                </div>

                <div>
                  <Label>Glass Opacity: {Math.round(settings.glassOpacity * 100)}%</Label>
                  <Slider
                    value={[settings.glassOpacity * 100]}
                    onValueChange={([value]) => updateSettings({ glassOpacity: value / 100 })}
                    max={100}
                    min={0}
                    step={1}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Transparency of glass surfaces
                  </p>
                </div>

                <div>
                  <Label>Border Opacity: {Math.round(settings.borderOpacity * 100)}%</Label>
                  <Slider
                    value={[settings.borderOpacity * 100]}
                    onValueChange={([value]) => updateSettings({ borderOpacity: value / 100 })}
                    max={100}
                    min={0}
                    step={1}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Visibility of borders and separators
                  </p>
                </div>

                <div>
                  <Label>Border Radius: {settings.borderRadius}px</Label>
                  <Slider
                    value={[settings.borderRadius]}
                    onValueChange={([value]) => updateSettings({ borderRadius: value })}
                    max={24}
                    min={0}
                    step={1}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Roundness of corners and edges
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => updateSettings(defaultThemeSettings)}
              className="flex-1 sm:flex-none"
            >
              Reset to Default
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Export settings
                const dataStr = JSON.stringify(settings, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                const exportFileDefaultName = 'theme-settings.json';
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
              }}
              className="flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {isOwner && (
              <Button
                onClick={() => pushThemeMutation.mutate(settings)}
                disabled={pushThemeMutation.isPending}
                className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
              >
                <Globe className="h-4 w-4 mr-2" />
                {pushThemeMutation.isPending ? "Pushing..." : "Push to All Users"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
