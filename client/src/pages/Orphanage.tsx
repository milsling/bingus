import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Home, Users, ExternalLink, ChevronDown, ChevronUp, Send, Trophy, Heart } from "lucide-react";
import Navigation from "@/components/Navigation";
import BarCard from "@/components/BarCard";
import { BarSkeletonList } from "@/components/BarSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useBars } from "@/context/BarContext";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
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

function AdoptionPanel({ bar }: { bar: any }) {
  const { currentUser } = useBars();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [usageLink, setUsageLink] = useState("");
  const [comment, setComment] = useState("");

  const { data: usages = [], isLoading: loadingUsages } = useQuery<BarUsage[]>({
    queryKey: ['bar-usages', bar.id],
    queryFn: async () => {
      const res = await fetch(`/api/bars/${bar.id}/usages`, { credentials: 'include' });
      return res.json();
    },
    enabled: isOpen,
    staleTime: 30000,
  });

  const adoptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bars/${bar.id}/usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ usageLink: usageLink || undefined, comment: comment || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Adopted!", description: "Your adoption has been recorded" });
      setShowForm(false);
      setUsageLink("");
      setComment("");
      queryClient.invalidateQueries({ queryKey: ['bar-usages', bar.id] });
      queryClient.invalidateQueries({ queryKey: ['adoptable-bars'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adoptMutation.mutate();
  };

  return (
    <div className="border-t border-border/50 bg-muted/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
        data-testid={`button-adoption-panel-${bar.id}`}
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Adopted {bar.usageCount || 0} time{(bar.usageCount || 0) !== 1 ? 's' : ''}
          </span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {currentUser && (
            <div>
              {!showForm ? (
                <Button
                  onClick={() => setShowForm(true)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  data-testid={`button-adopt-${bar.id}`}
                >
                  I Used This Bar
                </Button>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 p-3 bg-background rounded-lg border">
                  <p className="text-sm font-medium text-muted-foreground">Where did you use this bar?</p>
                  <Input
                    placeholder="Link to your work (optional)"
                    value={usageLink}
                    onChange={(e) => setUsageLink(e.target.value)}
                    type="url"
                    data-testid={`input-usage-link-${bar.id}`}
                  />
                  <Textarea
                    placeholder="Tell us about it... (optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    className="resize-none"
                    data-testid={`input-usage-comment-${bar.id}`}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowForm(false);
                        setUsageLink("");
                        setComment("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={adoptMutation.isPending}
                      className="flex-1"
                      data-testid={`button-submit-adoption-${bar.id}`}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      {adoptMutation.isPending ? "Submitting..." : "Submit"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {loadingUsages ? (
            <p className="text-sm text-muted-foreground text-center py-2">Loading adoptions...</p>
          ) : usages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No one has adopted this bar yet. Be the first!
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adoptions</p>
              {usages.map((usage) => (
                <div key={usage.id} className="flex gap-3 p-3 bg-background rounded-lg border" data-testid={`usage-${usage.id}`}>
                  <Link href={`/u/${usage.user.username}`}>
                    <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                      <AvatarImage src={usage.user.avatarUrl || undefined} />
                      <AvatarFallback>{usage.user.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/u/${usage.user.username}`}>
                        <span className="text-sm font-medium hover:text-primary cursor-pointer transition-colors">
                          @{usage.user.username}
                        </span>
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(usage.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {usage.comment && (
                      <p className="text-sm text-muted-foreground mt-1">{usage.comment}</p>
                    )}
                    {usage.usageLink && (
                      <a
                        href={usage.usageLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5"
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
    </div>
  );
}

export default function Orphanage() {
  const { currentUser } = useBars();
  
  const { data: adoptableBars = [], isLoading } = useQuery({
    queryKey: ['adoptable-bars'],
    queryFn: async () => {
      const res = await fetch('/api/bars/adoptable', { credentials: 'include' });
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: myAdoptions = [] } = useQuery({
    queryKey: ['my-adoptions'],
    queryFn: async () => {
      const res = await fetch('/api/user/adoptions', { credentials: 'include' });
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

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-0 md:pt-16">
      <Navigation />
      
      <main className="max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto">
        <div className="px-4 py-8">
          <div className="flex flex-col items-center mb-10">
            <img 
              src={orphanageLogo} 
              alt="The Orphanage" 
              className="h-48 md:h-56 w-auto mb-6 invert dark:invert-0"
              data-testid="img-orphanage-logo"
            />
            <p className="text-muted-foreground text-center text-base max-w-md">
              These bars are free to use for commercial purposes. Adopt one and make it your own.
            </p>
          </div>

          {!isLoading && topAdoptedBars.length > 0 && (
            <div id="leaderboard" className="mb-8 p-4 rounded-xl border bg-card/50 scroll-mt-20" data-testid="leaderboard">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <h2 className="font-display font-bold text-lg">Most Adopted</h2>
              </div>
              <div className="space-y-2">
                {topAdoptedBars.map((bar: any, index: number) => (
                  <a
                    key={bar.id}
                    href={`#bar-${bar.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
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
                      <p className="text-sm truncate group-hover:text-primary transition-colors">
                        {bar.content.replace(/<[^>]*>/g, '').slice(0, 60)}
                        {bar.content.length > 60 ? '...' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">by @{bar.user.username}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {bar.usageCount} {bar.usageCount === 1 ? 'adoption' : 'adoptions'}
                    </Badge>
                  </a>
                ))}
              </div>
            </div>
          )}

          {currentUser && myAdoptions.length > 0 && (
            <div id="my-adoptions" className="mb-8 p-4 rounded-xl border bg-card/50 scroll-mt-20" data-testid="my-adoptions">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5 text-pink-500" />
                <h2 className="font-display font-bold text-lg">My Adoptions</h2>
                <Badge variant="secondary" className="ml-auto">{myAdoptions.length}</Badge>
              </div>
              <div className="space-y-2">
                {myAdoptions.slice(0, 5).map((adoption: any, index: number) => (
                  <a
                    key={adoption.id}
                    href={`#bar-${adoption.barId}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                    data-testid={`my-adoption-${index}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate group-hover:text-primary transition-colors">
                        {adoption.bar.content.replace(/<[^>]*>/g, '').slice(0, 60)}
                        {adoption.bar.content.length > 60 ? '...' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">by @{adoption.bar.user.username}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(adoption.createdAt), { addSuffix: true })}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <BarSkeletonList count={3} />
          ) : adoptableBars.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <div className="h-16 w-16 mx-auto mb-4 opacity-50 rounded-lg bg-muted flex items-center justify-center">
                <Home className="h-8 w-8" />
              </div>
              <p className="text-lg">The Orphanage is empty</p>
              <p className="text-sm mt-2">No bars are currently available for adoption</p>
            </div>
          ) : (
            <div className="space-y-6">
              {adoptableBars.map((bar: any) => (
                <div key={bar.id} id={`bar-${bar.id}`} className="rounded-xl border bg-card overflow-hidden shadow-sm scroll-mt-20">
                  <BarCard bar={bar} />
                  <AdoptionPanel bar={bar} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
