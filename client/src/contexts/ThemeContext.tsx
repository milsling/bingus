import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark'); // Force dark mode
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

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
    };

    applyTheme();
    localStorage.setItem('theme', 'dark');

    return undefined;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
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
