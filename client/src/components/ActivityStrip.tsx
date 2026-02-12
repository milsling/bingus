import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, MessageCircle, PenLine, Sparkles } from "lucide-react";

type ActivityItem = {
  id: string;
  type: string;
  text: string;
  href: string;
  createdAt: string;
};

const ICONS: Record<string, typeof Flame> = {
  reaction: Flame,
  comment: MessageCircle,
  post: PenLine,
  prompt: Sparkles,
};

export default function ActivityStrip({ items }: { items: ActivityItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const safeItems = useMemo(() => items.filter(Boolean), [items]);

  useEffect(() => {
    if (safeItems.length <= 1) return;
    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % safeItems.length);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [safeItems.length]);

  useEffect(() => {
    if (activeIndex > safeItems.length - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, safeItems.length]);

  if (safeItems.length === 0) {
    return null;
  }

  const active = safeItems[activeIndex];
  const Icon = ICONS[active.type] || Sparkles;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary/80">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Now happening</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Link href={active.href}>
            <a
              className="group inline-flex items-center gap-2 text-sm text-foreground/90 hover:text-primary transition-colors"
              data-testid={`now-activity-${active.id}`}
            >
              <Icon className="h-4 w-4 shrink-0 text-primary/80" />
              <span className="line-clamp-1">{active.text}</span>
            </a>
          </Link>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
