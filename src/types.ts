export type Screen = 'home' | 'attendance' | 'history' | 'employees' | 'reports' | 'settings';

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
