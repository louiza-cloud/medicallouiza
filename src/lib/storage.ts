import { supabase } from './supabase';

const BUCKET_NAME = 'cabinet-files';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function getFileType(file: File): 'image' | 'pdf' | 'word' | 'other' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'pdf';
  if (
    file.type === 'application/msword' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return 'word';
  return 'other';
}

export function isAllowedFile(file: File): boolean {
  return ALLOWED_MIME_TYPES.some(
    (t) => file.type === t || (t.endsWith('/') && file.type.startsWith(t))
  );
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Fichier trop volumineux (max 10 Mo)' };
  }
  if (!isAllowedFile(file)) {
    return { valid: false, error: 'Type de fichier non autorisé. Images (JPG, PNG, WEBP), PDF et Word uniquement.' };
  }
  return { valid: true };
}

export async function uploadToCloudinary(
  file: File,
  folder: string
): Promise<{ secure_url: string; public_id: string } | null> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  return {
    secure_url: urlData.publicUrl,
    public_id: data.path,
  };
}

export async function deleteFile(publicId: string): Promise<boolean> {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([publicId]);
  if (error) {
    console.error('Delete error:', error);
    return false;
  }
  return true;
}

export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}
