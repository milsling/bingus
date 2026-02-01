import {
  Flame,
  Skull,
  Crown,
  Mic,
  Shield,
  Gem,
  Swords,
  Pen,
  Star,
  TrendingUp,
  Medal,
  Award,
  Trophy,
  MessageSquare,
  MessageCircle,
  RefreshCw,
  Zap,
  Sparkles,
  Diamond,
  Target,
  Factory,
  Moon,
  Ghost,
  GraduationCap,
  Handshake,
  CircleDot,
  Users,
  Megaphone,
  Network,
  Sparkle,
  ScrollText,
  Dog,
  BadgeCheck,
  ShieldCheck,
  HelpCircle,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  Flame,
  Skull,
  Crown,
  Mic,
  Shield,
  Gem,
  Swords,
  Pen,
  Star,
  TrendingUp,
  Medal,
  Award,
  Trophy,
  MessageSquare,
  MessageCircle,
  RefreshCw,
  Zap,
  Sparkles,
  Diamond,
  Target,
  Factory,
  Bolt: Zap,
  Moon,
  Ghost,
  GraduationCap,
  Handshake,
  CircleDot,
  Users,
  Megaphone,
  Network,
  Sparkle,
  ScrollText,
  Dog,
  BadgeCheck,
  ShieldCheck,
};

interface AchievementIconProps {
  icon?: string;
  imageUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function AchievementIcon({ icon, imageUrl, className, size = "md" }: AchievementIconProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt="" 
        className={cn(sizeClasses[size], "object-contain", className)} 
      />
    );
  }

  const IconComponent = icon ? iconMap[icon] : null;
  
  if (IconComponent) {
    return <IconComponent className={cn(sizeClasses[size], className)} />;
  }

  return <HelpCircle className={cn(sizeClasses[size], "text-muted-foreground", className)} />;
}

export { iconMap };
