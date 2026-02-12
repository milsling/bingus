import { useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, PenLine } from "lucide-react";
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
    <div className="min-h-screen bg-background pt-16 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:pt-24 md:pb-8">
      <main className="mx-auto max-w-7xl px-4 md:px-6 space-y-5">
        <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/12 via-card/80 to-background p-6 md:p-8">
          <Badge className="mb-3 bg-primary/15 text-primary hover:bg-primary/20">
            Prompt drops
          </Badge>
          <h1 className="text-[clamp(1.9rem,4vw,3rem)] font-black leading-tight">
            One prompt. Many angles.
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Choose a prompt and answer it your way. This keeps writing focused while still
            showing style and personality across the community.
          </p>

          {activePrompt && (
            <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 p-4 md:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                Active prompt
              </p>
              <p className="mt-1 text-xl font-semibold">{activePrompt.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={() => setLocation(`/post?prompt=${activePrompt.slug}`)}
                  data-testid="button-write-current-prompt"
                >
                  <PenLine className="mr-2 h-4 w-4" />
                  Write to this prompt
                </Button>
                <Badge variant="secondary">{activePrompt.barsCount} drops</Badge>
              </div>
            </div>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-border/60 bg-card/65 p-3 md:p-4 backdrop-blur-xl">
            <p className="mb-3 text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Prompt library
            </p>
            <div className="space-y-2">
              {prompts.map((prompt: PromptItem) => (
                <button
                  key={prompt.slug}
                  type="button"
                  onClick={() => setLocation(`/prompts/${prompt.slug}`)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${
                    prompt.slug === selectedSlug
                      ? "border-primary/40 bg-primary/12"
                      : "border-border/50 bg-background/45 hover:border-primary/30 hover:bg-primary/8"
                  }`}
                  data-testid={`prompt-pill-${prompt.slug}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{prompt.text}</span>
                    {prompt.isCurrent && (
                      <Badge className="bg-primary/20 text-primary hover:bg-primary/20">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {prompt.barsCount} {prompt.barsCount === 1 ? "drop" : "drops"}
                  </p>
                </button>
              ))}
            </div>
          </aside>

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
                  <Button className="mt-4" onClick={() => setLocation(`/post?prompt=${selectedSlug}`)}>
                    Write to this prompt
                  </Button>
                )}
              </div>
            ) : (
              promptBars.bars.map((bar) => <FeedBarCard key={bar.id} bar={bar} />)
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
