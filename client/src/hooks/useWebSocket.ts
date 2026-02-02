import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBars } from "@/context/BarContext";
import { playNotificationSound } from "@/lib/notificationSounds";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onNewMessage?: (message: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

const PING_INTERVAL = 8000;      // Faster heartbeat (8s)
const PONG_TIMEOUT = 3000;       // Detect issues faster (3s)
const RECONNECT_BASE_DELAY = 500; // Faster first reconnect (0.5s)
const RECONNECT_MAX_DELAY = 10000; // Cap reconnect delay (10s)

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { currentUser } = useBars();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const pongTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionHealth, setConnectionHealth] = useState<'healthy' | 'degraded' | 'disconnected'>('disconnected');

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) return;
    
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptRef.current),
      RECONNECT_MAX_DELAY
    );
    reconnectAttemptRef.current++;
    
    reconnectTimeoutRef.current = window.setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connect();
    }, delay);
  }, []);

  const startHeartbeat = useCallback(() => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    
    pingIntervalRef.current = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
        setConnectionHealth('degraded');
        
        pongTimeoutRef.current = window.setTimeout(() => {
          setConnectionHealth('disconnected');
          setIsConnected(false);
          wsRef.current?.close();
        }, PONG_TIMEOUT);
      }
    }, PING_INTERVAL);
  }, []);

  const connect = useCallback(() => {
    if (!currentUser) return;
    if (typeof window === "undefined" || !window.WebSocket) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    clearTimers();

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setIsConnected(true);
      setConnectionHealth('healthy');
      startHeartbeat();
      options.onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        
        if (data.type === "pong") {
          if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current);
            pongTimeoutRef.current = null;
          }
          setConnectionHealth('healthy');
          return;
        }
        
        if (data.type === "batchMessages") {
          data.messages.forEach((msg: WebSocketMessage) => {
            handleMessage(msg);
          });
        } else {
          handleMessage(data);
        }
        
        options.onMessage?.(data);
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };

    ws.onclose = () => {
      clearTimers();
      setIsConnected(false);
      setConnectionHealth('disconnected');
      options.onDisconnect?.();
      
      if (currentUser) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      setConnectionHealth('disconnected');
    };

    wsRef.current = ws;
  }, [currentUser, options, clearTimers, startHeartbeat, scheduleReconnect]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case "newMessage":
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["messages"] });
        if (message.message) {
          options.onNewMessage?.(message.message);
          // Play message sound based on user preference
          const messageSound = currentUser?.messageSound || "ding";
          if (messageSound !== "none") {
            playNotificationSound(messageSound as any);
          }
        }
        break;
      case "typing":
        break;
      default:
        break;
    }
  }, [queryClient, options]);

  const disconnect = useCallback(() => {
    clearTimers();
    reconnectAttemptRef.current = 0;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionHealth('disconnected');
  }, [clearTimers]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendTyping = useCallback((receiverId: string) => {
    send({ type: "typing", receiverId });
  }, [send]);

  const forceReconnect = useCallback(() => {
    disconnect();
    reconnectAttemptRef.current = 0;
    setTimeout(() => connect(), 100);
  }, [disconnect, connect]);

  useEffect(() => {
    if (currentUser) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [currentUser, connect, disconnect]);

  return {
    isConnected,
    connectionHealth,
    send,
    sendTyping,
    disconnect,
    forceReconnect,
  };
}
