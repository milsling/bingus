import { useState, useEffect } from "react";
import { Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FONTS = [
  { name: "Modern (Syne)", value: '"Syne", sans-serif' },
  { name: "OG (Old English)", value: '"UnifrakturMaguntia", cursive' },
  { name: "Loud (Anton)", value: '"Anton", sans-serif' },
  { name: "Street (Oswald)", value: '"Oswald", sans-serif' },
];

export function FontSwitcher() {
  const [currentFont, setCurrentFont] = useState(FONTS[0].value);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-display", currentFont);
  }, [currentFont]);

  return (
    <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" className="h-12 w-12 rounded-full shadow-2xl bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-background">
            <Type className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-card border-border">
          {FONTS.map((font) => (
            <DropdownMenuItem
              key={font.name}
              onClick={() => setCurrentFont(font.value)}
              className="cursor-pointer hover:bg-primary/20"
              style={{ fontFamily: font.value }}
            >
              {font.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
