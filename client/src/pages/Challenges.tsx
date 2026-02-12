import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Swords, MessageCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarSkeletonList } from "@/components/BarSkeleton";
import FeedBarCard from "@/components/FeedBarCard";

export default function Challenges() {
  const [, setLocation] = useLocation();

  const { data: challengeBars = [], isLoading } = useQuery({
    queryKey: ["bars-challenges"],
    queryFn: () => api.getChallenges(40),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const totalResponses = useMemo(
    () => challengeBars.reduce((sum: number, bar: any) => sum + (bar.responseCount || 0), 0),
    [challengeBars],
  );

  return (
    <div className="min-h-screen bg-background pt-16 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:pt-24 md:pb-8">
      <main className="mx-auto max-w-7xl px-4 md:px-6 space-y-5">
        <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/12 via-card/80 to-background p-6 md:p-8">
          <Badge className="mb-3 bg-primary/15 text-primary hover:bg-primary/20">
            Battles & responses
          </Badge>
          <h1 className="text-[clamp(1.9rem,4vw,3rem)] font-black leading-tight">
            Challenge a writer. Answer with bars.
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Open challenges create threaded call-and-response exchanges. Mark your bar as a
            challenge from the detail page, then let the community answer.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => setLocation("/post")}>Drop a new bar</Button>
            <Button variant="outline" onClick={() => setLocation("/")}>
              Browse latest feed
            </Button>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-border/60 bg-card/65 p-4 backdrop-blur-xl space-y-4">
            <div className="rounded-xl border border-primary/25 bg-primary/10 p-3">
              <p className="text-xs uppercase tracking-wide text-primary/80 font-semibold">Live stats</p>
              <p className="mt-1 text-sm font-medium">
                {challengeBars.length} active {challengeBars.length === 1 ? "challenge" : "challenges"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{totalResponses} total responses</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">How to start one</p>
              <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">
                  Open your bar detail and tap <strong>Mark as challenge</strong>. Other writers
                  can post responses directly into the thread.
                </p>
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            {isLoading ? (
              <BarSkeletonList count={4} />
            ) : challengeBars.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
                <Swords className="mx-auto h-9 w-9 text-muted-foreground" />
                <p className="mt-3 text-base font-medium">No active challenges yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start one from your own bar and invite responses.
                </p>
                <Button className="mt-4" onClick={() => setLocation("/post")}>
                  Drop a bar
                </Button>
              </div>
            ) : (
              challengeBars.map((bar: any) => (
                <div key={bar.id} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                      <Swords className="mr-1 h-3.5 w-3.5" />
                      Challenge
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {(bar.responseCount || 0) === 1
                        ? "1 response"
                        : `${bar.responseCount || 0} responses`}
                    </span>
                  </div>
                  <FeedBarCard bar={bar} />
                </div>
              ))
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
