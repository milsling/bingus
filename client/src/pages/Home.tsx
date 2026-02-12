import { useState, useMemo, useCallback, useEffect } from "react";
import { BarFeedCard } from "@/components/BarFeedCard";
import CategoryFilter from "@/components/CategoryFilter";
import { BarSkeletonList } from "@/components/BarSkeleton";
import { SearchBar } from "@/components/SearchBar";
import { PullToRefresh } from "@/components/PullToRefresh";
import { ArrowRight, BadgeCheck, Clock, Flame, Grid3X3, Hash, Heart, Laugh, Lightbulb, MessageCircle, Palette, PenLine, Search, Sparkles, Star, Trophy, X } from "lucide-react";
import { useBars } from "@/context/BarContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation, useSearch, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type Category = "Funny" | "Serious" | "Wordplay" | "Storytelling" | "Battle" | "Freestyle";
type FeedTab = "featured" | "latest" | "top" | "trending" | "categories";
type SortFilter = "all" | "technical" | "funny" | "imagery";

export default function Home() {
  const { bars, isLoadingBars, refetchBars, currentUser } = useBars();
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [activeTab, setActiveTab] = useState<FeedTab>("latest");
  const [sortFilter, setSortFilter] = useState<SortFilter>("all");
  const [originalOnly, setOriginalOnly] = useState(false);
  const [nowHappeningIndex, setNowHappeningIndex] = useState(0);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const tagFilter = params.get("tag");
  const { toast } = useToast();

  // Handle OAuth errors that redirect to the root URL
  useEffect(() => {
    const error = params.get("error");
    const errorDescription = params.get("error_description");
    
    if (error) {
      console.error('OAuth error:', { error, errorDescription });
      
      let message = "Authentication failed. Please try again.";
      
      if (errorDescription) {
        const decodedDescription = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
        
        // Handle specific Apple OAuth errors with user-friendly messages
        if (decodedDescription.includes("Unable to exchange external code")) {
          message = "Apple Sign In is currently unavailable. This may be due to a configuration issue. Please try signing in with a different method or contact support.";
        } else {
          message = decodedDescription;
        }
      }
      
      toast({
        title: "Sign In Failed",
        description: message,
        variant: "destructive",
      });
      
      // Clean up URL by removing error parameters
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [searchString, toast, params]);

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

  // Leaderboard query - real data from database
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const res = await fetch('/api/leaderboard?limit=5', { credentials: 'include' });
      return res.json();
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Recent activity query - real data from database
  const { data: recentActivity = [] } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const res = await fetch('/api/activity/recent?limit=6', { credentials: 'include' });
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: weeklySpotlight } = useQuery({
    queryKey: ['weekly-spotlight'],
    queryFn: async () => {
      const res = await fetch('/api/spotlight/weekly', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load spotlight');
      return res.json() as Promise<null | { barId: string; snippet: string; authorUsername: string; authorAvatar?: string | null; likesIn7d: number }>;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: communityStats } = useQuery({
    queryKey: ['community-stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats/community', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load stats');
      return res.json() as Promise<{ totalBars: number; barsThisWeek: number; activeWritersThisMonth: number }>;
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const nowHappeningItems = useMemo(() => {
    const promptItem = {
      id: "prompt-current",
      href: "/prompts",
      label: "New prompt: “Neon nightmares”",
      meta: "Write to this prompt",
    };

    const activityItems = (recentActivity || []).map((activity: any, i: number) => {
      const actor = activity.actorUsername ? `@${activity.actorUsername}` : "Someone";
      const preview = activity.barPreview ? `“${activity.barPreview}…”` : "a bar";
      if (activity.type === "like") {
        return {
          id: `like-${activity.id ?? i}`,
          href: `/bars/${activity.barId}`,
          label: `${actor} reacted 🔥 to ${preview}`,
          meta: `${activity.barAuthor ? `by @${activity.barAuthor}` : ""}`.trim(),
        };
      }
      if (activity.type === "comment") {
        return {
          id: `comment-${activity.id ?? i}`,
          href: `/bars/${activity.barId}`,
          label: `${actor} dropped a thought 💬 on ${preview}`,
          meta: `${activity.barAuthor ? `by @${activity.barAuthor}` : ""}`.trim(),
        };
      }
      return {
        id: `post-${activity.id ?? i}`,
        href: `/bars/${activity.barId}`,
        label: `${actor} just dropped a bar`,
        meta: activity.barPreview ? `“${activity.barPreview}…”` : "",
      };
    });

    return [promptItem, ...activityItems].filter(Boolean);
  }, [recentActivity]);

  useEffect(() => {
    if (!nowHappeningItems.length) return;
    const id = window.setInterval(() => {
      setNowHappeningIndex((i) => (i + 1) % nowHappeningItems.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [nowHappeningItems.length]);

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
    <div className="min-h-screen bg-background pt-12 pb-20 md:pt-0 md:pb-0 md:h-screen md:overflow-hidden">
      {/* Mobile search */}
      <div className="md:hidden sticky top-[72px] z-40 px-3 py-2">
        <div className="glass-panel p-3">
          <SearchBar />
        </div>
      </div>

      {/* Desktop: Three column layout - fixed height, only center scrolls */}
      <div className="hidden md:flex h-screen pt-16 px-6 gap-6">
        {/* Left Column - Fixed, non-scrolling - pr so panel shadows extend past scrollbar */}
        <aside className="w-56 shrink-0 space-y-4 overflow-y-auto py-4 pr-3">
          {/* User Profile Preview Pane */}
          {currentUser ? (
            <div className="glass-panel p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-foreground font-bold text-lg">
                  {currentUser.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground">@{currentUser.username}</p>
                  <p className="text-xs text-foreground/50">Level {currentUser.level || 1}</p>
                </div>
              </div>
              <div className="flex gap-4 text-sm text-foreground/60 mb-3">
                <div><span className="text-foreground font-semibold">{currentUser.xp || 0}</span> XP</div>
                  <div><span className="text-foreground font-semibold">{(currentUser as any).barCount || 0}</span> Bars</div>
              </div>
              {(currentUser as any).badges && (currentUser as any).badges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(currentUser as any).badges.slice(0, 4).map((badge: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-4 text-center">
              <p className="text-foreground/60 text-sm mb-3">Join the community</p>
              <a href="/auth" className="block w-full py-2 rounded-lg bg-primary text-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
                Login / Sign Up
              </a>
            </div>
          )}
          
          {/* Tags / Categories Pane */}
          <div className="glass-panel p-4">
            <h3 className="text-sm font-semibold text-foreground/80 mb-3">Popular Tags</h3>
            <div className="flex flex-wrap gap-2">
              {["wordplay", "punchline", "metaphor", "storytelling", "battle", "conscious"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setLocation(`/?tag=${tag}`)}
                  className="text-xs px-2.5 py-1 rounded-full bg-card/04 text-foreground/60 hover:bg-card/08 hover:text-foreground transition-colors border-border/06"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </aside>
        
        {/* Center Column - Feed (scrollable) - pr so card shadows extend into scrollbar area */}
        <main className="flex-1 overflow-y-auto py-4 pr-6">
          <div className="relative">
            <div className="absolute -top-10 left-1/2 h-64 w-[min(860px,92vw)] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(99,102,241,0.18),transparent)] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/8 to-transparent h-64 pointer-events-none" />
            
            <div className="py-7 space-y-3 text-center">
              <Badge className="mx-auto w-fit bg-primary/15 text-primary border border-primary/25 hover:bg-primary/15">
                Orphan Bars — a home for loose lines
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-display font-black tracking-tight text-foreground">
                Drop the lines that don’t fit anywhere else.
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                A focused place for writers to stash orphan bars, react fast, and build on each other’s energy.
              </p>
              <div className="flex items-center justify-center gap-3 pt-1">
                <Link href="/post">
                  <Button size="lg" className="gap-2 shadow-[0_12px_40px_-16px_rgba(99,102,241,0.9)]" data-testid="cta-write-bar-desktop">
                    Write a bar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setActiveTab("latest")}
                  data-testid="cta-browse-latest-desktop"
                >
                  Browse latest
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 max-w-2xl mx-auto pt-3">
                <div className="glass-panel p-3 text-left">
                  <p className="text-[11px] text-foreground/60">Total bars</p>
                  <p className="text-lg font-semibold text-foreground" data-testid="stat-total-bars">
                    {communityStats?.totalBars?.toLocaleString?.() ?? "—"}
                  </p>
                </div>
                <div className="glass-panel p-3 text-left">
                  <p className="text-[11px] text-foreground/60">Posted this week</p>
                  <p className="text-lg font-semibold text-foreground" data-testid="stat-bars-week">
                    {communityStats?.barsThisWeek?.toLocaleString?.() ?? "—"}
                  </p>
                </div>
                <div className="glass-panel p-3 text-left">
                  <p className="text-[11px] text-foreground/60">Active writers (30d)</p>
                  <p className="text-lg font-semibold text-foreground" data-testid="stat-active-writers">
                    {communityStats?.activeWritersThisMonth?.toLocaleString?.() ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="glass-panel p-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
                      <Search className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">Browse</p>
                      <p className="text-xs text-foreground/60">Scan the latest orphan bars from real writers.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
                      <PenLine className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">Drop</p>
                      <p className="text-xs text-foreground/60">Post a line, tag the style, add a quick breakdown.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">React</p>
                      <p className="text-xs text-foreground/60">Gas it up, save it, and build community momentum.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <a href="/guidelines" className="text-xs text-primary hover:underline font-medium">
                    Community guidelines
                  </a>
                </div>
              </div>
            </div>

            {!tagFilter && (
              <div className="mb-4">
                <div className="glass-panel p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-foreground/70">Now happening</span>
                    <span className="h-1 w-1 rounded-full bg-primary/70" />
                    <span className="text-[11px] text-foreground/50">live</span>
                  </div>
                  <div className="mt-2">
                    {nowHappeningItems.length > 0 ? (
                      <Link href={nowHappeningItems[nowHappeningIndex]?.href}>
                        <div className="group cursor-pointer rounded-lg px-2 py-2 hover:bg-card/06 transition-colors">
                          <p className="text-sm text-foreground/85 group-hover:text-foreground transition-colors">
                            <span className="text-primary font-semibold">•</span>{" "}
                            {nowHappeningItems[nowHappeningIndex]?.label}
                          </p>
                          {nowHappeningItems[nowHappeningIndex]?.meta ? (
                            <p className="text-xs text-foreground/50 mt-0.5 truncate">
                              {nowHappeningItems[nowHappeningIndex]?.meta}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    ) : (
                      <p className="text-xs text-foreground/40 py-2">No activity yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!tagFilter && weeklySpotlight && (
              <div className="mb-4">
                <div className="glass-panel p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-foreground/70 flex items-center gap-2">
                        <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                        Bar of the Week
                      </p>
                      <p className="text-sm text-foreground/85 mt-2 leading-relaxed line-clamp-3">
                        {weeklySpotlight.snippet}
                      </p>
                      <p className="text-xs text-foreground/50 mt-2">
                        by <span className="text-foreground/70 font-medium">@{weeklySpotlight.authorUsername}</span> · {weeklySpotlight.likesIn7d} 🔥 in 7d
                      </p>
                    </div>
                    <Link href={`/bars/${weeklySpotlight.barId}`}>
                      <Button variant="outline" size="sm" className="shrink-0" data-testid="button-weekly-spotlight">
                        Read full
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {tagFilter && (
              <div className="mb-4">
                <div className="glass-panel flex items-center gap-2 p-3">
                  <Hash className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground/70">Showing bars tagged with</span>
                  <Badge variant="secondary" className="font-semibold bg-primary/20 text-primary border-primary/30">#{tagFilter}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 text-foreground/50 hover:text-foreground hover:bg-card/10"
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
                <div className="mb-4">
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

                <div className="mb-4">
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
              <div className="py-6 space-y-6">
                {isLoading ? (
                  <BarSkeletonList count={5} />
                ) : filteredBars.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <p>No bars found{tagFilter ? ` with tag #${tagFilter}` : activeTab === "trending" ? " trending right now" : activeTab === "featured" ? " featured yet" : activeTab === "categories" ? " in this category" : sortFilter !== "all" ? " matching this filter" : ""}.</p>
                  </div>
                ) : (
                  filteredBars.map((bar) => (
                    <BarFeedCard key={bar.id} bar={bar} />
                  ))
                )}
              </div>
            </PullToRefresh>
          </div>
        </main>
        
        {/* Right Column - Leaderboard, Challenge, Activity - pr so panel shadows extend past scrollbar */}
        <aside className="w-56 shrink-0 space-y-4 overflow-y-auto py-4 pr-3">
          {/* Leaderboard - Real data */}
          <div className="glass-panel p-4">
            <h3 className="text-sm font-semibold text-foreground/80 mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Top Lyricists
            </h3>
            <div className="space-y-2">
              {leaderboard.length > 0 ? (
                leaderboard.map((user: any, index: number) => (
                  <Link key={user.id} href={`/user/${user.username}`}>
                    <div className="flex items-center gap-2 text-sm hover:bg-card/04 rounded-lg p-1 -m-1 transition-colors cursor-pointer">
                      <span className="w-5 text-foreground/40">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                      </span>
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">
                          {user.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="flex-1 text-foreground/80 truncate">{user.username}</span>
                      <span className="text-primary text-xs">{(user.xp || 0).toLocaleString()} XP</span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-foreground/40 text-xs">No users yet</p>
              )}
            </div>
          </div>
          
          {/* Challenge of the Day - Coming Soon placeholder */}
          <div className="glass-panel p-4">
            <h3 className="text-sm font-semibold text-foreground/80 mb-3 flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Challenge of the Day
            </h3>
            <p className="text-xs text-foreground/40 text-center py-4">Coming soon...</p>
          </div>
          
          {/* Recent Activity - Real data */}
          <div className="glass-panel p-4">
            <h3 className="text-sm font-semibold text-foreground/80 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              Recent Activity
            </h3>
            <div className="space-y-3 text-xs">
              {recentActivity.length > 0 ? (
                recentActivity.slice(0, 6).map((activity: any, i: number) => (
                  <Link key={`${activity.type}-${activity.id}-${i}`} href={`/bars/${activity.barId}`}>
                    <div className="flex items-start gap-2 hover:bg-card/04 rounded-lg p-1 -m-1 transition-colors cursor-pointer">
                      {activity.actorAvatar ? (
                        <img src={activity.actorAvatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-card/06 flex items-center justify-center text-[10px] text-foreground/40">
                          {activity.actorUsername?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {activity.type === 'like' && <Heart className="h-3 w-3 text-red-400" />}
                          {activity.type === 'comment' && <MessageCircle className="h-3 w-3 text-blue-400" />}
                          {activity.type === 'post' && <PenLine className="h-3 w-3 text-green-400" />}
                          <span className="text-foreground/70 truncate">{activity.actorUsername}</span>
                        </div>
                        <span className="text-foreground/40">
                          {activity.type === 'like' && 'liked a bar'}
                          {activity.type === 'comment' && 'commented on a bar'}
                          {activity.type === 'post' && 'dropped a new bar'}
                        </span>
                        <p className="text-foreground/30">{formatTimeAgo(activity.createdAt)}</p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-foreground/40 text-center py-2">No recent activity</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden pt-20 pb-4">
        <main className="px-4">
          <div className="relative">
            <div className="absolute -top-8 left-1/2 h-56 w-[92vw] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(99,102,241,0.18),transparent)] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/8 to-transparent h-56 pointer-events-none" />
            
            <div className="py-6 space-y-3 text-center">
              <Badge className="mx-auto w-fit bg-primary/15 text-primary border border-primary/25 hover:bg-primary/15">
                Orphan Bars
              </Badge>
              <h1 className="text-3xl font-display font-black tracking-tight text-foreground">
                Drop the lines that don’t fit anywhere else.
              </h1>
              <p className="text-muted-foreground text-base max-w-md mx-auto">
                Loose rap/lyric lines. Quick reactions. Real writers.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Link href="/post">
                  <Button className="gap-2" data-testid="cta-write-bar-mobile">
                    Write a bar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setActiveTab("latest")}
                  data-testid="cta-browse-latest-mobile"
                >
                  Browse
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="glass-panel p-2 text-left">
                  <p className="text-[10px] text-foreground/60">Bars</p>
                  <p className="text-sm font-semibold text-foreground">
                    {communityStats?.totalBars?.toLocaleString?.() ?? "—"}
                  </p>
                </div>
                <div className="glass-panel p-2 text-left">
                  <p className="text-[10px] text-foreground/60">This week</p>
                  <p className="text-sm font-semibold text-foreground">
                    {communityStats?.barsThisWeek?.toLocaleString?.() ?? "—"}
                  </p>
                </div>
                <div className="glass-panel p-2 text-left">
                  <p className="text-[10px] text-foreground/60">Active (30d)</p>
                  <p className="text-sm font-semibold text-foreground">
                    {communityStats?.activeWritersThisMonth?.toLocaleString?.() ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="glass-panel p-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex gap-2">
                    <div className="h-7 w-7 rounded-md bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">Browse</p>
                      <p className="text-[11px] text-foreground/60">Find lines.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-7 w-7 rounded-md bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
                      <PenLine className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">Drop</p>
                      <p className="text-[11px] text-foreground/60">Post yours.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-7 w-7 rounded-md bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">React</p>
                      <p className="text-[11px] text-foreground/60">Gas ’em up.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <a href="/guidelines" className="text-[11px] text-primary hover:underline font-medium">
                    Community guidelines
                  </a>
                </div>
              </div>
            </div>

            {!tagFilter && (
              <div className="mb-4">
                <div className="glass-panel p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-foreground/70">Now happening</span>
                    <span className="h-1 w-1 rounded-full bg-primary/70" />
                    <span className="text-[11px] text-foreground/50">live</span>
                  </div>
                  <div className="mt-2">
                    {nowHappeningItems.length > 0 ? (
                      <Link href={nowHappeningItems[nowHappeningIndex]?.href}>
                        <div className="cursor-pointer rounded-lg px-2 py-2 hover:bg-card/06 transition-colors">
                          <p className="text-sm text-foreground/85">
                            <span className="text-primary font-semibold">•</span>{" "}
                            {nowHappeningItems[nowHappeningIndex]?.label}
                          </p>
                          {nowHappeningItems[nowHappeningIndex]?.meta ? (
                            <p className="text-xs text-foreground/50 mt-0.5 truncate">
                              {nowHappeningItems[nowHappeningIndex]?.meta}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    ) : (
                      <p className="text-xs text-foreground/40 py-2">No activity yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!tagFilter && weeklySpotlight && (
              <div className="mb-4">
                <div className="glass-panel p-3">
                  <p className="text-[11px] font-semibold text-foreground/70 flex items-center gap-2">
                    <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                    Bar of the Week
                  </p>
                  <p className="text-sm text-foreground/85 mt-2 leading-relaxed line-clamp-4">
                    {weeklySpotlight.snippet}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <p className="text-xs text-foreground/50 truncate">
                      @{weeklySpotlight.authorUsername} · {weeklySpotlight.likesIn7d} 🔥 in 7d
                    </p>
                    <Link href={`/bars/${weeklySpotlight.barId}`}>
                      <Button variant="outline" size="sm" className="h-7 px-2" data-testid="button-weekly-spotlight-mobile">
                        Read
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {tagFilter && (
              <div className="mb-4">
                <div className="glass-panel flex items-center gap-2 p-3">
                  <Hash className="h-4 w-4 text-primary" />
                  <span className="text-xs text-foreground/70">Tag:</span>
                  <Badge variant="secondary" className="font-semibold bg-primary/20 text-primary border-primary/30 text-xs">#{tagFilter}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 text-foreground/50 hover:text-foreground hover:bg-card/10"
                    onClick={clearTagFilter}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {!tagFilter && (
              <div className="mb-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedTab)} className="w-full">
                  <TabsList className="w-full grid grid-cols-5 glass-panel p-1 h-auto">
                    <TabsTrigger value="featured" className="text-xs p-2" data-testid="tab-featured-mobile">
                      <Star className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="latest" className="text-xs p-2" data-testid="tab-latest-mobile">
                      <Clock className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="top" className="text-xs p-2" data-testid="tab-top-mobile">
                      <Trophy className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="trending" className="text-xs p-2" data-testid="tab-trending-mobile">
                      <Flame className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="text-xs p-2" data-testid="tab-categories-mobile">
                      <Grid3X3 className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            {activeTab === "categories" && !tagFilter && (
              <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
            )}

            <PullToRefresh onRefresh={handleRefresh}>
              <div className="py-4 space-y-4">
                {isLoading ? (
                  <BarSkeletonList count={5} />
                ) : filteredBars.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <p className="text-sm">No bars found.</p>
                  </div>
                ) : (
                  filteredBars.map((bar) => (
                    <BarFeedCard key={bar.id} bar={bar} />
                  ))
                )}
              </div>
            </PullToRefresh>
          </div>
        </main>
      </div>
    </div>
  );
}
