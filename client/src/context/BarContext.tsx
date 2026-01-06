import React, { createContext, useContext, ReactNode, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User, BarWithUser } from "@shared/schema";

interface BarContextType {
  bars: BarWithUser[];
  isLoadingBars: boolean;
  refetchBars: () => Promise<void>;
  addBar: (bar: {
    content: string;
    explanation?: string;
    category: string;
    tags: string[];
    feedbackWanted?: boolean;
    permissionStatus?: string;
    barType?: string;
    fullRapLink?: string;
    beatLink?: string;
    isRecorded?: boolean;
    isOriginal?: boolean;
  }) => Promise<BarWithUser>;
  currentUser: User | null;
  isLoadingUser: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (username: string, password: string, email: string, code: string) => Promise<void>;
  sendVerificationCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const BarContext = createContext<BarContextType | undefined>(undefined);

export function BarProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Fetch current user
  const { data: currentUser = null, isLoading: isLoadingUser } = useQuery<User | null>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await api.getCurrentUser();
      } catch (error) {
        return null;
      }
    },
  });

  // Fetch all bars
  const { data: bars = [], isLoading: isLoadingBars, refetch: refetchBarsQuery } = useQuery<BarWithUser[]>({
    queryKey: ['bars'],
    queryFn: () => api.getBars(),
  });

  const refetchBars = async () => {
    await refetchBarsQuery();
  };

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: ({ username, password, rememberMe }: { username: string; password: string; rememberMe?: boolean }) =>
      api.login(username, password, rememberMe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['bars'] });
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: ({ username, password, email, code }: { username: string; password: string; email: string; code: string }) =>
      api.signup(username, password, email, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['bars'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      // Clear all cached data to ensure clean logout state
      queryClient.clear();
      queryClient.setQueryData(['currentUser'], null);
    },
  });

  // Global WebSocket connection for real-time messages
  const connectWebSocket = useCallback(() => {
    if (!currentUser) return;
    if (typeof window === "undefined" || !window.WebSocket) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      console.log("Global WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "newMessage" || data.type === "batchMessages") {
          // Invalidate message-related queries
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.invalidateQueries({ queryKey: ["messages"] });
          queryClient.invalidateQueries({ queryKey: ["unreadMessages"] });
          
          // Dispatch global event for components listening
          window.dispatchEvent(new CustomEvent("newMessage", { detail: data }));
        }
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };

    ws.onclose = () => {
      console.log("Global WebSocket disconnected");
      // Reconnect after 3 seconds if user is still logged in
      if (currentUser) {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectWebSocket();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current = ws;
  }, [currentUser, queryClient]);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Connect/disconnect WebSocket based on user login state
  useEffect(() => {
    if (currentUser) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [currentUser, connectWebSocket, disconnectWebSocket]);

  // Create bar mutation
  const createBarMutation = useMutation({
    mutationFn: (data: {
      content: string;
      explanation?: string;
      category: string;
      tags: string[];
      feedbackWanted?: boolean;
      permissionStatus?: string;
      barType?: string;
      fullRapLink?: string;
      beatLink?: string;
      isRecorded?: boolean;
      isOriginal?: boolean;
    }) => api.createBar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bars'] });
    },
  });

  const login = async (username: string, password: string, rememberMe?: boolean) => {
    await loginMutation.mutateAsync({ username, password, rememberMe });
  };

  const signup = async (username: string, password: string, email: string, code: string) => {
    await signupMutation.mutateAsync({ username, password, email, code });
  };

  const sendVerificationCode = async (email: string) => {
    await api.sendVerificationCode(email);
  };

  const verifyCode = async (email: string, code: string): Promise<boolean> => {
    const result = await api.verifyCode(email, code);
    return result.verified;
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const addBar = async (newBarData: {
    content: string;
    explanation?: string;
    category: string;
    tags: string[];
    feedbackWanted?: boolean;
    permissionStatus?: string;
    barType?: string;
    fullRapLink?: string;
    beatLink?: string;
    isRecorded?: boolean;
    isOriginal?: boolean;
  }) => {
    const result = await createBarMutation.mutateAsync(newBarData);
    return result;
  };

  return (
    <BarContext.Provider
      value={{
        bars,
        isLoadingBars,
        refetchBars,
        addBar,
        currentUser,
        isLoadingUser,
        login,
        signup,
        sendVerificationCode,
        verifyCode,
        logout,
      }}
    >
      {children}
    </BarContext.Provider>
  );
}

export function useBars() {
  const context = useContext(BarContext);
  if (context === undefined) {
    throw new Error("useBars must be used within a BarProvider");
  }
  return context;
}
