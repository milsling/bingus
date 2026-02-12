import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
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
  BookOpen,
  NotebookPen
} from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";
import { useTheme } from "@/contexts/ThemeContext";
import AIAssistant from "@/components/AIAssistant";
import orphanBarsMenuLogo from "@/assets/orphan-bars-menu-logo.png";
import orphanageFullLogoWhite from "@/assets/orphanage-full-logo-white.png";
import orphanageFullLogoDark from "@/assets/orphanage-full-logo-dark.png";

// Scroll threshold for FAB hide/reveal (px)
const SCROLL_THRESHOLD = 15;

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

  const getNavItems = () => {
    if (!currentUser) {
      return [
        { icon: Home, label: "Explore", path: "/", id: "guest-explore" },
        { icon: Sparkles, label: "Prompts", path: "/prompts", id: "guest-prompts" },
        { icon: BookOpen, label: "Notebook", path: "/apps/notebook", id: "guest-notebook" },
        { icon: NotebookPen, label: "OrphanStudio", path: "/orphanstudio", id: "guest-orphanstudio" },
        { icon: Swords, label: "Challenges", path: "/challenges", id: "guest-challenges" },
        { icon: Search, label: "Search", action: "search" as const, id: "guest-search" },
        { icon: LogIn, label: "Login", path: "/auth", id: "guest-login" },
      ];
    }

    if (menuSection === "orphanage") {
      return [
        { icon: DoorOpen, label: "Browse", path: "/orphanage", id: "orphanage-browse" },
        { icon: BarChart3, label: "Leaderboard", path: "/orphanage#leaderboard", id: "orphanage-leaderboard" },
        { icon: Heart, label: "My Adoptions", path: "/orphanage#my-adoptions", id: "orphanage-my-adoptions" },
        { icon: Home, label: "Back to Feed", path: "/", id: "orphanage-back" },
      ];
    }

    const items = [
      { icon: Home, label: "Explore", path: "/", id: "main-explore" },
      { icon: Sparkles, label: "Prompts", path: "/prompts", id: "main-prompts" },
      { icon: BookOpen, label: "Notebook", path: "/apps/notebook", id: "main-notebook" },
      { icon: NotebookPen, label: "OrphanStudio", path: "/orphanstudio", id: "main-orphanstudio" },
      { icon: Swords, label: "Challenges", path: "/challenges", id: "main-challenges" },
      { icon: User, label: "My Bars", path: "/profile", id: "main-my-bars" },
      { icon: MessageCircle, label: "Messages", path: "/messages", id: "main-messages" },
      { icon: Users, label: "Friends", path: "/friends", id: "main-friends" },
      { icon: Bookmark, label: "Saved", path: "/saved", id: "main-saved" },
      { icon: Search, label: "Search", action: "search" as const, id: "main-search" },
      { icon: LayoutGrid, label: "Apps", path: "/apps", id: "main-apps" },
    ];

    if (currentUser.isAdmin) {
      items.push({ icon: Shield, label: "Admin", path: "/admin", id: "main-admin" });
    }

    return items;
  };

  const navItems = getNavItems();

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
    (item: { path?: string; action?: string }) => {
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
    [setLocation]
  );

  const handleCenterClick = () => {
    if (!isOpen) playMenuOpenSound();
    else playMenuCloseSound();
    setIsOpen(!isOpen);
  };

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
              className="fixed inset-x-0 bottom-0 z-[1110] flex flex-col rounded-t-[2rem] glass-sheet border border-b-0 border-white/[0.08] max-h-[85vh] shadow-[0_-28px_56px_rgba(0,0,0,0.4)]"
            >
              <div className="flex-shrink-0 px-6 pt-4 pb-3 border-b border-white/[0.06]">
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-foreground/20" />
                <div className="flex items-center justify-between">
                  <img
                    src={orphanBarsMenuLogo}
                    alt="Orphan Bars"
                    className="h-8 w-auto opacity-90 dark:brightness-0 dark:invert"
                  />
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
                <nav className="space-y-1">
                  {navItems.map((item, index) => {
                    const isActive = item.path && location === item.path;
                    return (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.03, duration: 0.2 }}
                        onClick={() => handleNavClick(item as any)}
                        className={cn(
                          "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]",
                          isActive ? "bg-primary/10 text-foreground" : "hover:bg-white/[0.06] text-foreground/90"
                        )}
                        data-testid={`nav-item-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            isActive ? "bg-primary/15" : "bg-white/[0.06]"
                          )}
                        >
                          {item.icon && (
                            <item.icon
                              className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")}
                              strokeWidth={1.8}
                            />
                          )}
                        </div>
                        <span className="text-base font-medium">{item.label}</span>
                      </motion.button>
                    );
                  })}
                </nav>

                <div className="mt-6 pt-6 border-t border-white/[0.06] space-y-1">
                  <button
                    onClick={() => {
                      setMenuSection("orphanbars");
                      handleNavClick({ path: "/" });
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]",
                      menuSection === "orphanbars" ? "bg-primary/10" : "hover:bg-white/[0.06]"
                    )}
                    data-testid="nav-section-orphanbars"
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        menuSection === "orphanbars" ? "bg-primary/15" : "bg-white/[0.06]"
                      )}
                    >
                      <img src={orphanBarsMenuLogo} alt="Orphan Bars" className="h-6 w-auto dark:brightness-0 dark:invert" />
                    </div>
                    <span className="text-base font-medium">Orphan Bars</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuSection("orphanage");
                      handleNavClick({ path: "/orphanage" });
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]",
                      menuSection === "orphanage" ? "bg-primary/10" : "hover:bg-white/[0.06]"
                    )}
                    data-testid="nav-section-orphanage"
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        menuSection === "orphanage" ? "bg-primary/15" : "bg-white/[0.06]"
                      )}
                    >
                      <img
                        src={resolvedTheme === "dark" ? orphanageFullLogoWhite : orphanageFullLogoDark}
                        alt="The Orphanage"
                        className="h-7 w-auto object-contain"
                      />
                    </div>
                    <span className="text-base font-medium">The Orphanage</span>
                  </button>
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
                    <span className="text-base font-medium text-foreground">Ara</span>
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
