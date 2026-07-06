import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type AnyClient = SupabaseClient<any, 'public', any>;

function getUrl() { return process.env.NEXT_PUBLIC_SUPABASE_URL || ''; }
function getKey() { return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; }

function createClientInstance(): AnyClient {
  const url = getUrl();
  const key = getKey();
  
  // Return a dummy client if env vars are missing to prevent crashes
  if (!url || !key) {
    console.warn('Supabase credentials not configured - using fallback client');
    return createClient('https://placeholder.supabase.co', 'placeholder', {
      auth: { persistSession: false }
    }) as unknown as AnyClient;
  }
  
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }) as unknown as AnyClient;
}

function getClient(): AnyClient {
  if (typeof window === 'undefined') {
    return createClientInstance();
  }
  if (!(window as any).__supabase) {
    (window as any).__supabase = createClientInstance();
  }
  return (window as any).__supabase;
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
    sessionStorage.clear();
  } catch (e) {
    console.error('Error clearing supabase cache:', e);
  }
}

export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  DOCUMENTS: 'documents',
  VIDEOS: 'videos',
  HOMEWORK: 'homework',
  ID_CARDS: 'id-cards',
  LESSONS: 'lessons',
  RECEIPTS: 'receipts',
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