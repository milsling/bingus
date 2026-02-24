import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

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
}

const defaultThemeSettings: ThemeSettings = {
  windowTint: 'rgba(0, 0, 0, 0.1)',
  panelTint: 'rgba(0, 0, 0, 0.05)',
  barCardTint: 'rgba(255, 255, 255, 0.05)',
  topBarTint: 'rgba(0, 0, 0, 0.2)',
  barCardOpacity: 0.95,
  backgroundType: 'default',
  backgroundValue: '',
  customBackgrounds: [],
  glassOpacity: 0.95,
  borderOpacity: 0.1,
  borderRadius: 12,
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  // Advanced theme settings
  settings: ThemeSettings;
  updateSettings: (updates: Partial<ThemeSettings>) => void;
  resetSettings: () => void;
  addCustomBackground: (background: { url: string; name: string }) => void;
  removeCustomBackground: (id: string) => void;
  canCustomize: boolean;
  
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
  const [theme, setTheme] = useState<Theme>('dark'); // Force dark mode as default
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
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

  // Check if user can customize (owner/admin check)
  useEffect(() => {
    // This would typically check user permissions
    // For now, we'll assume all users can customize
    setCanCustomize(true);
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
    // Always force dark mode
    setTheme('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const resolved: 'light' | 'dark' = 'dark'; // Always dark
      setResolvedTheme(resolved);
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
      
      // Apply custom theme variables
      const themeStyles = getThemeStyles(settings);
      Object.entries(themeStyles).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    };

    applyTheme();
    localStorage.setItem('theme', 'dark');
  }, [theme, settings]);

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
    '--glass-opacity': settings.glassOpacity.toString(),
    '--border-opacity': settings.borderOpacity.toString(),
    '--border-radius': `${settings.borderRadius}px`,
    '--background-type': settings.backgroundType,
    '--background-value': settings.backgroundValue,
  } as React.CSSProperties;
}
