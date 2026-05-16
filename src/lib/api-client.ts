import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

let authRef: { refreshSession: () => Promise<boolean>; clearSession: () => void } | null = null;
let routerRef: { push: (url: string) => void } | null = null;

export function setGlobalAuthHandler(
  auth: { refreshSession: () => Promise<boolean>; clearSession: () => void },
  router: { push: (url: string) => void }
) {
  authRef = auth;
  routerRef = router;
}

export function clearGlobalAuthHandler() {
  authRef = null;
  routerRef = null;
}

export function isAuthError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { status?: number; code?: string; message?: string };
  return (
    err.status === 401 ||
    err.code === '401' ||
    err.status === 403 ||
    err.code === 'PGRST301' ||
    (typeof err.message === 'string' && (
      err.message.includes('Unauthorized') ||
      err.message.includes('unauthorized') ||
      err.message.includes('session') ||
      err.message.includes('token')
    ))
  );
}

export async function handleAuthError(error: unknown): Promise<boolean> {
  if (!isAuthError(error)) return false;
  
  console.warn('Auth error detected, attempting session refresh...');
  
  if (authRef) {
    const refreshed = await authRef.refreshSession();
    if (refreshed) {
      console.log('Session refreshed successfully');
      return true;
    }
  }
  
  console.warn('Session refresh failed, clearing session and redirecting to login');
  
  if (authRef) {
    authRef.clearSession();
  }
  
  if (routerRef) {
    routerRef.push('/login?error=session_expired');
  }
  
  return false;
}

export class AuthError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  if (response.status === 401) {
    if (authRef) {
      const refreshed = await authRef.refreshSession();
      if (refreshed) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        });
      }
      authRef.clearSession();
      if (routerRef) {
        routerRef.push('/login?error=session_expired');
      }
    }
  }

  return response;
}