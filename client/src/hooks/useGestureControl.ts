import { useState, useRef, useCallback, useEffect, useMemo } from "react";

type Point = { x: number; y: number };
type ShortcutDirection = "up" | "left" | "right";

const HOLD_DELAY_MS = 300;
const SHORTCUT_THRESHOLD = 36;
const TAP_JITTER_THRESHOLD = 12; // New: max movement for a tap (px)

const resolveDirection = (dx: number, dy: number): ShortcutDirection | null => {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (dy < -SHORTCUT_THRESHOLD && absY >= absX * 0.55) return "up";
  if (dx < -SHORTCUT_THRESHOLD && absX >= absY * 0.55) return "left";
  if (dx > SHORTCUT_THRESHOLD && absX >= absY * 0.55) return "right";
  return null;
};

const getTouchPoint = (event: TouchEvent, useChangedTouches = false): Point | null => {
  const list = useChangedTouches ? event.changedTouches : event.touches;
  const touch = list[0];
  if (!touch) return null;
  return { x: touch.clientX, y: touch.clientY };
};

export const useGestureControl = (
  onTap: () => void,
  onSwipeUp: () => void,
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
) => {
  const [startPos, setStartPos] = useState<Point | null>(null);
  const [currentPos, setCurrentPos] = useState<Point | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [previewDirection, setPreviewDirection] = useState<ShortcutDirection | null>(null);

  const startPosRef = useRef<Point | null>(null);
  const currentPosRef = useRef<Point | null>(null);
  const previewDirectionRef = useRef<ShortcutDirection | null>(null);
  const isHoldingRef = useRef(false);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);

  const resetTrackingState = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    isHoldingRef.current = false;
    setIsHolding(false);
    setPreviewDirection(null);
    previewDirectionRef.current = null;
    startPosRef.current = null;
    currentPosRef.current = null;
    setStartPos(null);
    setCurrentPos(null);
  }, []);

  useEffect(() => {
    return () => {
      resetTrackingState();
    };
  }, [resetTrackingState]);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    event.preventDefault();
    const point = getTouchPoint(event);
    if (!point) return;

    if (holdTimer.current) clearTimeout(holdTimer.current);
    isHoldingRef.current = false;
    setIsHolding(false);
    setPreviewDirection(null);
    previewDirectionRef.current = null;

    startPosRef.current = point;
    currentPosRef.current = point;
    setStartPos(point);
    setCurrentPos(point);

    holdTimer.current = setTimeout(() => {
      isHoldingRef.current = true;
      setIsHolding(true);
    }, HOLD_DELAY_MS);
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    const start = startPosRef.current;
    if (!start) return;

    const point = getTouchPoint(event);
    if (!point) return;

    currentPosRef.current = point;
    setCurrentPos(point);

    if (!isHoldingRef.current) return;

    const dx = point.x - start.x;
    const dy = point.y - start.y;
    const direction = resolveDirection(dx, dy);
    previewDirectionRef.current = direction;
    setPreviewDirection(direction);
  }, []);

  const handleTouchEnd = useCallback(
    (event?: TouchEvent) => {
      const start = startPosRef.current;
      if (!start) {
        resetTrackingState();
        return;
      }

      const endPoint =
        (event ? getTouchPoint(event, true) : null) ?? currentPosRef.current ?? start;

      const dx = endPoint.x - start.x;
      const dy = endPoint.y - start.y;
      const movementDistance = Math.sqrt(dx * dx + dy * dy);

      // FIXED LOGIC: Tap vs Swipe decision on release
      // - If movement is tiny AND not holding → tap
      // - If holding → always try to resolve a swipe direction (even if movement is small)
      // - No fallback to tap after long press; either swipe or nothing
      if (isHoldingRef.current) {
        // Long press: prioritize swipe direction from full gesture
        const direction = resolveDirection(dx, dy) ?? previewDirectionRef.current;
        if (direction === "up") {
          onSwipeUp();
        } else if (direction === "left") {
          onSwipeLeft();
        } else if (direction === "right") {
          onSwipeRight();
        } else {
          // Long press with no clear direction: do nothing (no fallback to tap)
          // This prevents accidental nav opens after a failed swipe
        }
      } else if (movementDistance < TAP_JITTER_THRESHOLD) {
        // Quick tap: open nav
        onTap();
      } else {
        // Short gesture with too much movement: ignore
      }

      resetTrackingState();
    },
    [onTap, onSwipeUp, onSwipeLeft, onSwipeRight, resetTrackingState],
  );

  const gestureVector = useMemo(() => {
    if (!startPos || !currentPos) return { dx: 0, dy: 0 };
    return {
      dx: currentPos.x - startPos.x,
      dy: currentPos.y - startPos.y,
    };
  }, [startPos, currentPos]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isHolding,
    startPos,
    currentPos,
    previewDirection,
    gestureVector,
  };
};
