import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export interface ThemeSettings {
  // Window/Panel tinting
  windowTint: string;
  panelTint: string;
  barCardTint: string;
  topBarTint: string;
  
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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark'); // Force dark mode as default
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  const [settings, setSettings] = useState<ThemeSettings>(defaultThemeSettings);
  const [canCustomize, setCanCustomize] = useState(false);

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
    '--glass-opacity': settings.glassOpacity.toString(),
    '--border-opacity': settings.borderOpacity.toString(),
    '--border-radius': `${settings.borderRadius}px`,
    '--background-type': settings.backgroundType,
    '--background-value': settings.backgroundValue,
  } as React.CSSProperties;
}
