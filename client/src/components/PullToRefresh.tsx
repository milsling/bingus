import { useState, useRef, useCallback, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 80;
  const maxPull = 120;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === 0 || isRefreshing) return;
    if (window.scrollY > 0) {
      startY.current = 0;
      setPullDistance(0);
      return;
    }
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      const resistance = 0.4;
      const pull = Math.min(diff * resistance, maxPull);
      setPullDistance(pull);
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center transition-opacity z-10"
        style={{
          top: Math.max(pullDistance - 40, -40),
          opacity: pullDistance > 20 ? 1 : 0,
        }}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center",
            isRefreshing && "animate-spin"
          )}
        >
          <RefreshCw
            className="h-5 w-5 text-primary"
            style={{
              transform: isRefreshing ? "none" : `rotate(${rotation}deg)`,
            }}
          />
        </div>
      </div>
      
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? "transform 0.2s ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
