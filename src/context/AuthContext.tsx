'use client';

import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";
import { createContext, useEffect, useState, ReactNode, useCallback, useContext } from 'react';
import { db } from "@/lib/db";
import type { Profile } from '@/types';

interface AuthContextType {
  session: any;
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

function getStoredProfile(): Profile | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem('user-profile');
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function storeProfile(profile: Profile | null) {
  if (typeof window === 'undefined') return;
  if (profile) {
    window.localStorage.setItem('user-profile', JSON.stringify(profile));
    window.localStorage.setItem('user-role', profile.role);
  } else {
    window.localStorage.removeItem('user-profile');
    window.localStorage.removeItem('user-role');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [profile, setProfileState] = useState<Profile | null>(getStoredProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
    } else if (status === 'unauthenticated') {
      setProfileState(null);
      storeProfile(null);
      setLoading(false);
    } else if (status === 'authenticated') {
      if (session?.user && (session.user as any).id) {
        fetchProfile((session.user as any).id).finally(() => {
          setLoading(false);
        });
      } else {
        setProfileState(null);
        storeProfile(null);
        setLoading(false);
      }
    }
  }, [status, session]);

  async function fetchProfile(userId: string, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data, error } = await db
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (data) {
          setProfileState(data);
          storeProfile(data);
          return;
        }
        if (error) console.warn(`Profile fetch attempt ${attempt + 1} failed:`, error.message);
      } catch (error) {
        console.warn(`Profile fetch attempt ${attempt + 1} error:`, error);
      }
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    console.warn('Profile fetch failed after all retries');
    const cached = getStoredProfile();
    if (cached) {
      setProfileState(cached);
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
      if (result && (result as any).error) {
        return { error: new Error((result as any).error), profile: null };
      }
      return { error: null, profile: getStoredProfile() };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("An error occurred"), profile: null };
    }
  }, []);

  const signOut = useCallback(async () => {
    storeProfile(null);
    await nextAuthSignOut({ redirect: false });
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const userId = (session?.user as any)?.id;
      if (userId) {
        await fetchProfile(userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error refreshing session:", error);
      return false;
    }
  }, [session]);

  const clearSession = useCallback(() => {
    setProfileState(null);
    storeProfile(null);
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
