import { useRef, useState, useCallback } from "react";

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  enabled?: boolean;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  enabled = true,
}: SwipeGestureOptions) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || startX.current === 0) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;
    
    if (isHorizontalSwipe.current === null) {
      isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
    }
    
    if (isHorizontalSwipe.current) {
      const resistance = 0.5;
      setOffset(diffX * resistance);
    }
  }, [enabled]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled) return;
    
    if (offset > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (offset < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
    
    setOffset(0);
    startX.current = 0;
    startY.current = 0;
    isHorizontalSwipe.current = null;
  }, [enabled, offset, threshold, onSwipeLeft, onSwipeRight]);

  return {
    offset,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
