'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { supabase, clearSupabaseCache } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; user?: User; profile?: Profile }>;
  signUp: (email: string, password: string, role: UserRole, firstName: string, lastName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function fallbackProfile(user: User): Profile {
  const m = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email || '',
    first_name: m.first_name || '',
    last_name: m.last_name || '',
    role: (m.role || 'student') as UserRole,
    created_at: user.created_at,
    updated_at: user.created_at,
  };
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const clearSession = useCallback(() => {
    setUser(null);
    setProfile(null);
    setLoading(false);
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        clearSupabaseCache();
        clearSession();
        return false;
      }
      setUser(refreshData.user);
      const p = await fetchProfile(refreshData.user!.id);
      setProfile(p || fallbackProfile(refreshData.user!));
      return true;
    } catch {
      clearSupabaseCache();
      clearSession();
      return false;
    }
  }, [clearSession]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let mounted = true;

    (async () => {
      try {
        // Check if there's a stored session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          clearSupabaseCache();
        }

        if (session?.user) {
          // Try to refresh if close to expiry
          const expiresAt = session.expires_at;
          const needsRefresh = expiresAt && (Date.now() > (expiresAt * 1000) - 120000);

          if (needsRefresh) {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!mounted) return;
            if (refreshError || !refreshData.session) {
              clearSupabaseCache();
              if (mounted) setLoading(false);
              return;
            }
            setUser(refreshData.user);
            const p = await fetchProfile(refreshData.user!.id);
            if (mounted) setProfile(p || fallbackProfile(refreshData.user!));
          } else {
            setUser(session.user);
            const p = await fetchProfile(session.user.id);
            if (mounted) setProfile(p || fallbackProfile(session.user));
          }
        }
      } catch {
        clearSupabaseCache();
      }
      if (mounted) setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user);
          const p = await fetchProfile(session.user.id);
          if (mounted) setProfile(p || fallbackProfile(session.user));
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (event === 'USER_UPDATED') {
        if (session?.user) setUser(session.user);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [clearSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      clearSupabaseCache();
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setLoading(false);
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        const p = await fetchProfile(data.user.id);
        const profileData = p || fallbackProfile(data.user);
        setProfile(profileData);
        setLoading(false);
        return { error: null, user: data.user, profile: profileData };
      }

      setLoading(false);
      return { error: null };
    } catch (err: unknown) {
      setLoading(false);
      const message = err instanceof Error ? err.message : 'Network error during login.';
      return { error: new Error(message) };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, role: UserRole, firstName: string, lastName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName, last_name: lastName, role } },
    });
    if (error) return { error };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    try {
      clearSupabaseCache();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setProfile(null);
  }, []);

  const isAuthenticated = !!user && !!profile;

  return (
    <AuthContext.Provider value={{ 
      user, profile, setProfile, loading, isAuthenticated,
      signIn, signUp, signOut, refreshSession, clearSession,
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