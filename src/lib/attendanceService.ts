import { supabase } from './supabase';
import type { AttendanceDbRecord, GeoPoint } from '../types';

const DEFAULT_SHIFT = {
  shift_name: 'Ca hành chính',
  scheduled_start: '08:00',
  scheduled_end: '17:30',
};

// Generate anonymous employee ID
function generateAnonymousId() {
  return 'ANON_' + Math.random().toString(36).substring(2, 11).toUpperCase();
}

// Get or create employee from localStorage
function getOrCreateEmployee() {
  try {
    const stored = localStorage.getItem('employee_info');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse stored employee info:', e);
  }

  // Create new anonymous employee
  const newEmployee = {
    id: generateAnonymousId(),
    name: `User ${new Date().getTime().toString().slice(-6)}`,
  };
  localStorage.setItem('employee_info', JSON.stringify(newEmployee));
  return newEmployee;
}

export const currentEmployee = getOrCreateEmployee();

export async function saveEmployeeToSupabase() {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
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

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', currentEmployee.id)
    .eq('work_date', getTodayKey())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function checkIn(location: GeoPoint) {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
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
