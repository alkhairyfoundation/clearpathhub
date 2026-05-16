'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

function isSessionExpired(session: Session | null): boolean {
  if (!session) return true;
  const expiresAt = session.expires_at;
  if (!expiresAt) return false;
  const bufferTime = 60 * 1000;
  return Date.now() > (expiresAt * 1000) - bufferTime;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setProfile(null);
    setLoading(false);
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session refresh error:', error);
        return false;
      }
      
      if (session && !isSessionExpired(session)) {
        setUser(session.user);
        const p = await fetchProfile(session.user.id);
        setProfile(p || fallbackProfile(session.user));
        return true;
      }
      
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        console.error('Token refresh failed:', refreshError);
        clearSession();
        return false;
      }
      
      setUser(refreshData.user);
      const p = await fetchProfile(refreshData.user!.id);
      setProfile(p || fallbackProfile(refreshData.user!));
      return true;
    } catch (error) {
      console.error('Session refresh exception:', error);
      clearSession();
      return false;
    }
  }, [clearSession]);

  useEffect(() => {
    let isMounted = true;
    let initTimedOut = false;

    const safetyTimer = setTimeout(() => {
      if (!isMounted) return;
      initTimedOut = true;
      setLoading(false);
    }, 5000);

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session?.user) {
          if (isSessionExpired(session)) {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshData.session) {
              clearTimeout(safetyTimer);
              if (isMounted && !initTimedOut) setLoading(false);
              return;
            }
            setUser(refreshData.user);
            const p = await fetchProfile(refreshData.user!.id);
            if (isMounted) {
              setProfile(p || fallbackProfile(refreshData.user!));
            }
          } else {
            setUser(session.user);
            const p = await fetchProfile(session.user.id);
            if (isMounted) {
              setProfile(p || fallbackProfile(session.user));
            }
          }
        }
      } catch (error) {
        console.error('Initial session check error:', error);
      }

      clearTimeout(safetyTimer);
      if (isMounted && !initTimedOut) setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      if (event === 'INITIAL_SESSION') return;
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user);
          const p = await fetchProfile(session.user.id);
          if (isMounted) setProfile(p || fallbackProfile(session.user));
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (event === 'USER_UPDATED') {
        if (session?.user) setUser(session.user);
      }
    });

    return () => { isMounted = false; subscription.unsubscribe(); };
  }, [clearSession]);

  async function signIn(email: string, password: string) {
    try {
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
    } catch (err: any) {
      setLoading(false);
      return { error: err?.message ? new Error(err.message) : new Error('Network error during login.') };
    }
  }

  async function signUp(email: string, password: string, role: UserRole, firstName: string, lastName: string) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName, last_name: lastName, role } },
    });
    if (error) return { error };
    return { error: null };
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
    setUser(null);
    setProfile(null);
  }

  const isAuthenticated = !!user && !!profile;

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      setProfile, 
      loading, 
      isAuthenticated,
      signIn, 
      signUp, 
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
