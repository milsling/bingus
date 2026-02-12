import { Link } from "wouter";
import type { BarWithUser } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Flame, Lightbulb, Brain, ArrowRight } from "lucide-react";
import { formatTimestamp } from "@/lib/formatDate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";

type QuickReactionType = "fire" | "clever" | "deep";
type QuickReactionsState = Record<QuickReactionType, { count: number; reacted: boolean }>;

const EMPTY_REACTIONS: QuickReactionsState = {
  fire: { count: 0, reacted: false },
  clever: { count: 0, reacted: false },
  deep: { count: 0, reacted: false },
};

const REACTION_CONFIG: Record<
  QuickReactionType,
  {
    label: string;
    icon: typeof Flame;
    activeClass: string;
  }
> = {
  fire: {
    label: "Hard",
    icon: Flame,
    activeClass: "text-orange-500 bg-orange-500/10 border-orange-500/30",
  },
  clever: {
    label: "Clever",
    icon: Lightbulb,
    activeClass: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  },
  deep: {
    label: "Deep",
    icon: Brain,
    activeClass: "text-blue-500 bg-blue-500/10 border-blue-500/30",
  },
};

const THEME_CLASSES: Record<string, string> = {
  minimal: "",
  paper:
    "bg-gradient-to-br from-stone-50/70 to-slate-50/40 dark:from-zinc-900/40 dark:to-zinc-950/30",
  neon:
    "bg-gradient-to-br from-fuchsia-500/10 via-blue-500/5 to-transparent border-fuchsia-400/30",
  gritty:
    "bg-gradient-to-br from-zinc-900/20 via-zinc-700/10 to-transparent border-zinc-500/30",
};

function stripHtml(value: string): string {
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = value;
    return div.textContent || div.innerText || "";
  }
  return value.replace(/<[^>]+>/g, "");
}

function getPreview(content: string) {
  const plain = stripHtml(content).replace(/\s+/g, " ").trim();
  if (!plain) {
    return { title: "Untitled bar", snippet: "" };
  }
  const title = plain.slice(0, 60).trimEnd();
  const snippet =
    plain.length > 180 ? `${plain.slice(0, 180).trimEnd()}...` : plain;
  return { title, snippet };
}

function getTheme(bar: BarWithUser) {
  const fromField = String((bar as any).theme || (bar as any).visualTheme || "");
  if (fromField && THEME_CLASSES[fromField]) {
    return fromField;
  }
  const tagTheme = (bar.tags || []).find((tag) => tag.startsWith("theme:"));
  if (!tagTheme) {
    return "minimal";
  }
  const slug = tagTheme.replace("theme:", "");
  return THEME_CLASSES[slug] ? slug : "minimal";
}

export default function FeedBarCard({ bar }: { bar: BarWithUser }) {
  const { currentUser } = useBars();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { title, snippet } = getPreview(bar.content);
  const theme = getTheme(bar);
  const likeCount = (bar as any).likeCount || 0;

  const { data: quickReactions = EMPTY_REACTIONS } = useQuery({
    queryKey: ["quick-reactions", bar.id],
    queryFn: async () => {
      return (await api.getQuickReactions(bar.id)) as QuickReactionsState;
    },
    initialData: ((bar as any).quickReactions as QuickReactionsState) || EMPTY_REACTIONS,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const toggleReactionMutation = useMutation({
    mutationFn: async (reactionType: QuickReactionType) =>
      api.toggleQuickReaction(bar.id, reactionType),
    onMutate: async (reactionType) => {
      await queryClient.cancelQueries({ queryKey: ["quick-reactions", bar.id] });
      const previous = queryClient.getQueryData<QuickReactionsState>([
        "quick-reactions",
        bar.id,
      ]);

      const next = {
        ...(previous || EMPTY_REACTIONS),
        [reactionType]: {
          count:
            (previous?.[reactionType].count || 0) +
            (previous?.[reactionType].reacted ? -1 : 1),
          reacted: !previous?.[reactionType].reacted,
        },
      } as QuickReactionsState;

      if (next[reactionType].count < 0) {
        next[reactionType].count = 0;
      }

      queryClient.setQueryData(["quick-reactions", bar.id], next);
      return { previous };
    },
    onError: (error: any, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["quick-reactions", bar.id], context.previous);
      }
      if (String(error?.message || "").toLowerCase().includes("auth")) {
        toast({
          title: "Login required",
          description: "Sign in to react to bars.",
          variant: "destructive",
        });
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["quick-reactions", bar.id], data.reactions);
    },
  });

  const handleReact = (reactionType: QuickReactionType) => {
    if (!currentUser) {
      toast({
        title: "Login required",
        description: "Sign in to react to bars.",
        variant: "destructive",
      });
      return;
    }
    toggleReactionMutation.mutate(reactionType);
  };

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl glass-card p-5",
        "transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.25)]",
        "active:translate-y-0.5 active:scale-[0.99]",
        "md:hover:scale-[1.01]",
        THEME_CLASSES[theme]
      )}
      data-testid={`feed-bar-card-${bar.id}`}
    >
      <div className="mb-3 flex items-center gap-3">
        <Link href={`/u/${bar.user.username}`}>
          <Avatar className="h-9 w-9 cursor-pointer ring-1 ring-border/40 transition-all group-hover:ring-primary/40">
            <AvatarImage src={bar.user.avatarUrl || undefined} />
            <AvatarFallback>
              {bar.user.username[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0">
          <Link href={`/u/${bar.user.username}`}>
            <p className="truncate text-sm font-semibold hover:text-primary transition-colors">
              @{bar.user.username}
            </p>
          </Link>
          <p className="text-xs text-muted-foreground">
            {formatTimestamp(bar.createdAt)}
          </p>
        </div>
      </div>

      <Link href={`/bars/${bar.id}`}>
        <h3 className="cursor-pointer text-lg font-semibold leading-tight hover:text-primary transition-colors">
          {title}
        </h3>
      </Link>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{snippet}</p>

      {bar.tags && bar.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {bar.tags.slice(0, 4).map((tag) => (
            <Badge
              key={`${bar.id}-${tag}`}
              variant="secondary"
              className="text-[11px] font-medium bg-secondary/70"
            >
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-xs text-muted-foreground">
            <Heart className="h-3.5 w-3.5" />
            <span>{likeCount}</span>
          </div>

          {(Object.keys(REACTION_CONFIG) as QuickReactionType[]).map((reactionType) => {
            const reaction = quickReactions[reactionType];
            const config = REACTION_CONFIG[reactionType];
            const Icon = config.icon;
            return (
              <button
                key={reactionType}
                onClick={() => handleReact(reactionType)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all hover:scale-[1.03] ${
                  reaction.reacted
                    ? config.activeClass
                    : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary"
                }`}
                data-testid={`button-quick-reaction-${reactionType}-${bar.id}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{reaction.count}</span>
              </button>
            );
          })}
        </div>

        <Link href={`/bars/${bar.id}`}>
          <Button
            size="sm"
            className="group/cta bg-primary/90 hover:bg-primary text-primary-foreground"
            data-testid={`button-open-bar-${bar.id}`}
          >
            Open
            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
          </Button>
        </Link>
      </div>
    </article>
  );
}
