import { supabase } from './supabase';

const MAX_EDGE_PX = 1280;
const JPEG_QUALITY = 0.72;
const BUCKET = 'attendance-photos';

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh chấm công.'));
    };
    image.src = url;
  });
}

export async function compressAttendancePhoto(file: Blob): Promise<Blob> {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
  }
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/jpeg', JPEG_QUALITY);
  });

  if (!blob) {
    throw new Error('Không nén được ảnh chấm công.');
  }

  return blob;
}

export async function uploadAttendancePhoto(params: {
  employeeId: string;
  kind: 'check-in' | 'check-out';
  file: Blob;
}): Promise<string> {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  const compressed = await compressAttendancePhoto(params.file);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeEmployee = params.employeeId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'unknown';
  const path = `${safeEmployee}/${params.kind}-${stamp}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '3600',
    });

  if (uploadError) {
    throw new Error(
      uploadError.message.includes('Bucket not found')
        ? 'Chưa tạo bucket ảnh. Chạy supabase/migrate-attendance-photos.sql trên Supabase.'
        : `Không tải ảnh lên được: ${uploadError.message}`,
    );
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error('Không lấy được URL ảnh chấm công.');
  }

  return data.publicUrl;
}
