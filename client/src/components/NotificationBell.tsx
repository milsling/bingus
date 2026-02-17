import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";
import { useBars } from "@/context/BarContext";
import { playNotificationSound } from "@/lib/notificationSounds";

interface NotificationActor {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface Notification {
  id: string;
  userId: string;
  type: string;
  actorId: string | null;
  barId: string | null;
  message: string;
  read: boolean;
  createdAt: string;
  actor?: NotificationActor;
}

interface NotificationBellProps {
  compact?: boolean;
}

export function NotificationBell({ compact = false }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { currentUser } = useBars();
  const prevUnreadCountRef = useRef<number>(0);

  const handleNotificationClick = (notification: Notification) => {
    setOpen(false);
    
    // Navigate based on notification type
    if (notification.barId) {
      // Navigate to the bar
      setLocation(`/bar/${notification.barId}`);
    } else if (notification.actor?.username) {
      // Navigate to actor's profile (for follows, friend requests, etc.)
      setLocation(`/u/${notification.actor.username}`);
    }
  };

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const data = await api.getUnreadNotificationCount();
      return data.count;
    },
    refetchInterval: 30000,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Play notification sound when new notifications arrive
  const initializedRef = useRef(false);
  useEffect(() => {
    // Skip initial load to avoid sound on page open
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevUnreadCountRef.current = unreadCount;
      return;
    }
    // Play sound when count increases (including 0→1)
    if (unreadCount > prevUnreadCountRef.current) {
      const notificationSound = currentUser?.notificationSound || "chime";
      if (notificationSound !== "none") {
        playNotificationSound(notificationSound as any);
      }
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount, currentUser?.notificationSound]);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => api.getNotifications(20),
    enabled: open,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const markAllRead = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  useEffect(() => {
    if (open && unreadCount > 0) {
      const timer = setTimeout(() => {
        markAllRead.mutate();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [open, unreadCount]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", compact && "h-8 w-8")}
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-bold">Notifications</h3>
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50",
                    !notification.read && "bg-primary/5"
                  )}
                  data-testid={`notification-${notification.id}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={notification.actor?.avatarUrl || undefined} />
                    <AvatarFallback>
                      {notification.actor?.username?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
