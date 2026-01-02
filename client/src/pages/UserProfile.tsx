import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";
import Navigation from "@/components/Navigation";
import BarCard from "@/components/BarCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, MapPin, Share2, UserPlus, UserMinus, Users, MessageCircle, Clock } from "lucide-react";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";
import { shareContent, getProfileShareData } from "@/lib/share";

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const { currentUser } = useBars();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading, error } = useQuery({
    queryKey: ["user", username],
    queryFn: () => api.getUser(username!),
    enabled: !!username,
  });

  const { data: bars = [], isLoading: barsLoading } = useQuery({
    queryKey: ["userBars", user?.id],
    queryFn: () => api.getBarsByUser(user!.id),
    enabled: !!user?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ["userStats", user?.id],
    queryFn: () => api.getUserStats(user!.id),
    enabled: !!user?.id,
  });

  const { data: isFollowing = false } = useQuery({
    queryKey: ["isFollowing", user?.id],
    queryFn: () => api.isFollowing(user!.id),
    enabled: !!user?.id && !!currentUser,
  });

  const followMutation = useMutation({
    mutationFn: () => api.followUser(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["userStats", user?.id] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => api.unfollowUser(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["userStats", user?.id] });
    },
  });

  const { data: friendshipStatus } = useQuery({
    queryKey: ["friendshipStatus", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/friends/status/${user!.id}`, { credentials: 'include' });
      return res.json();
    },
    enabled: !!user?.id && !!currentUser,
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/friends/request/${user!.id}`, {
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

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0 md:pt-16">
        <Navigation />
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0 md:pt-16">
        <Navigation />
        <main className="container max-w-2xl mx-auto px-4 py-6">
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
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pt-16">
      <Navigation />
      <main className="container max-w-2xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation("/")}
          data-testid="button-back-home"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Feed
        </Button>

        <div className="bg-card rounded-lg p-6 mb-6 border">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="text-2xl">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold" data-testid="text-username">
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
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {user.location}
                </p>
              )}
              {user.bio && (
                <p className="mt-2 text-sm">{user.bio}</p>
              )}
              <div className="flex gap-6 mt-4 text-sm">
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
              <div className="flex gap-2 mt-4 flex-wrap">
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
