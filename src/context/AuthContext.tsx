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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function resolveProfile(currentUser: User): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (data && !error) return data;

    const fb = fallbackProfile(currentUser);

    (async () => {
      await supabase.from('profiles').insert({
        id: fb.id, email: fb.email,
        first_name: fb.first_name, last_name: fb.last_name, role: fb.role,
      });
    })();

    return fb;
  }

  useEffect(() => {
    let isMounted = true;

    // Restore session from localStorage on mount
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (session?.user) {
        setUser(session.user);
        const p = await resolveProfile(session.user);
        if (isMounted) setProfile(p);
      }
      if (isMounted) setLoading(false);
    })();

    // Listen for auth changes after mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'INITIAL_SESSION') return; // handled by getSession above
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user);
          const p = await resolveProfile(session.user);
          if (isMounted) setProfile(p);
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
        const profileData = await resolveProfile(data.user);
        setProfile(profileData);
        return { error: null, user: data.user, profile: profileData };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err?.message ? new Error(err.message) : new Error('Network error during login.') };
    }
  }

  async function signUp(email: string, password: string, role: UserRole, firstName: string, lastName: string) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName, last_name: lastName, role } },
    });
    if (error) return { error };
    if (data.user && data.session) {
      const p = await resolveProfile(data.user);
      setProfile(p);
    }
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
