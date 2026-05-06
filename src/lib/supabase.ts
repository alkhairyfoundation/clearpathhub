import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Browser client (for client components)
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Default client (for backward compatibility)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

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