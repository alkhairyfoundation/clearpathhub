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

function buildProfileInsert(user: User) {
  const metadata = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email || '',
    first_name: metadata.first_name || '',
    last_name: metadata.last_name || '',
    role: (metadata.role || 'student') as UserRole,
  };
}

async function fetchOrCreateProfile(user: User): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (data) return data;

  const insertData = buildProfileInsert(user);
  const { error: insertError } = await supabase.from('profiles').insert(insertData);

  if (insertError) {
    console.error('Failed to create profile:', insertError);
    return null;
  }

  const { data: newProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  return newProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        if (session?.user) {
          setUser(session.user);
          const p = await fetchOrCreateProfile(session.user);
          if (isMounted) { setProfile(p); setLoading(false); }
        } else {
          if (isMounted) { setUser(null); setProfile(null); setLoading(false); }
        }
      } catch (err) {
        console.error('Session error:', err);
        if (isMounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user);
          const p = await fetchOrCreateProfile(session.user);
          if (isMounted) { setProfile(p); setLoading(false); }
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
        const profileData = await fetchOrCreateProfile(data.user);
        setProfile(profileData);
        return { error: null, user: data.user, profile: profileData ?? undefined };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err?.message ? new Error(err.message) : new Error('Network error during login. Check your connection and try again.') };
    }
  }

  async function signUp(email: string, password: string, role: UserRole, firstName: string, lastName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, role },
      },
    });
    if (error) return { error };
    if (data.user) {
      if (data.session) {
        const profileData = await fetchOrCreateProfile(data.user);
        if (!profileData) return { error: new Error('Failed to create profile') };
      }
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
