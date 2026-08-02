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
    return 'VITE_SUPABASE_URL is not configured in .env.local.';
  }
  if (!supabaseAnonKey?.trim() || isPlaceholderKey(supabaseAnonKey)) {
    return 'VITE_SUPABASE_ANON_KEY is not configured. Get the anon public key from Supabase → Settings → API.';
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
    return 'Invalid Supabase API key. Check VITE_SUPABASE_ANON_KEY in .env.local, then restart npm run dev.';
  }
  if (message === 'Failed to fetch' || (err instanceof Error && err.name === 'TypeError')) {
    return 'Could not connect to Supabase. Check your network or project URL.';
  }
  if (code === '42P01' || message.includes('does not exist') || message.includes('schema cache')) {
    return 'The attendance_records table is missing. Run supabase/migrate-attendance-records.sql in the Supabase SQL Editor.';
  }
  if (code === '42703' || (message.includes('column') && message.includes('does not exist'))) {
    return 'Database is missing new columns. Run supabase/migrate-attendance-project-id.sql on Supabase.';
  }
  if (code === '22P02' || message.includes('invalid input syntax for type uuid')) {
    return 'Invalid project data. The app was fixed — reload the page and try checking in again.';
  }
  if (code === '23503') {
    return 'Invalid reference data (FK). Run migrate-attendance-project-id.sql on Supabase.';
  }
  if (code === '42501' || message.toLowerCase().includes('permission denied')) {
    return 'No permission to access Supabase (RLS). Check policies for the attendance_records table.';
  }

  if (message) {
    return details ? `${message} (${details})` : message;
  }

  if (err instanceof Error && err.message) {
    return err.message;
  }

  return fallback;
}
