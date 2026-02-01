import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User as SupabaseUser, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import type { User } from '@shared/schema';

interface AuthState {
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  appUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

type OAuthProvider = 'google' | 'apple' | 'github';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    supabaseUser: null,
    session: null,
    appUser: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const fetchAppUser = useCallback(async (session: Session | null): Promise<User | null> => {
    if (!session?.access_token) return null;
    
    try {
      const response = await fetch('/api/auth/supabase/user', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error fetching app user:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const supabase = await getSupabase();
      if (!supabase) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (mounted && session) {
        const appUser = await fetchAppUser(session);
        setState({
          supabaseUser: session.user,
          session,
          appUser,
          isLoading: false,
          isAuthenticated: !!appUser,
        });
      } else if (mounted) {
        setState(prev => ({ ...prev, isLoading: false }));
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          if (!mounted) return;

          if (event === 'SIGNED_IN' && session) {
            const appUser = await fetchAppUser(session);
            setState({
              supabaseUser: session.user,
              session,
              appUser,
              isLoading: false,
              isAuthenticated: !!appUser,
            });
          } else if (event === 'SIGNED_OUT') {
            setState({
              supabaseUser: null,
              session: null,
              appUser: null,
              isLoading: false,
              isAuthenticated: false,
            });
          } else if (event === 'TOKEN_REFRESHED' && session) {
            setState(prev => ({
              ...prev,
              session,
              supabaseUser: session.user,
            }));
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [fetchAppUser]);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    const supabase = await getSupabase();
    if (!supabase) return { error: 'Authentication service unavailable' };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      return { error: error.message };
    }
    
    return {};
  };

  const signInWithOAuth = async (provider: OAuthProvider): Promise<{ error?: string }> => {
    const supabase = await getSupabase();
    if (!supabase) return { error: 'Authentication service unavailable' };

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) {
      return { error: error.message };
    }
    
    return {};
  };

  const signUp = async (email: string, password: string, username: string): Promise<{ error?: string; needsEmailConfirmation?: boolean }> => {
    const supabase = await getSupabase();
    if (!supabase) return { error: 'Authentication service unavailable' };

    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { username }
      }
    });
    
    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      if (data.session) {
        const response = await fetch('/api/auth/supabase/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ username }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          return { error: errorData.message || 'Failed to create user profile' };
        }
      } else {
        const response = await fetch('/api/auth/supabase/pre-register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email, 
            username,
            supabaseId: data.user.id 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          return { error: errorData.message || 'Failed to create user profile' };
        }
        
        return { needsEmailConfirmation: true };
      }
    }
    
    return {};
  };

  const signOut = async (): Promise<void> => {
    const supabase = await getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const resetPassword = async (email: string): Promise<{ error?: string }> => {
    const supabase = await getSupabase();
    if (!supabase) return { error: 'Authentication service unavailable' };

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      return { error: error.message };
    }
    
    return {};
  };

  const refreshUser = async (): Promise<void> => {
    if (state.session) {
      const appUser = await fetchAppUser(state.session);
      setState(prev => ({ ...prev, appUser, isAuthenticated: !!appUser }));
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signInWithOAuth, signOut, resetPassword, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}
