'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface SessionInfo {
  authenticated: boolean;
  isAdmin: boolean;
  user: { id: string; email: string | null } | null;
}

/**
 * Ask the server whether the current session is authenticated and is the admin.
 *
 * The admin email is never shipped to the browser; the server compares it and
 * only returns a boolean. Fails closed (isAdmin: false) on any error and never
 * throws.
 */
async function fetchSessionInfo(): Promise<SessionInfo> {
  try {
    // Send the access token as a Bearer credential as well: cookie auth can be
    // missing (expired, blocked, or never written), and without a fallback the
    // endpoint reports isAdmin:false and the admin layout bounces to "/".
    const headers: Record<string, string> = {};
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch {
      // Ignore and rely on cookies.
    }

    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      return { authenticated: false, isAdmin: false, user: null };
    }

    const data = await response.json();
    return {
      authenticated: Boolean(data?.authenticated),
      isAdmin: Boolean(data?.isAdmin),
      user: data?.user ?? null,
    };
  } catch (error) {
    console.error('Session info fetch error:', error);
    return { authenticated: false, isAdmin: false, user: null };
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        // Admin status is decided server-side so the email never reaches the bundle.
        const sessionInfo = await fetchSessionInfo();
        setIsAdminUser(sessionInfo.isAdmin);
      } catch (error) {
        console.error('Session check error:', error);
        setUser(null);
        setIsAdminUser(false);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // Refresh the admin flag from the server endpoint. Avoid awaiting inside
      // this callback (Supabase warns it can deadlock), so fire-and-forget.
      // Loading is cleared only after the flag arrives: clearing it earlier let
      // the admin layout see loading=false + isAdmin=false for one tick and
      // redirect the owner back to the public site right after signing in.
      void fetchSessionInfo().then((sessionInfo) => {
        setIsAdminUser(sessionInfo.isAdmin);
        setLoading(false);
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Call API route instead of direct Supabase call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        // 构造详细的错误消息
        const errorMessage = result.error
          ? `${result.error}${result.name ? ` (${result.name})` : ''}${result.status ? ` [Status: ${result.status}]` : ''}`
          : 'Login failed';
        throw new Error(errorMessage);
      }

      // 🔥 手动设置 session 到客户端 Supabase
      if (result.session) {
        const { error: setSessionError } = await supabase.auth.setSession(result.session);

        if (setSessionError) {
          throw new Error('Failed to set session: ' + setSessionError.message);
        }

        setUser(result.session.user);

        // Derive the admin flag from the server (never from a public env var).
        const sessionInfo = await fetchSessionInfo();
        setIsAdminUser(sessionInfo.isAdmin);
      } else {
        // Fallback: try to get session from cookies
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);

          // Derive the admin flag from the server (never from a public env var).
          const sessionInfo = await fetchSessionInfo();
          setIsAdminUser(sessionInfo.isAdmin);
        } else {
          throw new Error('Session not found after login - neither from API response nor from cookies');
        }
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // Clear the HttpOnly session cookies used by the server guards first.
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (error) {
        console.error('Logout endpoint error:', error);
      }
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setIsAdminUser(false);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: isAdminUser, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
