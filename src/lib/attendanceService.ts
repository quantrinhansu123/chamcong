import { supabase } from './supabase';
import type { AttendanceDbRecord, CheckInProductSelection, GeoPoint } from '../types';
import { getShiftConfig } from './settingsService';
import { getAllStaff, type StaffRecord } from './staffService';

const EMPLOYEE_ID = (import.meta.env.VITE_EMPLOYEE_ID as string | undefined) || '';
const EMPLOYEE_NAME = (import.meta.env.VITE_EMPLOYEE_NAME as string | undefined) || '';
const EMPLOYEE_PHONE = (import.meta.env.VITE_EMPLOYEE_PHONE as string | undefined) || '';
const EMPLOYEE_STORAGE_KEY = 'employee_info';

export interface EmployeeIdentity {
  id: string;
  name: string;
  phone?: string;
}

function generateAnonymousId() {
  return 'ANON_' + Math.random().toString(36).substring(2, 11).toUpperCase();
}

function deriveEmployeeId(name: string) {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return slug || generateAnonymousId();
}

export function parseEmployeeFromUrl(search = window.location.search): EmployeeIdentity | null {
  const params = new URLSearchParams(search);
  const name = (
    params.get('employeeName')
    || params.get('employee_name')
    || params.get('name')
    || params.get('ten')
    || params.get('full_name')
    || params.get('fullName')
    || params.get('hoTen')
    || ''
  ).trim();
  const id = (
    params.get('employeeId')
    || params.get('employee_id')
    || params.get('userId')
    || params.get('user_id')
    || params.get('id')
    || ''
  ).trim();
  const phone = (
    params.get('employeePhone')
    || params.get('employee_phone')
    || params.get('phone')
    || ''
  ).trim();

  if (!name && !id) return null;

  const resolvedName = name || id;
  const resolvedId = id || deriveEmployeeId(resolvedName);

  return {
    id: resolvedId,
    name: resolvedName,
    phone: phone || undefined,
  };
}

export function syncEmployeeFromUrl(search = window.location.search): EmployeeIdentity | null {
  const parsed = parseEmployeeFromUrl(search);
  if (!parsed) return null;

  currentEmployee.id = parsed.id;
  currentEmployee.name = parsed.name;
  currentEmployee.phone = parsed.phone;
  localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(parsed));
  return parsed;
}

function getEmployeeFromUrl(): EmployeeIdentity | null {
  return parseEmployeeFromUrl(window.location.search);
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
  const urlEmployee = getEmployeeFromUrl();
  if (urlEmployee) {
    localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(urlEmployee));
    return urlEmployee;
  }

  const storedEmployee = getStoredEmployee();
  if (storedEmployee) return storedEmployee;

  const configuredEmployee = getConfiguredEmployeeDefaults();
  if (configuredEmployee) return configuredEmployee;

  const anonymousEmployee = {
    id: generateAnonymousId(),
    name: `User ${new Date().getTime().toString().slice(-6)}`,
    phone: undefined,
  };
  localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(anonymousEmployee));
  return anonymousEmployee;
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

/** @deprecated Dùng StaffRecord từ bảng users */
export type EmployeeRecord = StaffRecord;

export async function getAllEmployees() {
  return getAllStaff();
}

export async function getTodayAttendanceForAll() {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('work_date', getTodayKey());

  if (error) throw error;
  return data as AttendanceDbRecord[];
}

export async function saveEmployeeToSupabase() {
  if (!currentEmployee.id || !currentEmployee.name) {
    return null;
  }
  return null;
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

type BrowserLocationPermission = PermissionState | 'unknown';

async function getBrowserLocationPermission(): Promise<BrowserLocationPermission> {
  if (!navigator.permissions?.query) {
    return 'unknown';
  }

  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state;
  } catch {
    return 'unknown';
  }
}

