import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Sparkles,
  Activity,
  Users,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Send,
  Trophy,
  Heart,
  CheckCircle2,
  Loader2,
  Home,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { isToday, formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BarSkeletonList } from "@/components/BarSkeleton";
import { useToast } from "@/hooks/use-toast";
import { useBars } from "@/context/BarContext";
import { cn } from "@/lib/utils";
import AccentLogo from "@/components/AccentLogo";

interface BarUsage {
  id: string;
  barId: string;
  userId: string;
  usageLink: string | null;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

type OrphanBar = {
  id: string;
  content: string;
  createdAt: string;
  category: string;
  tags: string[] | null;
  barType: string;
  commentCount: number;
  usageCount: number;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
};

type UserAdoption = {
  id: string;
  barId: string;
  createdAt: string;
  bar: OrphanBar;
};

const STYLE_FILTERS = ["All", "Gritty", "Motivational", "Punchline", "Melodic"] as const;
type StyleFilter = (typeof STYLE_FILTERS)[number];

const STYLE_KEYWORDS: Record<Exclude<StyleFilter, "All">, string[]> = {
  Gritty: ["grit", "gritty", "street", "raw", "hard", "hustle", "dark"],
  Motivational: ["motivat", "inspire", "uplift", "rise", "win", "grind", "success"],
  Punchline: ["punchline", "bar", "battle", "wordplay", "flip", "metaphor"],
  Melodic: ["melod", "vibe", "flow", "harmon", "sing", "soft", "wave"],
};

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function estimateSyllables(text: string) {
  const words: string[] = text.toLowerCase().match(/[a-z]+/g) ?? [];
  return words.reduce((sum, word) => {
    const groups = word.match(/[aeiouy]+/g);
    return sum + Math.max(1, groups?.length || 0);
  }, 0);
}

function getStyleMatch(bar: OrphanBar, style: StyleFilter) {
  if (style === "All") return true;
  const source = `${bar.category} ${(bar.tags || []).join(" ")} ${stripHtml(bar.content)}`.toLowerCase();
  return STYLE_KEYWORDS[style].some((keyword) => source.includes(keyword));
}

function getDisplayTags(bar: OrphanBar) {
  const baseTags = (bar.tags || []).filter(Boolean);
  if (baseTags.length > 0) return baseTags.slice(0, 4);
  return [bar.category, bar.barType.replace("_", " ")].filter(Boolean).slice(0, 2);
}

interface OrphanageStatsProps {
  totalBars: number;
  visibleBars: number;
  totalAdoptions: number;
  adoptedToday: number;
}

function OrphanageStats({ totalBars, visibleBars, totalAdoptions, adoptedToday }: OrphanageStatsProps) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="glass-surface rounded-2xl p-4 transition-all duration-300 hover:border-primary/30">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Available
        </div>
        <p className="text-2xl font-semibold">{totalBars}</p>
      </div>
      <div className="glass-surface rounded-2xl p-4 transition-all duration-300 hover:border-primary/30">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <Search className="h-3.5 w-3.5 text-primary" />
          Visible
        </div>
        <p className="text-2xl font-semibold">{visibleBars}</p>
      </div>
      <div className="glass-surface rounded-2xl p-4 transition-all duration-300 hover:border-primary/30">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Total Adoptions
        </div>
        <p className="text-2xl font-semibold">{totalAdoptions}</p>
      </div>
      <div className="glass-surface rounded-2xl p-4 transition-all duration-300 hover:border-primary/30">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <Heart className="h-3.5 w-3.5 text-primary" />
          Adopted Today
        </div>
        <p className="text-2xl font-semibold">{adoptedToday}</p>
      </div>
    </section>
  );
}

interface OrphanageFiltersProps {
  activeFilter: StyleFilter;
  searchTerm: string;
  onFilterChange: (filter: StyleFilter) => void;
  onSearchChange: (value: string) => void;
}

function OrphanageFilters({
  activeFilter,
  searchTerm,
  onFilterChange,
  onSearchChange,
}: OrphanageFiltersProps) {
  return (
    <section className="glass-surface rounded-2xl p-4 transition-all duration-300">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search bars, tags, creator..."
          className="h-10 border-border/70 bg-background/80 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          data-testid="orphanage-search-input"
        />
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {STYLE_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
              activeFilter === filter
                ? "border-violet-400 bg-violet-600 text-white"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800",
            )}
            data-testid={`orphanage-filter-${filter.toLowerCase()}`}
          >
            {filter}
          </button>
        ))}
      </div>
    </section>
  );
}

interface OrphanBarCardProps {
  bar: OrphanBar;
}

