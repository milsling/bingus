import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Swords } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 md:pt-24 md:pb-8">
      <main className="mx-auto max-w-6xl px-4 md:px-6 space-y-5">
        <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-background p-6">
          <Badge className="mb-3 bg-primary/15 text-primary hover:bg-primary/20">
            Battles & responses
          </Badge>
          <h1 className="text-3xl font-black md:text-4xl">
            Challenge a writer. Answer a challenge.
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Open challenges invite call-and-response bars from the community. Drop a
            challenge from any bar detail page, then track responses under it.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => setLocation("/post")}>Drop a new bar</Button>
            <Button variant="outline" onClick={() => setLocation("/")}>
              Browse latest feed
            </Button>
          </div>
        </section>

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
                    Challenge
                  </Badge>
                  <span className="text-xs text-muted-foreground">
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
      </main>
    </div>
  );
}
