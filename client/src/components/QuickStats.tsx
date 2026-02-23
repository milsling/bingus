import { useQuery } from "@tanstack/react-query";
import { BarChart2, Users, TrendingUp, Clock } from "lucide-react";
import { NativeGlassCard } from "./ui/native-shell";

interface QuickStatsProps {
  className?: string;
}

export function QuickStats({ className }: QuickStatsProps) {
  const { data: stats } = useQuery({
    queryKey: ["community-stats"],
    queryFn: async () => {
      const res = await fetch("/api/community/stats", { credentials: "include" });
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const statItems = [
    {
      icon: BarChart2,
      label: "Total Bars",
      value: stats?.totalBars ? stats.totalBars.toLocaleString() : "Loading...",
      color: "text-purple-400",
    },
    {
      icon: Users,
      label: "Active Writers",
      value: stats?.activeWritersMonth ? `${stats.activeWritersMonth.toLocaleString()}/mo` : "Loading...",
      color: "text-blue-400",
    },
    {
      icon: TrendingUp,
      label: "This Week",
      value: stats?.barsThisWeek ? stats.barsThisWeek.toLocaleString() : "Loading...",
      color: "text-green-400",
    },
    {
      icon: Clock,
      label: "Avg. Response",
      value: "~2m",
      color: "text-orange-400",
    },
  ];

  return (
    <NativeGlassCard className={`${className} backdrop-blur-xl`}>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {statItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-background/20">
            <item.icon className={`h-4 w-4 ${item.color}`} />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground truncate">{item.label}</div>
              <div className="text-sm font-semibold text-foreground truncate">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </NativeGlassCard>
  );
}
