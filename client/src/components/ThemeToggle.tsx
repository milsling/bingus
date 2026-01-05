import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (saved === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
      if (themeColorMeta) themeColorMeta.setAttribute("content", "#fafafa");
    } else {
      setIsDark(true);
      document.documentElement.classList.add("dark");
      if (themeColorMeta) themeColorMeta.setAttribute("content", "#18181b");
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (newIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      if (themeColorMeta) themeColorMeta.setAttribute("content", "#18181b");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      if (themeColorMeta) themeColorMeta.setAttribute("content", "#fafafa");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Sun className="h-4 w-4 text-muted-foreground" />
      <Switch
        checked={isDark}
        onCheckedChange={toggleTheme}
        data-testid="theme-toggle"
      />
      <Moon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
