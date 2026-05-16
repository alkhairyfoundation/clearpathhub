import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type AnyClient = SupabaseClient<any, 'public', any>;

function getUrl() { return process.env.NEXT_PUBLIC_SUPABASE_URL || ''; }
function getKey() { return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; }

const STORAGE_KEY = 'sb-auth-token';

function getStorage() {
  return {
    getItem: (key: string): string | null => {
      if (typeof window === 'undefined') return null;
      try { return localStorage.getItem(key); }
      catch { return null; }
    },
    setItem: (key: string, value: string): void => {
      if (typeof window === 'undefined') return;
      try { localStorage.setItem(key, value); }
      catch { /* quota exceeded */ }
    },
    removeItem: (key: string): void => {
      if (typeof window === 'undefined') return;
      try { localStorage.removeItem(key); }
      catch { /* ignore */ }
    },
  };
}

function createClientInstance(): AnyClient {
  const url = getUrl();
  const key = getKey();
  if (!url || !key) {
    if (typeof window === 'undefined') return null as unknown as AnyClient;
    throw new Error('Supabase URL and Key required');
  }
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: STORAGE_KEY,
      storage: getStorage(),
    },
  }) as unknown as AnyClient;
}

function getClient(): AnyClient {
  if (typeof window === 'undefined') {
    return createClientInstance();
  }
  // Clean up old storage key if present
  try {
    if (localStorage.getItem('supabase.auth.token')) {
      localStorage.removeItem('supabase.auth.token');
    }
  } catch { /* ignore */ }
  if (!(window as any).__supabaseClient) {
    (window as any).__supabaseClient = createClientInstance();
  }
  return (window as any).__supabaseClient;
}

export const supabase: AnyClient = new Proxy({} as any, {
  get(_, prop: string) {
    const c = getClient();
    if (!c) {
      return (...args: unknown[]) => { throw new Error(`supabase.${prop}() not available during SSR`); };
    }
    const val = (c as unknown as Record<string, unknown>)[prop];
    return typeof val === 'function' ? val.bind(c) : val;
  },
});

export function clearSupabaseCache() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.clear();
    delete (window as any).__supabaseClient;
  } catch (e) {
    console.error('Error clearing supabase cache:', e);
  }
}

export function getFreshClient(): AnyClient {
  delete (window as any).__supabaseClient;
  return createClientInstance();
}

export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  DOCUMENTS: 'documents',
  VIDEOS: 'videos',
  HOMEWORK: 'homework',
  ID_CARDS: 'id-cards',
  LESSONS: 'lessons',
} as const;

export async function uploadFile(
  bucket: string,
  file: File,
  folder: string = ''
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const fileName = `${folder}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    return { url: publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}

export async function deleteFile(
  bucket: string,
  filePath: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

export function getStorageUrl(bucket: string, filePath: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}