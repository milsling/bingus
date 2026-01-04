import React, { createContext, useContext, ReactNode } from "react";
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
    isOriginal?: boolean;
  }) => Promise<void>;
  currentUser: User | null;
  isLoadingUser: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, email: string, code: string) => Promise<void>;
  sendVerificationCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const BarContext = createContext<BarContextType | undefined>(undefined);

export function BarProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

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
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      api.login(username, password),
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
      queryClient.setQueryData(['currentUser'], null);
      queryClient.invalidateQueries({ queryKey: ['bars'] });
    },
  });

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
      isOriginal?: boolean;
    }) => api.createBar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bars'] });
    },
  });

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
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
    isOriginal?: boolean;
  }) => {
    await createBarMutation.mutateAsync(newBarData);
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
