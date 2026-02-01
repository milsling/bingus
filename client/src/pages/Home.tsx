import { useState, useMemo, useCallback, useEffect } from "react";
import Navigation from "@/components/Navigation";
import BarCard from "@/components/BarCard";
import CategoryFilter from "@/components/CategoryFilter";
import { BarSkeletonList } from "@/components/BarSkeleton";
import { SearchBar } from "@/components/SearchBar";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Clock, Flame, Trophy, Grid3X3, Hash, X, Lightbulb, Laugh, Palette, HelpCircle, Star, BadgeCheck } from "lucide-react";
import iconUrl from "@/assets/icon.png";
import { useBars } from "@/context/BarContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";

type Category = "Funny" | "Serious" | "Wordplay" | "Storytelling" | "Battle" | "Freestyle";
type FeedTab = "featured" | "latest" | "top" | "trending" | "categories";
type SortFilter = "all" | "technical" | "funny" | "imagery";

export default function Home() {
  const { bars, isLoadingBars, refetchBars, currentUser } = useBars();
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [activeTab, setActiveTab] = useState<FeedTab>("latest");
  const [sortFilter, setSortFilter] = useState<SortFilter>("all");
  const [originalOnly, setOriginalOnly] = useState(false);
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
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: featuredBars = [], isLoading: isLoadingFeatured, refetch: refetchFeatured } = useQuery({
    queryKey: ['bars-featured'],
    queryFn: async () => {
      const res = await fetch('/api/bars/feed/featured', { credentials: 'include' });
      return res.json();
    },
    enabled: activeTab === "featured",
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: topBars = [], isLoading: isLoadingTop, refetch: refetchTop } = useQuery({
    queryKey: ['bars-top'],
    queryFn: async () => {
      const res = await fetch('/api/bars/feed/top', { credentials: 'include' });
      return res.json();
    },
    enabled: activeTab === "top",
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: trendingBars = [], isLoading: isLoadingTrending, refetch: refetchTrending } = useQuery({
    queryKey: ['bars-trending'],
    queryFn: async () => {
      const res = await fetch('/api/bars/feed/trending', { credentials: 'include' });
      return res.json();
    },
    enabled: activeTab === "trending",
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const handleRefresh = useCallback(async () => {
    await refetchBars();
    queryClient.invalidateQueries({ queryKey: ['likes'] });
    if (tagFilter) {
      queryClient.invalidateQueries({ queryKey: ['bars-by-tag', tagFilter] });
    }
    if (activeTab === "featured") refetchFeatured();
    if (activeTab === "top") refetchTop();
    if (activeTab === "trending") refetchTrending();
  }, [refetchBars, queryClient, tagFilter, activeTab, refetchFeatured, refetchTop, refetchTrending]);

  const clearTagFilter = () => {
    setLocation("/");
  };

  const filteredBars = useMemo(() => {
    let result: any[];
    
    if (tagFilter) {
      result = [...tagBars];
    } else {
      switch (activeTab) {
        case "featured":
          result = [...featuredBars];
          break;
        case "top":
          result = [...topBars];
          break;
        case "trending":
          result = [...trendingBars];
          break;
        case "categories":
          result = selectedCategory === "All" ? [...bars] : bars.filter(bar => bar.category === selectedCategory);
          break;
        case "latest":
        default:
          result = [...bars];
          break;
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

    if (originalOnly) {
      result = result.filter(bar => bar.isOriginal);
    }

    return result;
  }, [bars, tagBars, tagFilter, activeTab, selectedCategory, sortFilter, originalOnly, featuredBars, topBars, trendingBars]);

  const isLoading = tagFilter ? isLoadingTagBars : 
    activeTab === "featured" ? isLoadingFeatured :
    activeTab === "top" ? isLoadingTop :
    activeTab === "trending" ? isLoadingTrending :
    isLoadingBars;

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 md:pb-4 md:pt-24">
      <Navigation />
      
      {/* Mobile search */}
      <div className="md:hidden sticky top-[72px] z-40 px-3 py-2">
        <div className="glass-panel p-3">
          <SearchBar />
        </div>
      </div>

      {/* Desktop: Three column layout with left panes */}
      <div className="hidden md:flex max-w-[1600px] mx-auto px-4 gap-6">
        {/* Left Column - Two glass panes */}
        <aside className="w-72 shrink-0 space-y-4 sticky top-24 h-fit">
          {/* User Profile Preview Pane */}
          {currentUser ? (
            <div className="glass-panel p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {currentUser.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white">@{currentUser.username}</p>
                  <p className="text-xs text-white/50">Level {currentUser.level || 1}</p>
                </div>
              </div>
              <div className="flex gap-4 text-sm text-white/60 mb-3">
                <div><span className="text-white font-semibold">{currentUser.xp || 0}</span> XP</div>
                <div><span className="text-white font-semibold">{currentUser.barCount || 0}</span> Bars</div>
              </div>
              {currentUser.badges && currentUser.badges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {currentUser.badges.slice(0, 4).map((badge: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-4 text-center">
              <p className="text-white/60 text-sm mb-3">Join the community</p>
              <a href="/auth" className="block w-full py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors">
                Login / Sign Up
              </a>
            </div>
          )}
          
          {/* Tags / Categories Pane */}
          <div className="glass-panel p-4">
            <h3 className="text-sm font-semibold text-white/80 mb-3">Popular Tags</h3>
            <div className="flex flex-wrap gap-2">
              {["wordplay", "punchline", "metaphor", "storytelling", "battle", "conscious"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setLocation(`/?tag=${tag}`)}
                  className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white transition-colors border border-white/[0.06]"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </aside>
        
        {/* Center Column - Feed */}
        <main className="flex-1 min-w-0">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent h-48 pointer-events-none" />
            
            <div className="py-6 space-y-2 text-center">
              <h1 className="text-4xl lg:text-5xl font-display font-black uppercase tracking-tighter text-foreground">
                Drop Your <span className="text-foreground font-black italic">Bars</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                No home for your fire bars? Orphan 'em, cuh.
              </p>
            </div>

            <div className="mb-4">
              <div className="glass-panel p-4">
                <div className="flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-white/60">
                    <span className="font-semibold text-white">How it works:</span> Drop your best bars, tag them with style (wordplay, punchline, metaphor), and add a breakdown to explain the entendre. Explore, like, and save your favorites from the community.{" "}
                    <a href="/guidelines" className="text-primary hover:underline font-medium">Read the rules</a>
                  </p>
                </div>
              </div>
            </div>

            {tagFilter && (
              <div className="px-4 mb-4">
                <div className="glass-panel flex items-center gap-2 p-3">
                  <Hash className="h-4 w-4 text-primary" />
                  <span className="text-sm text-white/70">Showing bars tagged with</span>
                  <Badge variant="secondary" className="font-semibold bg-primary/20 text-primary border-primary/30">#{tagFilter}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 text-white/50 hover:text-white hover:bg-white/10"
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
                    <TabsList className="w-full grid grid-cols-5 glass-panel p-1 h-auto">
                      <TabsTrigger value="featured" className="gap-1 text-xs sm:text-sm" data-testid="tab-featured">
                        <Star className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Featured</span>
                      </TabsTrigger>
                      <TabsTrigger value="latest" className="gap-1 text-xs sm:text-sm" data-testid="tab-latest">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Latest</span>
                      </TabsTrigger>
                      <TabsTrigger value="top" className="gap-1 text-xs sm:text-sm" data-testid="tab-top">
                        <Trophy className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Top</span>
                      </TabsTrigger>
                      <TabsTrigger value="trending" className="gap-1 text-xs sm:text-sm" data-testid="tab-trending">
                        <Flame className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Trending</span>
                      </TabsTrigger>
                      <TabsTrigger value="categories" className="gap-1 text-xs sm:text-sm" data-testid="tab-categories">
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
                    <div className="border-l border-border mx-1" />
                    <Button
                      variant={originalOnly ? "default" : "outline"}
                      size="sm"
                      onClick={() => setOriginalOnly(!originalOnly)}
                      className={`text-xs gap-1 ${originalOnly ? "bg-primary" : ""}`}
                      data-testid="filter-original"
                    >
                      <BadgeCheck className="h-3 w-3" />
                      OC Only
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
                    <p>No bars found{tagFilter ? ` with tag #${tagFilter}` : activeTab === "trending" ? " trending right now" : activeTab === "featured" ? " featured yet" : activeTab === "categories" ? " in this category" : sortFilter !== "all" ? " matching this filter" : ""}.</p>
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
