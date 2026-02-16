import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Bookmark,
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

  const handleTapAction = useCallback(() => {
    updateDebugState((prev) => ({
      ...prev,
      lastEvent: "tap-open-menu",
      tapCount: prev.tapCount + 1,
      updatedAt: Date.now(),
    }));
    setIsNavOpen((open) => !open);
  }, [updateDebugState]);

  const handleSwipeUpAction = useCallback(() => {
    updateDebugState((prev) => ({
      ...prev,
      lastEvent: "swipe-up-drop-bar",
      swipeUpCount: prev.swipeUpCount + 1,
      updatedAt: Date.now(),
    }));
    setIsNavOpen(false);
    runDropABar();
  }, [updateDebugState, runDropABar]);

  const handleSwipeLeftAction = useCallback(() => {
    updateDebugState((prev) => ({
      ...prev,
      lastEvent: "swipe-left-quick-action",
      swipeLeftCount: prev.swipeLeftCount + 1,
      updatedAt: Date.now(),
    }));
    setIsNavOpen(false);
    runSwipeLeft();
  }, [updateDebugState, runSwipeLeft]);

  const handleSwipeRightAction = useCallback(() => {
    updateDebugState((prev) => ({
      ...prev,
      lastEvent: "swipe-right-quick-action",
      swipeRightCount: prev.swipeRightCount + 1,
      updatedAt: Date.now(),
    }));
    setIsNavOpen(false);
    runSwipeRight();
  }, [updateDebugState, runSwipeRight]);

  const { handleTouchStart, handleTouchMove, handleTouchEnd, isHolding } = useGestureControl(
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
    [handleTouchStart, updateDebugState],
  );

  const finishTouchInteraction = useCallback(
    (event: Event | React.TouchEvent<HTMLButtonElement>, source: "element" | "window") => {
      event.preventDefault();
      if (!touchActiveRef.current) return;
      touchActiveRef.current = false;
      touchStartRef.current = null;
      handleTouchEnd();
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
    if (suppressClickRef.current || Date.now() - lastTouchEndAtRef.current < 450) {
      updateDebugState((prev) => ({
        ...prev,
        lastEvent: "click-blocked",
        updatedAt: Date.now(),
      }));
      return;
    }
    updateDebugState((prev) => ({
      ...prev,
      lastEvent: "click-toggle-menu",
      updatedAt: Date.now(),
    }));
    setIsNavOpen((open) => !open);
  }, [updateDebugState]);

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

      <motion.button
        type="button"
        animate={isHolding ? { scale: 1.1, boxShadow: "0 12px 32px rgba(0,0,0,0.3)" } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        transformTemplate={(_, generated) => `translateX(-50%) ${generated}`}
        className="fab-button"
        aria-label="Open main navigation menu"
        aria-expanded={isNavOpen}
        data-testid="floating-action-button"
        onTouchStart={onFabTouchStart}
        onTouchMove={(event) => {
          event.preventDefault();
          handleTouchMove(event.nativeEvent);
          const touch = event.nativeEvent.touches[0];
          if (touch) trackTouchMoveForDebug(touch);
        }}
        onTouchEnd={(event) => finishTouchInteraction(event, "element")}
        onTouchCancel={(event) => finishTouchInteraction(event, "element")}
        onClick={onFabClick}
        onKeyDown={(event) => {
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
          <motion.div animate={{ rotate: isNavOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus className="h-8 w-8 text-white" strokeWidth={2.1} />
          </motion.div>
        </motion.div>
      </motion.button>
    </>
  );
}
