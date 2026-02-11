import { useState, useEffect, useCallback } from "react";
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
  LayoutGrid
} from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useUnreadMessagesCount, usePendingFriendRequestsCount } from "@/components/UnreadMessagesBadge";
import AIAssistant from "@/components/AIAssistant";
import orphanBarsMenuLogo from "@/assets/orphan-bars-menu-logo.png";
import orphanageFullLogoWhite from "@/assets/orphanage-full-logo-white.png";
import orphanageFullLogoDark from "@/assets/orphanage-full-logo-dark.png";

// Modern drawer slide sound effects using Web Audio API
const playMenuOpenSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a smooth "drawer slide open" whoosh
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
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(2000, audioContext.currentTime);
    noiseFilter.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.12);
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    
    // Swoosh envelope - softer attack, smooth decay
    noiseGain.gain.setValueAtTime(0, audioContext.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.06, audioContext.currentTime + 0.06);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
    
    // Add subtle tone underneath - also softer attack
    const toneGain = audioContext.createGain();
    oscillator.connect(toneGain);
    toneGain.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(280, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(160, audioContext.currentTime + 0.15);
    oscillator.type = 'sine';
    toneGain.gain.setValueAtTime(0, audioContext.currentTime);
    toneGain.gain.linearRampToValueAtTime(0.03, audioContext.currentTime + 0.04);
    toneGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
    
    noiseSource.start(audioContext.currentTime);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (e) {
    // Silently fail if audio isn't supported
  }
};

const playMenuCloseSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a softer "drawer slide close" sound - reverse characteristics
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.12, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.25;
    }
    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    const noiseGain = audioContext.createGain();
    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(600, audioContext.currentTime);
    noiseFilter.frequency.exponentialRampToValueAtTime(1500, audioContext.currentTime + 0.08);
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    
    // Softer closing envelope
    noiseGain.gain.setValueAtTime(0, audioContext.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.05, audioContext.currentTime + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
    
    // Subtle closing tone - goes up slightly
    const oscillator = audioContext.createOscillator();
    const toneGain = audioContext.createGain();
    oscillator.connect(toneGain);
    toneGain.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.08);
    oscillator.type = 'sine';
    toneGain.gain.setValueAtTime(0, audioContext.currentTime);
    toneGain.gain.linearRampToValueAtTime(0.03, audioContext.currentTime + 0.01);
    toneGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);
    
    noiseSource.start(audioContext.currentTime);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.12);
  } catch (e) {
    // Silently fail if audio isn't supported
  }
};

interface BottomNavProps {
  onNewMessage?: () => void;
}

