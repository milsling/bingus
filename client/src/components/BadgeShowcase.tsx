import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ProfileBadge {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  imageUrl: string | null;
  emoji: string | null;
  color: string | null;
  backgroundColor: string | null;
  borderColor: string | null;
  animation: string;
  rarity: string;
}

interface UserProfileBadge {
  id: string;
  userId: string;
  badgeId: string;
  source: string;
  sourceDetails: string | null;
  grantedAt: string;
  badge: ProfileBadge;
}

interface BadgeShowcaseProps {
  userId: string;
  username?: string;
  isOwnProfile?: boolean;
  maxDisplay?: number;
}

const rarityColors: Record<string, string> = {
  common: "ring-gray-400/50",
  uncommon: "ring-green-400/50",
  rare: "ring-blue-400/50",
  epic: "ring-purple-400/50",
  legendary: "ring-amber-400/50",
};

const rarityGlow: Record<string, string> = {
  legendary: "shadow-[0_0_12px_rgba(251,191,36,0.4)]",
  epic: "shadow-[0_0_8px_rgba(168,85,247,0.3)]",
  rare: "shadow-[0_0_6px_rgba(59,130,246,0.3)]",
};

export function BadgeShowcase({ userId, username, isOwnProfile, maxDisplay = 8 }: BadgeShowcaseProps) {
  const { data: userBadges = [] } = useQuery<UserProfileBadge[]>({
    queryKey: ["user-all-badges", userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/badges`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  const displayBadges = userBadges.slice(0, maxDisplay);
  const totalBadges = userBadges.length;

  if (totalBadges === 0 && !isOwnProfile) return null;

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Badges</h3>
            <p className="text-xs text-muted-foreground">{totalBadges} collected</p>
          </div>
        </div>
        {isOwnProfile && (
          <Link href="/badges">
            <span className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer">
              Manage
              <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        )}
      </div>

      {totalBadges === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No badges yet</p>
          {isOwnProfile && (
            <p className="text-xs text-muted-foreground/70 mt-1">Earn badges by being active!</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          <TooltipProvider>
            {displayBadges.map((userBadge) => (
              <Tooltip key={userBadge.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "aspect-square rounded-lg bg-white/5 flex items-center justify-center cursor-default transition-all hover:scale-105 ring-2",
                      rarityColors[userBadge.badge.rarity] || "ring-white/10",
                      rarityGlow[userBadge.badge.rarity] || "",
                      userBadge.badge.animation === "pulse" && "animate-pulse",
                      userBadge.badge.animation === "glow" && "shadow-lg shadow-primary/40"
                    )}
                    data-testid={`badge-showcase-${userBadge.badge.id}`}
                  >
                    {userBadge.badge.imageUrl ? (
                      <img
                        src={userBadge.badge.imageUrl}
                        alt={userBadge.badge.displayName}
                        className="w-8 h-8 object-contain"
                      />
                    ) : userBadge.badge.emoji ? (
                      <span className="text-xl">{userBadge.badge.emoji}</span>
                    ) : (
                      <span
                        className="text-[10px] font-bold uppercase text-center px-1 leading-tight"
                        style={{ color: userBadge.badge.color || "#fff" }}
                      >
                        {userBadge.badge.displayName.slice(0, 3)}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="font-semibold">{userBadge.badge.displayName}</p>
                  {userBadge.badge.description && (
                    <p className="text-xs text-muted-foreground">{userBadge.badge.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground/70 capitalize mt-1">{userBadge.badge.rarity}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
          
          {totalBadges > maxDisplay && (
            <Link href={isOwnProfile ? "/badges" : `/u/${username}`}>
              <div className="aspect-square rounded-lg bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors ring-2 ring-white/10">
                <span className="text-xs font-medium text-muted-foreground">+{totalBadges - maxDisplay}</span>
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
