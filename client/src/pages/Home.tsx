import { useState, useMemo, useCallback, useEffect } from "react";
import Navigation from "@/components/Navigation";
import BarCard from "@/components/BarCard";
import CategoryFilter from "@/components/CategoryFilter";
import { BarSkeletonList } from "@/components/BarSkeleton";
import { SearchBar } from "@/components/SearchBar";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Clock, Flame, Trophy, Grid3X3, Hash, X, Lightbulb, Laugh, Palette, HelpCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import iconUrl from "@/assets/icon.png";
import { useBars } from "@/context/BarContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";

type Category = "Funny" | "Serious" | "Wordplay" | "Storytelling" | "Battle" | "Freestyle";
type FeedTab = "latest" | "top" | "trending" | "categories";
type SortFilter = "all" | "technical" | "funny" | "imagery";

export default function Home() {
  const { bars, isLoadingBars, refetchBars } = useBars();
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [activeTab, setActiveTab] = useState<FeedTab>("latest");
  const [sortFilter, setSortFilter] = useState<SortFilter>("all");
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const tagFilter = params.get("tag");

  const { data: tagBars = [], isLoading: isLoadingTagBars } = useQuery({
    queryKey: ['bars-by-tag', tagFilter],
    queryFn: async () => {
      if (!tagFilter) return [];
      const res = await fetch(`/api/bars/by-tag/${encodeURIComponent(tagFilter)}`, { credentials: 'include' });
      return res.json();
    },
    enabled: !!tagFilter,
  });

  const handleRefresh = useCallback(async () => {
    await refetchBars();
    queryClient.invalidateQueries({ queryKey: ['likes'] });
    if (tagFilter) {
      queryClient.invalidateQueries({ queryKey: ['bars-by-tag', tagFilter] });
    }
  }, [refetchBars, queryClient, tagFilter]);

  const clearTagFilter = () => {
    setLocation("/");
  };

  const filteredBars = useMemo(() => {
    let result = tagFilter ? [...tagBars] : [...bars];

    if (!tagFilter) {
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
    }

    if (sortFilter !== "all") {
      const technicalTags = ["wordplay", "metaphor", "entendre", "scheme", "technical", "multis"];
      const funnyTags = ["funny", "comedy", "humor", "joke", "hilarious"];
      const imageryTags = ["imagery", "visual", "cinematic", "vivid", "crazy", "wild"];

      result = result.filter(bar => {
        const barTags = (bar.tags || []).map((t: string) => t.toLowerCase());
        if (sortFilter === "technical") {
          return barTags.some((t: string) => technicalTags.includes(t)) || bar.category === "Wordplay";
        }
        if (sortFilter === "funny") {
          return barTags.some((t: string) => funnyTags.includes(t)) || bar.category === "Funny";
        }
        if (sortFilter === "imagery") {
          return barTags.some((t: string) => imageryTags.includes(t)) || bar.category === "Storytelling";
        }
        return true;
      });
    }

    return result;
  }, [bars, tagBars, tagFilter, activeTab, selectedCategory, sortFilter]);

  const isLoading = tagFilter ? isLoadingTagBars : isLoadingBars;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pt-16">
      <Navigation />
      
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

            <div className="px-4 mb-4 p-3 bg-secondary/30 rounded-lg border border-border/50">
              <div className="flex items-start gap-2">
                <HelpCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">How it works:</span> Drop your best bars, tag them with style (wordplay, punchline, metaphor), and add a breakdown to explain the entendre. Explore, like, and save your favorites from the community.
                </p>
              </div>
            </div>

            {tagFilter && (
              <div className="px-4 mb-4">
                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <Hash className="h-4 w-4 text-primary" />
                  <span className="text-sm">Showing bars tagged with</span>
                  <Badge variant="secondary" className="font-semibold">#{tagFilter}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 text-muted-foreground hover:text-foreground"
                    onClick={clearTagFilter}
                    data-testid="button-clear-tag"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {!tagFilter && (
              <>
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

                <div className="px-4 mb-4">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={sortFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortFilter("all")}
                      className="text-xs"
                      data-testid="filter-all"
                    >
                      All
                    </Button>
                    <Button
                      variant={sortFilter === "technical" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortFilter("technical")}
                      className="text-xs gap-1"
                      data-testid="filter-technical"
                    >
                      <Lightbulb className="h-3 w-3" />
                      Most Technical
                    </Button>
                    <Button
                      variant={sortFilter === "funny" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortFilter("funny")}
                      className="text-xs gap-1"
                      data-testid="filter-funny"
                    >
                      <Laugh className="h-3 w-3" />
                      Funniest
                    </Button>
                    <Button
                      variant={sortFilter === "imagery" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortFilter("imagery")}
                      className="text-xs gap-1"
                      data-testid="filter-imagery"
                    >
                      <Palette className="h-3 w-3" />
                      Craziest Imagery
                    </Button>
                  </div>
                </div>
              </>
            )}

            {activeTab === "categories" && !tagFilter && (
              <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
            )}

            <PullToRefresh onRefresh={handleRefresh}>
              <div className="px-4 py-6 space-y-6">
                {isLoading ? (
                  <BarSkeletonList count={5} />
                ) : filteredBars.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <p>No bars found{tagFilter ? ` with tag #${tagFilter}` : activeTab === "trending" ? " in the last 24 hours" : activeTab === "categories" ? " in this category" : sortFilter !== "all" ? " matching this filter" : ""}.</p>
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
