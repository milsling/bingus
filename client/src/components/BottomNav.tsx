import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useDragControls, type PanInfo } from "framer-motion";
import {
  Home,
  Plus,
  User,
  MessageCircle,
  Users,
  Bookmark,
  Shield,
  LogIn,
  Grid3X3,
  X,
  Search,
  DoorOpen,
  Heart,
  BarChart3,
  Sparkles,
  LayoutGrid,
  Swords,
  NotebookPen,
  type LucideIcon
} from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";
import { useTheme } from "@/contexts/ThemeContext";
import AIAssistant from "@/components/AIAssistant";
import headerLogo from "@/assets/logo.png";
import orphanageFullLogoWhite from "@/assets/orphanage-full-logo-white.png";
import orphanageFullLogoDark from "@/assets/orphanage-full-logo-dark.png";

// Scroll threshold for FAB hide/reveal (px)
const SCROLL_THRESHOLD = 15;
const SHEET_CLOSE_DRAG_OFFSET = 90;
const SHEET_CLOSE_DRAG_VELOCITY = 700;

// Modern drawer slide sound effects using Web Audio API
const playMenuOpenSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.15, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseGain = audioContext.createGain();
    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(2000, audioContext.currentTime);
    noiseFilter.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.12);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noiseGain.gain.setValueAtTime(0, audioContext.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.06, audioContext.currentTime + 0.06);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
    const toneGain = audioContext.createGain();
    oscillator.connect(toneGain);
    toneGain.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(280, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(160, audioContext.currentTime + 0.15);
    oscillator.type = "sine";
    toneGain.gain.setValueAtTime(0, audioContext.currentTime);
    toneGain.gain.linearRampToValueAtTime(0.03, audioContext.currentTime + 0.04);
    toneGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
    noiseSource.start(audioContext.currentTime);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (e) {
    /* noop */
  }
};

const playMenuCloseSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.12, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.25;
    }
    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseGain = audioContext.createGain();
    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(600, audioContext.currentTime);
    noiseFilter.frequency.exponentialRampToValueAtTime(1500, audioContext.currentTime + 0.08);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noiseGain.gain.setValueAtTime(0, audioContext.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.05, audioContext.currentTime + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
    const oscillator = audioContext.createOscillator();
    const toneGain = audioContext.createGain();
    oscillator.connect(toneGain);
    toneGain.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.08);
    oscillator.type = "sine";
    toneGain.gain.setValueAtTime(0, audioContext.currentTime);
    toneGain.gain.linearRampToValueAtTime(0.03, audioContext.currentTime + 0.01);
    toneGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);
    noiseSource.start(audioContext.currentTime);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.12);
  } catch (e) {
    /* noop */
  }
};

interface BottomNavProps {
  onNewMessage?: () => void;
  /** Controlled search overlay - when provided, parent can open search */
  searchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
}

type NavItem = {
  icon: LucideIcon;
  label: string;
  subLabel: string;
  path?: string;
  action?: "search";
  id: string;
};

