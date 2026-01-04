import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronUp, 
  Home, 
  Plus, 
  User, 
  MessageCircle, 
  Users, 
  Bookmark, 
  Shield,
  LogIn,
  PenLine,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";
import { useUnreadMessagesCount, usePendingFriendRequestsCount } from "@/components/UnreadMessagesBadge";

interface RadialMenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path?: string;
  action?: () => void;
  badge?: number;
  badgeColor?: string;
  isCenter?: boolean;
}

interface RadialMenuProps {
  onNewMessage?: () => void;
}

export function RadialMenu({ onNewMessage }: RadialMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [location, setLocation] = useLocation();
  const { currentUser } = useBars();
  const unreadCount = useUnreadMessagesCount();
  const pendingFriendRequests = usePendingFriendRequestsCount();
  const isOnMessagesPage = location.startsWith("/messages");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getMenuItems = (): RadialMenuItem[] => {
    if (!currentUser) {
      return [
        { icon: Home, label: "Feed", path: "/" },
        { icon: LogIn, label: "Login", path: "/auth" },
      ];
    }

    const centerAction: RadialMenuItem = isOnMessagesPage && onNewMessage
      ? { icon: PenLine, label: "New Message", action: onNewMessage, isCenter: true }
      : { icon: Plus, label: "Drop Bar", path: "/post", isCenter: true };

    const baseItems: RadialMenuItem[] = [
      { icon: Home, label: "Feed", path: "/" },
      { icon: MessageCircle, label: "Messages", path: "/messages", badge: unreadCount, badgeColor: "bg-primary" },
      centerAction,
      { icon: Users, label: "Friends", path: "/friends", badge: pendingFriendRequests, badgeColor: "bg-destructive" },
      { icon: Bookmark, label: "Saved", path: "/saved" },
    ];

    if (currentUser.isAdmin) {
      baseItems.push({ icon: Shield, label: "Admin", path: "/admin" });
      baseItems.push({ icon: User, label: "Profile", path: "/profile" });
    } else {
      baseItems.push({ icon: User, label: "Profile", path: "/profile" });
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  const handleItemClick = (item: RadialMenuItem) => {
    setIsOpen(false);
    if (item.action) {
      setTimeout(() => item.action!(), 150);
    } else if (item.path) {
      setTimeout(() => setLocation(item.path!), 150);
    }
  };

  const radius = 130;

  const getItemPosition = (index: number, total: number) => {
    const angleSpread = 160;
    const startAngle = 180 + (180 - angleSpread) / 2;
    const angleStep = angleSpread / (total - 1 || 1);
    const angle = total === 1 ? 270 : startAngle + angleStep * index;
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * radius,
      y: Math.sin(rad) * radius,
    };
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="relative flex items-end justify-center pb-4" style={{ height: radius + 80 }}>
          <AnimatePresence>
            {isOpen && menuItems.map((item, index) => {
              const pos = getItemPosition(index, menuItems.length);
              const isHovered = hoveredIndex === index;
              const isActive = item.path && location === item.path;
              const isCenter = item.isCenter;

              return (
                <motion.button
                  key={item.path || item.label}
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    x: pos.x, 
                    y: pos.y 
                  }}
                  exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 25,
                    delay: index * 0.03 
                  }}
                  onClick={() => handleItemClick(item)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onTouchStart={() => setHoveredIndex(index)}
                  onTouchEnd={() => setHoveredIndex(null)}
                  className={cn(
                    "absolute bottom-8 pointer-events-auto",
                    "flex flex-col items-center gap-1"
                  )}
                  data-testid={`radial-item-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <div className={cn(
                    "rounded-full flex items-center justify-center",
                    "border-2 shadow-lg transition-all duration-150",
                    isCenter ? "w-16 h-16" : "w-14 h-14",
                    isCenter 
                      ? "bg-primary/20 border-primary shadow-primary/30"
                      : isActive
                        ? "bg-primary border-primary shadow-primary/30"
                        : isHovered
                          ? "bg-primary/20 border-primary shadow-primary/30"
                          : "bg-card/95 border-primary/50 shadow-primary/20",
                    isHovered && "scale-110"
                  )}>
                    <div className="relative">
                      <item.icon className={cn(
                        "transition-all duration-150",
                        isCenter ? "w-7 h-7" : "w-6 h-6",
                        isActive ? "text-primary-foreground" : isCenter || isHovered ? "text-primary" : "text-foreground"
                      )} />
                      {item.badge && item.badge > 0 && (
                        <span className={cn(
                          "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse",
                          item.badgeColor || "bg-primary"
                        )} />
                      )}
                    </div>
                  </div>
                  {isHovered && (
                    <motion.span 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-2 py-0.5 bg-card/95 border border-primary/50 rounded text-[10px] font-logo text-primary whitespace-nowrap shadow-lg"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>

          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "relative pointer-events-auto",
              "w-16 h-16 rounded-full",
              "bg-gradient-to-br from-primary to-primary/80",
              "flex items-center justify-center",
              "shadow-xl shadow-primary/40",
              "transition-all duration-200",
              isOpen && "from-destructive to-destructive/80 shadow-destructive/40"
            )}
            whileTap={{ scale: 0.9 }}
            data-testid="button-radial-menu"
          >
            {isOpen ? (
              <X className="h-7 w-7 text-primary-foreground" />
            ) : (
              <ChevronUp className="h-8 w-8 text-primary-foreground" />
            )}
            {!isOpen && (unreadCount > 0 || pendingFriendRequests > 0) && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-destructive border-2 border-background animate-pulse" />
            )}
          </motion.button>
        </div>
      </div>
    </>
  );
}
