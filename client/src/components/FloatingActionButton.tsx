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

interface FloatingActionButtonProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onDropABar?: () => void;
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
  const suppressClickRef = useRef(false);
  const { currentUser } = useBars();

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 768);
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  useEffect(() => {
    setIsNavOpen(false);
  }, [location]);

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

  const { handleTouchStart, handleTouchMove, handleTouchEnd, isHolding } = useGestureControl(
    () => setIsNavOpen((open) => !open),
    () => {
      setIsNavOpen(false);
      runDropABar();
    },
    () => {
      setIsNavOpen(false);
      runSwipeLeft();
    },
    () => {
      setIsNavOpen(false);
      runSwipeRight();
    },
  );

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
    (event: React.TouchEvent<HTMLDivElement>) => {
      event.preventDefault();
      suppressClickRef.current = true;
      setHapticPulseKey((key) => key + 1);
      if ("vibrate" in navigator) navigator.vibrate(10);
      handleTouchStart(event.nativeEvent);
    },
    [handleTouchStart],
  );

  const onFabTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      event.preventDefault();
      handleTouchMove(event.nativeEvent);
    },
    [handleTouchMove],
  );

  const onFabTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      event.preventDefault();
      handleTouchEnd();
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    },
    [handleTouchEnd],
  );

  const onFabClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (suppressClickRef.current) return;
    setIsNavOpen((open) => !open);
  }, []);

  if (!isMobile) return null;

  return (
    <>
      <NavOverlay isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} items={navItems} />

      <motion.div
        animate={isHolding ? { scale: 1.1, boxShadow: "0 12px 32px rgba(0,0,0,0.3)" } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{ x: "-50%" }}
        className="fab-button"
        role="button"
        tabIndex={0}
        aria-label="Open main navigation menu"
        aria-expanded={isNavOpen}
        data-testid="floating-action-button"
        onTouchStart={onFabTouchStart}
        onTouchMove={onFabTouchMove}
        onTouchEnd={onFabTouchEnd}
        onTouchCancel={onFabTouchEnd}
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
      </motion.div>
    </>
  );
}
