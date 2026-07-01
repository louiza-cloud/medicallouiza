const CLOUD_NAME = 'djalane-louiza';
const UPLOAD_PRESET = 'cabinet_djalane';

export function getFileType(file: File): 'image' | 'pdf' | 'word' | 'other' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'pdf';
  if (
    file.type === 'application/msword' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) return 'word';
  return 'other';
}

export function isAllowedFile(file: File): boolean {
  const allowedTypes = [
    'image/',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  return allowedTypes.some(t => file.type.startsWith(t) || file.type === t);
}

export async function uploadToCloudinary(
  file: File,
  folder: string
): Promise<{ secure_url: string; public_id: string } | null> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const resourceType = file.type.startsWith('image/') ? 'image' : 'raw';

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return { secure_url: data.secure_url, public_id: data.public_id };
}
