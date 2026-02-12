import { useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarSkeletonList } from "@/components/BarSkeleton";
import FeedBarCard from "@/components/FeedBarCard";

type PromptItem = {
  slug: string;
  text: string;
  tag: string;
  isCurrent: boolean;
  barsCount: number;
};

export default function Prompts() {
  const [, setLocation] = useLocation();
  const params = useParams<{ slug?: string }>();
  const slugFromRoute = params?.slug;

  const { data: prompts = [] } = useQuery({
    queryKey: ["prompts"],
    queryFn: () => api.getPrompts(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: currentPrompt } = useQuery({
    queryKey: ["current-prompt"],
    queryFn: () => api.getCurrentPrompt(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const selectedSlug = useMemo(() => {
    if (slugFromRoute) return slugFromRoute;
    if (currentPrompt?.slug) return currentPrompt.slug;
    return prompts[0]?.slug;
  }, [slugFromRoute, currentPrompt?.slug, prompts]);

  useEffect(() => {
    if (!slugFromRoute && selectedSlug) {
      setLocation(`/prompts/${selectedSlug}`);
    }
  }, [selectedSlug, setLocation, slugFromRoute]);

  const { data: promptBars, isLoading: isLoadingBars } = useQuery({
    queryKey: ["prompt-bars", selectedSlug],
    queryFn: () => api.getPromptBars(selectedSlug!),
    enabled: !!selectedSlug,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const activePrompt =
    prompts.find((prompt: PromptItem) => prompt.slug === selectedSlug) ||
    (currentPrompt
      ? {
          slug: currentPrompt.slug,
          text: currentPrompt.text,
          tag: currentPrompt.tag,
          isCurrent: true,
          barsCount: currentPrompt.barsCount,
        }
      : null);

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 md:pt-24 md:pb-8">
      <main className="mx-auto max-w-6xl px-4 md:px-6 space-y-5">
        <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-background p-6">
          <Badge className="mb-3 bg-primary/15 text-primary hover:bg-primary/20">
            Prompt drops
          </Badge>
          <h1 className="text-3xl font-black md:text-4xl">Write to the prompt.</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Pick a prompt, drop a bar, and see how different writers interpret the same
            idea.
          </p>

          {activePrompt && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                Active prompt
              </p>
              <p className="mt-1 text-lg font-semibold">{activePrompt.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={() => setLocation(`/post?prompt=${activePrompt.slug}`)}
                  data-testid="button-write-current-prompt"
                >
                  Write to this prompt
                </Button>
                <Badge variant="secondary">{activePrompt.barsCount} drops</Badge>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/60 p-3">
          <div className="flex flex-wrap gap-2">
            {prompts.map((prompt: PromptItem) => (
              <Button
                key={prompt.slug}
                size="sm"
                variant={prompt.slug === selectedSlug ? "default" : "outline"}
                onClick={() => setLocation(`/prompts/${prompt.slug}`)}
                className={prompt.slug === selectedSlug ? "bg-primary text-primary-foreground" : ""}
                data-testid={`prompt-pill-${prompt.slug}`}
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                {prompt.text}
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          {isLoadingBars ? (
            <BarSkeletonList count={4} />
          ) : !promptBars?.bars || promptBars.bars.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
              <p className="text-base font-medium">No bars for this prompt yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Be the first to answer it.
              </p>
              {selectedSlug && (
                <Button
                  className="mt-4"
                  onClick={() => setLocation(`/post?prompt=${selectedSlug}`)}
                >
                  Write to this prompt
                </Button>
              )}
            </div>
          ) : (
            promptBars.bars.map((bar) => <FeedBarCard key={bar.id} bar={bar} />)
          )}
        </section>
      </main>
    </div>
  );
}