function OrphanBarCard({ bar }: OrphanBarCardProps) {
  const { currentUser } = useBars();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [usageLink, setUsageLink] = useState("");
  const [comment, setComment] = useState("");
  const [adopted, setAdopted] = useState(false);
  const [adoptPulse, setAdoptPulse] = useState(false);
  const [adoptError, setAdoptError] = useState<string | null>(null);

  const plainText = useMemo(() => stripHtml(bar.content), [bar.content]);
  const wordCount = useMemo(() => plainText.split(/\s+/).filter(Boolean).length, [plainText]);
  const syllableCount = useMemo(() => estimateSyllables(plainText), [plainText]);
  const displayTags = useMemo(() => getDisplayTags(bar), [bar]);

  const { data: usages = [], isLoading: loadingUsages } = useQuery<BarUsage[]>({
    queryKey: ["bar-usages", bar.id],
    queryFn: async () => {
      const res = await fetch(`/api/bars/${bar.id}/usages`, { credentials: "include" });
      return res.json();
    },
    enabled: isOpen,
    staleTime: 30000,
  });

  const adoptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bars/${bar.id}/usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ usageLink: usageLink || undefined, comment: comment || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      return res.json();
    },
    onSuccess: () => {
      setAdoptError(null);
      setAdopted(true);
      setAdoptPulse(true);
      toast({ title: "Adopted!", description: "Your adoption has been recorded" });
      setShowForm(false);
      setUsageLink("");
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["bar-usages", bar.id] });
      queryClient.invalidateQueries({ queryKey: ["adoptable-bars"] });
      queryClient.invalidateQueries({ queryKey: ["my-adoptions"] });
    },
    onError: (error: any) => {
      setAdoptError(error.message || "Could not submit adoption");
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!adoptPulse) return;
    const timeout = window.setTimeout(() => setAdoptPulse(false), 950);
    return () => window.clearTimeout(timeout);
  }, [adoptPulse]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdoptError(null);
    adoptMutation.mutate();
  };

  return (
    <article
      className={cn(
        "glass-card overflow-hidden p-4 transition-all duration-300 hover:border-primary/30",
        adoptPulse && "border-emerald-400/70 shadow-[0_0_28px_rgba(16,185,129,0.35)] animate-pulse",
      )}
      data-testid={`orphan-bar-card-${bar.id}`}
    >
      <div className="mb-3 space-y-3">
        <div className="min-w-0">
          <p className="text-sm leading-relaxed text-foreground">{plainText}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {displayTags.map((tag) => (
              <Badge
                key={`${bar.id}-${tag}`}
                variant="outline"
                className="rounded-full border-border/70 bg-muted/50 px-2.5 py-0.5 text-[11px] text-muted-foreground"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-2.5 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-8 w-8 border-2 border-border/50">
            <AvatarImage src={bar.user.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {bar.user.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">@{bar.user.username}</p>
            <Link href={`/u/${bar.user.username}`} className="text-xs text-primary hover:underline">
              View Profile
            </Link>
          </div>
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground text-right">
            {formatDistanceToNow(new Date(bar.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="rounded-lg border border-border/60 bg-background/50 px-2.5 py-1.5 text-center font-medium">
          {wordCount} words
        </div>
        <div className="rounded-lg border border-border/60 bg-background/50 px-2.5 py-1.5 text-center font-medium">
          ~{syllableCount} syllables
        </div>
      </div>

      <div className="space-y-2">
        {!currentUser ? (
          <Link href="/auth">
            <Button className="h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Login to Adopt
            </Button>
          </Link>
        ) : !showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            disabled={adoptMutation.isPending}
            className={cn(
              "h-10 w-full",
              adopted
                ? "bg-emerald-500 text-white hover:bg-emerald-500"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
            data-testid={`button-adopt-${bar.id}`}
          >
            {adoptMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : adopted ? (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {adopted ? "Adopted" : "Adopt"}
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2 glass-surface-strong rounded-xl p-3">
            <Input
              placeholder="Link to your work (optional)"
              value={usageLink}
              onChange={(e) => setUsageLink(e.target.value)}
              type="url"
              className="border-border/50 bg-background/80 text-foreground placeholder:text-muted-foreground"
              data-testid={`input-usage-link-${bar.id}`}
            />
            <Textarea
              placeholder="Tell us how you used it (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="resize-none border-border/50 bg-background/80 text-foreground placeholder:text-muted-foreground"
              data-testid={`input-usage-comment-${bar.id}`}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-border/60 bg-transparent text-muted-foreground hover:bg-muted"
                onClick={() => {
                  setShowForm(false);
                  setAdoptError(null);
                  setUsageLink("");
                  setComment("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={adoptMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {adoptMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Submit Adoption"
                )}
              </Button>
            </div>
            {adoptError && (
              <p className="text-xs text-red-400" data-testid={`adoption-error-${bar.id}`}>
                {adoptError}
              </p>
            )}
          </form>
        )}
      </div>

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="mt-3 flex w-full items-center justify-between glass-surface rounded-lg p-2 transition-all duration-300 hover:border-primary/30"
        data-testid={`button-adoption-panel-${bar.id}`}
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-violet-400" />
          <span>
            {bar.usageCount || 0} adoption{(bar.usageCount || 0) === 1 ? "" : "s"}
          </span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2">
          {loadingUsages ? (
            <p className="text-center text-sm text-slate-400">Loading adoptions...</p>
          ) : usages.length === 0 ? (
            <p className="text-center text-sm text-slate-400">
              No one has adopted this bar yet. Be the first!
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Recent adoptions</p>
              {usages.map((usage) => (
                <div
                  key={usage.id}
                  className="flex gap-3 glass-surface rounded-lg p-3 transition-all duration-300 hover:border-primary/30"
                  data-testid={`usage-${usage.id}`}
                >
                  <Link href={`/u/${usage.user.username}`}>
                    <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                      <AvatarImage src={usage.user.avatarUrl || undefined} />
                      <AvatarFallback>{usage.user.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/u/${usage.user.username}`}>
                        <span className="cursor-pointer text-sm font-medium text-slate-100 hover:text-violet-300 transition-colors">
                          @{usage.user.username}
                        </span>
                      </Link>
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(usage.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {usage.comment && (
                      <p className="mt-1 text-sm text-slate-300">{usage.comment}</p>
                    )}
                    {usage.usageLink && (
                      <a
                        href={usage.usageLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-violet-300 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View work
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function OrphanagePage() {
  const { currentUser } = useBars();
  const shouldReduceMotion = useReducedMotion();
  const [activeFilter, setActiveFilter] = useState<StyleFilter>("All");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: adoptableBars = [], isLoading, isError, error } = useQuery<OrphanBar[]>({
    queryKey: ["adoptable-bars"],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const res = await fetch("/api/bars/adoptable", { 
          credentials: "include",
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch adoptable bars: ${res.status}`);
        }
        return res.json();
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: myAdoptions = [] } = useQuery<UserAdoption[]>({
    queryKey: ["my-adoptions"],
    queryFn: async () => {
      const res = await fetch("/api/user/adoptions", { credentials: "include" });
      return res.json();
    },
    enabled: !!currentUser,
    staleTime: 30000,
  });

  const topAdoptedBars = useMemo(() => {
    if (!adoptableBars.length) return [];
    return [...adoptableBars]
      .filter((bar: any) => (bar.usageCount || 0) > 0)
      .sort((a: any, b: any) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 5);
  }, [adoptableBars]);

  const filteredBars = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return adoptableBars.filter((bar) => {
      const styleMatches = getStyleMatch(bar, activeFilter);
      if (!styleMatches) return false;
      if (!search) return true;
      const source = `${stripHtml(bar.content)} ${bar.category} ${(bar.tags || []).join(" ")} ${bar.user.username}`.toLowerCase();
      return source.includes(search);
    });
  }, [adoptableBars, activeFilter, searchTerm]);

  const totalAdoptions = useMemo(
    () => adoptableBars.reduce((sum, bar) => sum + (bar.usageCount || 0), 0),
    [adoptableBars],
  );

  const adoptedToday = useMemo(
    () => myAdoptions.filter((adoption) => isToday(new Date(adoption.createdAt))).length,
    [myAdoptions],
  );

  return (
    <div className="min-h-screen pt-14 pb-20 text-foreground md:pb-4 md:pt-24">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <AccentLogo 
              className="mb-4 h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48"
            />
            <h1 className="text-center text-2xl font-semibold sm:text-3xl">The Orphanage</h1>
            <p className="mt-2 max-w-2xl text-center text-sm text-muted-foreground sm:text-base">
              Open-adopt bars cleared for commercial use. Claim one, build on it, and make it yours.
            </p>
          </div>

          <OrphanageStats
            totalBars={adoptableBars.length}
            visibleBars={filteredBars.length}
            totalAdoptions={totalAdoptions}
            adoptedToday={adoptedToday}
          />

          <OrphanageFilters
            activeFilter={activeFilter}
            searchTerm={searchTerm}
            onFilterChange={setActiveFilter}
            onSearchChange={setSearchTerm}
          />

          {currentUser && myAdoptions.length > 0 && (
            <section
              id="my-adoptions"
              className="glass-surface rounded-2xl p-4 transition-all duration-300"
              data-testid="my-adoptions"
            >
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">My Adoptions</h2>
              </div>
              <div className="space-y-2">
                {myAdoptions.map((adoption) => (
                  <a
                    key={adoption.id}
                    href={`#bar-${adoption.bar.id}`}
                    className="group flex items-center gap-3 glass-surface-strong rounded-lg p-2.5 transition-all duration-300 hover:border-primary/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm text-foreground transition-colors group-hover:text-primary">
                        {stripHtml(adoption.bar.content).slice(0, 80)}
                        {adoption.bar.content.length > 60 ? '...' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">by @{adoption.bar.user.username}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(adoption.createdAt), { addSuffix: true })}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Render the filtered bars */}
          <section className="space-y-4">
            {isLoading ? (
              <BarSkeletonList count={6} />
            ) : isError ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-destructive/50" />
                <h3 className="text-lg font-medium text-foreground mb-2">Failed to load bars</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {error instanceof Error ? error.message : "An error occurred while loading adoptable bars"}
                </p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Reload Page
                </Button>
              </div>
            ) : filteredBars.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium text-foreground mb-2">No bars found</h3>
                <p className="text-sm text-muted-foreground">
                  {adoptableBars.length === 0 
                    ? "No adoptable bars are available at the moment."
                    : "Try adjusting your filters or search terms."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredBars.map((bar) => (
                  <div key={bar.id} id={`bar-${bar.id}`}>
                    <OrphanBarCard bar={bar} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
