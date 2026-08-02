import { normalizeEmployeeName } from './attendanceSheetUtils';
import { supabase } from './supabase';

export interface StaffIdentity {
  id: string;
  name: string;
  phone?: string;
}

export interface StaffRecord {
  id: string | number;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  department: string | null;
  status: string | null;
  position: string | null;
}

type UserRow = {
  user_id: string | number;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  department: string | null;
  status: string | null;
  role: string | null;
};

function mapUser(row: UserRow): StaffRecord {
  return {
    id: row.user_id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    avatar_url: row.avatar_url,
    department: row.department,
    status: row.status,
    position: row.department,
  };
}

const userSelect =
  'user_id, full_name, email, phone, avatar_url, department, status, role';

export async function getAllStaff(): Promise<StaffRecord[]> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('users')
    .select(userSelect)
    .order('full_name', { ascending: true });

  if (error) throw error;
  return (data as UserRow[] | null)?.map(mapUser) ?? [];
}

function isResolvableUserId(userId: string) {
  const trimmed = userId.trim();
  if (!trimmed || trimmed.startsWith('ANON_')) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
    return true;
  }
  return /^\d+$/.test(trimmed);
}

export function isValidQueryUserId(userId: string) {
  return isResolvableUserId(userId);
}

export function isAnonymousUserId(userId: string) {
  return userId.trim().startsWith('ANON_');
}

export async function resolveQueryUserId(identity: StaffIdentity): Promise<string | null> {
  if (isResolvableUserId(identity.id)) return identity.id.trim();

  const resolved = await resolveStaffIdentity(identity);
  if (isResolvableUserId(resolved.id)) return resolved.id.trim();

  return null;
}

export async function findStaffById(userId: string): Promise<StaffRecord | null> {
  if (!supabase || !isResolvableUserId(userId)) return null;

  const { data, error } = await supabase
    .from('users')
    .select(userSelect)
    .eq('user_id', userId.trim())
    .maybeSingle();

  if (error) throw error;
  return data ? mapUser(data as UserRow) : null;
}

export async function findStaffByName(name: string): Promise<StaffRecord | null> {
  if (!supabase || !name.trim()) return null;

  const normalized = normalizeEmployeeName(name);
  const { data, error } = await supabase
    .from('users')
    .select(userSelect)
    .order('full_name', { ascending: true });

  if (error) throw error;
  if (!data?.length) return null;

  const exact = (data as UserRow[]).find(
    (row) => normalizeEmployeeName(row.full_name) === normalized,
  );
  if (exact) return mapUser(exact);

  const partial = (data as UserRow[]).find((row) =>
    normalizeEmployeeName(row.full_name).includes(normalized)
    || normalized.includes(normalizeEmployeeName(row.full_name)),
  );
  return partial ? mapUser(partial) : null;
}

export async function resolveStaffIdentity(identity: StaffIdentity): Promise<StaffIdentity> {
  const byId = identity.id && isResolvableUserId(identity.id)
    ? await findStaffById(identity.id).catch(() => null)
    : null;
  if (byId) {
    return {
      id: String(byId.id),
      name: byId.full_name,
      phone: byId.phone ?? identity.phone,
    };
  }

  const byName = identity.name ? await findStaffByName(identity.name).catch(() => null) : null;
  if (byName) {
    return {
      id: String(byName.id),
      name: byName.full_name,
      phone: byName.phone ?? identity.phone,
    };
  }

  return identity;
}
