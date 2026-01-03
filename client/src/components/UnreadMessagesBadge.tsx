import { useQuery } from "@tanstack/react-query";
import { useBars } from "@/context/BarContext";
import { useEffect } from "react";

export function useUnreadMessagesCount() {
  const { currentUser } = useBars();
  
  const { data, refetch } = useQuery({
    queryKey: ['unreadMessages'],
    queryFn: async () => {
      const res = await fetch('/api/messages/unread/count', { credentials: 'include' });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    enabled: !!currentUser,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  useEffect(() => {
    const handleNewMessage = () => {
      refetch();
    };
    window.addEventListener('newMessage', handleNewMessage);
    return () => window.removeEventListener('newMessage', handleNewMessage);
  }, [refetch]);

  return data?.count || 0;
}

interface UnreadMessagesBadgeProps {
  className?: string;
}

export function UnreadMessagesBadge({ className }: UnreadMessagesBadgeProps) {
  const count = useUnreadMessagesCount();

  if (count === 0) return null;

  return (
    <span 
      className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center ${className}`}
      data-testid="badge-unread-messages"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
