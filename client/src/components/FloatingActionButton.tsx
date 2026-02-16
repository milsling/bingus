import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Home,
  LayoutGrid,
  LogIn,
  MessageCircle,
  NotebookPen,
  Plus,
  Shield,
  Sparkles,
  Swords,
  User,
  Users,
} from "lucide-react";
import { useBars } from "@/context/BarContext";
import { NavOverlay, type NavOverlayItem } from "@/components/NavOverlay";
import { useGestureControl } from "@/hooks/useGestureControl";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onDropABar?: () => void;
}

type ShortcutDirection = "up" | "left" | "right";

interface GestureDebugState {
  lastEvent: string;
  tapCount: number;
  swipeUpCount: number;
  swipeLeftCount: number;
  swipeRightCount: number;
  holdCount: number;
  touchActive: boolean;
  touchStart: { x: number; y: number } | null;
  touchMove: { x: number; y: number; dx: number; dy: number } | null;
  updatedAt: number;
}

export function FloatingActionButton({
  onSwipeLeft,
  onSwipeRight,
  onDropABar,
}: FloatingActionButtonProps) {
  const [location, setLocation] = useLocation();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hapticPulseKey, setHapticPulseKey] = useState(0);
  const [pendingShortcut, setPendingShortcut] = useState<ShortcutDirection | null>(null);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugState, setDebugState] = useState<GestureDebugState>({
    lastEvent: "idle",
    tapCount: 0,
    swipeUpCount: 0,
    swipeLeftCount: 0,
    swipeRightCount: 0,
    holdCount: 0,
    touchActive: false,
    touchStart: null,
    touchMove: null,
    updatedAt: Date.now(),
  });
  const suppressClickRef = useRef(false);
  const lastTouchEndAtRef = useRef(0);
  const lastGestureActionAtRef = useRef(0);
  const shortcutTimerRef = useRef<number | null>(null);
  const touchActiveRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const { currentUser } = useBars();
  const canDebug = Boolean(currentUser?.isAdmin || currentUser?.isAdminPlus || currentUser?.isOwner);

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 768);
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  useEffect(() => {
    setIsNavOpen(false);
  }, [location]);

  useEffect(() => {
    return () => {
      if (shortcutTimerRef.current !== null) {
        window.clearTimeout(shortcutTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!canDebug) {
      setDebugEnabled(false);
      return;
    }
    const saved = window.localStorage.getItem("fab-debug-enabled");
    setDebugEnabled(saved === "1");
  }, [canDebug]);

  useEffect(() => {
    if (!canDebug) return;
    window.localStorage.setItem("fab-debug-enabled", debugEnabled ? "1" : "0");
  }, [canDebug, debugEnabled]);

  const updateDebugState = useCallback(
    (updater: (prev: GestureDebugState) => GestureDebugState) => {
      if (!canDebug || !debugEnabled) return;
      setDebugState((prev) => updater(prev));
    },
    [canDebug, debugEnabled],
  );

  const navigate = useCallback(
    (path: string) => {
      setLocation(path);
    },
    [setLocation],
  );

  const runDropABar = useCallback(() => {
    if (onDropABar) {
      onDropABar();
      return;
    }

    navigate(currentUser ? "/post" : "/auth");
  }, [onDropABar, navigate, currentUser]);

  const runSwipeLeft = useCallback(() => {
    if (onSwipeLeft) {
      onSwipeLeft();
      return;
    }

    navigate(currentUser ? "/messages" : "/auth");
  }, [onSwipeLeft, navigate, currentUser]);

  const runSwipeRight = useCallback(() => {
    if (onSwipeRight) {
      onSwipeRight();
      return;
    }

    navigate(currentUser ? "/profile" : "/auth");
  }, [onSwipeRight, navigate, currentUser]);

  const runShortcutAction = useCallback(
    (direction: ShortcutDirection) => {
      if (direction === "up") runDropABar();
      else if (direction === "left") runSwipeLeft();
      else runSwipeRight();
    },
    [runDropABar, runSwipeLeft, runSwipeRight],
  );

  const queueShortcutAction = useCallback(
    (direction: ShortcutDirection) => {
      lastGestureActionAtRef.current = Date.now();
      setIsNavOpen(false);
      setPendingShortcut(direction);
      updateDebugState((prev) => ({
        ...prev,
        lastEvent: `shortcut-animate-${direction}`,
        swipeUpCount: direction === "up" ? prev.swipeUpCount + 1 : prev.swipeUpCount,
        swipeLeftCount: direction === "left" ? prev.swipeLeftCount + 1 : prev.swipeLeftCount,
        swipeRightCount: direction === "right" ? prev.swipeRightCount + 1 : prev.swipeRightCount,
        updatedAt: Date.now(),
      }));

      if (shortcutTimerRef.current !== null) {
        window.clearTimeout(shortcutTimerRef.current);
      }

      shortcutTimerRef.current = window.setTimeout(() => {
        setPendingShortcut(null);
        runShortcutAction(direction);
        updateDebugState((prev) => ({
          ...prev,
          lastEvent: `shortcut-open-${direction}`,
          updatedAt: Date.now(),
        }));
      }, 180);
    },
    [runShortcutAction, updateDebugState],
  );

  const handleTapAction = useCallback(() => {
    if (pendingShortcut) return;
    lastGestureActionAtRef.current = Date.now();
    updateDebugState((prev) => ({
      ...prev,
      lastEvent: "tap-open-menu",
      tapCount: prev.tapCount + 1,
      updatedAt: Date.now(),
    }));
    setIsNavOpen((open) => !open);
  }, [pendingShortcut, updateDebugState]);

  const handleSwipeUpAction = useCallback(() => {
    queueShortcutAction("up");
  }, [queueShortcutAction]);

  const handleSwipeLeftAction = useCallback(() => {
    queueShortcutAction("left");
  }, [queueShortcutAction]);

  const handleSwipeRightAction = useCallback(() => {
    queueShortcutAction("right");
  }, [queueShortcutAction]);

  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isHolding,
    previewDirection,
    gestureVector,
  } = useGestureControl(
    handleTapAction,
    handleSwipeUpAction,
    handleSwipeLeftAction,
    handleSwipeRightAction,
  );

  useEffect(() => {
    if (!isHolding) return;
    updateDebugState((prev) => ({
      ...prev,
      lastEvent: "hold-active",
      holdCount: prev.holdCount + 1,
      updatedAt: Date.now(),
    }));
  }, [isHolding, updateDebugState]);

  const navItems = useMemo<NavOverlayItem[]>(() => {
    if (!currentUser) {
      return [
        {
          id: "guest-explore",
          label: "Explore",
          subtitle: "Fresh bars and trends",
          icon: Home,
          onSelect: () => navigate("/"),
        },
        {
          id: "guest-prompts",
          label: "Prompts",
          subtitle: "Daily writing sparks",
          icon: Sparkles,
          onSelect: () => navigate("/prompts"),
        },
        {
          id: "guest-studio",
          label: "Orphan Studio",
          subtitle: "Write with rhyme tools",
          icon: NotebookPen,
          onSelect: () => navigate("/orphanstudio"),
        },
        {
          id: "guest-challenges",
          label: "Challenges",
          subtitle: "Battles and events",
          icon: Swords,
          onSelect: () => navigate("/challenges"),
        },
        {
          id: "guest-login",
          label: "Login",
          subtitle: "Access your profile",
          icon: LogIn,
          onSelect: () => navigate("/auth"),
        },
      ];
    }

    const items: NavOverlayItem[] = [
      {
        id: "main-explore",
        label: "Explore",
        subtitle: "Newest bars and stories",
        icon: Home,
        onSelect: () => navigate("/"),
      },
      {
        id: "main-drop-bar",
        label: "Drop a Bar",
        subtitle: "Create a new post",
        icon: Plus,
        onSelect: runDropABar,
      },
      {
        id: "main-messages",
        label: "Messages",
        subtitle: "DMs and threads",
        icon: MessageCircle,
        onSelect: () => navigate("/messages"),
      },
      {
        id: "main-friends",
        label: "Friends",
        subtitle: "Your circle",
        icon: Users,
        onSelect: () => navigate("/friends"),
      },
      {
        id: "main-saved",
        label: "Saved",
        subtitle: "Bookmarks and refs",
        icon: Bookmark,
        onSelect: () => navigate("/saved"),
      },
      {
        id: "main-profile",
        label: "My Bars",
        subtitle: "Profile and progress",
        icon: User,
        onSelect: () => navigate("/profile"),
      },
      {
        id: "main-apps",
        label: "Apps",
        subtitle: "Creative tools",
        icon: LayoutGrid,
        onSelect: () => navigate("/apps"),
      },
    ];

    if (currentUser.isAdmin) {
      items.push({
        id: "main-admin",
        label: "Admin",
        subtitle: "Moderation controls",
        icon: Shield,
        onSelect: () => navigate("/admin"),
      });
    }

    return items;
  }, [currentUser, navigate, runDropABar]);

  const onFabTouchStart = useCallback(
    (event: React.TouchEvent<HTMLButtonElement>) => {
      if (pendingShortcut) return;
      event.preventDefault();
      suppressClickRef.current = true;
      touchActiveRef.current = true;
      const touch = event.nativeEvent.touches[0];
      const touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
      touchStartRef.current = touchStart;
      updateDebugState((prev) => ({
        ...prev,
        lastEvent: "element-touchstart",
        touchActive: true,
        touchStart,
        touchMove: null,
        updatedAt: Date.now(),
      }));
      setHapticPulseKey((key) => key + 1);
      if ("vibrate" in navigator) navigator.vibrate(10);
      handleTouchStart(event.nativeEvent);
    },
    [pendingShortcut, handleTouchStart, updateDebugState],
  );

  const finishTouchInteraction = useCallback(
    (event: Event | React.TouchEvent<HTMLButtonElement>, source: "element" | "window") => {
      event.preventDefault();
      if (!touchActiveRef.current) return;
      touchActiveRef.current = false;
      touchStartRef.current = null;
      const nativeEvent = "nativeEvent" in event ? event.nativeEvent : event;
      handleTouchEnd(nativeEvent as TouchEvent);
      lastTouchEndAtRef.current = Date.now();
      updateDebugState((prev) => ({
        ...prev,
        lastEvent: `${source}-touchend`,
        touchActive: false,
        touchMove: null,
        updatedAt: Date.now(),
      }));
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 450);
    },
    [handleTouchEnd, updateDebugState],
  );

  const trackTouchMoveForDebug = useCallback(
    (touch: Touch) => {
      const start = touchStartRef.current;
      if (!start) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      updateDebugState((prev) => ({
        ...prev,
        lastEvent: "touchmove",
        touchMove: { x: touch.clientX, y: touch.clientY, dx, dy },
        updatedAt: Date.now(),
      }));
    },
    [updateDebugState],
  );

  useEffect(() => {
    const onWindowTouchMove = (event: TouchEvent) => {
      if (!touchActiveRef.current) return;
      event.preventDefault();
      handleTouchMove(event);
      const touch = event.touches[0];
      if (touch) trackTouchMoveForDebug(touch);
    };

    const onWindowTouchEnd = (event: TouchEvent) => {
      finishTouchInteraction(event, "window");
    };

    window.addEventListener("touchmove", onWindowTouchMove, { passive: false });
    window.addEventListener("touchend", onWindowTouchEnd, { passive: false });
    window.addEventListener("touchcancel", onWindowTouchEnd, { passive: false });

    return () => {
      window.removeEventListener("touchmove", onWindowTouchMove);
      window.removeEventListener("touchend", onWindowTouchEnd);
      window.removeEventListener("touchcancel", onWindowTouchEnd);
    };
  }, [finishTouchInteraction, handleTouchMove, trackTouchMoveForDebug]);

  const onFabClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (pendingShortcut) return;
    const now = Date.now();
    const touchEndedRecently = now - lastTouchEndAtRef.current < 450;
    const gestureHandledRecently = now - lastGestureActionAtRef.current < 450;

    if (suppressClickRef.current || touchEndedRecently) {
      if (!gestureHandledRecently) {
        updateDebugState((prev) => ({
          ...prev,
          lastEvent: "click-fallback-toggle",
          updatedAt: now,
        }));
        setIsNavOpen((open) => !open);
        return;
      }

      updateDebugState((prev) => ({
        ...prev,
        lastEvent: "click-blocked-touch-handled",
        updatedAt: now,
      }));
      return;
    }
    updateDebugState((prev) => ({
      ...prev,
      lastEvent: "click-toggle-menu",
      updatedAt: now,
    }));
    setIsNavOpen((open) => !open);
  }, [pendingShortcut, updateDebugState]);

  const hudVisible = isHolding || pendingShortcut !== null;
  const clampedGestureVector = useMemo(
    () => ({
      dx: Math.max(-76, Math.min(76, gestureVector.dx)),
      dy: Math.max(-86, Math.min(34, gestureVector.dy)),
    }),
    [gestureVector],
  );

  const shortcutButtonAnimation = useMemo(() => {
    if (!pendingShortcut) return null;

    if (pendingShortcut === "up") return { x: [0, 0], y: [0, -26], scale: [1, 1.08] };
    if (pendingShortcut === "left") return { x: [0, -26], y: [0, 0], scale: [1, 1.08] };
    return { x: [0, 26], y: [0, 0], scale: [1, 1.08] };
  }, [pendingShortcut]);

  if (!isMobile) return null;

  return (
    <>
      <NavOverlay isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} items={navItems} />

      {canDebug && (
        <div className="md:hidden fixed left-3 top-[calc(env(safe-area-inset-top)+4.2rem)] z-[10002] flex flex-col items-start gap-2 pointer-events-none">
          <button
            type="button"
            onClick={() => setDebugEnabled((enabled) => !enabled)}
            className={cn(
              "fab-debug-toggle",
              debugEnabled && "fab-debug-toggle-active",
            )}
            data-testid="button-fab-debug-toggle"
          >
            {debugEnabled ? "Hide FAB Debug" : "Show FAB Debug"}
          </button>

          {debugEnabled && (
            <div className="fab-debug-panel" data-testid="panel-fab-debug">
              <p className="fab-debug-title">FAB Gesture Debug</p>
              <p>Event: {debugState.lastEvent}</p>
              <p>Holding: {isHolding ? "yes" : "no"}</p>
              <p>Touch Active: {debugState.touchActive ? "yes" : "no"}</p>
              <p>Menu Open: {isNavOpen ? "yes" : "no"}</p>
              <p>
                Tap/Up/Left/Right: {debugState.tapCount}/{debugState.swipeUpCount}/
                {debugState.swipeLeftCount}/{debugState.swipeRightCount}
              </p>
              <p>Hold Count: {debugState.holdCount}</p>
              <p>Preview Direction: {previewDirection ?? "-"}</p>
              <p>Pending Shortcut: {pendingShortcut ?? "-"}</p>
              <p>
                Start: {debugState.touchStart ? `${debugState.touchStart.x},${debugState.touchStart.y}` : "-"}
              </p>
              <p>
                Move:{" "}
                {debugState.touchMove
                  ? `${debugState.touchMove.x},${debugState.touchMove.y} (dx ${Math.round(debugState.touchMove.dx)}, dy ${Math.round(debugState.touchMove.dy)})`
                  : "-"}
              </p>
              <p>Updated: {new Date(debugState.updatedAt).toLocaleTimeString()}</p>
            </div>
          )}
        </div>
      )}

      {hudVisible && (
        <div className="fab-gesture-hud" aria-hidden>
          <motion.div
            className={cn(
              "fab-gesture-target fab-gesture-target-up",
              (previewDirection === "up" || pendingShortcut === "up") && "fab-gesture-target-active",
            )}
            animate={previewDirection === "up" || pendingShortcut === "up" ? { scale: 1.12, opacity: 1 } : { scale: 1, opacity: 0.7 }}
            transition={{ type: "spring", stiffness: 440, damping: 30 }}
          >
            <ChevronUp className="h-4 w-4" />
          </motion.div>
          <motion.div
            className={cn(
              "fab-gesture-target fab-gesture-target-left",
              (previewDirection === "left" || pendingShortcut === "left") && "fab-gesture-target-active",
            )}
            animate={previewDirection === "left" || pendingShortcut === "left" ? { scale: 1.12, opacity: 1 } : { scale: 1, opacity: 0.7 }}
            transition={{ type: "spring", stiffness: 440, damping: 30 }}
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.div>
          <motion.div
            className={cn(
              "fab-gesture-target fab-gesture-target-right",
              (previewDirection === "right" || pendingShortcut === "right") && "fab-gesture-target-active",
            )}
            animate={previewDirection === "right" || pendingShortcut === "right" ? { scale: 1.12, opacity: 1 } : { scale: 1, opacity: 0.7 }}
            transition={{ type: "spring", stiffness: 440, damping: 30 }}
          >
            <ChevronRight className="h-4 w-4" />
          </motion.div>

          {isHolding && (
            <motion.div
              className="fab-gesture-cursor"
              animate={{ x: clampedGestureVector.dx, y: clampedGestureVector.dy }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            />
          )}
        </div>
      )}

      <motion.button
        type="button"
        animate={
          shortcutButtonAnimation
            ? { ...shortcutButtonAnimation, boxShadow: "0 14px 34px rgba(0,0,0,0.34)" }
            : isHolding
              ? { scale: 1.1, boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }
              : { scale: 1, x: 0, y: 0 }
        }
        transition={
          shortcutButtonAnimation
            ? { duration: 0.18, ease: "easeOut" }
            : { type: "spring", stiffness: 500, damping: 30 }
        }
        transformTemplate={(_, generated) => `translateX(-50%) ${generated}`}
        className="fab-button"
        aria-label="Open main navigation menu"
        aria-expanded={isNavOpen}
        data-testid="floating-action-button"
        onTouchStart={onFabTouchStart}
        onTouchMove={(event) => {
          if (pendingShortcut) return;
          event.preventDefault();
          handleTouchMove(event.nativeEvent);
          const touch = event.nativeEvent.touches[0];
          if (touch) trackTouchMoveForDebug(touch);
        }}
        onTouchEnd={(event) => finishTouchInteraction(event, "element")}
        onTouchCancel={(event) => finishTouchInteraction(event, "element")}
        onClick={onFabClick}
        onKeyDown={(event) => {
          if (pendingShortcut) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsNavOpen((open) => !open);
          }
        }}
      >
        <motion.div
          key={hapticPulseKey}
          animate={{ scale: [1, 0.95, 1] }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          className="button-inner"
        >
          <motion.div
            className={cn("fab-ring-core", isNavOpen && "fab-ring-core-open")}
            animate={isNavOpen ? { scale: 1.04 } : { scale: 1 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          />
        </motion.div>
      </motion.button>
    </>
  );
}
