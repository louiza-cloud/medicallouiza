import { supabase } from './supabase';

const BUCKET_NAME = 'cabinet-files';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 10;

export interface UploadProgress {
  fileIndex: number;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
  result?: { url: string; name: string; type: string; size: number };
}

export interface FilePreview {
  file: File;
  preview: string | null;
  type: 'image' | 'pdf' | 'word' | 'audio' | 'other';
  size: number;
  name: string;
}

export function getFileType(file: File): 'image' | 'pdf' | 'word' | 'audio' | 'other' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
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
    return { valid: false, error: `${file.name} est trop volumineux (max ${formatFileSize(MAX_FILE_SIZE)})` };
  }
  if (!isAllowedFile(file)) {
    return { valid: false, error: `${file.name}: type non autorisé. Images, PDF et Word uniquement.` };
  }
  return { valid: true };
}

export function validateFiles(files: File[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (files.length > MAX_FILES_PER_UPLOAD) {
    errors.push(`Maximum ${MAX_FILES_PER_UPLOAD} fichiers à la fois`);
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    errors.push(`Taille totale maximale dépassée (${formatFileSize(MAX_TOTAL_SIZE)})`);
  }

  for (const file of files) {
    const result = validateFile(file);
    if (!result.valid && result.error) {
      errors.push(result.error);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 o';
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

export async function createFilePreview(file: File): Promise<FilePreview> {
  const type = getFileType(file);

  let preview: string | null = null;
  if (type === 'image') {
    preview = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  return {
    file,
    preview,
    type,
    size: file.size,
    name: file.name,
  };
}

export async function uploadFile(
  file: File,
  folder: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; name: string; type: string; size: number } | null> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const fileExt = file.name.split('.').pop() || 'bin';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Erreur lors de l'upload: ${error.message}`);
    }

    onProgress?.(100);

    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      name: file.name,
      type: getFileType(file),
      size: file.size,
    };
  } catch (err) {
    console.error('Upload error:', err);
    throw err;
  }
}

export async function uploadMultipleFiles(
  files: File[],
  folder: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<Array<{ url: string; name: string; type: string; size: number }>> {
  const results: Array<{ url: string; name: string; type: string; size: number }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    onProgress?.({
      fileIndex: i,
      fileName: file.name,
      progress: 0,
      status: 'uploading',
    });

    try {
      const result = await uploadFile(file, folder, (progress) => {
        onProgress?.({
          fileIndex: i,
          fileName: file.name,
          progress,
          status: 'uploading',
        });
      });

      if (result) {
        results.push(result);
        onProgress?.({
          fileIndex: i,
          fileName: file.name,
          progress: 100,
          status: 'complete',
          result,
        });
      }
    } catch (err) {
      onProgress?.({
        fileIndex: i,
        fileName: file.name,
        progress: 0,
        status: 'error',
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    }
  }

  return results;
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

export function getDataUrlFromClipboard(item: DataTransferItem): Promise<File | null> {
  return new Promise((resolve) => {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      resolve(file);
    } else {
      resolve(null);
    }
  });
}
