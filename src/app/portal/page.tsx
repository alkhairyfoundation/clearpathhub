'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function PortalPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && !profile) {
        setTimedOut(true);
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [loading, profile]);

  useEffect(() => {
    if (!loading && !profile) {
      router.push('/login');
    } else if (profile) {
      switch (profile.role) {
        case 'admin':
          router.push('/admin');
          break;
        case 'teacher':
          router.push('/teacher');
          break;
        case 'student':
          router.push('/student');
          break;
        case 'parent':
          router.push('/parent');
          break;
        case 'accountant':
          router.push('/accountant');
          break;
        default:
          router.push('/login');
      }
    }
  }, [profile, loading, router]);

  if (timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L4.07 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Connection Issue</h2>
          <p className="text-slate-500 mb-6">Unable to connect to the server. Please check your internet connection and try again.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setTimedOut(false); window.location.reload(); }} className="btn-primary px-6 py-2.5">Retry</button>
            <Link href="/login" className="btn-outline px-6 py-2.5">Go to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return null;
}