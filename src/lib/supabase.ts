import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function isPlaceholderKey(value?: string) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes('your_')
    || normalized.includes('placeholder')
    || normalized === 'your_supabase_anon_key'
    || normalized === 'your_anon_key_from_supabase_dashboard'
  );
}

export function getSupabaseConfigError(): string | null {
  if (!supabaseUrl?.trim()) {
    return 'Chưa cấu hình VITE_SUPABASE_URL trong .env.local.';
  }
  if (!supabaseAnonKey?.trim() || isPlaceholderKey(supabaseAnonKey)) {
    return 'Chưa cấu hình VITE_SUPABASE_ANON_KEY. Lấy anon public key tại Supabase → Settings → API.';
  }
  return null;
}

export const isSupabaseConfigured = getSupabaseConfigError() === null;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export function getSupabaseRequestErrorMessage(err: unknown, fallback: string) {
  const record = err && typeof err === 'object' ? (err as Record<string, unknown>) : null;
  const message = typeof record?.message === 'string' ? record.message : '';
  const code = typeof record?.code === 'string' ? record.code : '';
  const details = typeof record?.details === 'string' ? record.details : '';

  if (message.includes('Invalid API key') || message.includes('JWT')) {
    return 'API key Supabase không hợp lệ. Kiểm tra VITE_SUPABASE_ANON_KEY trong .env.local rồi restart npm run dev.';
  }
  if (message === 'Failed to fetch' || (err instanceof Error && err.name === 'TypeError')) {
    return 'Không kết nối được Supabase. Hãy kiểm tra mạng hoặc URL project.';
  }
  if (code === '42P01' || message.includes('does not exist') || message.includes('schema cache')) {
    return 'Bảng attendance_records chưa có. Chạy supabase/migrate-attendance-records.sql trong Supabase SQL Editor.';
  }
  if (code === '42703' || message.includes('column') && message.includes('does not exist')) {
    return 'Database thiếu cột mới. Chạy supabase/migrate-attendance-project-id.sql trên Supabase.';
  }
  if (code === '22P02' || message.includes('invalid input syntax for type uuid')) {
    return 'Dữ liệu dự án không hợp lệ. Đã sửa app — tải lại trang và thử check-in lại.';
  }
  if (code === '23503') {
    return 'Dữ liệu tham chiếu không hợp lệ (FK). Chạy migrate-attendance-project-id.sql trên Supabase.';
  }
  if (code === '42501' || message.toLowerCase().includes('permission denied')) {
    return 'Không có quyền truy cập Supabase (RLS). Kiểm tra policy cho bảng attendance_records.';
  }

  if (message) {
    return details ? `${message} (${details})` : message;
  }

  if (err instanceof Error && err.message) {
    return err.message;
  }

  return fallback;
}
