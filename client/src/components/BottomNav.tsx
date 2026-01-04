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
  PenLine,
  Flame,
  TrendingUp,
  Grid3X3,
  X,
  Search
} from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";
import { useUnreadMessagesCount, usePendingFriendRequestsCount } from "@/components/UnreadMessagesBadge";

interface BottomNavProps {
  onNewMessage?: () => void;
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
}

export function BottomNav({ onNewMessage, activeFilter = "featured", onFilterChange }: BottomNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { currentUser } = useBars();
  const unreadCount = useUnreadMessagesCount();
  const pendingFriendRequests = usePendingFriendRequestsCount();
  const isOnMessagesPage = location.startsWith("/messages");

  
  const getNavItems = () => {
    if (!currentUser) {
      return [
        { icon: Home, label: "Feed", path: "/" },
        { icon: LogIn, label: "Login", path: "/auth" },
      ];
    }

    const items = [
      { icon: Home, label: "Feed", path: "/" },
      { icon: Plus, label: "Drop Bar", path: "/post" },
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
    if (isOnMessagesPage && onNewMessage) {
      onNewMessage();
    } else {
      setIsOpen(!isOpen);
    }
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
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-border rounded-2xl p-6 shadow-2xl"
            >
              <div className="grid grid-cols-3 gap-4">
                {navItems.map((item, index) => {
                  const isActive = item.path && location === item.path;
                  return (
                    <motion.button
                      key={item.path}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleNavClick(item.path)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl transition-all",
                        "hover:bg-muted active:scale-95",
                        isActive && "bg-primary/10"
                      )}
                      data-testid={`nav-item-${item.label.toLowerCase().replace(' ', '-')}`}
                    >
                      <div className={cn(
                        "relative w-14 h-14 rounded-full flex items-center justify-center",
                        "border-2 transition-colors",
                        isActive 
                          ? "bg-primary border-primary" 
                          : "bg-muted/50 border-border hover:border-primary/50"
                      )}>
                        <item.icon className={cn(
                          "w-6 h-6",
                          isActive ? "text-primary-foreground" : "text-foreground"
                        )} />
                        {item.badge && item.badge > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </div>
                      <span className={cn(
                        "text-xs font-medium",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}>
                        {item.label}
                      </span>
                    </motion.button>
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

      <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div className="bg-background/95 backdrop-blur-lg border-t border-border">
          <div className="flex items-center justify-between px-2 h-16">
            <button
              onClick={() => setSearchOpen(true)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors flex-1",
                "text-muted-foreground hover:text-foreground"
              )}
              data-testid="button-search"
            >
              <Search className="w-5 h-5" />
              <span className="text-[10px] font-medium">Search</span>
            </button>

            <button
              onClick={() => onFilterChange?.("featured")}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors flex-1",
                activeFilter === "featured" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="filter-featured"
            >
              <Flame className="w-5 h-5" />
              <span className="text-[10px] font-medium">Featured</span>
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
                ) : isOnMessagesPage ? (
                  <PenLine className="w-7 h-7 text-primary-foreground" />
                ) : (
                  <Grid3X3 className="w-7 h-7 text-primary-foreground" />
                )}
              </motion.button>
              {!isOpen && (unreadCount > 0 || pendingFriendRequests > 0) && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-destructive border-2 border-background animate-pulse" />
              )}
            </div>

            <button
              onClick={() => onFilterChange?.("top")}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors flex-1",
                activeFilter === "top" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="filter-top"
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-[10px] font-medium">Top</span>
            </button>

            <button
              onClick={() => onFilterChange?.("categories")}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors flex-1",
                activeFilter === "categories" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="filter-categories"
            >
              <Bookmark className="w-5 h-5" />
              <span className="text-[10px] font-medium">Saved</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