export function BottomNav({ onNewMessage }: BottomNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [araOpen, setAraOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const [menuSection, setMenuSection] = useState<"orphanbars" | "orphanage">(
    location.startsWith("/orphanage") ? "orphanage" : "orphanbars"
  );
  const { currentUser } = useBars();
  const { resolvedTheme } = useTheme();
  const unreadCount = useUnreadMessagesCount();
  const pendingFriendRequests = usePendingFriendRequestsCount();

  useEffect(() => {
    setMenuSection(location.startsWith("/orphanage") ? "orphanage" : "orphanbars");
  }, [location]);
  
  const getNavItems = () => {
    if (!currentUser) {
      return [
        { icon: Home, label: "Feed", path: "/", id: "guest-feed" },
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
      { icon: Home, label: "Feed", path: "/", id: "main-feed" },
      { icon: MessageCircle, label: "Messages", path: "/messages", badge: unreadCount, id: "main-messages" },
      { icon: Users, label: "Friends", path: "/friends", badge: pendingFriendRequests, id: "main-friends" },
      { icon: Bookmark, label: "Saved", path: "/saved", id: "main-saved" },
      { icon: LayoutGrid, label: "Apps", path: "/apps", id: "main-apps" },
      { icon: User, label: "Profile", path: "/profile", id: "main-profile" },
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

  const handleNavClick = (path: string) => {
    setIsOpen(false);
    
    // Handle hash links for scrolling to sections
    if (path.includes('#')) {
      const [basePath, hash] = path.split('#');
      setLocation(basePath);
      window.setTimeout(() => {
        scrollToHashTarget(hash);
      }, 120);
    } else {
      setLocation(path);
    }
    
    // Update menu section based on destination
    if (path.startsWith('/orphanage')) {
      setMenuSection('orphanage');
    } else if (path === '/') {
      setMenuSection('orphanbars');
    }
  };

  const handleCenterClick = () => {
    if (!isOpen) {
      playMenuOpenSound();
    } else {
      playMenuCloseSound();
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Fullscreen Menu - Glass Style */}
      <AnimatePresence>
        {isOpen && (
          <div className="md:hidden">
            <div
              className="fixed inset-0 bg-black/55 dark:bg-black/75 z-[1100]"
              onClick={() => { playMenuCloseSound(); setIsOpen(false); }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[1110] flex flex-col bg-background/72 backdrop-blur-2xl border-t border-border/50"
            >
              {/* Header with close button */}
              <div className="flex items-center justify-between px-6 pt-14 pb-4">
                <img 
                  src={orphanBarsMenuLogo} 
                  alt="Orphan Bars" 
                  className="h-8 w-auto opacity-90 dark:brightness-0 dark:invert"
                />
                <motion.button
                  onClick={() => { playMenuCloseSound(); setIsOpen(false); }}
                  className="w-10 h-10 rounded-full bg-background/70 hover:bg-accent border border-border/60 flex items-center justify-center transition-colors"
                  whileTap={{ scale: 0.9 }}
                  data-testid="button-close-menu"
                >
                  <X className="w-5 h-5 text-foreground" strokeWidth={2} />
                </motion.button>
              </div>

              {/* Navigation Items - Vertical List */}
              <motion.div 
                className="flex-1 flex flex-col px-6 py-4 overflow-y-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.2 }}
              >
                <nav className="space-y-1">
                  {navItems.map((item, index) => {
                    const isActive = item.path && location === item.path;
                    return (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + index * 0.03, duration: 0.2 }}
                        onClick={() => handleNavClick(item.path)}
                        className={cn(
                          "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all active:scale-[0.98]",
                          isActive 
                            ? "bg-primary/12 border border-primary/25 shadow-[0_6px_16px_rgba(99,102,241,0.15)]"
                            : "hover:bg-accent/55 border border-transparent"
                        )}
                        data-testid={`nav-item-${item.label.toLowerCase().replace(' ', '-')}`}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          isActive ? "bg-primary/12" : "bg-muted/35"
                        )}>
                          {item.icon && (
                            <item.icon className={cn(
                              "w-6 h-6",
                              isActive ? "text-primary" : "text-foreground/70"
                            )} strokeWidth={1.8} />
                          )}
                        </div>
                        <span className={cn(
                          "text-lg font-medium",
                          isActive ? "text-foreground" : "text-foreground/85"
                        )}>
                          {item.label}
                        </span>
                        {item.badge && item.badge > 0 && (
                          <span className="ml-auto px-2.5 py-1 rounded-full bg-red-500/90 text-white text-xs font-medium">
                            {item.badge}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                  {navItems.length === 0 && (
                    <p className="px-4 py-3 text-sm text-muted-foreground">
                      No navigation items available.
                    </p>
                  )}
                </nav>

                {/* Section Switchers */}
                <div className="mt-6 pt-6 border-t border-border/50 space-y-1">
                  <button
                    onClick={() => {
                      setMenuSection("orphanbars");
                      handleNavClick("/");
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all active:scale-[0.98]",
                      menuSection === "orphanbars" 
                        ? "bg-primary/12 border border-primary/25" 
                        : "hover:bg-accent/55"
                    )}
                    data-testid="nav-section-orphanbars"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      menuSection === "orphanbars" ? "bg-primary/12" : "bg-muted/35"
                    )}>
                      <img 
                        src={orphanBarsMenuLogo} 
                        alt="Orphan Bars" 
                        className="h-6 w-auto dark:brightness-0 dark:invert"
                      />
                    </div>
                    <span className={cn(
                      "text-lg font-medium",
                      menuSection === "orphanbars" ? "text-foreground" : "text-foreground/85"
                    )}>Orphan Bars</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setMenuSection("orphanage");
                      handleNavClick("/orphanage");
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all active:scale-[0.98]",
                      menuSection === "orphanage" 
                        ? "bg-primary/12 border border-primary/25" 
                        : "hover:bg-accent/55"
                    )}
                    data-testid="nav-section-orphanage"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      menuSection === "orphanage" ? "bg-primary/12" : "bg-muted/35"
                    )}>
                      <img 
                        src={resolvedTheme === "dark" ? orphanageFullLogoWhite : orphanageFullLogoDark}
                        alt="The Orphanage" 
                        className="h-7 w-auto object-contain"
                      />
                    </div>
                    <span className={cn(
                      "text-lg font-medium",
                      menuSection === "orphanage" ? "text-foreground" : "text-foreground/85"
                    )}>The Orphanage</span>
                  </button>
                </div>

                {/* Ara AI Button */}
                {currentUser && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setAraOpen(true);
                    }}
                    className="mt-4 w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-gradient-to-r from-purple-500/18 to-pink-500/16 border border-purple-400/35 transition-all active:scale-[0.98] hover:from-purple-500/24 hover:to-pink-500/20"
                    data-testid="nav-section-ara"
                  >
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-purple-500 dark:text-purple-300" />
                    </div>
                    <span className="text-lg font-medium text-foreground">Ara</span>
                  </button>
                )}
              </motion.div>

              {/* Drop a Bar Button - Fixed at bottom */}
              {currentUser && (
                <div className="px-6 pb-8 pt-4">
                  <button
                    onClick={() => handleNavClick("/post")}
                    className="w-full p-4 rounded-2xl bg-primary/14 hover:bg-primary/22 border border-primary/28 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    data-testid="nav-item-drop-bar-main"
                  >
                    <Plus className="w-6 h-6 text-primary" strokeWidth={2} />
                    <span 
                      className="text-lg text-foreground font-semibold"
                      style={{ fontFamily: 'var(--font-logo)' }}
                    >Drop a Bar</span>
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
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-40"
              onClick={() => setSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-24 left-3 right-3 z-50 bg-card/40 backdrop-blur-3xl rounded-[20px] border border-border shadow-[0_8px_32px_rgba(0,0,0,0.2)] p-4"
            >
              <SearchBar className="w-full" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Nav - Fixed floating glass pill */}
      <div className="md:hidden fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-[999] px-3 pointer-events-none">
        <div className="relative mx-auto max-w-md pointer-events-auto">
          <div className="relative floating-bar rounded-[28px] shadow-[0_18px_36px_rgba(15,23,42,0.18),0_2px_8px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_36px_rgba(0,0,0,0.45),0_2px_8px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-around h-[72px] px-1">
              <button
                onClick={() => setSearchOpen(true)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl transition-all duration-200",
                  "text-foreground/50 active:scale-90 active:bg-secondary/80"
                )}
                data-testid="button-search"
              >
                <Search className="w-[22px] h-[22px]" strokeWidth={1.8} />
                <span className="text-[10px] font-medium opacity-80">Search</span>
              </button>

              <button
                onClick={() => setLocation("/")}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl transition-all duration-200 active:scale-90",
                  location === "/" 
                    ? "text-primary"
                    : "text-foreground/75 active:bg-secondary/80"
                )}
                data-testid="nav-feed"
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  location === "/" && "bg-primary/12"
                )}>
                  <Home className="w-[22px] h-[22px]" strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-medium opacity-80">Feed</span>
              </button>

              <div className="relative mx-1">
                <motion.button
                  onClick={handleCenterClick}
                  className={cn(
                    "w-14 h-14 rounded-full",
                    "bg-primary/15",
                    "backdrop-blur-xl",
                    "flex items-center justify-center",
                    "border border-primary/25",
                    "shadow-[0_10px_22px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] dark:shadow-[0_10px_22px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]",
                    isOpen && "bg-primary/22 border-primary/35"
                  )}
                  whileTap={{ scale: 0.92 }}
                  data-testid="button-menu"
                >
                  <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isOpen ? (
                      <X className="w-6 h-6 text-foreground" strokeWidth={2} />
                    ) : (
                      <Grid3X3 className="w-6 h-6 text-foreground" strokeWidth={1.8} />
                    )}
                  </motion.div>
                </motion.button>
                {!isOpen && (unreadCount > 0 || pendingFriendRequests > 0) && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border border-background/80" />
                )}
              </div>

              <button
                onClick={() => setLocation("/saved")}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl transition-all duration-200 active:scale-90",
                  location === "/saved" 
                    ? "text-primary"
                    : "text-foreground/75 active:bg-secondary/80"
                )}
                data-testid="nav-saved"
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  location === "/saved" && "bg-primary/12"
                )}>
                  <Bookmark className="w-[22px] h-[22px]" strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-medium opacity-80">Saved</span>
              </button>

              <button
                onClick={() => setLocation("/profile")}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl transition-all duration-200 active:scale-90",
                  location === "/profile" 
                    ? "text-primary"
                    : "text-foreground/75 active:bg-secondary/80"
                )}
                data-testid="nav-profile"
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  location === "/profile" && "bg-primary/12"
                )}>
                  <User className="w-[22px] h-[22px]" strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-medium opacity-80">Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      
      <AIAssistant open={araOpen} onOpenChange={setAraOpen} hideFloatingButton />
    </>
  );
}
