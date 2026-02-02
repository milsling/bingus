import { useState, useEffect } from "react";
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
import { useUnreadMessagesCount, usePendingFriendRequestsCount } from "@/components/UnreadMessagesBadge";
import AIAssistant from "@/components/AIAssistant";
import orphanBarsMenuLogo from "@/assets/orphan-bars-menu-logo.png";
import orphanageFullLogoWhite from "@/assets/orphanage-full-logo-white.png";
import orphanageFullLogoDark from "@/assets/orphanage-full-logo-dark.png";

interface BottomNavProps {
  onNewMessage?: () => void;
}

export function BottomNav({ onNewMessage }: BottomNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [orphieOpen, setOrphieOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const [menuSection, setMenuSection] = useState<"orphanbars" | "orphanage">(
    location.startsWith("/orphanage") ? "orphanage" : "orphanbars"
  );
  const { currentUser } = useBars();
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

  const handleNavClick = (path: string) => {
    setIsOpen(false);
    
    // Handle hash links for scrolling to sections
    if (path.includes('#')) {
      const [basePath, hash] = path.split('#');
      setLocation(basePath);
      // Wait for navigation then scroll to element
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
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
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Menu Popup - Glass Style */}
      <AnimatePresence>
        {isOpen && (
          <div className="md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="fixed bottom-24 left-3 right-3 z-50 bg-white/[0.08] backdrop-blur-3xl rounded-[24px] border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden"
            >
              <div className="flex">
                <div className="flex flex-col w-[120px] shrink-0 border-r border-white/[0.1]">
                  <button
                    onClick={() => {
                      setMenuSection("orphanbars");
                      handleNavClick("/");
                    }}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center px-3 py-4 transition-all active:scale-95",
                      menuSection === "orphanbars" 
                        ? "bg-white/[0.10]" 
                        : "hover:bg-white/[0.06]"
                    )}
                    data-testid="nav-section-orphanbars"
                  >
                    <img 
                      src={orphanBarsMenuLogo} 
                      alt="Orphan Bars" 
                      className={cn(
                        "h-8 w-auto transition-all mb-1 brightness-0 invert",
                        menuSection === "orphanbars" ? "opacity-100" : "opacity-60"
                      )}
                    />
                    <span 
                      className={cn(
                        "text-[10px] font-medium transition-colors",
                        menuSection === "orphanbars" ? "text-white" : "text-white/60"
                      )} 
                      style={{ fontFamily: 'var(--font-logo)' }}
                    >ORPHAN BARS</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setMenuSection("orphanage");
                      handleNavClick("/orphanage");
                    }}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center px-3 py-4 transition-all active:scale-95 border-t border-white/[0.08]",
                      menuSection === "orphanage" 
                        ? "bg-white/[0.10]" 
                        : "hover:bg-white/[0.06]"
                    )}
                    data-testid="nav-section-orphanage"
                  >
                    <img 
                      src={orphanageFullLogoWhite} 
                      alt="The Orphanage" 
                      className={cn(
                        "h-12 w-auto object-contain transition-all",
                        menuSection !== "orphanage" && "opacity-60"
                      )}
                    />
                  </button>
                  
                  {currentUser && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setOrphieOpen(true);
                      }}
                      className="flex-1 flex flex-col items-center justify-center px-3 py-4 transition-all active:scale-95 bg-white/[0.05] hover:bg-white/[0.08] border-t border-white/[0.08]"
                      data-testid="nav-section-orphie"
                    >
                      <Sparkles className="h-5 w-5 text-purple-300 mb-1" />
                      <span className="text-[10px] font-medium text-white/80">Orphie AI</span>
                    </button>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-2 p-3 flex-1">
                    {navItems.map((item) => {
                      const isActive = item.path && location === item.path;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.path)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95",
                            isActive 
                              ? "bg-white/[0.10]" 
                              : "hover:bg-white/[0.05]"
                          )}
                          data-testid={`nav-item-${item.label.toLowerCase().replace(' ', '-')}`}
                        >
                          <div className={cn(
                            "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            isActive 
                              ? "bg-white/[0.12]" 
                              : "bg-white/[0.05]"
                          )}>
                            {item.icon && (
                              <item.icon className={cn(
                                "w-5 h-5",
                                isActive ? "text-white" : "text-white/70"
                              )} strokeWidth={1.8} />
                            )}
                            {item.badge && item.badge > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500" />
                            )}
                          </div>
                          <span className={cn(
                            "text-[11px] font-medium",
                            isActive ? "text-white" : "text-white/60"
                          )}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {currentUser && (
                    <button
                      onClick={() => handleNavClick("/post")}
                      className="m-3 mt-0 p-3.5 rounded-2xl bg-white/[0.10] hover:bg-white/[0.15] border border-white/[0.12] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      data-testid="nav-item-drop-bar-main"
                    >
                      <Plus className="w-5 h-5 text-white" strokeWidth={2} />
                      <span 
                        className="text-base text-white font-medium"
                        style={{ fontFamily: 'var(--font-logo)' }}
                      >Drop a Bar</span>
                    </button>
                  )}
                </div>
              </div>
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
              className="fixed bottom-24 left-3 right-3 z-50 bg-white/[0.08] backdrop-blur-3xl rounded-[20px] border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.2)] p-4"
            >
              <SearchBar className="w-full" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Nav - Super Transparent Apple Style */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-3 pb-2 safe-area-inset-bottom">
        <div className="relative">
          <div className="relative bg-white/[0.08] backdrop-blur-3xl rounded-[28px] border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-around h-[72px] px-1">
              <button
                onClick={() => setSearchOpen(true)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl transition-all duration-200",
                  "text-white/50 active:scale-90 active:bg-white/[0.08]"
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
                    ? "text-white" 
                    : "text-white/50 active:bg-white/[0.08]"
                )}
                data-testid="nav-feed"
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  location === "/" && "bg-white/[0.12]"
                )}>
                  <Home className="w-[22px] h-[22px]" strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-medium opacity-80">Feed</span>
              </button>

              <div className="relative mx-1">
                <motion.button
                  onClick={handleCenterClick}
                  className={cn(
                    "w-14 h-14 rounded-2xl",
                    "bg-white/[0.12]",
                    "backdrop-blur-xl",
                    "flex items-center justify-center",
                    "border border-white/[0.15]",
                    "shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]",
                    isOpen && "bg-white/[0.18] border-white/[0.22]"
                  )}
                  whileTap={{ scale: 0.92 }}
                  data-testid="button-menu"
                >
                  <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isOpen ? (
                      <X className="w-6 h-6 text-white" strokeWidth={2} />
                    ) : (
                      <Grid3X3 className="w-6 h-6 text-white" strokeWidth={1.8} />
                    )}
                  </motion.div>
                </motion.button>
                {!isOpen && (unreadCount > 0 || pendingFriendRequests > 0) && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border border-black/30" />
                )}
              </div>

              <button
                onClick={() => setLocation("/saved")}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl transition-all duration-200 active:scale-90",
                  location === "/saved" 
                    ? "text-white" 
                    : "text-white/50 active:bg-white/[0.08]"
                )}
                data-testid="nav-saved"
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  location === "/saved" && "bg-white/[0.12]"
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
                    ? "text-white" 
                    : "text-white/50 active:bg-white/[0.08]"
                )}
                data-testid="nav-profile"
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  location === "/profile" && "bg-white/[0.12]"
                )}>
                  <User className="w-[22px] h-[22px]" strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-medium opacity-80">Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      
      <AIAssistant open={orphieOpen} onOpenChange={setOrphieOpen} hideFloatingButton />
    </>
  );
}
