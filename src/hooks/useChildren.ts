'use client';

import { useEffect, useState } from 'react';
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
  const { session } = useAuth();
  const [children, setChildren] = useState<ChildWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.user) return;
    fetchChildren();
  }, [session]);

  async function fetchChildren() {
    setLoading(true);
    setError('');
    try {
      // We'll need to create an API route to fetch children data
      const response = await fetch('/api/parent/children');
      if (!response.ok) throw new Error('Failed to fetch children');
      
      const data = await response.json();
      setChildren(data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  return { children, loading, error, refetch: fetchChildren };
}