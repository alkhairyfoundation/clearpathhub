'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export function useStudentClass() {
  const { session } = useAuth();
  const [classId, setClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    fetchClass();
  }, [session]);

  async function fetchClass() {
    setLoading(true);
    try {
      // We'll need to create a function to fetch student class from Neon
      // For now, we'll call an API route
      const response = await fetch('/api/student/class');
      if (!response.ok) throw new Error('Failed to fetch class');
      
      const data = await response.json();
      setClassId(data.classId);
    } catch {
      setClassId(null);
    }
    setLoading(false);
  }

  return { classId, loading };
}