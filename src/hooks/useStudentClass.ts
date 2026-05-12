'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useStudentClass() {
  const { profile } = useAuth();
  const [classId, setClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'student') return;
    fetchClass();
  }, [profile]);

  async function fetchClass() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('students')
        .select('class_id')
        .eq('profile_id', profile?.id)
        .maybeSingle();
      setClassId(data?.class_id || null);
    } catch {
      setClassId(null);
    }
    setLoading(false);
  }

  return { classId, loading };
}
