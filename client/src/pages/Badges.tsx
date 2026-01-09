import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBars } from "@/context/BarContext";
import { ACHIEVEMENTS, type AchievementId, type AchievementRarity } from "@shared/schema";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Trophy, Lock, Check, Star, Sparkles, Crown, Gem } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const rarityConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  common: { 
    label: "Common", 
    color: "text-gray-400", 
    bgColor: "bg-gray-500/20",
    icon: <Star className="w-3 h-3" />
  },
  uncommon: { 
    label: "Uncommon", 
    color: "text-green-400", 
    bgColor: "bg-green-500/20",
    icon: <Star className="w-3 h-3" />
  },
  rare: { 
    label: "Rare", 
    color: "text-blue-400", 
    bgColor: "bg-blue-500/20",
    icon: <Sparkles className="w-3 h-3" />
  },
  epic: { 
    label: "Epic", 
    color: "text-purple-400", 
    bgColor: "bg-purple-500/20",
    icon: <Crown className="w-3 h-3" />
  },
  legendary: { 
    label: "Legendary", 
    color: "text-amber-400", 
    bgColor: "bg-gradient-to-r from-red-500/20 via-yellow-500/20 to-purple-500/20",
    icon: <Gem className="w-3 h-3" />
  },
};

export default function Badges() {
  const { currentUser } = useBars();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: userAchievements = [] } = useQuery({
    queryKey: ["userAchievements", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      return api.getUserAchievements(currentUser.id);
    },
    enabled: !!currentUser?.id,
  });

  const { data: userData } = useQuery({
    queryKey: ["user", currentUser?.username],
    queryFn: async () => {
      if (!currentUser?.username) return null;
      return api.getUser(currentUser.username);
    },
    enabled: !!currentUser?.username,
  });

  const { data: customAchievements = [] } = useQuery({
    queryKey: ["customAchievements"],
    queryFn: async () => {
      const res = await fetch("/api/achievements/custom", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
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

  const updateDisplayedBadgesMutation = useMutation({
    mutationFn: async (displayedBadges: string[]) => {
      const response = await fetch("/api/user/displayed-badges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayedBadges }),
      });
      if (!response.ok) throw new Error("Failed to update badges");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast({ title: "Badges updated", description: "Your displayed badges have been saved." });
    },
  });

  const unlockedIds = new Set(userAchievements.map((a: { achievementId: string }) => a.achievementId));
  const displayedBadges = new Set(userData?.displayedBadges || []);

  const toggleBadgeDisplay = (achievementId: string) => {
    const newDisplayed = new Set(displayedBadges);
    if (newDisplayed.has(achievementId)) {
      newDisplayed.delete(achievementId);
    } else {
      if (newDisplayed.size >= 5) {
        toast({ 
          title: "Maximum badges reached", 
          description: "You can only display up to 5 badges on your profile.",
          variant: "destructive"
        });
        return;
      }
      newDisplayed.add(achievementId);
    }
    updateDisplayedBadgesMutation.mutate(Array.from(newDisplayed));
  };

  const achievementsByRarity = Object.entries(ACHIEVEMENTS).reduce((acc, [id, achievement]) => {
    const rarity = achievement.rarity;
    if (!acc[rarity]) acc[rarity] = [];
    acc[rarity].push({ id, ...achievement });
    return acc;
  }, {} as Record<AchievementRarity, Array<{ id: string; name: string; emoji: string; description: string; rarity: AchievementRarity }>>);

  const rarityOrder: AchievementRarity[] = ["legendary", "epic", "rare", "common"];

  if (!currentUser) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Please log in to view your badges.</p>
            <Link href="/auth">
              <Button className="mt-4">Log In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 pb-24">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/u/${currentUser.username}`}>
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            My Badges
          </h1>
          <p className="text-sm text-muted-foreground">
            Toggle badges to display on your profile (max 5)
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Displaying:</span>
          {displayedBadges.size === 0 ? (
            <span className="text-sm text-muted-foreground italic">No badges selected</span>
          ) : (
            Array.from(displayedBadges).map((badgeId) => {
              let achievement: { name: string; emoji: string; description: string; rarity: string } | null = null;
              
              if (badgeId.startsWith("custom_")) {
                const customId = badgeId.replace("custom_", "");
                const custom = customAchievements.find((c: any) => c.id === customId);
                if (custom) {
                  achievement = { name: custom.name, emoji: custom.emoji, description: custom.description, rarity: custom.rarity };
                }
              } else {
                const builtin = ACHIEVEMENTS[badgeId as AchievementId];
                if (builtin) {
                  achievement = builtin;
                }
              }
              
              if (!achievement) return null;
              const rarity = achievement.rarity;
              const hasBadgeImage = !!badgeImages[badgeId];
              return (
                <TooltipProvider key={badgeId}>
                  <Tooltip>
                    <TooltipTrigger>
                      {hasBadgeImage ? (
                        <div 
                          className={cn(
                            "inline-flex items-center justify-center rounded px-1 py-0.5",
                            `badge-${rarity}`,
                            rarityConfig[rarity]?.bgColor || "bg-gray-500/20"
                          )}
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
                            "inline-flex items-center justify-center w-8 h-8 rounded-full text-lg",
                            `badge-${rarity}`,
                            rarityConfig[rarity]?.bgColor || "bg-gray-500/20"
                          )}
                        >
                          {achievement.emoji}
                        </span>
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{achievement.name}</p>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-8">
        {rarityOrder.map((rarity) => {
          const achievements = achievementsByRarity[rarity];
          if (!achievements || achievements.length === 0) return null;
          const config = rarityConfig[rarity];

          return (
            <div key={rarity}>
              <div className="flex items-center gap-2 mb-4">
                <span className={cn("flex items-center gap-1.5", config.color)}>
                  {config.icon}
                  <span className="font-semibold text-lg">{config.label}</span>
                </span>
                <Badge variant="outline" className={config.color}>
                  {achievements.filter(a => unlockedIds.has(a.id)).length}/{achievements.length}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {achievements.map((achievement) => {
                  const isUnlocked = unlockedIds.has(achievement.id);
                  const isDisplayed = displayedBadges.has(achievement.id);

                  return (
                    <Card 
                      key={achievement.id}
                      className={cn(
                        "transition-all",
                        !isUnlocked && "opacity-50 grayscale",
                        isDisplayed && `badge-${rarity}`
                      )}
                      data-testid={`badge-card-${achievement.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div 
                            className={cn(
                              "flex items-center justify-center shrink-0",
                              badgeImages[achievement.id] ? "w-auto h-12 rounded px-2" : "w-12 h-12 rounded-full text-2xl",
                              isUnlocked ? config.bgColor : "bg-muted",
                              isUnlocked && isDisplayed && `badge-${rarity}`
                            )}
                          >
                            {isUnlocked ? (
                              badgeImages[achievement.id] ? (
                                <img src={badgeImages[achievement.id]} alt={achievement.name} className="h-6 w-auto object-contain" />
                              ) : (
                                achievement.emoji
                              )
                            ) : (
                              <Lock className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-semibold truncate">{achievement.name}</h3>
                              {isUnlocked && (
                                <Switch
                                  checked={isDisplayed}
                                  onCheckedChange={() => toggleBadgeDisplay(achievement.id)}
                                  disabled={updateDisplayedBadgesMutation.isPending}
                                  data-testid={`switch-badge-${achievement.id}`}
                                />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            {isUnlocked && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-green-500">
                                <Check className="w-3 h-3" />
                                Unlocked
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {customAchievements.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold text-lg">Special Badges</span>
              </span>
              <Badge variant="outline" className="text-cyan-400">
                {customAchievements.filter((a: any) => unlockedIds.has(`custom_${a.id}`)).length}/{customAchievements.length}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {customAchievements.map((achievement: any) => {
                const customId = `custom_${achievement.id}`;
                const isUnlocked = unlockedIds.has(customId);
                const isDisplayed = displayedBadges.has(customId);
                const config = rarityConfig[achievement.rarity] || rarityConfig.common;

                return (
                  <Card 
                    key={customId}
                    className={cn(
                      "transition-all border-cyan-500/30",
                      !isUnlocked && "opacity-50 grayscale",
                      isDisplayed && `badge-${achievement.rarity}`
                    )}
                    data-testid={`badge-card-${customId}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div 
                          className={cn(
                            "flex items-center justify-center shrink-0",
                            badgeImages[customId] ? "w-auto h-12 rounded px-2" : "w-12 h-12 rounded-full text-2xl",
                            isUnlocked ? config.bgColor : "bg-muted",
                            isUnlocked && isDisplayed && `badge-${achievement.rarity}`
                          )}
                        >
                          {isUnlocked ? (
                            badgeImages[customId] ? (
                              <img src={badgeImages[customId]} alt={achievement.name} className="h-6 w-auto object-contain" />
                            ) : (
                              achievement.emoji
                            )
                          ) : (
                            <Lock className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold truncate">{achievement.name}</h3>
                              <Badge variant="outline" className={config.color}>
                                {achievement.rarity}
                              </Badge>
                            </div>
                            {isUnlocked && (
                              <Switch
                                checked={isDisplayed}
                                onCheckedChange={() => toggleBadgeDisplay(customId)}
                                disabled={updateDisplayedBadgesMutation.isPending}
                                data-testid={`switch-badge-${customId}`}
                              />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          {isUnlocked && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-green-500">
                              <Check className="w-3 h-3" />
                              Unlocked
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
