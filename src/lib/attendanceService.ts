import { supabase } from './supabase';
import type { AttendanceDbRecord, CheckInProductSelection, GeoPoint } from '../types';
import { getShiftConfig } from './settingsService';
import { getAllStaff, isValidQueryUserId, resolveQueryUserId, resolveStaffIdentity, type StaffRecord } from './staffService';

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

export async function syncEmployeeFromUrlWithStaff(
  search = window.location.search,
): Promise<EmployeeIdentity | null> {
  const parsed = parseEmployeeFromUrl(search);
  if (!parsed) return null;

  const resolved = await resolveStaffIdentity(parsed);
  currentEmployee.id = resolved.id;
  currentEmployee.name = resolved.name;
  currentEmployee.phone = resolved.phone;
  localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(resolved));
  return resolved;
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

export async function ensureCurrentEmployeeResolved(): Promise<EmployeeIdentity | null> {
  if (!hasCurrentEmployee()) return null;

  if (isValidQueryUserId(currentEmployee.id)) {
    return currentEmployee;
  }

  const resolved = await resolveStaffIdentity(currentEmployee).catch(() => currentEmployee);
  if (isValidQueryUserId(resolved.id)) {
    currentEmployee.id = resolved.id;
    currentEmployee.name = resolved.name;
    currentEmployee.phone = resolved.phone;
    localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify({
      id: resolved.id,
      name: resolved.name,
      phone: resolved.phone,
    }));
    return currentEmployee;
  }

  const resolvedId = await resolveQueryUserId(resolved).catch(() => null);
  if (!resolvedId) return null;

  currentEmployee.id = resolvedId;
  currentEmployee.name = resolved.name;
  currentEmployee.phone = resolved.phone;
  localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify({
    id: resolvedId,
    name: resolved.name,
    phone: resolved.phone,
  }));
  return currentEmployee;
}

export function setCurrentEmployee(employee: EmployeeIdentity) {
  const nextEmployee = {
    id: employee.id.trim(),
    name: employee.name.trim(),
    phone: employee.phone?.trim() || undefined,
  };

  if (!nextEmployee.id || !nextEmployee.name) {
    throw new Error('Please enter employee ID and name.');
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
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('work_date', getTodayKey());

  if (error) throw error;
  return data as AttendanceDbRecord[];
}

export function isActiveAttendanceRecord(record: AttendanceDbRecord) {
  return Boolean(record.check_in_at) && !record.check_out_at;
}

export async function getTodayActiveAttendanceForAll() {
  const records = await getTodayAttendanceForAll();
  return records.filter(isActiveAttendanceRecord);
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

function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function getBrowserName() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Safari';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/Chrome/i.test(ua)) return 'Chrome';
  if (/Firefox/i.test(ua)) return 'Firefox';
  return 'browser';
}

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

function isIosDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function getSafariLocationHelp() {
  return [
    'Tap the "aA" icon on the left of the address bar → Website Settings → Location → Allow.',
    'Or iPhone Settings → Safari → Location → Ask / Allow.',
    'Enable Settings → Privacy → Location Services, then reload the page and tap Retry.',
  ].join(' ');
}

function getPermissionDeniedMessage(permissionState: BrowserLocationPermission) {
  const browser = getBrowserName();

  if (browser === 'Safari' || isIosDevice()) {
    if (permissionState === 'denied') {
      return `Safari is blocking GPS. ${getSafariLocationHelp()}`;
    }

    return `Safari has not granted GPS permission. Tap Retry and choose Allow when prompted. If you do not see the dialog: ${getSafariLocationHelp()}`;
  }

  if (permissionState === 'denied') {
    return `${browser} is blocking GPS. Open site settings > Location > Allow, or enter lat/lng manually in Settings → Projects.`;
  }

  return `Tap Allow when ${browser} asks for location permission. If you do not see the dialog, open https://chamcong-psi.vercel.app directly in the browser (not via Zalo/Facebook in-app browser).`;
}

const GEO_PERMISSION_DENIED = 1;
const GEO_POSITION_UNAVAILABLE = 2;
const GEO_TIMEOUT = 3;

function getGeolocationMessage(error: GeolocationPositionError, permissionState: BrowserLocationPermission = 'unknown') {
  const code = error?.code;

  if (code === GEO_PERMISSION_DENIED) {
    return getPermissionDeniedMessage(permissionState);
  }

  if (code === GEO_POSITION_UNAVAILABLE) {
    return 'Could not determine GPS. Enable Location Services on your phone, go outdoors, or enter lat/lng manually in Settings → Projects.';
  }

  if (code === GEO_TIMEOUT) {
    return 'GPS timed out. Try again in an open area, or enter coordinates manually in Settings → Projects.';
  }

  return `Could not get GPS on ${getBrowserName()}. Check location permission or enter lat/lng manually.`;
}

function mapGeolocationPosition(position: GeolocationPosition): GeoPoint {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
    capturedAt: new Date().toISOString(),
  };
}

function requestBrowserLocation(options: PositionOptions): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(mapGeolocationPosition(position)),
      reject,
      options,
    );
  });
}

function watchBrowserLocation(options: PositionOptions, timeoutMs: number): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        navigator.geolocation.clearWatch(watchId);
        resolve(mapGeolocationPosition(position));
      },
      (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        navigator.geolocation.clearWatch(watchId);
        reject(error);
      },
      options,
    );

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      reject({ code: GEO_TIMEOUT, message: 'GPS timeout' } as GeolocationPositionError);
    }, timeoutMs);
  });
}

