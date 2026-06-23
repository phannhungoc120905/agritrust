import { supabase } from './client';

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * @param file The file to upload
 * @param bucket The storage bucket (e.g., 'profiles')
 * @param path Optional subpath (e.g., wallet address)
 * @returns The public URL of the uploaded file, or null on error
 */
export async function uploadFile(file: File, bucket: string, path: string = ''): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = path ? `${path}/${fileName}` : fileName;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Lỗi khi upload file:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    console.error('Lỗi không xác định khi upload:', error);
    return null;
  }
}
