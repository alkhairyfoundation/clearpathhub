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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (isMounted) {
            setProfile(data);
            setLoading(false);
          }
        } else {
          if (isMounted) setLoading(false);
        }
      } catch (err) {
        console.error('Session error:', err);
        if (isMounted) setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user);
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          setProfile(data);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setLoading(false);
        return { error };
      }
      
      if (data.user) {
        setUser(data.user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();
        
        setProfile(profileData);
        return { error: null, user: data.user, profile: profileData ?? undefined };
      }
      
      return { error: null };
    } catch (err: any) {
      setLoading(false);
      return { error: err?.message ? new Error(err.message) : new Error('Network error during login. Check your connection and try again.') };
    }
  }

  async function signUp(email: string, password: string, role: UserRole, firstName: string, lastName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) return { error };

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
      });

      if (profileError) return { error: profileError };
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}