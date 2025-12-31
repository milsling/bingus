import { useState } from "react";
import Navigation from "@/components/Navigation";
import BarCard from "@/components/BarCard";
import CategoryFilter from "@/components/CategoryFilter";
import { BookOpen } from "lucide-react";
import { useBars } from "@/context/BarContext";

type Category = "Funny" | "Serious" | "Wordplay" | "Storytelling" | "Battle" | "Freestyle";

export default function Home() {
  const { bars, isLoadingBars } = useBars();
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");

  const filteredBars = selectedCategory === "All"
    ? bars
    : bars.filter(bar => bar.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pt-16">
      <Navigation />
      
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <BookOpen className="text-primary h-6 w-6" />
          <span className="font-display font-black text-xl tracking-tighter">ORPHAN BARS</span>
        </div>
      </header>

      <main>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent h-48 pointer-events-none" />
          
          <div className="max-w-3xl mx-auto">
            <div className="px-4 py-8 md:text-center space-y-2">
              <h1 className="text-4xl md:text-6xl font-display font-black uppercase tracking-tighter text-foreground">
                Drop Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-400">Bars</span>
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto">
                The definitive archive for lyricists, punchline kings, and freestyle poets.
              </p>
            </div>

            <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />

            <div className="px-4 py-6 space-y-6">
              {isLoadingBars ? (
                <div className="text-center py-20 text-muted-foreground">
                  <p>Loading bars...</p>
                </div>
              ) : filteredBars.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <p>No bars found in this category.</p>
                </div>
              ) : (
                filteredBars.map((bar) => (
                  <BarCard key={bar.id} bar={bar} />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
