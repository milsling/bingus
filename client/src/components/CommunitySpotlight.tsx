import { motion } from "framer-motion";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Crown } from "lucide-react";

type Spotlight = {
  id: string;
  author: string;
  avatarUrl: string | null;
  lines: string[];
  snippet: string;
  reactionCount: number;
  href: string;
  theme: string;
};

const THEME_STYLE: Record<string, string> = {
  minimal: "bg-gradient-to-br from-primary/10 to-transparent",
  paper: "bg-gradient-to-br from-stone-100/80 to-slate-50/70 dark:from-zinc-900/40 dark:to-zinc-950/20",
  neon: "bg-gradient-to-br from-fuchsia-500/20 via-blue-500/10 to-transparent",
  gritty: "bg-gradient-to-br from-zinc-800/30 via-zinc-700/20 to-transparent",
};

export default function CommunitySpotlight({ spotlight }: { spotlight: Spotlight | null }) {
  if (!spotlight) {
    return null;
  }

  const background = THEME_STYLE[spotlight.theme] || THEME_STYLE.minimal;
  const lines = spotlight.lines.length > 0 ? spotlight.lines : [spotlight.snippet];

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-primary/20 p-5 ${background}`}
      data-testid="community-spotlight"
    >
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        <Crown className="h-3.5 w-3.5" />
        Bar of the week
      </div>

      <div className="space-y-1">
        {lines.map((line, index) => (
          <motion.p
            key={`${spotlight.id}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.08 }}
            className="text-lg leading-relaxed font-medium"
          >
            {line}
          </motion.p>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 border border-border/60">
            <AvatarImage src={spotlight.avatarUrl || undefined} />
            <AvatarFallback>{spotlight.author[0]?.toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">@{spotlight.author}</p>
            <p className="text-xs text-muted-foreground">
              {spotlight.reactionCount} reactions this week
            </p>
          </div>
        </div>

        <Link href={spotlight.href}>
          <a className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Read full bar
            <ArrowRight className="h-4 w-4" />
          </a>
        </Link>
      </div>
    </section>
  );
}
