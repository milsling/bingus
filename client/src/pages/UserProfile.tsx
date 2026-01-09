import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";
import Navigation from "@/components/Navigation";
import BarCard from "@/components/BarCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, MapPin, Share2, UserPlus, UserMinus, Users, MessageCircle, Clock, Trophy } from "lucide-react";
import { Link } from "wouter";
import { ACHIEVEMENTS, type AchievementId, type AchievementRarity } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";
import { shareContent, getProfileShareData } from "@/lib/share";

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const { currentUser } = useBars();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading, error, isFetching } = useQuery({
    queryKey: ["user", username],
    queryFn: async () => {
      if (!username) throw new Error("Username required");
      return api.getUser(username);
    },
    enabled: !!username,
    retry: 1,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const { data: bars = [], isLoading: barsLoading } = useQuery({
    queryKey: ["userBars", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        return await api.getBarsByUser(user.id);
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: stats = { barsCount: 0, followersCount: 0, followingCount: 0 } } = useQuery({
    queryKey: ["userStats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { barsCount: 0, followersCount: 0, followingCount: 0 };
      try {
        return await api.getUserStats(user.id);
      } catch {
        return { barsCount: 0, followersCount: 0, followingCount: 0 };
      }
    },
    enabled: !!user?.id,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ["userAchievements", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        return await api.getUserAchievements(user.id);
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: isFollowing = false } = useQuery({
    queryKey: ["isFollowing", user?.id],
    queryFn: async () => {
      if (!user?.id || !currentUser) return false;
      try {
        return await api.isFollowing(user.id);
      } catch {
        return false;
      }
    },
    enabled: !!user?.id && !!currentUser,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not found");
      return api.followUser(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["userStats", user?.id] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not found");
      return api.unfollowUser(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["userStats", user?.id] });
    },
  });

  const { data: friendshipStatus = { status: "none" } } = useQuery({
    queryKey: ["friendshipStatus", user?.id],
    queryFn: async () => {
      if (!user?.id) return { status: "none" };
      try {
        const res = await fetch(`/api/friends/status/${user.id}`, { credentials: 'include' });
        if (!res.ok) return { status: "none" };
        return res.json();
      } catch {
        return { status: "none" };
      }
    },
    enabled: !!user?.id && !!currentUser,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not found");
      const res = await fetch(`/api/friends/request/${user.id}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendshipStatus", user?.id] });
      toast({ title: "Friend request sent!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleShare = async () => {
    if (!username) return;
    const result = await shareContent(getProfileShareData(username));
    if (result.success) {
      toast({
        title: result.method === "clipboard" ? "Link copied!" : "Shared!",
        description: result.method === "clipboard" 
          ? "Profile link copied to clipboard" 
          : "Profile shared successfully",
      });
    } else {
      toast({
        title: "Share failed",
        description: "Unable to share. Please try copying the link manually.",
        variant: "destructive",
      });
    }
  };

  const isOwnProfile = currentUser?.username === username;

  if (userLoading || (!user && isFetching)) {
    return (
      <div className="min-h-screen bg-background pt-14 pb-20 md:pb-0 md:pt-16">
        <Navigation />
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background pt-14 pb-20 md:pb-0 md:pt-16">
        <Navigation />
        <main className="max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 py-6">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Feed
          </Button>
          <div className="text-center py-12">
            <p className="text-destructive">User not found.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-0 md:pt-16">
      <Navigation />
      <main className="max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation("/")}
          data-testid="button-back-home"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Feed
        </Button>

        <div className="bg-card rounded-lg overflow-hidden mb-6 border">
          {user.bannerUrl && (
            <div className="w-full h-32 md:h-40">
              <img 
                src={user.bannerUrl} 
                alt={`${user.username}'s banner`}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="relative shrink-0">
              <Avatar className={`h-20 w-20 ${user.bannerUrl ? '-mt-12 border-4 border-card' : ''}`}>
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {user.isOwner && (
                <img 
                  src="/owner-crown.png"
                  alt="Owner crown"
                  className="absolute -top-[28px] left-1/2 -translate-x-[calc(50%+8px)] w-22 h-15 rotate-[-8deg] drop-shadow-lg pointer-events-none z-10"
                />
              )}
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left w-full">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold" data-testid="text-username">
                  @{user.username}
                </h1>
                {user.membershipTier !== "free" && (
                  <Badge variant="secondary">{user.membershipTier}</Badge>
                )}
                {user.isAdmin && (
                  <Badge variant="default" className="bg-purple-600">{user.username === "Milsling" ? "Owner" : "Admin"}</Badge>
                )}
              </div>
              {user.location && (
                <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {user.location}
                </p>
              )}
              {user.bio && (
                <p className="mt-2 text-sm">{user.bio}</p>
              )}
              <div className="flex justify-center sm:justify-start gap-6 mt-4 text-sm">
                <div>
                  <span className="font-bold">{stats?.barsCount || bars.length}</span>
                  <span className="text-muted-foreground ml-1">Bars</span>
                </div>
                <div>
                  <span className="font-bold">{stats?.followersCount || 0}</span>
                  <span className="text-muted-foreground ml-1">Followers</span>
                </div>
                <div>
                  <span className="font-bold">{stats?.followingCount || 0}</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </div>
              </div>
              {/* Displayed Badges */}
              {((user.displayedBadges?.length ?? 0) > 0 || isOwnProfile) && (
                <div className="mt-4">
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 items-center">
                    <TooltipProvider>
                      {user.displayedBadges?.map((badgeId: string) => {
                        const achievement = ACHIEVEMENTS[badgeId as AchievementId];
                        if (!achievement) return null;
                        const rarity = achievement.rarity;
                        return (
                          <Tooltip key={badgeId}>
                            <TooltipTrigger>
                              <span 
                                className={cn(
                                  "inline-flex items-center justify-center w-10 h-10 rounded-full text-xl",
                                  `badge-${rarity}`,
                                  rarity === "legendary" && "bg-gradient-to-r from-red-500/20 via-yellow-500/20 to-purple-500/20",
                                  rarity === "epic" && "bg-purple-500/20",
                                  rarity === "rare" && "bg-blue-500/20",
                                  rarity === "common" && "bg-gray-500/20"
                                )}
                                data-testid={`badge-displayed-${badgeId}`}
                              >
                                {achievement.emoji}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-semibold">{achievement.name}</p>
                              <p className="text-xs text-muted-foreground">{achievement.description}</p>
                              <p className={cn(
                                "text-xs capitalize mt-1",
                                rarity === "legendary" && "text-amber-400",
                                rarity === "epic" && "text-purple-400",
                                rarity === "rare" && "text-blue-400",
                                rarity === "common" && "text-gray-400"
                              )}>{rarity}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </TooltipProvider>
                    {isOwnProfile && (
                      <Link href="/badges">
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                          <Trophy className="h-4 w-4 mr-1" />
                          {(user.displayedBadges?.length ?? 0) > 0 ? "Edit" : "Add Badges"}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Action buttons in separate section to prevent overlap */}
          <div className="flex justify-center sm:justify-start gap-2 mt-4 flex-wrap">
                {!isOwnProfile && currentUser && (
                  <>
                    <Button
                      variant={isFollowing ? "outline" : "default"}
                      size="sm"
                      onClick={() => isFollowing ? unfollowMutation.mutate() : followMutation.mutate()}
                      disabled={followMutation.isPending || unfollowMutation.isPending}
                      data-testid="button-follow-toggle"
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="h-4 w-4 mr-1" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1" />
                          Follow
                        </>
                      )}
                    </Button>
                    {friendshipStatus?.status === "accepted" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/messages/${user.id}`)}
                        data-testid="button-message"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                    ) : friendshipStatus?.status === "pending" ? (
                      <Button variant="outline" size="sm" disabled data-testid="button-friend-pending">
                        <Clock className="h-4 w-4 mr-1" />
                        Pending
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendFriendRequestMutation.mutate()}
                        disabled={sendFriendRequestMutation.isPending}
                        data-testid="button-friend-request"
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Add Friend
                      </Button>
                    )}
                  </>
                )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              data-testid="button-share-profile"
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4">Bars by @{user.username}</h2>
        
        {barsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : bars.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No bars yet.
          </p>
        ) : (
          <div className="space-y-4">
            {bars.map((bar) => (
              <BarCard key={bar.id} bar={bar} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
