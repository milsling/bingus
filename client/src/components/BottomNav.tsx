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
              className="fixed bottom-24 left-3 right-3 z-50 glass-panel overflow-hidden"
            >
              <div className="flex">
                <div className="flex flex-col w-[130px] shrink-0 border-r border-white/[0.08]">
                  <button
                    onClick={() => {
                      setMenuSection("orphanbars");
                      handleNavClick("/");
                    }}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center px-3 py-4 transition-all active:scale-95",
                      menuSection === "orphanbars" 
                        ? "bg-primary/20 border-l-2 border-l-primary" 
                        : "hover:bg-white/[0.05]"
                    )}
                    data-testid="nav-section-orphanbars"
                  >
                    <img 
                      src={orphanBarsMenuLogo} 
                      alt="Orphan Bars" 
                      className={cn(
                        "h-9 w-auto transition-all mb-1 brightness-0 invert",
                        menuSection === "orphanbars" ? "opacity-100" : "opacity-50"
                      )}
                    />
                    <span 
                      className={cn(
                        "text-xs font-medium transition-colors",
                        menuSection === "orphanbars" ? "text-white" : "text-white/50"
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
                      "flex-1 flex flex-col items-center justify-center px-3 py-4 transition-all active:scale-95 border-t border-white/[0.05]",
                      menuSection === "orphanage" 
                        ? "bg-primary/20 border-l-2 border-l-primary" 
                        : "hover:bg-white/[0.05]"
                    )}
                    data-testid="nav-section-orphanage"
                  >
                    <img 
                      src={orphanageFullLogoWhite} 
                      alt="The Orphanage" 
                      className={cn(
                        "h-14 w-auto object-contain transition-all",
                        menuSection !== "orphanage" && "opacity-50"
                      )}
                    />
                  </button>
                  
                  {currentUser && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setOrphieOpen(true);
                      }}
                      className="flex-1 flex flex-col items-center justify-center px-3 py-4 transition-all active:scale-95 bg-gradient-to-br from-purple-500/20 to-purple-600/10 hover:from-purple-500/30 hover:to-purple-600/20 border-t border-white/[0.05]"
                      data-testid="nav-section-orphie"
                    >
                      <Sparkles className="h-6 w-6 text-purple-300 mb-1" />
                      <span className="text-xs font-medium text-purple-200">Orphie AI</span>
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
                            "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all active:scale-95",
                            isActive 
                              ? "bg-white/[0.08] border border-white/[0.1]" 
                              : "hover:bg-white/[0.05]"
                          )}
                          data-testid={`nav-item-${item.label.toLowerCase().replace(' ', '-')}`}
                        >
                          <div className={cn(
                            "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            isActive 
                              ? "bg-primary/20 border border-primary/40" 
                              : "bg-white/[0.05]"
                          )}>
                            {item.icon && (
                              <item.icon className={cn(
                                "w-5 h-5",
                                isActive ? "text-primary" : "text-white/70"
                              )} />
                            )}
                            {item.badge && item.badge > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_3px_rgba(168,85,247,0.7)] animate-pulse" />
                            )}
                          </div>
                          <span className={cn(
                            "text-[11px] font-medium",
                            isActive ? "text-white" : "text-white/50"
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
                      className="m-3 mt-0 p-4 rounded-xl bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 transition-all active:scale-[0.98] flex flex-col items-center justify-center shadow-lg shadow-primary/30"
                      data-testid="nav-item-drop-bar-main"
                    >
                      <span 
                        className="text-lg text-white font-medium"
                        style={{ fontFamily: 'var(--font-logo)' }}
                      >Drop a Bar</span>
                      <Plus className="w-5 h-5 text-white/80 mt-1" />
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
              className="fixed bottom-24 left-3 right-3 z-50 glass-panel p-4"
            >
              <SearchBar className="w-full" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Nav - Premium Glass Style */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] p-4 pb-safe">
        <div className="relative">
          {/* Glow effect behind nav */}
          <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 via-transparent to-transparent blur-xl rounded-full" />
          
          <div className="relative bg-white/[0.03] backdrop-blur-2xl rounded-full border border-white/[0.08] shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between h-16 px-2">
              <button
                onClick={() => setSearchOpen(true)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-full transition-all flex-1",
                  "text-white/40 hover:text-white/90 hover:bg-white/[0.08]"
                )}
                data-testid="button-search"
              >
                <Search className="w-5 h-5" />
                <span className="text-[9px] font-medium tracking-wide">Search</span>
              </button>

              <button
                onClick={() => setLocation("/")}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-full transition-all flex-1",
                  location === "/" 
                    ? "text-white bg-white/[0.12]" 
                    : "text-white/40 hover:text-white/90 hover:bg-white/[0.08]"
                )}
                data-testid="nav-feed"
              >
                <Home className="w-5 h-5" />
                <span className="text-[9px] font-medium tracking-wide">Feed</span>
              </button>

              <div className="relative -mt-6 mx-2">
                <motion.button
                  onClick={handleCenterClick}
                  className={cn(
                    "w-16 h-16 rounded-full",
                    "bg-gradient-to-br from-purple-500 via-primary to-purple-600",
                    "flex items-center justify-center",
                    "shadow-xl shadow-purple-500/40",
                    "border-2 border-white/30",
                    "ring-4 ring-purple-500/20",
                    isOpen && "from-white/30 via-white/20 to-white/10 shadow-white/30 ring-white/10"
                  )}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  data-testid="button-menu"
                >
                  {isOpen ? (
                    <X className="w-7 h-7 text-white drop-shadow-lg" />
                  ) : (
                    <Grid3X3 className="w-7 h-7 text-white drop-shadow-lg" />
                  )}
                </motion.button>
                {!isOpen && (unreadCount > 0 || pendingFriendRequests > 0) && (
                  <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 border-2 border-white/50 shadow-[0_0_12px_4px_rgba(239,68,68,0.6)] animate-pulse" />
                )}
              </div>

              <button
                onClick={() => setLocation("/saved")}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-full transition-all flex-1",
                  location === "/saved" 
                    ? "text-white bg-white/[0.12]" 
                    : "text-white/40 hover:text-white/90 hover:bg-white/[0.08]"
                )}
                data-testid="nav-saved"
              >
                <Bookmark className="w-5 h-5" />
                <span className="text-[9px] font-medium tracking-wide">Saved</span>
              </button>

              <button
                onClick={() => setLocation("/profile")}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-full transition-all flex-1",
                  location === "/profile" 
                    ? "text-white bg-white/[0.12]" 
                    : "text-white/40 hover:text-white/90 hover:bg-white/[0.08]"
                )}
                data-testid="nav-profile"
              >
                <User className="w-5 h-5" />
                <span className="text-[9px] font-medium tracking-wide">Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      
      <AIAssistant open={orphieOpen} onOpenChange={setOrphieOpen} hideFloatingButton />
    </>
  );
}
