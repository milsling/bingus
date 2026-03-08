import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark';

export interface ThemePreset {
  id: string;
  name: string;
  description?: string;
  settings: ThemeSettings;
  isGlobal?: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeSettings {
  // Window/Panel tinting
  windowTint: string;
  panelTint: string;
  barCardTint: string;
  topBarTint: string;
  
  // Opacity controls
  barCardOpacity: number;
  mobileNavOpacity: number;
  
  // Background settings
  backgroundType: 'default' | 'gradient' | 'image' | 'custom';
  backgroundValue: string;
  customBackgrounds: Array<{
    id: string;
    url: string;
    name: string;
    uploadedAt: string;
  }>;
  
  // UI customization
  glassOpacity: number;
  borderOpacity: number;
  borderRadius: number;
  
  // Accent color settings
  accentColor: string; // HSL string like "265 70% 60%"
  accentColorMode: 'manual' | 'auto'; // auto extracts from background
}

export const defaultThemeSettings: ThemeSettings = {
  windowTint: 'rgba(255, 255, 255, 0.18)',
  panelTint: 'rgba(255, 255, 255, 0.18)',
  barCardTint: 'rgba(255, 255, 255, 0.22)',
  topBarTint: 'rgba(255, 255, 255, 0.26)',
  barCardOpacity: 0.96,
  mobileNavOpacity: 0.96,
  backgroundType: 'default',
  backgroundValue: '',
  customBackgrounds: [],
  glassOpacity: 0.96,
  borderOpacity: 0.24,
  borderRadius: 16,
  accentColor: '265 70% 60%', // Default purple
  accentColorMode: 'manual',
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark';
  // Advanced theme settings
  settings: ThemeSettings;
  updateSettings: (updates: Partial<ThemeSettings>) => void;
  resetSettings: () => void;
  addCustomBackground: (background: { url: string; name: string }) => void;
  removeCustomBackground: (id: string) => void;
  canCustomize: boolean;
  setCanCustomize: (value: boolean) => void;
  
  // Preset management
  presets: ThemePreset[];
  currentPresetId: string | null;
  savePreset: (name: string, description?: string) => Promise<ThemePreset>;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => Promise<void>;
  updatePreset: (presetId: string, updates: Partial<ThemePreset>) => Promise<void>;
  publishGlobalTheme: (presetId: string) => Promise<void>;
  unpublishGlobalTheme: (presetId: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'dark'>('dark');
  const [settings, setSettings] = useState<ThemeSettings>(defaultThemeSettings);
  const [canCustomize, setCanCustomize] = useState(false);
  const [presets, setPresets] = useState<ThemePreset[]>([]);
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('theme-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultThemeSettings, ...parsed });
      } catch (error) {
        console.error('Failed to load theme settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('theme-settings', JSON.stringify(settings));
  }, [settings]);

  // canCustomize is set externally via setCanCustomize (owner-only)
  // Default false — ThemeProvider consumers call setCanCustomize when user loads

  // On mount: fetch site-wide theme settings from DB and apply for all users
  useEffect(() => {
    const loadSiteSettings = async () => {
      try {
        const res = await fetch('/api/backgrounds/site-settings');
        if (!res.ok) return;
        const data = await res.json();
        if (data.themeSettings) {
          try {
            const serverSettings: Partial<ThemeSettings> = typeof data.themeSettings === 'string'
              ? JSON.parse(data.themeSettings)
              : data.themeSettings;
            // Merge server settings into local — server wins over defaults but not user's saved prefs
            setSettings(prev => ({ ...defaultThemeSettings, ...serverSettings, ...prev }));
          } catch (e) {
            console.error('Failed to parse server themeSettings:', e);
          }
        }
      } catch (e) {
        // Silently fail — site settings are optional
      }
    };
    loadSiteSettings();
  }, []);

  // Load presets from localStorage and server
  useEffect(() => {
    const loadPresets = async () => {
      try {
        // Load local presets
        const localPresets = localStorage.getItem('theme-presets');
        let loadedPresets: ThemePreset[] = [];
        
        if (localPresets) {
          loadedPresets = JSON.parse(localPresets);
        }

        // Load global presets from server
        try {
          const response = await fetch('/api/themes/global');
          if (response.ok) {
            const globalPresets = await response.json();
            loadedPresets = [...globalPresets, ...loadedPresets];
          }
        } catch (error) {
          console.error('Failed to load global presets:', error);
        }

        setPresets(loadedPresets);
      } catch (error) {
        console.error('Failed to load presets:', error);
      }
    };

    loadPresets();
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      setResolvedTheme('dark');
      root.classList.remove('light');
      if (!root.classList.contains('dark')) root.classList.add('dark');

      const themeStyles = getThemeStyles(settings);
      Object.entries(themeStyles).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });

      // Force dark color scheme for system UI (scrollbars, form controls)
      root.style.setProperty('color-scheme', 'dark');
      localStorage.setItem('theme', 'dark');
    };

    applyTheme();
  }, [settings]);

  const updateSettings = (updates: Partial<ThemeSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(defaultThemeSettings);
    localStorage.removeItem('theme-settings');
  };

  const addCustomBackground = (background: { url: string; name: string }) => {
    const newBackground = {
      id: Date.now().toString(),
      url: background.url,
      name: background.name,
      uploadedAt: new Date().toISOString(),
    };
    
    setSettings(prev => ({
      ...prev,
      customBackgrounds: [...prev.customBackgrounds, newBackground],
    }));
  };

  const removeCustomBackground = (id: string) => {
    setSettings(prev => ({
      ...prev,
      customBackgrounds: prev.customBackgrounds.filter(bg => bg.id !== id),
    }));
  };

  // Preset management functions
  const savePreset = async (name: string, description?: string): Promise<ThemePreset> => {
    const newPreset: ThemePreset = {
      id: Date.now().toString(),
      name,
      description,
      settings: { ...settings },
      isGlobal: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('theme-presets', JSON.stringify(updatedPresets.filter(p => !p.isGlobal)));
    
    return newPreset;
  };

  const loadPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setSettings(preset.settings);
      setCurrentPresetId(presetId);
    }
  };

  const deletePreset = async (presetId: string): Promise<void> => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset || preset.isGlobal) {
      throw new Error('Cannot delete global preset');
    }

    const updatedPresets = presets.filter(p => p.id !== presetId);
    setPresets(updatedPresets);
    localStorage.setItem('theme-presets', JSON.stringify(updatedPresets.filter(p => !p.isGlobal)));

    if (currentPresetId === presetId) {
      setCurrentPresetId(null);
    }
  };

  const updatePreset = async (presetId: string, updates: Partial<ThemePreset>): Promise<void> => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset || preset.isGlobal) {
      throw new Error('Cannot update global preset');
    }

    const updatedPresets = presets.map(p => 
      p.id === presetId 
        ? { ...p, ...updates, updatedAt: new Date().toISOString() }
        : p
    );
    setPresets(updatedPresets);
    localStorage.setItem('theme-presets', JSON.stringify(updatedPresets.filter(p => !p.isGlobal)));
  };

  const publishGlobalTheme = async (presetId: string): Promise<void> => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) {
      throw new Error('Preset not found');
    }

    try {
      const response = await fetch('/api/themes/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...preset,
          isGlobal: true,
          settings: preset.settings
        })
      });

      if (!response.ok) {
        throw new Error('Failed to publish global theme');
      }

      const updatedPresets = presets.map(p =>
        p.id === presetId ? { ...p, isGlobal: true } : p
      );
      setPresets(updatedPresets);
    } catch (error) {
      throw new Error('Failed to publish global theme');
    }
  };

  const unpublishGlobalTheme = async (presetId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/themes/global/${presetId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to unpublish global theme');
      }

      const updatedPresets = presets.map(p =>
        p.id === presetId ? { ...p, isGlobal: false } : p
      );
      setPresets(updatedPresets);
    } catch (error) {
      throw new Error('Failed to unpublish global theme');
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      resolvedTheme,
      settings,
      updateSettings,
      resetSettings,
      addCustomBackground,
      removeCustomBackground,
      canCustomize,
      setCanCustomize,
      presets,
      currentPresetId,
      savePreset,
      loadPreset,
      deletePreset,
      updatePreset,
      publishGlobalTheme,
      unpublishGlobalTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper function to apply theme styles
export function getThemeStyles(settings: ThemeSettings) {
  return {
    '--window-tint': settings.windowTint,
    '--panel-tint': settings.panelTint,
    '--bar-card-tint': settings.barCardTint,
    '--top-bar-tint': settings.topBarTint,
    '--bar-card-opacity': settings.barCardOpacity.toString(),
    '--mobile-nav-opacity': settings.mobileNavOpacity.toString(),
    '--glass-opacity': settings.glassOpacity.toString(),
    '--border-opacity': settings.borderOpacity.toString(),
    '--border-radius': `${settings.borderRadius}px`,
    '--background-type': settings.backgroundType,
    '--background-value': settings.backgroundValue,
    '--accent-color': settings.accentColor,
    '--accent-color-mode': settings.accentColorMode,
    // Logo hue-rotate: sepia produces ~50° hue, so rotate to match accent
    '--logo-hue-rotate': `${(parseInt(settings.accentColor?.split(' ')[0] || '265', 10) - 50)}deg`,
  } as React.CSSProperties;
}

// Function to extract accent color from background image
export async function extractAccentColorFromBackground(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('265 70% 60%'); // fallback to purple
        return;
      }
      
      // Sample the image at multiple points to get dominant color
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);
      
      const imageData = ctx.getImageData(0, 0, 50, 50);
      const data = imageData.data;
      
      let r = 0, g = 0, b = 0;
      let count = 0;
      
      // Sample every 4th pixel for performance
      for (let i = 0; i < data.length; i += 16) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      
      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);
      
      // Convert RGB to HSL
      const hsl = rgbToHsl(r, g, b);
      resolve(`${hsl.h} ${hsl.s}% ${hsl.l}%`);
    };
    
    img.onerror = () => {
      resolve('265 70% 60%'); // fallback to purple
    };
    
    img.src = imageUrl;
  });
}

// RGB to HSL conversion
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  
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
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}
