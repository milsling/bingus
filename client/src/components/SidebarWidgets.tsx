import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { api } from "@/lib/api";
import { useBars } from "@/context/BarContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Flame, Hash, Trophy, Users, PenLine, Swords,
  Zap, TrendingUp, Heart, Star, CircleDot, Activity,
  Sparkles, Award, ChevronRight, UserPlus
} from "lucide-react";

// ── Glass card wrapper ─────────────────────────────────────────────────
function SidebarCard({
  children,
  className,
  hasCustomBackground,
}: {
  children: React.ReactNode;
  className?: string;
  hasCustomBackground?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4",
        hasCustomBackground ? "glass-surface-strong" : "NativeGlassCard",
        className
      )}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  iconColor = "text-primary",
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  title: string;
}) {
  return (
    <p className="mb-3 text-sm font-semibold flex items-center gap-2">
      <Icon className={cn("h-4 w-4", iconColor)} />
      {title}
    </p>
  );
}

// ── Bar of the Day ─────────────────────────────────────────────────────
export function BarOfTheDay({ hasCustomBackground }: { hasCustomBackground: boolean }) {
  const { data: bar } = useQuery({
    queryKey: ["sidebar-bar-of-the-day"],
    queryFn: () => api.getBarOfTheDay(),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  if (!bar) return null;

  return (
    <SidebarCard hasCustomBackground={hasCustomBackground}>
      <SectionHeader icon={Star} iconColor="text-amber-400" title="Bar of the Day" />
      <Link href={bar.href}>
        <a className="block group">
          <p className="text-sm leading-relaxed text-foreground/90 line-clamp-3 group-hover:text-primary transition-colors">
            "{bar.snippet}"
          </p>
          <div className="flex items-center gap-2 mt-3">
            <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-xs overflow-hidden">
              {bar.avatarUrl ? (
                <img src={bar.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                bar.author?.[0]?.toUpperCase()
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate">@{bar.author}</span>
            <span className="ml-auto flex items-center gap-1 text-xs text-rose-400">
              <Heart className="h-3 w-3" /> {bar.likeCount}
            </span>
          </div>
        </a>
      </Link>
    </SidebarCard>
  );
}

// ── Trending Tags ──────────────────────────────────────────────────────
export function TrendingTags({ hasCustomBackground }: { hasCustomBackground: boolean }) {
  const [, setLocation] = useLocation();
  const { data: tags = [] } = useQuery({
    queryKey: ["sidebar-trending-tags"],
    queryFn: () => api.getTrendingTags(),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  if (tags.length === 0) return null;

  return (
    <SidebarCard hasCustomBackground={hasCustomBackground}>
      <SectionHeader icon={TrendingUp} iconColor="text-emerald-400" title="Trending" />
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <button
            key={t.tag}
            onClick={() => setLocation(`/?tag=${encodeURIComponent(t.tag)}`)}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            <Hash className="h-3 w-3" />
            {t.tag}
            <span className="text-[10px] text-primary/60">{t.usage_count}</span>
          </button>
        ))}
      </div>
    </SidebarCard>
  );
}

// ── Recent Activity Feed ───────────────────────────────────────────────
export function RecentActivityFeed({ hasCustomBackground }: { hasCustomBackground: boolean }) {
  const { data: activity = [] } = useQuery({
    queryKey: ["sidebar-recent-activity"],
    queryFn: () => api.getNowActivity(6),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: 30_000,
  });

  if (activity.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "reaction": return <Flame className="h-3 w-3 text-orange-400" />;
      case "comment": return <PenLine className="h-3 w-3 text-blue-400" />;
      case "post": return <Sparkles className="h-3 w-3 text-purple-400" />;
      case "prompt": return <Zap className="h-3 w-3 text-yellow-400" />;
      default: return <CircleDot className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <SidebarCard hasCustomBackground={hasCustomBackground}>
      <SectionHeader icon={Activity} iconColor="text-cyan-400" title="Live Activity" />
      <div className="space-y-2">
        {activity.slice(0, 5).map((item) => (
          <Link key={item.id} href={item.href}>
            <a className="flex items-start gap-2 rounded-lg px-1.5 py-1 hover:bg-muted/50 transition-colors group">
              <span className="mt-0.5 shrink-0">{getIcon(item.type)}</span>
              <span className="text-xs text-muted-foreground leading-snug line-clamp-2 group-hover:text-foreground transition-colors">
                {item.text}
              </span>
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/60 mt-0.5">
                {timeAgo(item.createdAt)}
              </span>
            </a>
          </Link>
        ))}
      </div>
    </SidebarCard>
  );
}

// ── Current Prompt (sidebar) ───────────────────────────────────────────
export function SidebarPrompt({ hasCustomBackground }: { hasCustomBackground: boolean }) {
  const [, setLocation] = useLocation();
  const { data: prompt } = useQuery({
    queryKey: ["current-prompt"],
    queryFn: () => api.getCurrentPrompt(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  if (!prompt) return null;

  return (
    <SidebarCard hasCustomBackground={hasCustomBackground} className="border border-primary/20">
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-1">
        This week's prompt
      </p>
      <p className="text-sm font-semibold leading-snug">{prompt.text}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-muted-foreground">{prompt.barsCount} entries</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
          onClick={() => setLocation(`/post?prompt=${prompt.slug}`)}
        >
          Write <ChevronRight className="h-3 w-3 ml-0.5" />
        </Button>
      </div>
    </SidebarCard>
  );
}

// ── XP Progress Card ───────────────────────────────────────────────────
export function XpProgressCard({ hasCustomBackground }: { hasCustomBackground: boolean }) {
  const { currentUser } = useBars();
  const { data: xp } = useQuery({
    queryKey: ["sidebar-my-xp"],
    queryFn: () => api.getMyXpProgress(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: !!currentUser,
  });

  if (!currentUser || !xp) return null;

  const progressPercent = Math.min(100, Math.round(xp.xpProgress * 100));

  return (
    <SidebarCard hasCustomBackground={hasCustomBackground}>
      <SectionHeader icon={Award} iconColor="text-violet-400" title="Your Progress" />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-primary">Lv.{xp.level}</span>
            <span className="text-xs text-muted-foreground ml-2">{xp.xp} XP</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {xp.xpForNextLevel - xp.xp} to next
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm font-bold text-foreground">{xp.barsMinted}</p>
            <p className="text-[10px] text-muted-foreground">Bars</p>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{xp.likesReceived}</p>
            <p className="text-[10px] text-muted-foreground">Likes</p>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{xp.followers}</p>
            <p className="text-[10px] text-muted-foreground">Followers</p>
          </div>
        </div>
      </div>
    </SidebarCard>
  );
}

// ── Community Stats (Pulse) ────────────────────────────────────────────
export function CommunityPulse({ hasCustomBackground }: { hasCustomBackground: boolean }) {
  const { data: pulse } = useQuery({
    queryKey: ["sidebar-community-pulse"],
    queryFn: () => api.getCommunityPulse(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  });

  if (!pulse) return null;

  const stats = [
    { label: "Bars today", value: pulse.barsToday, icon: PenLine, color: "text-purple-400" },
    { label: "Online now", value: pulse.onlineNow, icon: Users, color: "text-green-400" },
    { label: "Reactions today", value: pulse.reactionsToday, icon: Heart, color: "text-rose-400" },
  ];

  return (
    <SidebarCard hasCustomBackground={hasCustomBackground}>
      <SectionHeader icon={Zap} iconColor="text-yellow-400" title="Community Pulse" />
      <div className="space-y-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <s.icon className={cn("h-3.5 w-3.5", s.color)} />
            <span className="text-xs text-muted-foreground flex-1">{s.label}</span>
            <span className="text-sm font-semibold">{s.value}</span>
          </div>
        ))}
      </div>
    </SidebarCard>
  );
}

// ── Recent Challenges ──────────────────────────────────────────────────
export function RecentChallenges({ hasCustomBackground }: { hasCustomBackground: boolean }) {
  const [, setLocation] = useLocation();
  const { data: challenges = [] } = useQuery({
    queryKey: ["sidebar-recent-challenges"],
    queryFn: () => api.getRecentChallenges(3),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  if (challenges.length === 0) return null;

  return (
    <SidebarCard hasCustomBackground={hasCustomBackground}>
      <SectionHeader icon={Swords} iconColor="text-red-400" title="Active Challenges" />
      <div className="space-y-2">
        {challenges.map((c) => (
          <Link key={c.id} href={c.href}>
            <a className="block rounded-xl p-2 hover:bg-muted/50 transition-colors group">
              <p className="text-xs leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                "{c.snippet}"
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-muted-foreground">@{c.author}</span>
                <span className="ml-auto text-[10px] text-primary/70">
                  {c.responseCount} response{c.responseCount !== 1 ? "s" : ""}
                </span>
              </div>
            </a>
          </Link>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2 h-7 text-xs text-muted-foreground hover:text-primary"
        onClick={() => setLocation("/?tab=challenges")}
      >
        View all challenges <ChevronRight className="h-3 w-3 ml-0.5" />
      </Button>
    </SidebarCard>
  );
}

// ── Suggested Writers ──────────────────────────────────────────────────
export function SuggestedWriters({ hasCustomBackground }: { hasCustomBackground: boolean }) {
  const { data: writers = [] } = useQuery({
    queryKey: ["sidebar-suggested-writers"],
    queryFn: () => api.getSuggestedWriters(4),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  if (writers.length === 0) return null;

  return (
    <SidebarCard hasCustomBackground={hasCustomBackground}>
      <SectionHeader icon={UserPlus} iconColor="text-sky-400" title="Writers to Follow" />
      <div className="space-y-2">
        {writers.map((w) => (
          <Link key={w.id} href={`/u/${w.username}`}>
            <a className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-muted/50 transition-colors">
              <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-xs text-primary overflow-hidden shrink-0">
                {w.avatarUrl ? (
                  <img src={w.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  w.username?.[0]?.toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">@{w.username}</p>
                {w.bio && (
                  <p className="text-[10px] text-muted-foreground truncate">{w.bio}</p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {w.barCount} bars
              </span>
            </a>
          </Link>
        ))}
      </div>
    </SidebarCard>
  );
}
