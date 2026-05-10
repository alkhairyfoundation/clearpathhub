'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function PortalPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Immediate redirect if we have user and profile
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
        router.replace(route);
      }
    } else if (user && !profile) {
      // User exists but no profile - redirect to login with error
      router.replace('/login?error=no_profile');
    } else if (!user) {
      // No user - go to login
      router.replace('/login');
    }
  }, [user, profile, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cp-gold mx-auto mb-4"></div>
        <p className="text-slate-600">Redirecting...</p>
      </div>
    </div>
  );
}