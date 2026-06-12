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
  if (!(err instanceof Error)) return fallback;

  const message = err.message || '';
  if (message.includes('Invalid API key') || message.includes('JWT')) {
    return 'API key Supabase không hợp lệ. Kiểm tra VITE_SUPABASE_ANON_KEY trong .env.local rồi restart npm run dev.';
  }
  if (message === 'Failed to fetch' || err.name === 'TypeError') {
    return 'Không kết nối được Supabase. Hãy kiểm tra mạng hoặc URL project.';
  }

  return message || fallback;
}
