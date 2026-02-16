import { useState, useRef, useCallback, useEffect } from "react";

export const useGestureControl = (
  onTap: () => void,
  onSwipeUp: () => void,
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
) => {
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isHoldingRef = useRef(false);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const gestureHandled = useRef(false);

  const resetTrackingState = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    isHoldingRef.current = false;
    setIsHolding(false);
    startPosRef.current = null;
    setStartPos(null);
  }, []);

  useEffect(() => {
    return () => {
      resetTrackingState();
    };
  }, [resetTrackingState]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    if (holdTimer.current) clearTimeout(holdTimer.current);
    gestureHandled.current = false;
    isHoldingRef.current = false;
    setIsHolding(false);

    const nextStartPos = { x: touch.clientX, y: touch.clientY };
    startPosRef.current = nextStartPos;
    setStartPos(nextStartPos);

    holdTimer.current = setTimeout(() => {
      isHoldingRef.current = true;
      setIsHolding(true);
    }, 300);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const currentStartPos = startPosRef.current;
      if (!currentStartPos || !isHoldingRef.current || gestureHandled.current) return;
      const touch = e.touches[0];
      if (!touch) return;

      const dx = touch.clientX - currentStartPos.x;
      const dy = touch.clientY - currentStartPos.y;

      if (Math.abs(dy) > 40 && dy < 0) {
        gestureHandled.current = true;
        resetTrackingState();
        onSwipeUp();
        return;
      } // up = Drop a Bar
      if (Math.abs(dx) > 40 && dx > 0) {
        gestureHandled.current = true;
        resetTrackingState();
        onSwipeRight();
        return;
      } // right = custom
      if (Math.abs(dx) > 40 && dx < 0) {
        gestureHandled.current = true;
        resetTrackingState();
        onSwipeLeft();
        return;
      } // left = custom
    },
    [onSwipeUp, onSwipeLeft, onSwipeRight, resetTrackingState],
  );

  const handleTouchEnd = useCallback(() => {
    if (!gestureHandled.current && !isHoldingRef.current && startPosRef.current) onTap(); // tap = nav menu
    gestureHandled.current = false;
    resetTrackingState();
  }, [onTap, resetTrackingState]);

  return { handleTouchStart, handleTouchMove, handleTouchEnd, isHolding };
};
