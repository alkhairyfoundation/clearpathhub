'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface ChildWithProfile {
  id: string;
  profile_id: string;
  admission_number: string;
  class_id?: string;
  parent_id?: string;
  profile?: { first_name: string; last_name: string; email?: string; phone?: string };
  class?: { name: string; level?: number };
  [key: string]: any;
}

export function useChildren() {
  const { profile } = useAuth();
  const [children, setChildren] = useState<ChildWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'parent') return;
    fetchChildren();
  }, [profile]);

  async function fetchChildren() {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('students')
        .select('*, profile:profiles!profile_id(first_name, last_name, email, phone), class:classes!class_id(name)')
        .eq('parent_id', profile?.id)
        .order('admission_number');
      if (err) throw new Error(err.message);
      setChildren(data || []);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  return { children, loading, error, refetch: fetchChildren };
}
