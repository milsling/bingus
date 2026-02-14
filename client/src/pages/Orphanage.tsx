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
import orphanageLogo from "@/assets/orphanage-new-logo.png";

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
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
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
      <div className="rounded-2xl border border-violet-500/20 bg-slate-900/70 p-4 backdrop-blur shadow-[0_0_30px_rgba(139,92,246,0.18)]">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          Available
        </div>
        <p className="text-2xl font-semibold">{totalBars}</p>
      </div>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 backdrop-blur">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-400">
          <Search className="h-3.5 w-3.5 text-violet-400" />
          Visible
        </div>
        <p className="text-2xl font-semibold">{visibleBars}</p>
      </div>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 backdrop-blur">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-400">
          <Activity className="h-3.5 w-3.5 text-violet-400" />
          Total Adoptions
        </div>
        <p className="text-2xl font-semibold">{totalAdoptions}</p>
      </div>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 backdrop-blur">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-400">
          <Heart className="h-3.5 w-3.5 text-violet-400" />
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
    <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 backdrop-blur">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search bars, tags, creator..."
          className="h-10 border-slate-700/70 bg-slate-950/80 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:ring-violet-500"
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
        "relative rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 backdrop-blur transition-transform duration-200 hover:-translate-y-1 hover:border-violet-500 hover:shadow-xl",
        adoptPulse && "border-emerald-400/70 shadow-[0_0_28px_rgba(16,185,129,0.35)] animate-pulse",
      )}
      data-testid={`orphan-bar-card-${bar.id}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm leading-relaxed text-slate-100">{plainText}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {displayTags.map((tag) => (
              <Badge
                key={`${bar.id}-${tag}`}
                variant="outline"
                className="rounded-full border-slate-600/70 bg-slate-800/70 px-2.5 py-0.5 text-[11px] text-slate-300"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
        <div className="rounded-lg border border-slate-700/60 bg-slate-950/70 px-2.5 py-1.5">
          {wordCount} words
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-950/70 px-2.5 py-1.5">
          ~{syllableCount} syllables
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-slate-400">
        <span>@{bar.user.username}</span>
        <span>{formatDistanceToNow(new Date(bar.createdAt), { addSuffix: true })}</span>
      </div>

      <div className="space-y-2">
        {!currentUser ? (
          <Link href="/auth">
            <Button className="h-10 w-full bg-violet-600 text-white hover:bg-violet-500">
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
                : "bg-violet-600 text-white hover:bg-violet-500",
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
          <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-slate-700/60 bg-slate-950/70 p-3">
            <Input
              placeholder="Link to your work (optional)"
              value={usageLink}
              onChange={(e) => setUsageLink(e.target.value)}
              type="url"
              className="border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500"
              data-testid={`input-usage-link-${bar.id}`}
            />
            <Textarea
              placeholder="Tell us how you used it (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="resize-none border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500"
              data-testid={`input-usage-comment-${bar.id}`}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-600 bg-transparent text-slate-300 hover:bg-slate-800"
                onClick={() => {
                  setShowForm(false);
                  setAdoptError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={adoptMutation.isPending}
                className="flex-1 bg-violet-600 text-white hover:bg-violet-500"
                data-testid={`button-submit-adoption-${bar.id}`}
              >
                {adoptMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adopting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Confirm Adopt
                  </>
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
        className="mt-3 flex w-full items-center justify-between rounded-lg border border-slate-700/60 bg-slate-950/70 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/70"
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
                  className="flex gap-3 rounded-lg border border-slate-700/60 bg-slate-950/70 p-3"
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

  const { data: adoptableBars = [], isLoading } = useQuery<OrphanBar[]>({
    queryKey: ["adoptable-bars"],
    queryFn: async () => {
      const res = await fetch("/api/bars/adoptable", { credentials: "include" });
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-14 pb-20 text-slate-100 md:pb-4 md:pt-24">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <img 
              src={orphanageLogo} 
              alt="The Orphanage" 
              className="mb-4 h-32 w-auto sm:h-40 md:h-48"
              data-testid="img-orphanage-logo"
            />
            <h1 className="text-center text-2xl font-semibold sm:text-3xl">The Orphanage</h1>
            <p className="mt-2 max-w-2xl text-center text-sm text-slate-400 sm:text-base">
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

          {!isLoading && topAdoptedBars.length > 0 && (
            <section
              id="leaderboard"
              className="scroll-mt-20 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 backdrop-blur"
              data-testid="leaderboard"
            >
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-violet-400" />
                <h2 className="text-lg font-semibold">Most Adopted</h2>
              </div>
              <div className="space-y-2">
                {topAdoptedBars.map((bar: any, index: number) => (
                  <a
                    key={bar.id}
                    href={`#bar-${bar.id}`}
                    className="group flex items-center gap-3 rounded-lg border border-transparent p-2.5 transition-colors hover:border-violet-500/30 hover:bg-slate-800/80"
                    data-testid={`leaderboard-item-${index}`}
                  >
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      index === 0 && "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
                      index === 1 && "bg-gray-300/30 text-gray-600 dark:text-gray-400",
                      index === 2 && "bg-amber-600/20 text-amber-700 dark:text-amber-500",
                      index > 2 && "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm text-slate-200 transition-colors group-hover:text-violet-300">
                        {stripHtml(bar.content).slice(0, 80)}
                        {bar.content.length > 60 ? '...' : ''}
                      </p>
                      <p className="text-xs text-slate-500">by @{bar.user.username}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 border-violet-400/35 bg-violet-500/10 text-violet-200">
                      {bar.usageCount} {bar.usageCount === 1 ? 'adoption' : 'adoptions'}
                    </Badge>
                  </a>
                ))}
              </div>
            </section>
          )}

          {currentUser && myAdoptions.length > 0 && (
            <section
              id="my-adoptions"
              className="scroll-mt-20 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 backdrop-blur"
              data-testid="my-adoptions"
            >
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5 text-violet-400" />
                <h2 className="text-lg font-semibold">My Adoptions</h2>
                <Badge variant="outline" className="ml-auto border-violet-400/35 bg-violet-500/10 text-violet-200">
                  {myAdoptions.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {myAdoptions.slice(0, 5).map((adoption: any, index: number) => (
                  <a
                    key={adoption.id}
                    href={`#bar-${adoption.barId}`}
                    className="group flex items-center gap-3 rounded-lg border border-transparent p-2.5 transition-colors hover:border-violet-500/30 hover:bg-slate-800/80"
                    data-testid={`my-adoption-${index}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm text-slate-200 transition-colors group-hover:text-violet-300">
                        {stripHtml(adoption.bar.content).slice(0, 80)}
                        {adoption.bar.content.length > 60 ? '...' : ''}
                      </p>
                      <p className="text-xs text-slate-500">by @{adoption.bar.user.username}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">
                      {formatDistanceToNow(new Date(adoption.createdAt), { addSuffix: true })}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {isLoading ? (
            <BarSkeletonList count={3} />
          ) : adoptableBars.length === 0 ? (
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 py-20 text-center text-slate-400">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-slate-800/70 opacity-70">
                <Home className="h-8 w-8" />
              </div>
              <p className="text-lg text-slate-200">The Orphanage is empty</p>
              <p className="mt-2 text-sm">No bars are currently available for adoption</p>
            </div>
          ) : filteredBars.length === 0 ? (
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 py-16 text-center text-slate-400">
              <p className="text-lg text-slate-200">No bars match these filters</p>
              <p className="mt-2 text-sm">Try another style or clear your search.</p>
              <Button
                variant="outline"
                className="mt-4 border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800"
                onClick={() => {
                  setActiveFilter("All");
                  setSearchTerm("");
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBars.map((bar, index) => (
                <motion.div
                  key={bar.id}
                  id={`bar-${bar.id}`}
                  className="scroll-mt-20"
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: shouldReduceMotion ? 0 : Math.min(index * 0.04, 0.32) }}
                >
                  <OrphanBarCard bar={bar} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