function getPermissionDeniedMessage(permissionState: BrowserLocationPermission) {
  if (permissionState === 'denied') {
    return 'Safari đang chặn GPS cho trang này. Hãy vào Safari > Cài đặt cho trang web > Vị trí > Cho phép, rồi tải lại trang.';
  }

  return 'Safari chưa cấp quyền GPS cho trang này. Nếu đang để "Hỏi", hãy bấm Thử lại và chọn Cho phép khi Safari hỏi quyền vị trí.';
}

function getGeolocationMessage(error: GeolocationPositionError, permissionState: BrowserLocationPermission = 'unknown') {
  if (error.code === error.PERMISSION_DENIED) {
    return getPermissionDeniedMessage(permissionState);
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Không xác định được GPS hiện tại. Hãy bật Dịch vụ định vị trên iPhone và cho phép Safari dùng vị trí.';
  }

  if (error.code === error.TIMEOUT) {
    return 'Lấy vị trí GPS quá lâu. Hãy đứng nơi có tín hiệu tốt hơn rồi thử lại.';
  }

  return 'Không lấy được vị trí GPS. Hãy kiểm tra quyền vị trí của Safari rồi thử lại.';
}

function requestBrowserLocation(options: PositionOptions): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
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
      reject,
      options,
    );
  });
}

export async function getBrowserLocation(): Promise<GeoPoint> {
  if (!navigator.geolocation) {
    throw new Error('Trình duyệt không hỗ trợ GPS.');
  }

  if (window.isSecureContext === false) {
    throw new Error('GPS chỉ hoạt động trên trang HTTPS. Hãy mở link Vercel bằng https rồi thử lại.');
  }

  const permissionState = await getBrowserLocationPermission();

  try {
    return await requestBrowserLocation({
      enableHighAccuracy: true,
      maximumAge: 30_000,
      timeout: 15_000,
    });
  } catch (firstError) {
    const error = firstError as GeolocationPositionError;
    if (error.code === error.PERMISSION_DENIED) {
      throw new Error(getGeolocationMessage(error, permissionState));
    }

    try {
      return await requestBrowserLocation({
        enableHighAccuracy: false,
        maximumAge: 120_000,
        timeout: 20_000,
      });
    } catch (secondError) {
      throw new Error(getGeolocationMessage(secondError as GeolocationPositionError, permissionState));
    }
  }
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

export async function getEmployeeAttendanceRecords(
  employeeId: string,
  startDate: string,
  endDate: string,
) {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .order('work_date', { ascending: false });

  if (error) throw error;
  return data as AttendanceDbRecord[];
}

export async function checkIn(
  location: GeoPoint | null,
  product: CheckInProductSelection,
) {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  if (!hasCurrentEmployee()) {
    throw new Error('Vui lòng nhập mã nhân viên trước khi chấm công.');
  }

  if (!product.productId) {
    throw new Error('Vui lòng chọn dự án trước khi check-in.');
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(
      {
        employee_id: currentEmployee.id,
        employee_name: currentEmployee.name,
        work_date: getTodayKey(),
        ...getShiftConfig(),
        product_id: product.productId,
        product_location_id: product.productLocationId,
        product_name: product.productName,
        location_name: product.locationName,
        check_in_at: now,
        check_in_lat: location?.lat ?? null,
        check_in_lng: location?.lng ?? null,
        last_lat: location?.lat ?? null,
        last_lng: location?.lng ?? null,
        location_accuracy_m: location?.accuracy ?? null,
        location_captured_at: location?.capturedAt ?? null,
        status: 'working',
      },
      { onConflict: 'employee_id,work_date' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data as AttendanceDbRecord;
}

export async function checkOut(record: AttendanceDbRecord, location: GeoPoint | null) {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .update({
      check_out_at: new Date().toISOString(),
      check_out_lat: location?.lat ?? null,
      check_out_lng: location?.lng ?? null,
      last_lat: location?.lat ?? record.last_lat,
      last_lng: location?.lng ?? record.last_lng,
      location_accuracy_m: location?.accuracy ?? record.location_accuracy_m,
      location_captured_at: location?.capturedAt ?? record.location_captured_at,
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
      ...getShiftConfig(),
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
