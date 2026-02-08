import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Lock, Trophy } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useBars } from "@/context/BarContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ACHIEVEMENTS, type AchievementId } from "@shared/schema";
import { format } from "date-fns";

const achievementOrder: AchievementId[] = [
  "first_bar",
  "bar_slinger",
  "wordsmith",
  "bar_lord",
  "rising_star",
  "cult_leader",
  "crowd_pleaser",
  "milsling_legacy",
  "viral",
  "immortal_bar",
];

export default function Achievements() {
  const { currentUser } = useBars();
  const [, setLocation] = useLocation();

  const { data: userAchievements = [] } = useQuery({
    queryKey: ["myAchievements"],
    queryFn: async () => {
      if (!currentUser) return [];
      return api.getUserAchievements(currentUser.id);
    },
    enabled: !!currentUser,
  });

  const unlockedMap = new Map(
    userAchievements.map(a => [a.achievementId, a.unlockedAt])
  );

  if (!currentUser) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-4 md:pt-24">
      
      <main className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-amber-500" />
              Achievements
            </h1>
            <p className="text-muted-foreground text-sm" data-testid="text-achievement-progress">
              {userAchievements.length} of {achievementOrder.length} unlocked
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {achievementOrder.map(achievementId => {
            const achievement = ACHIEVEMENTS[achievementId];
            if (!achievement) return null;
            const unlockedAt = unlockedMap.get(achievementId);
            const isUnlocked = !!unlockedAt;

            return (
              <Card 
                key={achievementId} 
                className={`border transition-all ${
                  isUnlocked 
                    ? 'bg-card border-amber-500/30' 
                    : 'bg-card/50 opacity-60'
                }`}
                data-testid={`card-achievement-${achievementId}`}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`text-4xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                    {achievement.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{achievement.name}</h3>
                      {!isUnlocked && (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">{achievement.description}</p>
                    {isUnlocked && unlockedAt && (
                      <p className="text-xs text-amber-500 mt-1">
                        Unlocked {format(new Date(unlockedAt), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  {isUnlocked && (
                    <div className="shrink-0">
                      <div className="bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-sm font-medium">
                        Earned
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
