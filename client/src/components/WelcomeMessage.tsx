import { useEffect, useState } from 'react';
import { useBars } from '@/context/BarContext';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export default function WelcomeMessage() {
  const { currentUser } = useBars();
  const [daysSinceLastLogin, setDaysSinceLastLogin] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Check localStorage for last visit timestamp
    const lastVisitKey = `lastVisit_${currentUser.username}`;
    const lastVisit = localStorage.getItem(lastVisitKey);

    if (lastVisit) {
      const lastVisitDate = new Date(parseInt(lastVisit));
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - lastVisitDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      setDaysSinceLastLogin(diffDays);
    }

    // Update the last visit timestamp to now
    localStorage.setItem(lastVisitKey, Date.now().toString());
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <Card className="glass-surface-strong border-foreground/15 bg-gradient-to-r from-primary/10 to-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">
              Welcome back, {currentUser.displayName || currentUser.username}!
            </h3>
            {daysSinceLastLogin !== null && daysSinceLastLogin > 0 && (
              <p className="text-sm text-muted-foreground">
                It's been {daysSinceLastLogin} {daysSinceLastLogin === 1 ? 'day' : 'days'} since your last login.
              </p>
            )}
            {(daysSinceLastLogin === null || daysSinceLastLogin === 0) && (
              <p className="text-sm text-muted-foreground">
                Great to see you!
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
