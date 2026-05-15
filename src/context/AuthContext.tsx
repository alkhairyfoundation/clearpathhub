'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; user?: User; profile?: Profile }>;
  signUp: (email: string, password: string, role: UserRole, firstName: string, lastName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
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
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data || null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let initTimedOut = false;

    // Safety timeout: never block the UI for more than 5 seconds
    const safetyTimer = setTimeout(() => {
      if (!isMounted) return;
      initTimedOut = true;
      setLoading(false);
    }, 5000);

    (async () => {
      // Restore session from localStorage
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        const p = await fetchProfile(session.user.id);
        if (isMounted) {
          setProfile(p || fallbackProfile(session.user));
        }
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
        setUser(null); setProfile(null); setLoading(false);
      } else if (event === 'USER_UPDATED') {
        if (session?.user) setUser(session.user);
      }
    });

    return () => { isMounted = false; subscription.unsubscribe(); };
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };
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
    await supabase.auth.signOut();
    setUser(null); setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth must be used within an AuthProvider');
  return c;
}
