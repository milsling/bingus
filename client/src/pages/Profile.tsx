import Navigation from "@/components/Navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import BarCard from "@/components/BarCard";
import { UserProfileBadges } from "@/components/UserProfileBadges";
import { Settings, Share2, MapPin, Edit, Trophy, Star, Crown, Zap } from "lucide-react";
import { ACHIEVEMENTS, type AchievementId, type AchievementRarity } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBars } from "@/context/BarContext";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { shareContent, getProfileShareData } from "@/lib/share";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export default function Profile() {
  const { bars, currentUser, logout, isLoadingUser } = useBars();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: stats } = useQuery({
    queryKey: ["user-stats", currentUser?.id],
    queryFn: () => api.getUserStats(currentUser!.id),
    enabled: !!currentUser,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: totalAchievements } = useQuery<{ total: number; builtIn: number; custom: number }>({
    queryKey: ["achievements-total"],
    queryFn: async () => {
      const res = await fetch("/api/achievements/total", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch total achievements");
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: userAchievements = [] } = useQuery<any[]>({
    queryKey: ["user-achievements", currentUser?.id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${currentUser!.id}/achievements`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user achievements");
      return res.json();
    },
    enabled: !!currentUser,
    staleTime: 30000,
  });

  const { data: badgeImages = {} } = useQuery<Record<string, string>>({
    queryKey: ["achievements", "badge-images"],
    queryFn: async () => {
      const res = await fetch("/api/achievements/badge-images", { credentials: "include" });
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: xpStats } = useQuery<{ xp: number; level: number; xpForNextLevel: number; xpProgress: number }>({
    queryKey: ["user-xp", currentUser?.username],
    queryFn: async () => {
      const res = await fetch(`/api/users/${currentUser!.username}/xp`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch XP stats");
      return res.json();
    },
    enabled: !!currentUser,
    staleTime: 30000,
  });

  const earnedCount = userAchievements.length;
  const totalCount = totalAchievements?.total || Object.keys(ACHIEVEMENTS).length;
  const progressPercentage = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  const level = xpStats?.level ?? currentUser?.level ?? 1;
  const xp = xpStats?.xp ?? currentUser?.xp ?? 0;
  const xpProgress = xpStats?.xpProgress ?? 0;
  const xpForNextLevel = xpStats?.xpForNextLevel ?? 100;
  const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
  const xpInCurrentLevel = xp - xpForCurrentLevel;
  const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;

  const getPerks = (userLevel: number) => {
    const perks = [];
    if (userLevel >= 3) perks.push({ icon: "🏷️", label: "Extra custom tag slot" });
    if (userLevel >= 5) perks.push({ icon: "📈", label: "Feed priority boost" });
    if (userLevel >= 10) perks.push({ icon: "👑", label: "Legend flair" });
    return perks;
  };

  const activePerks = getPerks(level);

  const handleShare = async () => {
    if (!currentUser) return;
    const result = await shareContent(getProfileShareData(currentUser.username));
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

  const { data: likedBars = [] } = useQuery<any[]>({
    queryKey: ["liked-bars", currentUser?.id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${currentUser!.id}/likes`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch liked bars");
      return res.json();
    },
    enabled: !!currentUser,
  });

  const { data: savedBars = [] } = useQuery<any[]>({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      const res = await fetch("/api/bars/bookmarks", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch saved bars");
      return res.json();
    },
    enabled: !!currentUser,
  });

  // Redirect if not logged in (after loading completes)
  useEffect(() => {
    if (!isLoadingUser && !currentUser) {
      setLocation("/auth");
    }
  }, [isLoadingUser, currentUser, setLocation]);

  // Show loading while checking auth or if no user yet
  if (isLoadingUser || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const userBars = bars.filter(bar => bar.userId === currentUser.id);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 md:pb-4 md:pt-20 md:ml-20 lg:ml-24">
      <Navigation />
      
      <main className="max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto px-3 md:px-0">
        {/* Profile Header */}
        <div className="relative glass-panel overflow-hidden">
          {currentUser.bannerUrl ? (
            <div className="h-32 md:h-48 w-full overflow-hidden">
              <img 
                src={currentUser.bannerUrl} 
                alt="Profile banner"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="h-32 md:h-48 bg-gradient-to-r from-purple-900/30 via-zinc-900 to-zinc-800 w-full" />
          )}
          
          <div className="px-4 md:px-8 -mt-12 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-xl">
                  <AvatarImage src={currentUser.avatarUrl || undefined} />
                  <AvatarFallback>{currentUser.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                {currentUser.isOwner && (
                  <img 
                    src="/owner-crown.png"
                    alt="Owner crown"
                    className="absolute -top-[33px] left-1/2 -translate-x-[calc(50%+10px)] w-24 h-18 md:w-36 md:h-22 rotate-[-8deg] drop-shadow-lg pointer-events-none z-10"
                  />
                )}
              </div>
              
              <div className="mb-2">
                <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2 flex-wrap">
                  @{currentUser.username}
                  <UserProfileBadges userId={currentUser.id} size="sm" maxBadges={5} />
                  {currentUser.membershipTier !== "free" && <span className="text-primary text-xl">✓</span>}
                  {currentUser.username.toLowerCase() === "milsling" && (
                    <span className="ml-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-normal">
                      Creator
                    </span>
                  )}
                  {currentUser.isAdminPlus && (
                    <span className="ml-1 bg-red-600/90 text-white text-xs px-2 py-0.5 rounded-full font-normal shadow-[0_0_10px_rgba(255,0,0,0.6)] animate-pulse">
                      Admin+
                    </span>
                  )}
                  {currentUser.isAdmin && !currentUser.isAdminPlus && !currentUser.isOwner && (
                    <span className="ml-1 bg-blue-600/90 text-white text-xs px-2 py-0.5 rounded-full font-normal">
                      Admin
                    </span>
                  )}
                </h1>
                <p className="text-muted-foreground">{currentUser.bio || "Lyricist"}</p>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto mb-2 flex-wrap">
              <Link href="/profile/edit">
                <Button variant="outline" className="gap-2 glass-button border-white/10 hover:bg-white/10" data-testid="button-edit-profile">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Link href="/badges">
                <Button variant="outline" className="gap-2 glass-button border-white/10 hover:bg-white/10" data-testid="button-badges">
                  Badges
                </Button>
              </Link>
              <Button variant="outline" className="gap-2 glass-button border-white/10 hover:bg-white/10" onClick={handleLogout} data-testid="button-logout">
                <Settings className="h-4 w-4" />
                Logout
              </Button>
              <Button className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 shadow-lg shadow-primary/30" onClick={handleShare} data-testid="button-share">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Stats & Bio */}
        <div className="px-4 md:px-8 py-6 space-y-4">
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-1 glass-button px-3 py-1.5 rounded-lg" data-testid="stat-bars">
              <span className="font-bold text-white">{stats?.barsCount ?? 0}</span>
              <span className="text-white/60">Bars</span>
            </div>
            <div className="flex items-center gap-1" data-testid="stat-followers">
              <span className="font-bold text-foreground">{stats?.followersCount ?? 0}</span>
              <span className="text-muted-foreground">Followers</span>
            </div>
            <div className="flex items-center gap-1" data-testid="stat-following">
              <span className="font-bold text-foreground">{stats?.followingCount ?? 0}</span>
              <span className="text-muted-foreground">Following</span>
            </div>
          </div>

          {/* XP & Level Display */}
          <div className="glass-panel p-4 bg-gradient-to-r from-purple-500/10 to-violet-500/5" data-testid="xp-section">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {level >= 10 ? (
                  <Crown className="h-6 w-6 text-amber-400" />
                ) : (
                  <Star className="h-6 w-6 text-purple-400" />
                )}
                <span className="text-2xl font-bold text-purple-300" data-testid="text-level">Level {level}</span>
                {level >= 10 && (
                  <span className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full">Legend</span>
                )}
              </div>
              <div className="text-sm text-muted-foreground" data-testid="text-xp">
                {xp.toLocaleString()} XP
              </div>
            </div>
            
            <div className="mb-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{xpInCurrentLevel.toLocaleString()} / {xpNeededForNext.toLocaleString()} XP</span>
                <span>To Level {level + 1}</span>
              </div>
              <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-violet-400 transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>

            {activePerks.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {activePerks.map((perk, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-1 text-xs bg-purple-500/20 text-purple-200 px-2 py-1 rounded-full border border-purple-500/30"
                  >
                    <span>{perk.icon}</span>
                    <span>{perk.label}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {currentUser.bio && (
            <p className="text-sm md:text-base max-w-xl" data-testid="text-bio">
              {currentUser.bio}
            </p>
          )}

          {currentUser.location && (
            <div className="flex gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1" data-testid="text-location">
                <MapPin className="h-3 w-3" />
                {currentUser.location}
              </div>
            </div>
          )}

          {/* Achievement Progress */}
          <Link href="/badges" className="block">
            <div className="flex items-center gap-3 p-3 glass-panel glass-panel-hover cursor-pointer" data-testid="achievement-progress">
              <Trophy className="h-5 w-5 text-amber-500" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Achievements</span>
                  <span className="text-sm text-muted-foreground">
                    {earnedCount} / {totalCount}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
              <span className="text-xs text-muted-foreground">{progressPercentage}%</span>
            </div>
          </Link>

          {/* Displayed Badges */}
          <div className="flex flex-wrap gap-2 items-center">
            <TooltipProvider>
              {currentUser.displayedBadges?.map((badgeId: string) => {
                const achievement = ACHIEVEMENTS[badgeId as AchievementId];
                if (!achievement) return null;
                const rarity = achievement.rarity;
                const hasBadgeImage = !!badgeImages[badgeId];
                return (
                  <Tooltip key={badgeId}>
                    <TooltipTrigger>
                      {hasBadgeImage ? (
                        <div 
                          className={cn(
                            "inline-flex items-center justify-center rounded px-1 py-0.5",
                            `badge-${rarity}`,
                            rarity === "legendary" && "bg-gradient-to-r from-red-500/30 via-yellow-500/30 to-purple-500/30 border border-amber-500/50",
                            rarity === "epic" && "bg-purple-500/30 border border-purple-500/50",
                            rarity === "rare" && "bg-blue-500/30 border border-blue-500/50",
                            rarity === "common" && "bg-gray-500/30 border border-gray-500/50"
                          )}
                          data-testid={`badge-displayed-${badgeId}`}
                        >
                          <img 
                            src={badgeImages[badgeId]} 
                            alt={achievement.name} 
                            className="h-6 w-auto object-contain"
                          />
                        </div>
                      ) : (
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
                      )}
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
            <Link href="/badges">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                {(currentUser.displayedBadges?.length ?? 0) > 0 ? "Edit Badges" : "Add Badges"}
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-8">
          <Tabs defaultValue="bars" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-6">
              <TabsTrigger 
                value="bars" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 text-muted-foreground data-[state=active]:text-foreground font-display font-bold tracking-wide"
              >
                BARS
              </TabsTrigger>
              <TabsTrigger 
                value="likes" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 text-muted-foreground data-[state=active]:text-foreground font-display font-bold tracking-wide"
              >
                LIKES
              </TabsTrigger>
              <TabsTrigger 
                value="saved" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 text-muted-foreground data-[state=active]:text-foreground font-display font-bold tracking-wide"
              >
                SAVED
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bars" className="py-6 space-y-6">
              {userBars.map(bar => (
                <BarCard key={bar.id} bar={bar} />
              ))}
            </TabsContent>
            
            <TabsContent value="likes" className="py-6 space-y-6">
              {likedBars.length > 0 ? (
                likedBars.map(bar => (
                  <BarCard key={bar.id} bar={bar} />
                ))
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No liked bars yet.
                </div>
              )}
            </TabsContent>

            <TabsContent value="saved" className="py-6 space-y-6">
              {savedBars.length > 0 ? (
                savedBars.map(bar => (
                  <BarCard key={bar.id} bar={bar} />
                ))
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No saved bars yet.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
