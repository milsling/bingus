import { useQuery } from "@tanstack/react-query";
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

interface UserProfileBadgesProps {
  userId: string;
  size?: "xs" | "sm" | "md";
  maxBadges?: number;
  className?: string;
}

export function UserProfileBadges({ 
  userId, 
  size = "xs",
  maxBadges = 3,
  className 
}: UserProfileBadgesProps) {
  const { data: badges = [] } = useQuery<ProfileBadge[]>({
    queryKey: ["user-displayed-badges", userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/displayed-badges`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  const displayBadges = badges.slice(0, maxBadges);

  if (displayBadges.length === 0) return null;

  const sizeClasses = {
    xs: "text-[10px] px-1 py-0 h-4",
    sm: "text-xs px-1.5 py-0.5 h-5",
    md: "text-sm px-2 py-1 h-6",
  };

  const emojiSizes = {
    xs: "text-[10px]",
    sm: "text-xs",
    md: "text-sm",
  };

  const imgSizes = {
    xs: "h-3 w-auto",
    sm: "h-4 w-auto",
    md: "h-5 w-auto",
  };

  return (
    <div className={cn("inline-flex items-center gap-0.5 flex-wrap", className)}>
      {displayBadges.map((badge) => (
        <TooltipProvider key={badge.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded gap-0.5 transition-all cursor-default",
                  sizeClasses[size],
                  badge.animation === "pulse" && "animate-pulse",
                  badge.animation === "glow" && "shadow-sm shadow-primary/50",
                  badge.animation === "shimmer" && "relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-[shimmer_2s_infinite]"
                )}
                style={{
                  color: badge.color || undefined,
                  backgroundColor: badge.backgroundColor || "rgba(var(--muted), 0.3)",
                  borderColor: badge.borderColor || undefined,
                  borderWidth: badge.borderColor ? "1px" : undefined,
                  borderStyle: badge.borderColor ? "solid" : undefined,
                }}
                data-testid={`profile-badge-${badge.id}`}
              >
                {badge.imageUrl ? (
                  <img
                    src={badge.imageUrl}
                    alt={badge.displayName}
                    className={cn("object-contain", imgSizes[size])}
                  />
                ) : badge.emoji ? (
                  <span className={emojiSizes[size]}>{badge.emoji}</span>
                ) : (
                  <span className={cn("font-medium", emojiSizes[size])}>{badge.displayName}</span>
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="font-semibold">{badge.displayName}</p>
              {badge.description && (
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              )}
              <p className="text-xs text-muted-foreground/70 capitalize mt-1">{badge.rarity}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      {badges.length > maxBadges && (
        <span className={cn("text-muted-foreground", emojiSizes[size])}>
          +{badges.length - maxBadges}
        </span>
      )}
    </div>
  );
}
