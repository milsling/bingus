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
}

interface RadialMenuProps {
  onNewMessage?: () => void;
}

export function RadialMenu({ onNewMessage }: RadialMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
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

    const baseItems: RadialMenuItem[] = [
      { icon: Home, label: "Feed", path: "/" },
      { icon: MessageCircle, label: "Messages", path: "/messages", badge: unreadCount, badgeColor: "bg-primary" },
      { icon: Users, label: "Friends", path: "/friends", badge: pendingFriendRequests, badgeColor: "bg-destructive" },
      { icon: Bookmark, label: "Saved", path: "/saved" },
      { icon: User, label: "Profile", path: "/profile" },
    ];

    if (currentUser.isAdmin) {
      baseItems.push({ icon: Shield, label: "Admin", path: "/admin" });
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

  const totalItems = menuItems.length;
  const radius = 130;
  const startAngle = -90;
  const angleSpread = Math.min(200, totalItems * 32);
  const angleStep = angleSpread / (totalItems - 1 || 1);

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
        <div className="relative h-32 flex items-end justify-center pb-4">
          <AnimatePresence>
            {isOpen && menuItems.map((item, index) => {
              const angle = startAngle - angleSpread / 2 + index * angleStep;
              const radian = (angle * Math.PI) / 180;
              const x = Math.cos(radian) * radius;
              const y = Math.sin(radian) * radius;

              return (
                <motion.button
                  key={item.path || item.label}
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    x: x, 
                    y: y,
                  }}
                  exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    delay: index * 0.03,
                  }}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto",
                    "flex flex-col items-center gap-1",
                    "transition-transform duration-150 ease-out",
                    "hover:scale-110 active:scale-105"
                  )}
                  data-testid={`radial-item-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center",
                    "bg-card border-2 border-primary/50 shadow-lg shadow-primary/20",
                    "transition-all duration-150 ease-out",
                    "hover:scale-125 hover:border-primary hover:bg-primary/20 hover:shadow-xl hover:shadow-primary/40",
                    "active:scale-110 active:bg-primary active:border-primary",
                    item.path && location === item.path && "bg-primary border-primary"
                  )}>
                    <div className="relative">
                      <item.icon className={cn(
                        "h-6 w-6",
                        item.path && location === item.path ? "text-primary-foreground" : "text-foreground"
                      )} />
                      {item.badge && item.badge > 0 && (
                        <span className={cn(
                          "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse",
                          item.badgeColor || "bg-primary"
                        )} />
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-logo text-foreground/90 whitespace-nowrap">
                    {item.label}
                  </span>
                </motion.button>
              );
            })}

            {/* Center action button - Drop Bar or New Message */}
            {isOpen && currentUser && (
              <motion.button
                initial={{ opacity: 0, scale: 0, y: 0 }}
                animate={{ opacity: 1, scale: 1, y: -80 }}
                exit={{ opacity: 0, scale: 0, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.05 }}
                onClick={() => {
                  setIsOpen(false);
                  if (isOnMessagesPage && onNewMessage) {
                    setTimeout(() => onNewMessage(), 150);
                  } else {
                    setTimeout(() => setLocation("/post"), 150);
                  }
                }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-1 transition-transform duration-150 ease-out hover:scale-110 active:scale-105"
                data-testid="radial-item-center-action"
              >
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center",
                  "bg-card border-3 border-primary shadow-xl shadow-primary/30",
                  "transition-all duration-150 ease-out",
                  "hover:scale-115 hover:bg-primary/20 hover:shadow-2xl hover:shadow-primary/50",
                  "active:scale-105 active:bg-primary"
                )}>
                  {isOnMessagesPage && onNewMessage ? (
                    <PenLine className="h-7 w-7 text-foreground" />
                  ) : (
                    <Plus className="h-8 w-8 text-foreground" />
                  )}
                </div>
                <span className="text-[12px] font-logo text-foreground/90 whitespace-nowrap">
                  {isOnMessagesPage && onNewMessage ? "New Message" : "Drop Bar"}
                </span>
              </motion.button>
            )}
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
              isOpen && "rotate-180 from-destructive to-destructive/80 shadow-destructive/40"
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

      {isOpen && <div className="fixed bottom-0 left-0 right-0 h-20 bg-background z-45 pointer-events-none" />}
    </>
  );
}
