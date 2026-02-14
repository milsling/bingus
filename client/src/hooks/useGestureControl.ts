import { useState, useRef, useCallback } from "react";

export const useGestureControl = (
  onTap: () => void,
  onSwipeUp: () => void,
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
) => {
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    setStartPos({ x: touch.clientX, y: touch.clientY });
    holdTimer.current = setTimeout(() => setIsHolding(true), 300);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!startPos || !isHolding) return;
      const touch = e.touches[0];
      if (!touch) return;

      const dx = touch.clientX - startPos.x;
      const dy = touch.clientY - startPos.y;

      if (Math.abs(dy) > 40 && dy < 0) {
        onSwipeUp();
        return;
      } // up = Drop a Bar
      if (Math.abs(dx) > 40 && dx > 0) {
        onSwipeRight();
        return;
      } // right = custom
      if (Math.abs(dx) > 40 && dx < 0) {
        onSwipeLeft();
        return;
      } // left = custom
    },
    [startPos, isHolding, onSwipeUp, onSwipeLeft, onSwipeRight],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isHolding && startPos) onTap(); // tap = nav menu
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setIsHolding(false);
    setStartPos(null);
  }, [startPos, isHolding, onTap]);

  return { handleTouchStart, handleTouchMove, handleTouchEnd, isHolding };
};
