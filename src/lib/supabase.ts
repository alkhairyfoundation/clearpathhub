import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, 'public', any>;

function getUrl() { return process.env.NEXT_PUBLIC_SUPABASE_URL || ''; }
function getKey() { return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; }

let _client: SupabaseClient | null = null;

export function clearSupabaseCache() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();
  } catch (e) {
    console.error('Error clearing supabase cache:', e);
  }
}

export function getFreshClient(): AnyClient {
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
      storage: {
        getItem: (key: string) => {
          if (typeof window === 'undefined') return null;
          return localStorage.getItem(key);
        },
        setItem: (key: string, value: string) => {
          if (typeof window !== 'undefined') {
            localStorage.setItem(key, value);
          }
        },
        removeItem: (key: string) => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem(key);
          }
        },
      },
    },
  }) as unknown as AnyClient;
}

function getClient(): AnyClient {
  if (!_client) {
    const url = getUrl();
    const key = getKey();
    if (!url || !key) {
      if (typeof window === 'undefined') return null as unknown as AnyClient;
      throw new Error('Your project URL and Key are required to create a Supabase client!');
    }
    _client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'supabase.auth.token',
        storage: {
          getItem: (key: string) => {
            if (typeof window === 'undefined') return null;
            return localStorage.getItem(key);
          },
          setItem: (key: string, value: string) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem(key, value);
            }
          },
          removeItem: (key: string) => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem(key);
            }
          },
        },
      },
    }) as unknown as SupabaseClient;
  }
  return _client as unknown as AnyClient;
}

export function createSupabaseBrowserClient(): AnyClient {
  return createClient(getUrl(), getKey(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }) as unknown as AnyClient;
}

export const supabase: AnyClient = new Proxy({} as any, {
  get(_, prop) {
    const c = getClient();
    if (!c) {
      return (...args: any[]) => { throw new Error(`supabase.${String(prop)}() is not available during server-side rendering`); };
    }
    const val = (c as any)[prop];
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
