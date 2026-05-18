'use client';

import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";
import { createContext, useEffect, useState, ReactNode, useCallback, useContext } from 'react';
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from '@/types';

interface AuthContextType {
  session: any; // NextAuth session type
  user: any;
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; profile: Profile | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [profile, setProfileState] = useState<Profile | null>(() => {
    if (typeof window !== 'undefined') {
      const savedRole = window.localStorage.getItem('user-role');
      if (savedRole) {
        return { role: savedRole } as Profile;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // On mount, recover Supabase session from localStorage so client queries
  // (profiles, etc.) have proper auth and pass RLS.
  useEffect(() => {
    supabase.auth.getSession().catch(() => {});
  }, []);

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
    } else if (status === 'unauthenticated') {
      setProfileState(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('user-role');
      }
      setLoading(false);
    } else if (status === 'authenticated') {
      if (session?.user && (session.user as any).id) {
        // Keep loading true until profile fetch completes so child pages
        // never see a null profile before the fetch finishes.
        fetchProfile((session.user as any).id).finally(() => {
          setLoading(false);
        });
      } else {
        setProfileState(null);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('user-role');
        }
        setLoading(false);
      }
    }
  }, [status, session]);

  async function fetchProfile(userId: string, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // On first load, Supabase session may not be recovered from localStorage
        // yet. Call getSession() to trigger recovery before querying profiles.
        await supabase.auth.getSession();
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (data) {
          setProfileState(data);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('user-role', data.role);
          }
          return;
        }
        // If error or no data, retry after a delay (session might still be
        // recovering via autoRefreshToken)
        if (error) console.warn(`Profile fetch attempt ${attempt + 1} failed:`, error.message);
      } catch (error) {
        console.warn(`Profile fetch attempt ${attempt + 1} error:`, error);
      }
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    // All retries exhausted — profile will remain null. Auth is still valid
    // via NextAuth; individual pages can choose to show fallback UI.
    console.warn('Profile fetch failed after all retries');
    // If it failed but we have a cached role, keep it to prevent abrupt logouts
    if (typeof window !== 'undefined' && window.localStorage.getItem('user-role')) {
      return;
    }
    setProfileState(null);
  }

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const result = await nextAuthSignIn("credentials", {
        redirect: false,
        email,
        password
      });
      if (result && result.error) {
        return { error: new Error(result.error), profile: null };
      }

      // After NextAuth succeeds, sign in to Supabase directly to authenticate
      // the browser's supabase client for all subsequent DB queries
      const { error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (supabaseError) {
        console.warn('Supabase client auth failed:', supabaseError.message);
      }

      // Fetch and return profile for immediate role-based redirect
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          return { error: null, profile };
        }
      }

      return { error: null, profile: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("An error occurred"), profile: null };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('user-role');
    }
    await nextAuthSignOut({ redirect: false });
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error refreshing session:", error);
      return false;
    }
  }, []);

  const clearSession = useCallback(() => {
    setProfileState(null);
  }, []);

  const isAuthenticated = !!session && !!profile;
  const user = session?.user || null;

  return (
    <AuthContext.Provider value={{ 
      session,
      user,
      profile,
      setProfile: setProfileState,
      loading,
      isAuthenticated,
      signIn,
      signOut,
      refreshSession,
      clearSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth must be used within an AuthProvider');
  return c;
}