import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Circle, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBars } from "@/context/BarContext";

type OnlineStatusType = "online" | "offline" | "busy";

export function OnlineStatusIndicator() {
  const { currentUser } = useBars();
  const queryClient = useQueryClient();
  const manualStatusRef = useRef<OnlineStatusType | null>(null);

  const { data: onlineCount = 0 } = useQuery({
    queryKey: ['onlineCount'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/online/count', { credentials: 'include' });
        if (!res.ok) return 0;
        const data = await res.json();
        return data.count || 0;
      } catch {
        return 0;
      }
    },
    refetchInterval: 30000,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const statusMutation = useMutation({
    mutationFn: async (status: OnlineStatusType) => {
      const res = await fetch('/api/online/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['onlineCount'] });
    },
  });

  const setManualStatus = (status: OnlineStatusType) => {
    manualStatusRef.current = status;
    statusMutation.mutate(status);
  };

  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.onlineStatus !== 'online' && currentUser.onlineStatus !== 'busy' && !manualStatusRef.current) {
      statusMutation.mutate('online');
    }

    const sendHeartbeat = () => {
      fetch('/api/online/heartbeat', {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
    };

    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);

    const handleVisibility = () => {
      if (document.hidden) {
        return;
      } else {
        sendHeartbeat();
      }
    };

    const handleBeforeUnload = () => {
      manualStatusRef.current = null;
      const blob = new Blob([JSON.stringify({ status: 'offline' })], { type: 'application/json' });
      navigator.sendBeacon('/api/online/status', blob);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'online': return <Circle className="h-2 w-2 fill-green-500 text-green-500" />;
      case 'busy': return <Minus className="h-2 w-2 text-amber-500" />;
      default: return <Circle className="h-2 w-2 fill-gray-400 text-gray-400" />;
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        <span>{onlineCount} online</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" data-testid="button-online-status">
          <div className="relative">
            <Users className="h-3.5 w-3.5" />
            <div className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ${getStatusColor(currentUser.onlineStatus)} border border-background`} />
          </div>
          <span>{onlineCount} online</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => setManualStatus('online')}
          className="gap-2"
          data-testid="status-online"
        >
          <Circle className="h-2 w-2 fill-green-500 text-green-500" />
          Online
          {currentUser.onlineStatus === 'online' && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setManualStatus('busy')}
          className="gap-2"
          data-testid="status-busy"
        >
          <Minus className="h-2 w-2 text-amber-500" />
          Busy
          {currentUser.onlineStatus === 'busy' && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setManualStatus('offline')}
          className="gap-2"
          data-testid="status-offline"
        >
          <Circle className="h-2 w-2 fill-gray-400 text-gray-400" />
          Appear Offline
          {currentUser.onlineStatus === 'offline' && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
