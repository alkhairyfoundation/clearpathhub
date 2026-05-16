'use client';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { setGlobalAuthHandler } from '@/lib/api-client';

function AuthHandler({ children }: { children: React.ReactNode }) {
  const { refreshSession, clearSession } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setGlobalAuthHandler({ refreshSession, clearSession }, router);
  }, [refreshSession, clearSession, router]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthHandler>{children}</AuthHandler>
    </AuthProvider>
  );
}