export function BottomNav({ onNewMessage, searchOpen: searchOpenProp, onSearchOpenChange }: BottomNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpenInternal, setSearchOpenInternal] = useState(false);
  const isControlled = searchOpenProp !== undefined && onSearchOpenChange;
  const searchOpen = isControlled ? searchOpenProp! : searchOpenInternal;
  const setSearchOpen = useCallback(
    (open: boolean) => {
      if (isControlled) onSearchOpenChange!(open);
      else setSearchOpenInternal(open);
    },
    [isControlled, onSearchOpenChange]
  );
  const [araOpen, setAraOpen] = useState(false);
  const [fabVisible, setFabVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [location, setLocation] = useLocation();
  const [menuSection, setMenuSection] = useState<"orphanbars" | "orphanage">(
    location.startsWith("/orphanage") ? "orphanage" : "orphanbars"
  );
  const { currentUser } = useBars();
  const { resolvedTheme } = useTheme();
  const sheetDragControls = useDragControls();

  useEffect(() => {
    setMenuSection(location.startsWith("/orphanage") ? "orphanage" : "orphanbars");
  }, [location]);

  // Scroll-direction-based FAB visibility: down = hide, up = show
  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      const delta = current - lastScrollY.current;
      if (Math.abs(delta) < SCROLL_THRESHOLD) return;
      if (delta > 0) {
        setFabVisible(false);
      } else {
        setFabVisible(true);
      }
      lastScrollY.current = current;
    };

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const getNavItems = (): NavItem[] => {
    if (!currentUser) {
      return [
        { icon: Home, label: "Explore", subLabel: "Fresh bars and trends", path: "/", id: "guest-explore" },
        { icon: Sparkles, label: "Prompts", subLabel: "Daily writing sparks", path: "/prompts", id: "guest-prompts" },
        {
          icon: NotebookPen,
          label: "Orphan Studio",
          subLabel: "Write with rhyme tools",
          path: "/orphanstudio",
          id: "guest-orphanstudio",
        },
        { icon: Swords, label: "Challenges", subLabel: "Battles and events", path: "/challenges", id: "guest-challenges" },
        { icon: Search, label: "Search", subLabel: "Find bars and users", action: "search", id: "guest-search" },
        { icon: LogIn, label: "Login", subLabel: "Access your profile", path: "/auth", id: "guest-login" },
      ];
    }

    if (menuSection === "orphanage") {
      return [
        { icon: DoorOpen, label: "Browse", subLabel: "See available bars", path: "/orphanage", id: "orphanage-browse" },
        {
          icon: BarChart3,
          label: "Leaderboard",
          subLabel: "Top adopters this week",
          path: "/orphanage#leaderboard",
          id: "orphanage-leaderboard",
        },
        {
          icon: Heart,
          label: "My Adoptions",
          subLabel: "Bars you've adopted",
          path: "/orphanage#my-adoptions",
          id: "orphanage-my-adoptions",
        },
        { icon: Home, label: "Back to Feed", subLabel: "Return to Orphan Bars", path: "/", id: "orphanage-back" },
      ];
    }

    const items: NavItem[] = [
      { icon: Home, label: "Explore", subLabel: "Newest bars and stories", path: "/", id: "main-explore" },
      { icon: Sparkles, label: "Prompts", subLabel: "Stay in writing mode", path: "/prompts", id: "main-prompts" },
      {
        icon: NotebookPen,
        label: "Orphan Studio",
        subLabel: "Draft lyrics and rhyme",
        path: "/orphanstudio",
        id: "main-orphanstudio",
      },
      { icon: Swords, label: "Challenges", subLabel: "Compete with the community", path: "/challenges", id: "main-challenges" },
      { icon: User, label: "My Bars", subLabel: "Your profile and progress", path: "/profile", id: "main-my-bars" },
      { icon: MessageCircle, label: "Messages", subLabel: "DMs and threads", path: "/messages", id: "main-messages" },
      { icon: Users, label: "Friends", subLabel: "Your circle", path: "/friends", id: "main-friends" },
      { icon: Bookmark, label: "Saved", subLabel: "Bookmarks and refs", path: "/saved", id: "main-saved" },
      { icon: Search, label: "Search", subLabel: "Find anything quickly", action: "search", id: "main-search" },
      { icon: LayoutGrid, label: "Apps", subLabel: "Creative tools", path: "/apps", id: "main-apps" },
    ];

    if (currentUser.isAdmin) {
      items.push({ icon: Shield, label: "Admin", subLabel: "Moderation controls", path: "/admin", id: "main-admin" });
    }

    return items;
  };

  const navItems = getNavItems();
  const quickNavItems = navItems.slice(0, menuSection === "orphanage" ? 4 : 5);

  const isItemActive = useCallback(
    (item: { path?: string }) => {
      if (!item.path) return false;
      const basePath = item.path.split("#")[0];
      if (basePath === "/") return location === "/";
      return location === basePath || location.startsWith(`${basePath}/`);
    },
    [location],
  );

  const scrollToHashTarget = (hash: string, attempt = 0) => {
    const target = document.getElementById(hash);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (attempt < 12) {
      window.setTimeout(() => scrollToHashTarget(hash, attempt + 1), 100);
    }
  };

  const handleNavClick = useCallback(
    (item: Pick<NavItem, "path" | "action">) => {
      if (item.action === "search") {
        setIsOpen(false);
        setSearchOpen(true);
        return;
      }
      if (!item.path) return;
      setIsOpen(false);
      if (item.path.includes("#")) {
        const [basePath, hash] = item.path.split("#");
        setLocation(basePath);
        window.setTimeout(() => scrollToHashTarget(hash), 120);
      } else {
        setLocation(item.path);
      }
      if (item.path.startsWith("/orphanage")) setMenuSection("orphanage");
      else if (item.path === "/") setMenuSection("orphanbars");
    },
    [setLocation, setSearchOpen]
  );

  const handleCenterClick = () => {
    if (!isOpen) playMenuOpenSound();
    else playMenuCloseSound();
    setIsOpen(!isOpen);
  };

  const handleSheetDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const draggedFarEnough = info.offset.y > SHEET_CLOSE_DRAG_OFFSET;
      const draggedFastEnough = info.velocity.y > SHEET_CLOSE_DRAG_VELOCITY;
      if (draggedFarEnough || draggedFastEnough) {
        playMenuCloseSound();
        setIsOpen(false);
      }
    },
    [],
  );

  return (
    <>
      {/* Glassmorphic bottom sheet - compact overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-black/50 z-[1100]"
              onClick={() => {
                playMenuCloseSound();
                setIsOpen(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
              drag="y"
              dragControls={sheetDragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 280 }}
              dragElastic={{ top: 0, bottom: 0.35 }}
              dragMomentum={false}
              dragSnapToOrigin
              onDragEnd={handleSheetDragEnd}
              className="fixed inset-x-0 bottom-0 z-[1110] flex flex-col rounded-t-[2rem] glass-sheet border border-b-0 border-white/[0.08] max-h-[85vh] shadow-[0_-28px_56px_rgba(0,0,0,0.4)]"
            >
              <div className="flex-shrink-0 px-6 pt-4 pb-3 border-b border-white/[0.06]">
                <button
                  type="button"
                  onPointerDown={(event) => sheetDragControls.start(event)}
                  onClick={() => {
                    playMenuCloseSound();
                    setIsOpen(false);
                  }}
                  className="mx-auto mb-3 block h-5 w-14 touch-none rounded-full"
                  aria-label="Drag down to close menu"
                >
                  <span className="mx-auto mt-1.5 block h-1.5 w-12 rounded-full bg-foreground/20" />
                </button>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={headerLogo} alt="Orphan Bars" className="h-8 w-8" />
                    <span className="font-logo text-xl leading-none text-foreground flex items-center gap-0.5">
                      <span>ORPHAN</span>
                      <span>BARS</span>
                    </span>
                  </div>
                  <motion.button
                    onClick={() => {
                      playMenuCloseSound();
                      setIsOpen(false);
                    }}
                    className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center transition-colors"
                    whileTap={{ scale: 0.9 }}
                    data-testid="button-close-menu"
                  >
                    <X className="w-5 h-5 text-foreground" strokeWidth={2} />
                  </motion.button>
                </div>
              </div>

              <motion.div
                className="flex-1 flex flex-col px-6 py-4 overflow-y-auto overscroll-contain min-h-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.2 }}
              >
                <div className="space-y-4">
                  <div className="glass-surface rounded-2xl p-1">
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => {
                          setMenuSection("orphanbars");
                          handleNavClick({ path: "/" });
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98]",
                          menuSection === "orphanbars"
                            ? "bg-primary/15 text-foreground"
                            : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
                        )}
                        data-testid="nav-section-orphanbars"
                      >
                        <img src={headerLogo} alt="Orphan Bars" className="h-5 w-5" />
                        <span>Orphan Bars</span>
                      </button>
                      <button
                        onClick={() => {
                          setMenuSection("orphanage");
                          handleNavClick({ path: "/orphanage" });
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98]",
                          menuSection === "orphanage"
                            ? "bg-primary/15 text-foreground"
                            : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
                        )}
                        data-testid="nav-section-orphanage"
                      >
                        <img
                          src={resolvedTheme === "dark" ? orphanageFullLogoWhite : orphanageFullLogoDark}
                          alt="The Orphanage"
                          className="h-5 w-auto object-contain"
                        />
                        <span>The Orphanage</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">
                      Quick Jump
                    </p>
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                      {quickNavItems.map((item, index) => {
                        const isActive = isItemActive(item);
                        return (
                          <motion.button
                            key={`quick-${item.id}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.06 + index * 0.03, duration: 0.18 }}
                            onClick={() => handleNavClick(item)}
                            className={cn(
                              "min-w-[116px] rounded-2xl border px-3 py-2 text-left transition-all active:scale-[0.98]",
                              isActive
                                ? "border-primary/40 bg-primary/12"
                                : "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]",
                            )}
                            data-testid={`nav-quick-item-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-xl",
                                  isActive ? "bg-primary/20" : "bg-white/[0.08]",
                                )}
                              >
                                <item.icon
                                  className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")}
                                  strokeWidth={1.9}
                                />
                              </div>
                              <span className="text-sm font-medium text-foreground">{item.label}</span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">
                      Navigation
                    </p>
                    <nav className="grid grid-cols-2 gap-2.5">
                      {navItems.map((item, index) => {
                        const isActive = isItemActive(item);
                        return (
                          <motion.button
                            key={item.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 + index * 0.025, duration: 0.2 }}
                            onClick={() => handleNavClick(item)}
                            className={cn(
                              "group rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98]",
                              isActive
                                ? "border-primary/40 bg-primary/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                                : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08]",
                            )}
                            data-testid={`nav-item-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                          >
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <div
                                className={cn(
                                  "flex h-9 w-9 items-center justify-center rounded-xl",
                                  isActive ? "bg-primary/20" : "bg-white/[0.08]",
                                )}
                              >
                                <item.icon
                                  className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")}
                                  strokeWidth={1.9}
                                />
                              </div>
                              {isActive && (
                                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                                  Live
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-foreground">{item.label}</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.subLabel}</p>
                          </motion.button>
                        );
                      })}
                    </nav>
                  </div>
                </div>

                {currentUser && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setAraOpen(true);
                    }}
                    className="mt-4 w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] transition-all active:scale-[0.98]"
                    data-testid="nav-section-ara"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-base font-medium text-foreground leading-none">Ara</p>
                      <p className="mt-1 text-xs text-muted-foreground">AI writing copilot</p>
                    </div>
                  </button>
                )}
              </motion.div>

              {currentUser && (
                <div className="flex-shrink-0 px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 border-t border-white/[0.06]">
                  <button
                    onClick={() => handleNavClick({ path: "/post" })}
                    className="w-full p-4 rounded-2xl glass-panel glass-panel-hover flex items-center justify-center gap-3 border-primary/25 hover:border-primary/40 transition-all active:scale-[0.98] shadow-[0_0_24px_rgba(168,85,247,0.15)]"
                    data-testid="nav-item-drop-bar-main"
                  >
                    <Plus className="w-6 h-6 text-primary" strokeWidth={2} />
                    <span className="text-lg text-foreground font-semibold" style={{ fontFamily: "var(--font-logo)" }}>
                      Drop a Bar
                    </span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1120]"
              onClick={() => setSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed bottom-24 left-3 right-3 z-[1125] glass-surface-strong rounded-2xl border border-white/[0.08] p-4"
            >
              <SearchBar className="w-full" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Single FAB - centered, scroll hide/reveal */}
      <AnimatePresence>
        {fabVisible && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.9 }}
            transition={{ duration: 0.22, ease: [0.33, 1, 0.68, 1] }}
            className="fab-transition md:hidden fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[999] flex justify-center pointer-events-none"
          >
            <div className="pointer-events-auto">
              <motion.button
                onClick={handleCenterClick}
                className={cn(
                  "w-16 h-16 rounded-full",
                  "glass-panel",
                  "flex items-center justify-center",
                  "border border-white/[0.1]",
                  "shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
                  "hover:border-primary/30",
                  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg-base-start)]",
                  isOpen && "border-primary/40 shadow-[0_0_28px_rgba(168,85,247,0.25)]"
                )}
                whileTap={{ scale: 0.92 }}
                data-testid="button-menu"
              >
                <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
                  {isOpen ? (
                    <X className="w-7 h-7 text-foreground" strokeWidth={2} />
                  ) : (
                    <Grid3X3 className="w-7 h-7 text-foreground" strokeWidth={1.8} />
                  )}
                </motion.div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AIAssistant open={araOpen} onOpenChange={setAraOpen} hideFloatingButton />
    </>
  );
}
