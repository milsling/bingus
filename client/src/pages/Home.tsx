import { useCallback, useEffect, useMemo, useState } from "react";
import type { BarWithUser } from "@shared/schema";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, PenLine, Flame, Sparkles, Trophy, Hash, X, Compass } from "lucide-react";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PullToRefresh } from "@/components/PullToRefresh";
import { BarSkeletonList } from "@/components/BarSkeleton";
import { SearchBar } from "@/components/SearchBar";
import FeedBarCard from "@/components/FeedBarCard";
import ActivityStrip from "@/components/ActivityStrip";
import CommunitySpotlight from "@/components/CommunitySpotlight";

type FeedTab = "latest" | "top" | "trending" | "challenges";

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function Home() {
  const { bars, isLoadingBars, refetchBars, currentUser } = useBars();
  const [activeTab, setActiveTab] = useState<FeedTab>("latest");
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const tagFilter = params.get("tag");
  const { toast } = useToast();

  useEffect(() => {
    const error = params.get("error");
    const errorDescription = params.get("error_description");
    if (!error) {
      return;
    }

    const message = errorDescription
      ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
      : "Authentication failed. Please try again.";

    toast({
      title: "Sign In Failed",
      description: message,
      variant: "destructive",
    });

    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }, [params, toast]);

  const { data: communityStats } = useQuery({
    queryKey: ["community-stats"],
    queryFn: () => api.getCommunityStats(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: activityItems = [] } = useQuery({
    queryKey: ["community-now"],
    queryFn: () => api.getNowActivity(8),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: spotlight } = useQuery({
    queryKey: ["community-spotlight"],
    queryFn: () => api.getCommunitySpotlight(),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const { data: currentPrompt } = useQuery({
    queryKey: ["current-prompt"],
    queryFn: () => api.getCurrentPrompt(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard?limit=8", { credentials: "include" });
      return res.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: topBars = [], isLoading: isTopLoading } = useQuery({
    queryKey: ["bars-top"],
    queryFn: async () => {
      const res = await fetch("/api/bars/feed/top", { credentials: "include" });
      return res.json();
    },
    enabled: !tagFilter && activeTab === "top",
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: trendingBars = [], isLoading: isTrendingLoading } = useQuery({
    queryKey: ["bars-trending"],
    queryFn: async () => {
      const res = await fetch("/api/bars/feed/trending", { credentials: "include" });
      return res.json();
    },
    enabled: !tagFilter && activeTab === "trending",
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: challengeBars = [], isLoading: isChallengesLoading } = useQuery({
    queryKey: ["bars-challenges"],
    queryFn: () => api.getChallenges(30),
    enabled: !tagFilter && activeTab === "challenges",
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: tagBars = [], isLoading: isTagBarsLoading } = useQuery({
    queryKey: ["bars-by-tag", tagFilter],
    queryFn: async () => {
      if (!tagFilter) return [];
      const res = await fetch(`/api/bars/by-tag/${encodeURIComponent(tagFilter)}`, {
        credentials: "include",
      });
      return res.json();
    },
    enabled: !!tagFilter,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const visibleBars = useMemo<BarWithUser[]>(() => {
    if (tagFilter) return tagBars;
    if (activeTab === "top") return topBars;
    if (activeTab === "trending") return trendingBars;
    if (activeTab === "challenges") return challengeBars as BarWithUser[];
    return bars;
  }, [tagFilter, tagBars, activeTab, topBars, trendingBars, challengeBars, bars]);

  const isLoading = tagFilter
    ? isTagBarsLoading
    : activeTab === "top"
      ? isTopLoading
      : activeTab === "trending"
        ? isTrendingLoading
        : activeTab === "challenges"
          ? isChallengesLoading
          : isLoadingBars;

  const handleRefresh = useCallback(async () => {
    await refetchBars();
    queryClient.invalidateQueries({ queryKey: ["bars-top"] });
    queryClient.invalidateQueries({ queryKey: ["bars-trending"] });
    queryClient.invalidateQueries({ queryKey: ["bars-challenges"] });
    queryClient.invalidateQueries({ queryKey: ["bars-by-tag", tagFilter] });
    queryClient.invalidateQueries({ queryKey: ["community-now"] });
    queryClient.invalidateQueries({ queryKey: ["community-spotlight"] });
    queryClient.invalidateQueries({ queryKey: ["community-stats"] });
  }, [queryClient, refetchBars, tagFilter]);

  const stats = {
    totalBars: communityStats?.totalBars ?? bars.length,
    barsThisWeek: communityStats?.barsThisWeek ?? 0,
    activeWritersMonth: communityStats?.activeWritersMonth ?? 0,
  };

  const showFeed = () => {
    const feed = document.getElementById("feed-start");
    if (feed) {
      feed.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const clearTagFilter = () => setLocation("/");

  return (
    <div className="min-h-screen bg-background pt-14 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:pt-20 md:pb-8">
      <main className="mx-auto w-full max-w-7xl xl:max-w-[1600px] px-4 md:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-5">
            <div className="md:hidden sticky top-[calc(env(safe-area-inset-top)+3.4rem)] z-30">
              <div className="glass-panel p-3">
                <SearchBar />
              </div>
            </div>

            <section className="relative overflow-hidden rounded-3xl glass-panel border border-white/[0.08] p-6 md:p-8">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
              <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />

              <div className="relative">
                <Badge className="mb-3 bg-primary/15 text-primary hover:bg-primary/20">
                  Modern writer room
                </Badge>
                <h1 className="max-w-3xl text-[clamp(2rem,4.4vw,3.4rem)] font-black leading-tight tracking-tight">
                  Drop the lines that do not fit anywhere else.
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
                  Orphan Bars is a focused place to share loose bars, discover sharp writing,
                  and keep the culture moving through reactions and responses.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => setLocation("/post")}
                    data-testid="button-hero-write"
                  >
                    Write a bar
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={showFeed}
                    data-testid="button-hero-browse"
                  >
                    Browse latest
                  </Button>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Total bars
                    </p>
                    <p className="mt-1 text-2xl font-bold text-primary">
                      {formatCompact(stats.totalBars)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Bars this week
                    </p>
                    <p className="mt-1 text-2xl font-bold text-primary">
                      {formatCompact(stats.barsThisWeek)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Active writers (month)
                    </p>
                    <p className="mt-1 text-2xl font-bold text-primary">
                      {formatCompact(stats.activeWritersMonth)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <ActivityStrip items={activityItems} />
            <CommunitySpotlight spotlight={spotlight ?? null} />

            {currentPrompt && (
              <section className="rounded-2xl border border-primary/25 bg-primary/6 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                  Current prompt
                </p>
                <p className="mt-2 text-xl font-semibold">{currentPrompt.text}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    onClick={() => setLocation(`/post?prompt=${currentPrompt.slug}`)}
                    data-testid="button-write-prompt"
                  >
                    Write to this prompt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setLocation(`/prompts/${currentPrompt.slug}`)}
                  >
                    View prompt page
                  </Button>
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-border/60 bg-card/60 p-4 md:p-5">
              <p className="mb-3 text-sm font-semibold">How it works</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <div className="mb-2 inline-flex rounded-full bg-primary/12 p-2 text-primary">
                    <Search className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold">1. Browse orphan bars.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Explore what writers are dropping right now.
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <div className="mb-2 inline-flex rounded-full bg-primary/12 p-2 text-primary">
                    <PenLine className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold">2. Drop your own lines.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Post one-liners, snippets, or challenge bars.
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <div className="mb-2 inline-flex rounded-full bg-primary/12 p-2 text-primary">
                    <Flame className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold">3. React and respond.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Give quick feedback and jump into call-and-response threads.
                  </p>
                </div>
              </div>
            </section>

            {tagFilter && (
              <div className="rounded-xl border border-border/60 bg-card/60 p-3 flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Filtering by</span>
                <Badge variant="secondary">#{tagFilter}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={clearTagFilter}
                  data-testid="button-clear-tag"
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
              </div>
            )}

            {!tagFilter && (
              <div className="rounded-2xl border border-border/60 bg-card/60 p-2 flex flex-wrap gap-2">
                {(
                  [
                    { id: "latest", label: "Latest" },
                    { id: "top", label: "Top" },
                    { id: "trending", label: "Trending" },
                    { id: "challenges", label: "Challenges" },
                  ] as Array<{ id: FeedTab; label: string }>
                ).map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    className={activeTab === tab.id ? "bg-primary text-primary-foreground" : ""}
                    data-testid={`feed-tab-${tab.id}`}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            )}

            <PullToRefresh onRefresh={handleRefresh}>
              <div id="feed-start" className="space-y-4 pb-4">
                {isLoading ? (
                  <BarSkeletonList count={5} />
                ) : visibleBars.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
                    <p className="text-base font-medium">
                      {tagFilter
                        ? `No bars found for #${tagFilter} yet.`
                        : activeTab === "challenges"
                          ? "No active challenges yet."
                          : "No bars yet."}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Start the energy with your first post.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => setLocation("/post")}
                      data-testid="button-empty-state-post"
                    >
                      Drop your first orphan bar
                    </Button>
                  </div>
                ) : (
                  visibleBars.map((bar) => <FeedBarCard key={bar.id} bar={bar} />)
                )}
              </div>
            </PullToRefresh>
          </section>

          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              <section className="rounded-2xl border border-border/60 bg-card/70 p-4">
                <p className="mb-3 text-sm font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Top lyricists
                </p>
                <div className="space-y-2">
                  {leaderboard.length === 0 && (
                    <p className="text-xs text-muted-foreground">No ranking yet.</p>
                  )}
                  {leaderboard.slice(0, 6).map((user: any, index: number) => (
                    <Link key={user.id} href={`/u/${user.username}`}>
                      <a className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors">
                        <span className="w-5 text-xs text-muted-foreground">
                          {index + 1}
                        </span>
                        <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-xs text-primary overflow-hidden">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            user.username?.[0]?.toUpperCase()
                          )}
                        </div>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          @{user.username}
                        </span>
                        <span className="text-xs text-primary">
                          {formatCompact(user.xp || 0)}
                        </span>
                      </a>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-border/60 bg-card/70 p-4">
                <p className="mb-2 text-sm font-semibold flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary" />
                  Explore
                </p>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setLocation("/prompts")}
                  >
                    Prompts
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setLocation("/challenges")}
                  >
                    Challenges
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setLocation(currentUser ? "/profile" : "/auth")}
                  >
                    My Bars
                  </Button>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
