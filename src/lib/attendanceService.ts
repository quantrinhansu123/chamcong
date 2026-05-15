import { supabase } from './supabase';
import type { AttendanceDbRecord, GeoPoint } from '../types';

const DEFAULT_SHIFT = {
  shift_name: 'Ca hành chính',
  scheduled_start: '08:00',
  scheduled_end: '17:30',
};

const EMPLOYEE_ID = (import.meta.env.VITE_EMPLOYEE_ID as string | undefined) || '';
const EMPLOYEE_NAME = (import.meta.env.VITE_EMPLOYEE_NAME as string | undefined) || '';
const EMPLOYEE_PHONE = (import.meta.env.VITE_EMPLOYEE_PHONE as string | undefined) || '';
const EMPLOYEE_STORAGE_KEY = 'employee_info';

export interface EmployeeIdentity {
  id: string;
  name: string;
  phone?: string;
}

// Generate anonymous employee ID
function generateAnonymousId() {
  return 'ANON_' + Math.random().toString(36).substring(2, 11).toUpperCase();
}

export function getConfiguredEmployeeDefaults(): EmployeeIdentity | null {
  const configuredId = EMPLOYEE_ID || EMPLOYEE_PHONE || '';
  const configuredName = EMPLOYEE_NAME || EMPLOYEE_PHONE || '';

  if (!configuredId && !configuredName) {
    return null;
  }

  return {
    id: configuredId || generateAnonymousId(),
    name: configuredName || `User ${new Date().getTime().toString().slice(-6)}`,
    phone: EMPLOYEE_PHONE || undefined,
  };
}

export function getStoredEmployee(): EmployeeIdentity | null {
  try {
    const stored = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.id && parsed?.name) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse stored employee info:', e);
  }

  return null;
}

function getInitialEmployee(): EmployeeIdentity {
  return getStoredEmployee() || {
    id: '',
    name: '',
    phone: undefined,
  };
}

export const currentEmployee = getInitialEmployee();

export function hasCurrentEmployee() {
  return Boolean(currentEmployee.id && currentEmployee.name);
}

export function setCurrentEmployee(employee: EmployeeIdentity) {
  const nextEmployee = {
    id: employee.id.trim(),
    name: employee.name.trim(),
    phone: employee.phone?.trim() || undefined,
  };

  if (!nextEmployee.id || !nextEmployee.name) {
    throw new Error('Vui lòng nhập mã nhân viên và tên.');
  }

  currentEmployee.id = nextEmployee.id;
  currentEmployee.name = nextEmployee.name;
  currentEmployee.phone = nextEmployee.phone;
  localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(nextEmployee));
  return nextEmployee;
}

export async function saveEmployeeToSupabase() {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  if (!currentEmployee.id || !currentEmployee.name) {
    return null;
  }

  const { data, error } = await supabase
    .from('employees')
    .upsert(
      {
        id: currentEmployee.id,
        name: currentEmployee.name,
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export function clearCurrentEmployee() {
  localStorage.removeItem(EMPLOYEE_STORAGE_KEY);
  currentEmployee.id = '';
  currentEmployee.name = '';
  currentEmployee.phone = undefined;
}

export function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getBrowserLocation(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Trình duyệt không hỗ trợ GPS.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
          capturedAt: new Date().toISOString(),
        });
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Trình duyệt đang chặn quyền GPS. Hãy bật Location cho trang này rồi thử lại.'
            : error.code === error.POSITION_UNAVAILABLE
              ? 'Không xác định được vị trí GPS hiện tại.'
              : error.code === error.TIMEOUT
                ? 'Lấy vị trí GPS quá lâu. Hãy thử lại.'
                : 'Không lấy được vị trí GPS.';

        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 15_000,
      },
    );
  });
}

export async function getTodayAttendance() {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  if (!hasCurrentEmployee()) {
    throw new Error('Vui lòng nhập mã nhân viên trước khi chấm công.');
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', currentEmployee.id)
    .eq('work_date', getTodayKey())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAttendanceRecordsInRange(startDate: string, endDate: string) {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .order('work_date', { ascending: true })
    .order('employee_name', { ascending: true });

  if (error) throw error;
  return data as AttendanceDbRecord[];
}

export async function checkIn(location: GeoPoint) {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  if (!hasCurrentEmployee()) {
    throw new Error('Vui lòng nhập mã nhân viên trước khi chấm công.');
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(
      {
        employee_id: currentEmployee.id,
        employee_name: currentEmployee.name,
        work_date: getTodayKey(),
        ...DEFAULT_SHIFT,
        check_in_at: now,
        check_in_lat: location.lat,
        check_in_lng: location.lng,
        last_lat: location.lat,
        last_lng: location.lng,
        location_accuracy_m: location.accuracy,
        location_captured_at: location.capturedAt,
        status: 'working',
      },
      { onConflict: 'employee_id,work_date' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function checkOut(record: AttendanceDbRecord, location: GeoPoint) {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .update({
      check_out_at: new Date().toISOString(),
      check_out_lat: location.lat,
      check_out_lng: location.lng,
      last_lat: location.lat,
      last_lng: location.lng,
      location_accuracy_m: location.accuracy,
      location_captured_at: location.capturedAt,
      status: 'checked_out',
    })
    .eq('id', record.id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function saveLocation(record: AttendanceDbRecord, location: GeoPoint) {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .update({
      last_lat: location.lat,
      last_lng: location.lng,
      location_accuracy_m: location.accuracy,
      location_captured_at: location.capturedAt,
    })
    .eq('id', record.id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function saveTodayLocation(location: GeoPoint) {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  if (!hasCurrentEmployee()) {
    throw new Error('Vui lòng nhập mã nhân viên trước khi lưu GPS.');
  }

  const existing = await getTodayAttendance();
  if (existing) {
    return saveLocation(existing, location);
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .insert({
      employee_id: currentEmployee.id,
      employee_name: currentEmployee.name,
      work_date: getTodayKey(),
      ...DEFAULT_SHIFT,
      last_lat: location.lat,
      last_lng: location.lng,
      location_accuracy_m: location.accuracy,
      location_captured_at: location.capturedAt,
      status: 'not_checked_in',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
