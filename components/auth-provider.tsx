'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin';

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

        // Check if user is admin
        const adminCheck = isAdmin(currentUser?.email);
        setIsAdminUser(adminCheck);
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

      // Check if user is admin
      const adminCheck = isAdmin(currentUser?.email);
      setIsAdminUser(adminCheck);

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log('[Auth] Attempting server-side sign in for:', email);

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
        console.error('[Auth] Login API error:', result.error);
        console.error('[Auth] Login API details:', result);
        // 构造详细的错误消息
        const errorMessage = result.error
          ? `${result.error}${result.name ? ` (${result.name})` : ''}${result.status ? ` [Status: ${result.status}]` : ''}`
          : 'Login failed';
        throw new Error(errorMessage);
      }

      console.log('[Auth] Login API successful, received session data');

      // 🔥 手动设置 session 到客户端 Supabase
      if (result.session) {
        console.log('[Auth] Setting session manually from API response');
        const { error: setSessionError } = await supabase.auth.setSession(result.session);

        if (setSessionError) {
          console.error('[Auth] Failed to set session:', setSessionError);
          throw new Error('Failed to set session: ' + setSessionError.message);
        }

        console.log('[Auth] Session set successfully, user:', result.session.user.email);
        setUser(result.session.user);

        // Check if user is admin
        const adminCheck = isAdmin(result.session.user.email);
        setIsAdminUser(adminCheck);
        console.log('[Auth] Admin check:', adminCheck);
      } else {
        // Fallback: try to get session from cookies
        console.log('[Auth] No session in response, trying to fetch from cookies...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          console.log('[Auth] Session retrieved from cookies:', session.user.email);
          setUser(session.user);

          // Check if user is admin
          const adminCheck = isAdmin(session.user.email);
          setIsAdminUser(adminCheck);
          console.log('[Auth] Admin check:', adminCheck);
        } else {
          throw new Error('Session not found after login - neither from API response nor from cookies');
        }
      }
    } catch (error: any) {
      console.error('[Auth] Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAdminUser(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: isAdminUser, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
