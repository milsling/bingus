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

  const radius = 120;
  const innerRadius = 40;

  const getIconPosition = (index: number, total: number) => {
    const spreadAngle = Math.min(180, total * 35);
    const startOffset = (180 - spreadAngle) / 2;
    const itemAngle = total > 1 ? spreadAngle / (total - 1) : 0;
    const midAngle = 180 + startOffset + (index * itemAngle);
    const midRad = (midAngle * Math.PI) / 180;
    const iconRadius = (radius + innerRadius) / 2;
    return {
      x: Math.cos(midRad) * iconRadius,
      y: Math.sin(midRad) * iconRadius,
      angle: midAngle,
    };
  };

  const getSlicePath = (index: number, total: number) => {
    const spreadAngle = Math.min(180, total * 35);
    const startOffset = (180 - spreadAngle) / 2;
    const itemAngle = spreadAngle / total;
    const startAngle = 180 + startOffset + (index * itemAngle);
    const endAngle = startAngle + itemAngle;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = Math.cos(startRad) * radius;
    const y1 = Math.sin(startRad) * radius;
    const x2 = Math.cos(endRad) * radius;
    const y2 = Math.sin(endRad) * radius;
    const x3 = Math.cos(endRad) * innerRadius;
    const y3 = Math.sin(endRad) * innerRadius;
    const x4 = Math.cos(startRad) * innerRadius;
    const y4 = Math.sin(startRad) * innerRadius;
    
    return `M ${x4} ${y4} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4} Z`;
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
        <div className="relative h-48 flex items-end justify-center pb-4">
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute bottom-8 pointer-events-auto"
              >
                <svg 
                  width={radius * 2 + 20} 
                  height={radius + 20} 
                  viewBox={`${-radius - 10} ${-radius - 10} ${radius * 2 + 20} ${radius + 20}`}
                  className="overflow-visible"
                >
                  {menuItems.map((item, index) => {
                    const iconPos = getIconPosition(index, menuItems.length);
                    const isHovered = hoveredIndex === index;
                    const isActive = item.path && location === item.path;
                    const isCenter = item.isCenter;
                    
                    return (
                      <g key={item.path || item.label}>
                        <motion.path
                          d={getSlicePath(index, menuItems.length)}
                          initial={{ opacity: 0 }}
                          animate={{ 
                            opacity: 1,
                            scale: isHovered ? 1.05 : 1,
                          }}
                          className={cn(
                            "cursor-pointer transition-colors duration-150",
                            isCenter 
                              ? "fill-primary/30 stroke-primary stroke-2"
                              : isActive 
                                ? "fill-primary/40 stroke-primary stroke-2" 
                                : isHovered 
                                  ? "fill-primary/20 stroke-primary stroke-2"
                                  : "fill-card/90 stroke-primary/50 stroke-1"
                          )}
                          onClick={() => handleItemClick(item)}
                          onMouseEnter={() => setHoveredIndex(index)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          onTouchStart={() => setHoveredIndex(index)}
                          onTouchEnd={() => setHoveredIndex(null)}
                        />
                        <g 
                          transform={`translate(${iconPos.x}, ${iconPos.y})`}
                          className="pointer-events-none"
                        >
                          <foreignObject 
                            x={-24} 
                            y={-24} 
                            width={48} 
                            height={48}
                            style={{ overflow: 'visible' }}
                          >
                            <div className="flex flex-col items-center justify-center w-full h-full">
                              <div className="relative flex items-center justify-center">
                                <item.icon 
                                  className={cn(
                                    "transition-all duration-150",
                                    isCenter ? "w-7 h-7" : "w-6 h-6",
                                    isActive || isCenter ? "text-primary" : isHovered ? "text-primary" : "text-foreground"
                                  )} 
                                />
                                {item.badge && item.badge > 0 && (
                                  <span className={cn(
                                    "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse",
                                    item.badgeColor || "bg-primary"
                                  )} />
                                )}
                              </div>
                              {isHovered && (
                                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-card/95 border border-primary/50 rounded text-[10px] font-logo text-primary whitespace-nowrap shadow-lg">
                                  {item.label}
                                </span>
                              )}
                            </div>
                          </foreignObject>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              </motion.div>
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
