'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function PortalPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    
    console.log('Portal check:', { user: !!user, profile: !!profile, loading });

    if (loading) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    if (!profile) {
      router.push('/login?error=profile_not_found');
      return;
    }

    if (!profile.role) {
      router.push('/login?error=no_role');
      return;
    }

    const roleRoutes: Record<string, string> = {
      admin: '/admin',
      teacher: '/teacher',
      student: '/student',
      parent: '/parent',
      accountant: '/accountant',
    };

    const targetRoute = roleRoutes[profile.role];
    if (targetRoute) {
      router.push(targetRoute);
    } else {
      router.push('/login?error=invalid_role');
    }
  }, [user, profile, loading, ready, router]);

  if (loading || !ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cp-gold mb-4"></div>
        <p className="text-slate-600">Loading portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cp-gold mx-auto mb-4"></div>
        <p className="text-slate-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}