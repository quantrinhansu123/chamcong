export interface AppSettings {
  shiftName: string;
  scheduledStart: string;
  scheduledEnd: string;
  officeName: string;
  officeLat: string;
  officeLng: string;
  officeRadiusM: number;
  notificationsEnabled: boolean;
  remindBeforeShift: boolean;
  lateGraceMinutes: number;
}

const SETTINGS_STORAGE_KEY = 'jarviz_app_settings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  shiftName: 'Ca hành chính',
  scheduledStart: '08:00',
  scheduledEnd: '17:30',
  officeName: 'Văn phòng Jarviz',
  officeLat: '',
  officeLng: '',
  officeRadiusM: 200,
  notificationsEnabled: true,
  remindBeforeShift: true,
  lateGraceMinutes: 0,
};

export function getAppSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return { ...DEFAULT_APP_SETTINGS };

    const parsed = JSON.parse(stored) as Partial<AppSettings>;
    return { ...DEFAULT_APP_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function saveAppSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function getShiftConfig() {
  const settings = getAppSettings();
  return {
    shift_name: settings.shiftName.trim() || DEFAULT_APP_SETTINGS.shiftName,
    scheduled_start: settings.scheduledStart.trim() || DEFAULT_APP_SETTINGS.scheduledStart,
    scheduled_end: settings.scheduledEnd.trim() || DEFAULT_APP_SETTINGS.scheduledEnd,
  };
}

export function formatShiftSummary(settings: AppSettings = getAppSettings()) {
  return `${settings.shiftName} · ${settings.scheduledStart}–${settings.scheduledEnd}`;
}

export function formatLocationSummary(settings: AppSettings = getAppSettings()) {
  if (settings.officeLat && settings.officeLng) {
    return `${settings.officeName} (${settings.officeRadiusM}m)`;
  }
  return settings.officeName || 'Chưa cấu hình GPS văn phòng';
}