async function tryLocationStrategies(): Promise<GeoPoint> {
  const mobile = isMobileBrowser();
  const attempts: Array<() => Promise<GeoPoint>> = mobile
    ? [
      () => requestBrowserLocation({ enableHighAccuracy: false, maximumAge: 60_000, timeout: 25_000 }),
      () => watchBrowserLocation({ enableHighAccuracy: false, maximumAge: 60_000 }, 30_000),
      () => requestBrowserLocation({ enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 }),
    ]
    : [
      () => requestBrowserLocation({ enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 }),
      () => requestBrowserLocation({ enableHighAccuracy: false, maximumAge: 120_000, timeout: 20_000 }),
    ];

  let lastError: GeolocationPositionError | null = null;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error as GeolocationPositionError;
      if (lastError.code === GEO_PERMISSION_DENIED) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error('Could not get GPS.');
}

export async function getBrowserLocation(): Promise<GeoPoint> {
  if (!navigator.geolocation) {
    throw new Error('This browser does not support GPS.');
  }

  if (window.isSecureContext === false) {
    throw new Error(
      'GPS only works over HTTPS. On mobile, open https://chamcong-psi.vercel.app (do not use http://192.168...). Or enter lat/lng manually in Settings → Projects.',
    );
  }

  const permissionState = await getBrowserLocationPermission();

  try {
    return await tryLocationStrategies();
  } catch (error) {
    const geoError = error as GeolocationPositionError;
    throw new Error(getGeolocationMessage(geoError, permissionState));
  }
}

export async function getTodayAttendanceSessions() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const employee = await ensureCurrentEmployeeResolved();
  if (!employee) {
    throw new Error('Please enter an employee ID before checking in.');
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employee.id)
    .eq('work_date', getTodayKey())
    .order('check_in_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AttendanceDbRecord[];
}

/** Phiên đang làm (đã check-in, chưa check-out). Không có thì null. */
export async function getActiveTodayAttendance() {
  const sessions = await getTodayAttendanceSessions();
  return sessions.find((row) => Boolean(row.check_in_at) && !row.check_out_at) ?? null;
}

/**
 * Bản ghi hôm nay để hiển thị:
 * ưu tiên phiên đang làm, không có thì phiên gần nhất.
 */
export async function getTodayAttendance() {
  const sessions = await getTodayAttendanceSessions();
  const active = sessions.find((row) => Boolean(row.check_in_at) && !row.check_out_at);
  return active ?? sessions[0] ?? null;
}

export async function getAttendanceRecordsInRange(startDate: string, endDate: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
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
    throw new Error('Supabase is not configured.');
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
    throw new Error('Supabase is not configured.');
  }

  const employee = await ensureCurrentEmployeeResolved();
  if (!employee) {
    throw new Error('Could not identify employee. Open the link with ?name=...');
  }

  if (!product.projectId) {
    throw new Error('Please select a project before checking in.');
  }

  const active = await getActiveTodayAttendance();
  if (active) {
    throw new Error('You are already checked in to a project. Check out before selecting another.');
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('attendance_records')
    .insert({
      employee_id: employee.id,
      employee_name: employee.name,
      work_date: getTodayKey(),
      ...getShiftConfig(),
      product_id: null,
      product_location_id: null,
      project_id: product.projectId,
      product_name: product.projectName,
      location_name: product.locationName,
      check_in_at: now,
      check_in_lat: location?.lat ?? null,
      check_in_lng: location?.lng ?? null,
      last_lat: location?.lat ?? null,
      last_lng: location?.lng ?? null,
      location_accuracy_m: location?.accuracy ?? null,
      location_captured_at: location?.capturedAt ?? null,
      status: 'working',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as AttendanceDbRecord;
}

export async function checkOut(
  record: AttendanceDbRecord,
  location: GeoPoint | null,
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
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

/** Lấy GPS im lặng — không chặn luồng chấm công nếu thất bại. */
export async function getBrowserLocationQuiet(): Promise<GeoPoint | null> {
  try {
    return await getBrowserLocation();
  } catch {
    return null;
  }
}

/**
 * Theo dõi GPS nền khi đang làm việc.
 * Trả về hàm stop để hủy watch + interval.
 */
export function startBackgroundLocationTracking(
  onLocation: (point: GeoPoint) => void | Promise<void>,
  intervalMs = 60_000,
): () => void {
  if (!navigator.geolocation || window.isSecureContext === false) {
    return () => undefined;
  }

  let stopped = false;
  let watchId: number | null = null;
  let timer: number | null = null;
  let lastSentAt = 0;

  const emit = (point: GeoPoint) => {
    if (stopped) return;
    const now = Date.now();
    if (now - lastSentAt < 15_000) return;
    lastSentAt = now;
    void onLocation(point);
  };

  const pollOnce = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => emit(mapGeolocationPosition(position)),
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 20_000 },
    );
  };

  watchId = navigator.geolocation.watchPosition(
    (position) => emit(mapGeolocationPosition(position)),
    () => undefined,
    { enableHighAccuracy: false, maximumAge: 30_000, timeout: 20_000 },
  );

  pollOnce();
  timer = window.setInterval(pollOnce, intervalMs);

  return () => {
    stopped = true;
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (timer !== null) window.clearInterval(timer);
  };
}

export async function saveLocation(record: AttendanceDbRecord, location: GeoPoint) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
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
    throw new Error('Supabase is not configured.');
  }

  const employee = await ensureCurrentEmployeeResolved();
  if (!employee) {
    throw new Error('Could not identify employee. Open the link with ?name=...');
  }

  const existing = await getActiveTodayAttendance() ?? await getTodayAttendance();
  if (existing) {
    return saveLocation(existing, location);
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .insert({
      employee_id: employee.id,
      employee_name: employee.name,
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
