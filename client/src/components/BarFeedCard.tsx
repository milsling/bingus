import type { BarWithUser } from "@shared/schema";
import { useLocation } from "wouter";
import { ArrowRight, Heart, Lightbulb, MessageCircle, Brain } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatTimestamp } from "@/lib/formatDate";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function getTitleAndSnippet(contentHtml: string) {
  const text = stripHtml(contentHtml)
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const first = lines[0] || text;
  const title = first.length > 64 ? `${first.slice(0, 64)}…` : first;
  const snippetRaw = lines.slice(0, 2).join(" / ");
  const snippet = snippetRaw.length > 140 ? `${snippetRaw.slice(0, 140)}…` : snippetRaw;
  return { title, snippet };
}

export function BarFeedCard({ bar }: { bar: BarWithUser }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { title, snippet } = getTitleAndSnippet(bar.content);
  const likeCount = (bar as any).likeCount ?? 0;
  const commentCount = (bar as any).commentCount ?? 0;

  type ReactionType = "fire" | "idea" | "mind";
  type ReactionState = {
    enabled: boolean;
    counts: Record<ReactionType, number>;
    reacted: Record<ReactionType, boolean>;
  };

  const { data: reactions } = useQuery({
    queryKey: ["bar-reactions", bar.id],
    queryFn: async (): Promise<ReactionState | { enabled: false }> => {
      const res = await fetch(`/api/bars/${bar.id}/reactions`, { credentials: "include" });
      if (res.status === 501) return { enabled: false };
      if (!res.ok) throw new Error("Failed to load reactions");
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  const toggleReactionMutation = useMutation({
    mutationFn: async (type: ReactionType) => {
      const res = await fetch(`/api/bars/${bar.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type }),
      });
      if (res.status === 401) {
        throw new Error("Not authenticated");
      }
      if (res.status === 501) {
        throw new Error("Reactions not enabled");
      }
      if (!res.ok) {
        const msg = (await res.json().catch(() => null))?.message;
        throw new Error(msg || "Failed to react");
      }
      return res.json() as Promise<{ enabled: true; type: ReactionType; reacted: boolean; counts: Record<ReactionType, number> }>;
    },
    onMutate: async (type) => {
      await queryClient.cancelQueries({ queryKey: ["bar-reactions", bar.id] });
      const previous = queryClient.getQueryData<ReactionState | { enabled: false }>(["bar-reactions", bar.id]);
      if (!previous || (previous as any).enabled === false) return { previous };

      const prev = previous as ReactionState;
      const wasReacted = Boolean(prev.reacted?.[type]);
      const nextReacted = !wasReacted;
      const nextCounts = {
        ...prev.counts,
        [type]: Math.max(0, (prev.counts?.[type] || 0) + (nextReacted ? 1 : -1)),
      } as ReactionState["counts"];

      queryClient.setQueryData(["bar-reactions", bar.id], {
        enabled: true,
        counts: nextCounts,
        reacted: { ...prev.reacted, [type]: nextReacted },
      } satisfies ReactionState);

      return { previous };
    },
    onError: (error: any, _type, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["bar-reactions", bar.id], context.previous);
      }
      if (String(error?.message || "").includes("Not authenticated")) {
        toast({
          title: "Login required",
          description: "Sign in to react to bars.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Couldn’t react",
          description: error?.message || "Try again in a moment.",
          variant: "destructive",
        });
      }
    },
    onSuccess: (data) => {
      const current = queryClient.getQueryData<ReactionState | { enabled: false }>(["bar-reactions", bar.id]);
      if (!current || (current as any).enabled === false) return;
      const cur = current as ReactionState;
      queryClient.setQueryData(["bar-reactions", bar.id], {
        enabled: true,
        counts: data.counts,
        reacted: { ...cur.reacted, [data.type]: data.reacted },
      } satisfies ReactionState);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["bar-reactions", bar.id] });
    },
  });

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={() => setLocation(`/bars/${bar.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setLocation(`/bars/${bar.id}`);
        }
      }}
      className="glass-card border-border/08 overflow-hidden cursor-pointer hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20 hover:border-border/15 transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      data-testid={`feed-card-${bar.id}`}
    >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 border border-border/10">
              <AvatarImage src={bar.user.avatarUrl || undefined} alt={bar.user.username} />
              <AvatarFallback>{bar.user.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                @{bar.user.username}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatTimestamp(bar.createdAt)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setLocation(`/bars/${bar.id}`);
            }}
          >
            Open <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-base md:text-lg font-display font-bold text-foreground tracking-tight">
              {title || "Untitled bar"}
            </h3>
            <p className="text-sm text-foreground/75 leading-relaxed">
              {snippet}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {bar.isOriginal && (
              <Badge className="bg-primary/15 text-primary border border-primary/20 text-xs">
                OC
              </Badge>
            )}
            <Badge variant="outline" className="border-primary/20 text-primary/80 text-xs">
              {bar.category}
            </Badge>
            {bar.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs text-muted-foreground">
                #{tag}
              </Badge>
            ))}
            {bar.tags && bar.tags.length > 3 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{bar.tags.length - 3}
              </Badge>
            )}
          </div>
        </CardContent>

        <CardFooter className="border-t border-white/5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {(reactions as any)?.enabled ? (
              <>
                <button
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${
                    (reactions as any).reacted?.fire ? "bg-red-500/10 text-red-400" : "hover:bg-card/06 hover:text-foreground"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleReactionMutation.mutate("fire");
                  }}
                  disabled={toggleReactionMutation.isPending}
                  data-testid={`reaction-fire-${bar.id}`}
                  title="🔥 Hard"
                >
                  <Heart className={`h-3.5 w-3.5 ${(reactions as any).reacted?.fire ? "fill-current" : ""}`} />
                  {(reactions as any).counts?.fire ?? 0}
                </button>
                <button
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${
                    (reactions as any).reacted?.idea ? "bg-yellow-500/10 text-yellow-400" : "hover:bg-card/06 hover:text-foreground"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleReactionMutation.mutate("idea");
                  }}
                  disabled={toggleReactionMutation.isPending}
                  data-testid={`reaction-idea-${bar.id}`}
                  title="💡 Clever"
                >
                  <Lightbulb className={`h-3.5 w-3.5 ${(reactions as any).reacted?.idea ? "fill-current" : ""}`} />
                  {(reactions as any).counts?.idea ?? 0}
                </button>
                <button
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${
                    (reactions as any).reacted?.mind ? "bg-purple-500/10 text-purple-400" : "hover:bg-card/06 hover:text-foreground"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleReactionMutation.mutate("mind");
                  }}
                  disabled={toggleReactionMutation.isPending}
                  data-testid={`reaction-mind-${bar.id}`}
                  title="🧠 Deep"
                >
                  <Brain className={`h-3.5 w-3.5 ${(reactions as any).reacted?.mind ? "fill-current" : ""}`} />
                  {(reactions as any).counts?.mind ?? 0}
                </button>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  {likeCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {commentCount}
                </span>
              </>
            )}
          </div>
          <span className="text-xs text-primary/80 font-medium">
            View bar
          </span>
        </CardFooter>
    </Card>
  );
}

