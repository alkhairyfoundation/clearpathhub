import { createBrowserClient } from '@supabase/ssr';

function getUrl() { return process.env.NEXT_PUBLIC_SUPABASE_URL || ''; }
function getKey() { return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; }

let _client: ReturnType<typeof createBrowserClient> | null = null;

function getClient() {
  if (!_client) {
    const url = getUrl();
    const key = getKey();
    if (!url || !key) {
      if (typeof window === 'undefined') return null;
      throw new Error('Your project URL and Key are required to create a Supabase client!');
    }
    _client = createBrowserClient(url, key);
  }
  return _client;
}

// Browser client factory (for client components)
export function createSupabaseBrowserClient() {
  return createBrowserClient(getUrl(), getKey());
}

// Lazy supabase — created on first property access, not at module import time.
// This prevents build-time prerendering failures (e.g. _not-found) when env vars aren't available.
export const supabase: ReturnType<typeof createBrowserClient> = new Proxy({} as any, {
  get(_, prop) {
    const c = getClient();
    if (!c) {
      return (...args: any[]) => { throw new Error(`supabase.${String(prop)}() is not available during server-side rendering`); };
    }
    const val = (c as any)[prop];
    return typeof val === 'function' ? val.bind(c) : val;
  },
});

// Storage bucket names
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  DOCUMENTS: 'documents',
  VIDEOS: 'videos',
  HOMEWORK: 'homework',
  ID_CARDS: 'id-cards',
  LESSONS: 'lessons',
} as const;

// Helper function to upload files
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

// Helper function to delete files
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

// Get public URL for a file
export function getStorageUrl(bucket: string, filePath: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}