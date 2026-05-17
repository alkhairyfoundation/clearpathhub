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
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set loading based on session status
    if (status === 'loading') {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (session?.user && (session.user as any).id) {
      fetchProfile((session.user as any).id);
    } else {
      setProfileState(null);
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    // If session is loaded (not loading) but no user, ensure loading is false
    if (status === 'authenticated' && !session?.user) {
      setLoading(false);
    }
  }, [status, session]);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setProfileState(data);
      } else {
        setProfileState(null);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfileState(null);
    }
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
      return { error: null, profile: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("An error occurred"), profile: null };
    }
  }, []);

  const signOut = useCallback(async () => {
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