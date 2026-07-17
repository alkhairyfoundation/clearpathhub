'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function PortalPage() {
  const { user, profile, loading, refreshSession } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading || redirecting) return;

    if (user && profile && profile.role) {
      const routes: Record<string, string> = {
        admin: '/admin',
        teacher: '/teacher',
        student: '/student',
        parent: '/parent',
        accountant: '/accountant',
      };
      
      const route = routes[profile.role];
      if (route) {
        setRedirecting(true);
        router.replace(route);
      }
    } else if (user && !profile) {
      setRedirecting(true);
      router.replace('/login?error=no_profile');
    } else if (!user && !loading) {
      setRedirecting(true);
      router.replace('/login');
    }
  }, [user, profile, loading, router, redirecting]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cp-gold mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cp-gold mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400 dark:text-slate-400">Redirecting...</p>
      </div>
    </div>
  );
}