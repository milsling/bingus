import { useState } from "react";
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
  Heart
} from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";
import { useUnreadMessagesCount, usePendingFriendRequestsCount } from "@/components/UnreadMessagesBadge";

interface BottomNavProps {
  onNewMessage?: () => void;
}

export function BottomNav({ onNewMessage }: BottomNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { currentUser } = useBars();
  const unreadCount = useUnreadMessagesCount();
  const pendingFriendRequests = usePendingFriendRequestsCount();

  
  const getNavItems = () => {
    if (!currentUser) {
      return [
        { icon: Home, label: "Feed", path: "/" },
        { icon: Heart, label: "Orphanage", path: "/orphanage" },
        { icon: LogIn, label: "Login", path: "/auth" },
      ];
    }

    const items = [
      { icon: Home, label: "Feed", path: "/" },
      { icon: Heart, label: "Orphanage", path: "/orphanage" },
      { icon: MessageCircle, label: "Messages", path: "/messages", badge: unreadCount },
      { icon: Users, label: "Friends", path: "/friends", badge: pendingFriendRequests },
      { icon: Bookmark, label: "Saved", path: "/saved" },
      { icon: User, label: "Profile", path: "/profile" },
    ];

    if (currentUser.isAdmin) {
      items.push({ icon: Shield, label: "Admin", path: "/admin" });
    }

    return items;
  };

  const navItems = getNavItems();

  const handleNavClick = (path: string) => {
    setIsOpen(false);
    setLocation(path);
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
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-border rounded-2xl p-6 shadow-2xl"
            >
              {currentUser && (
                <button
                  onClick={() => handleNavClick("/post")}
                  className="w-full mb-4 p-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all active:scale-[0.98]"
                  data-testid="nav-item-drop-bar-main"
                >
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <Plus className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div className="text-left">
                      <span className="text-lg font-bold text-primary-foreground block">Drop Bar</span>
                      <span className="text-xs text-primary-foreground/70">Share your bars with the world</span>
                    </div>
                  </div>
                </button>
              )}
              
              <div className="grid grid-cols-3 gap-3">
                {navItems.map((item) => {
                  const isActive = item.path && location === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavClick(item.path)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                        "hover:bg-muted active:scale-95",
                        isActive && "bg-primary/10"
                      )}
                      data-testid={`nav-item-${item.label.toLowerCase().replace(' ', '-')}`}
                    >
                      <div className={cn(
                        "relative w-12 h-12 rounded-full flex items-center justify-center",
                        "border-2 transition-colors",
                        isActive 
                          ? "bg-primary border-primary" 
                          : "bg-muted/50 border-border hover:border-primary/50"
                      )}>
                        <item.icon className={cn(
                          "w-5 h-5",
                          isActive ? "text-primary-foreground" : "text-foreground"
                        )} />
                        {item.badge && item.badge > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
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
          <div className="flex items-center justify-around h-16 px-4">
            <button
              onClick={() => setSearchOpen(true)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 rounded-lg transition-colors min-w-[60px]",
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
                "flex flex-col items-center gap-1 py-2 rounded-lg transition-colors min-w-[60px]",
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
                <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-destructive border-2 border-background animate-pulse" />
              )}
            </div>

            <button
              onClick={() => setLocation("/saved")}
              className={cn(
                "flex flex-col items-center gap-1 py-2 rounded-lg transition-colors min-w-[60px]",
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
                "flex flex-col items-center gap-1 py-2 rounded-lg transition-colors min-w-[60px]",
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
    </>
  );
}
