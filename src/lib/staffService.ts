import { supabase } from './supabase';

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

export async function getAllStaff(): Promise<StaffRecord[]> {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  const { data, error } = await supabase
    .from('users')
    .select('user_id, full_name, email, phone, avatar_url, department, status, role')
    .order('full_name', { ascending: true });

  if (error) throw error;
  return (data as UserRow[] | null)?.map(mapUser) ?? [];
}
