export type Screen = 'home' | 'history' | 'reports' | 'settings';

export const ROUTES = {
  home: '/',
  reports: '/bao-cao',
  attendanceSheet: '/bang-cong',
  settings: '/cai-dat',
  history: '/lich-su',
  desktopChamCong: '/desktop/cham-cong',
} as const;

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'online' | 'offline' | 'absent';
  checkInTime?: string;
  avatar?: string;
}

export interface AttendanceRecord {
  date: string;
  day: string;
  shift: string;
  checkIn: string;
  checkOut: string;
  duration: string;
  status: 'on-time' | 'late' | 'absent';
  lateMinutes?: number;
}

export type AttendanceStatus = 'not_checked_in' | 'working' | 'checked_out';

export interface Product {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductLocation {
  id: string;
  product_id: string;
  name: string;
  lat: number;
  lng: number;
  radius_m: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithLocations extends Product {
  locations: ProductLocation[];
}

export interface AttendanceDbRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  work_date: string;
  shift_name: string;
  scheduled_start: string;
  scheduled_end: string;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  last_lat: number | null;
  last_lng: number | null;
  location_accuracy_m: number | null;
  location_captured_at: string | null;
  project_id: string | null;
  product_id: string | null;
  product_location_id: string | null;
  product_name: string | null;
  location_name: string | null;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export interface CheckInProductSelection {
  projectId: string;
  projectName: string;
  locationName: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy: number | null;
  capturedAt: string;
}
