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
  Sparkles
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
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="flex">
                <div className="flex flex-col w-[140px] shrink-0">
                  <button
                    onClick={() => {
                      setMenuSection("orphanbars");
                      handleNavClick("/");
                    }}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center px-3 py-3 transition-all active:scale-95",
                      menuSection === "orphanbars" ? "bg-primary" : "bg-primary/80"
                    )}
                    data-testid="nav-section-orphanbars"
                  >
                    <img 
                      src={orphanBarsMenuLogo} 
                      alt="Orphan Bars" 
                      className={cn(
                        "h-10 w-auto transition-all mb-1",
                        menuSection === "orphanbars" ? "brightness-0 invert" : "brightness-0 invert opacity-70"
                      )}
                    />
                    <span 
                      className={cn(
                        "text-sm font-medium transition-colors",
                        menuSection === "orphanbars" ? "text-primary-foreground" : "text-primary-foreground/70"
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
                      "flex-1 flex flex-col items-center justify-center px-3 py-3 transition-all active:scale-95",
                      menuSection === "orphanage" ? "bg-primary" : "bg-primary/60"
                    )}
                    data-testid="nav-section-orphanage"
                  >
                    <img 
                      src={orphanageFullLogoWhite} 
                      alt="The Orphanage" 
                      className={cn(
                        "h-16 w-auto object-contain transition-all",
                        menuSection !== "orphanage" && "opacity-70"
                      )}
                    />
                  </button>
                  
                  {currentUser && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setOrphieOpen(true);
                      }}
                      className="flex-1 flex flex-col items-center justify-center px-3 py-3 transition-all active:scale-95 bg-gradient-to-br from-purple-950 to-purple-900 hover:from-purple-900 hover:to-purple-800 border-t border-purple-700/30"
                      data-testid="nav-section-orphie"
                    >
                      <Sparkles className="h-7 w-7 text-white mb-1" />
                      <span className="text-sm font-medium text-white">Orphie AI</span>
                    </button>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col bg-card">
                  <div className="grid grid-cols-2 gap-1 p-3 flex-1">
                    {navItems.map((item) => {
                      const isActive = item.path && location === item.path;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.path)}
                          className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all active:scale-95 hover:bg-muted/50"
                          data-testid={`nav-item-${item.label.toLowerCase().replace(' ', '-')}`}
                        >
                          <div className={cn(
                            "relative w-10 h-10 rounded-full flex items-center justify-center transition-all",
                            isActive ? "bg-primary shadow-md shadow-primary/30" : "hover:bg-muted"
                          )}>
                            {item.icon && (
                              <item.icon className={cn(
                                "w-5 h-5",
                                isActive ? "text-primary-foreground" : "text-foreground"
                              )} />
                            )}
                            {item.badge && item.badge > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_3px_rgba(168,85,247,0.7)] animate-pulse" />
                            )}
                          </div>
                          <span className={cn(
                            "text-[11px] font-medium",
                            isActive ? "text-primary" : "text-muted-foreground"
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
                      className="m-3 mt-0 p-4 rounded-xl bg-primary/90 hover:bg-primary transition-all active:scale-[0.98] flex flex-col items-center justify-center"
                      data-testid="nav-item-drop-bar-main"
                    >
                      <span 
                        className="text-xl text-primary-foreground"
                        style={{ fontFamily: 'var(--font-logo)' }}
                      >Drop a Bar</span>
                      <Plus className="w-5 h-5 text-primary-foreground/80 mt-1" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-border rounded-2xl p-4 shadow-2xl"
            >
              <SearchBar className="w-full" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 z-[100] pb-safe">
        <div className="bg-background backdrop-blur-lg border-t border-border">
          <div className="flex items-center justify-between h-16 px-2">
            <button
              onClick={() => setSearchOpen(true)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 rounded-lg transition-colors flex-1",
                "text-muted-foreground hover:text-foreground"
              )}
              data-testid="button-search"
            >
              <Search className="w-5 h-5" />
              <span className="text-[10px] font-medium">Search</span>
            </button>

            <button
              onClick={() => setLocation("/")}
              className={cn(
                "flex flex-col items-center gap-1 py-2 rounded-lg transition-colors flex-1",
                location === "/" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="nav-feed"
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] font-medium">Feed</span>
            </button>

            <div className="relative -mt-6">
              <motion.button
                onClick={handleCenterClick}
                className={cn(
                  "w-16 h-16 rounded-full",
                  "bg-gradient-to-br from-primary to-primary/80",
                  "flex items-center justify-center",
                  "shadow-xl shadow-primary/40",
                  "border-4 border-background",
                  isOpen && "from-destructive to-destructive/80 shadow-destructive/40"
                )}
                whileTap={{ scale: 0.9 }}
                data-testid="button-menu"
              >
                {isOpen ? (
                  <X className="w-7 h-7 text-primary-foreground" />
                ) : (
                  <Grid3X3 className="w-7 h-7 text-primary-foreground" />
                )}
              </motion.button>
              {!isOpen && (unreadCount > 0 || pendingFriendRequests > 0) && (
                <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-[0_0_8px_3px_rgba(168,85,247,0.7)] animate-pulse" />
              )}
            </div>

            <button
              onClick={() => setLocation("/saved")}
              className={cn(
                "flex flex-col items-center gap-1 py-2 rounded-lg transition-colors flex-1",
                location === "/saved" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="nav-saved"
            >
              <Bookmark className="w-5 h-5" />
              <span className="text-[10px] font-medium">Saved</span>
            </button>

            <button
              onClick={() => setLocation("/profile")}
              className={cn(
                "flex flex-col items-center gap-1 py-2 rounded-lg transition-colors flex-1",
                location === "/profile" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="nav-profile"
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-medium">Profile</span>
            </button>
          </div>
        </div>
      </div>
      
      <AIAssistant open={orphieOpen} onOpenChange={setOrphieOpen} hideFloatingButton />
    </>
  );
}
