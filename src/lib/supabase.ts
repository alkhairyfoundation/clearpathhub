import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type AnyClient = SupabaseClient<any, 'public', any>;

function getUrl() { return process.env.NEXT_PUBLIC_SUPABASE_URL || ''; }
function getKey() { return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; }

function getStorage() {
  return {
    getItem: (key: string): string | null => {
      if (typeof window === 'undefined') return null;
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('Storage getItem error:', e);
        return null;
      }
    },
    setItem: (key: string, value: string): void => {
      if (typeof window === 'undefined') return;
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('Storage setItem error:', e);
      }
    },
    removeItem: (key: string): void => {
      if (typeof window === 'undefined') return;
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('Storage removeItem error:', e);
      }
    },
  };
}

let _client: AnyClient | null = null;

export function clearSupabaseCache() {
  if (typeof window === 'undefined') return;
  try {
    const storage = getStorage();
    storage.removeItem('supabase.auth.token');
    sessionStorage.clear();
    _client = null;
  } catch (e) {
    console.error('Error clearing supabase cache:', e);
  }
}

function createClientInstance(): AnyClient {
  const url = getUrl();
  const key = getKey();
  if (!url || !key) {
    if (typeof window === 'undefined') return null as unknown as AnyClient;
    throw new Error('Your project URL and Key are required to create a Supabase client!');
  }
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'supabase.auth.token',
      storage: getStorage(),
    },
  }) as unknown as AnyClient;
}

function getClient(): AnyClient {
  if (!_client) {
    _client = createClientInstance();
  }
  return _client;
}

export function getFreshClient(): AnyClient {
  _client = null;
  return createClientInstance();
}

export const supabase: AnyClient = new Proxy({} as any, {
  get(_, prop: string) {
    const c = getClient();
    if (!c) {
      return (...args: unknown[]) => { throw new Error(`supabase.${prop}() is not available during server-side rendering`); };
    }
    const val = (c as unknown as Record<string, unknown>)[prop];
    return typeof val === 'function' ? val.bind(c) : val;
  },
});

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