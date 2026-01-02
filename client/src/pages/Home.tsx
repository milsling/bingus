import { useState, useMemo, useCallback } from "react";
import Navigation from "@/components/Navigation";
import BarCard from "@/components/BarCard";
import CategoryFilter from "@/components/CategoryFilter";
import { BarSkeletonList } from "@/components/BarSkeleton";
import { SearchBar } from "@/components/SearchBar";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Clock, Flame, Trophy, Grid3X3 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import iconUrl from "@/assets/icon.png";
import { useBars } from "@/context/BarContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";

type Category = "Funny" | "Serious" | "Wordplay" | "Storytelling" | "Battle" | "Freestyle";
type FeedTab = "latest" | "top" | "trending" | "categories";

export default function Home() {
  const { bars, isLoadingBars, refetchBars } = useBars();
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [activeTab, setActiveTab] = useState<FeedTab>("latest");
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await refetchBars();
    queryClient.invalidateQueries({ queryKey: ['likes'] });
  }, [refetchBars, queryClient]);

  const filteredBars = useMemo(() => {
    let result = [...bars];

    if (activeTab === "categories" && selectedCategory !== "All") {
      result = result.filter(bar => bar.category === selectedCategory);
    }

    if (activeTab === "top") {
      result = result.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    if (activeTab === "trending") {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      result = result.filter(bar => new Date(bar.createdAt).getTime() > oneDayAgo);
    }

    return result;
  }, [bars, activeTab, selectedCategory]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pt-16">
      <Navigation />
      
      {/* Mobile Header */}
      <header className="md:hidden flex flex-col gap-3 p-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={iconUrl} alt="" className="h-7 w-7" />
            <span className="font-logo text-xl">ORPHAN BARS</span>
          </div>
          <ThemeToggle />
        </div>
        <SearchBar />
      </header>

      <main>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent h-48 pointer-events-none" />
          
          <div className="max-w-3xl mx-auto">
            <div className="px-4 py-8 md:text-center space-y-2">
              <h1 className="text-4xl md:text-6xl font-display font-black uppercase tracking-tighter text-foreground">
                Drop Your <span className="text-foreground font-black italic">Bars</span>
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto">
                The definitive archive for lyricists, punchline kings, and freestyle poets.
              </p>
            </div>

            <div className="px-4 mb-4">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedTab)} className="w-full">
                <TabsList className="w-full grid grid-cols-4 bg-secondary/50">
                  <TabsTrigger value="latest" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-latest">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Latest</span>
                  </TabsTrigger>
                  <TabsTrigger value="top" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-top">
                    <Trophy className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Top</span>
                  </TabsTrigger>
                  <TabsTrigger value="trending" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-trending">
                    <Flame className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Trending</span>
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-categories">
                    <Grid3X3 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Categories</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {activeTab === "categories" && (
              <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
            )}

            <PullToRefresh onRefresh={handleRefresh}>
              <div className="px-4 py-6 space-y-6">
                {isLoadingBars ? (
                  <BarSkeletonList count={5} />
                ) : filteredBars.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <p>No bars found{activeTab === "trending" ? " in the last 24 hours" : activeTab === "categories" ? " in this category" : ""}.</p>
                  </div>
                ) : (
                  filteredBars.map((bar) => (
                    <BarCard key={bar.id} bar={bar} />
                  ))
                )}
              </div>
            </PullToRefresh>
          </div>
        </div>
      </main>
    </div>
  );
}
