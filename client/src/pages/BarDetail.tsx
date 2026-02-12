import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";
import { useBars } from "@/context/BarContext";
import BarCard from "@/components/BarCard";
import FeedBarCard from "@/components/FeedBarCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Swords, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BarDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { currentUser } = useBars();
  const { toast } = useToast();

  const {
    data: bar,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bar", id],
    queryFn: () => api.getBar(id!),
    enabled: !!id,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: responses = [], isLoading: responsesLoading } = useQuery({
    queryKey: ["bar-responses", id],
    queryFn: () => api.getChallengeResponses(id!),
    enabled: !!id,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const isOwner = useMemo(
    () => !!(bar && currentUser && bar.userId === currentUser.id),
    [bar, currentUser],
  );

  const isChallenge = useMemo(() => {
    if (!bar) return false;
    return (
      (bar.tags || []).some((tag) => tag.toLowerCase() === "challenge") ||
      bar.permissionStatus === "open_adopt"
    );
  }, [bar]);

  const challengeMutation = useMutation({
    mutationFn: async (active: boolean) => api.toggleChallenge(id!, active),
    onSuccess: (_, active) => {
      queryClient.invalidateQueries({ queryKey: ["bar", id] });
      queryClient.invalidateQueries({ queryKey: ["bars-challenges"] });
      toast({
        title: active ? "Challenge enabled" : "Challenge ended",
        description: active
          ? "Writers can now respond to this bar."
          : "This bar is no longer marked as an active challenge.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Could not update challenge",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-6 md:pt-24">
      <main className="mx-auto w-full max-w-5xl xl:max-w-6xl px-4 md:px-6 lg:px-8 py-6 space-y-5">
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => setLocation("/")}
          data-testid="button-back-home"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Button>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-10 text-center">
            <p className="text-destructive" data-testid="text-bar-error">
              Bar not found or has been deleted.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setLocation("/")}
            >
              Go to feed
            </Button>
          </div>
        )}

        {bar && (
          <>
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {isChallenge && (
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                    Challenge active
                  </Badge>
                )}

                {isOwner ? (
                  <Button
                    variant={isChallenge ? "outline" : "default"}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => challengeMutation.mutate(!isChallenge)}
                    disabled={challengeMutation.isPending}
                    data-testid="button-toggle-challenge"
                  >
                    <Swords className="h-4 w-4" />
                    {isChallenge ? "End challenge" : "Mark as challenge"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setLocation(`/post?respondTo=${bar.id}`)}
                    disabled={!isChallenge}
                    data-testid="button-respond-to-bar"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {isChallenge ? "Respond with a bar" : "Challenge not open"}
                  </Button>
                )}
              </div>

              <BarCard bar={bar} />
            </section>

            <section className="space-y-3 rounded-2xl border border-border/60 bg-card/50 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Responses {responses.length > 0 ? `(${responses.length})` : ""}
                </h2>
                {!isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/post?respondTo=${bar.id}`)}
                    disabled={!isChallenge}
                  >
                    {isChallenge ? "Add response" : "Challenge not open"}
                  </Button>
                )}
              </div>

              {responsesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : responses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-8 text-center">
                  <p className="font-medium">No responses yet.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Start the thread with your first response bar.
                  </p>
                  {!isOwner && (
                    <Button
                      className="mt-4"
                      onClick={() => setLocation(`/post?respondTo=${bar.id}`)}
                      disabled={!isChallenge}
                    >
                      {isChallenge ? "Respond with a bar" : "Challenge not open"}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {responses.map((responseBar) => (
                    <FeedBarCard key={responseBar.id} bar={responseBar} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
