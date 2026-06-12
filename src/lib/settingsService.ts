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

export interface OfficeLocation {
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
}

export function getOfficeLocation(settings: AppSettings = getAppSettings()): OfficeLocation | null {
  const lat = Number(settings.officeLat);
  const lng = Number(settings.officeLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    name: settings.officeName.trim() || DEFAULT_APP_SETTINGS.officeName,
    lat,
    lng,
    radiusM: Math.max(50, Number(settings.officeRadiusM) || DEFAULT_APP_SETTINGS.officeRadiusM),
  };
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusM = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function compareWithOffice(
  point: { lat: number; lng: number },
  settings: AppSettings = getAppSettings(),
) {
  const office = getOfficeLocation(settings);
  if (!office) {
    return { configured: false as const, office: null, distanceM: 0, withinRadius: false };
  }

  const distanceM = distanceMeters(point.lat, point.lng, office.lat, office.lng);
  return {
    configured: true as const,
    office,
    distanceM,
    withinRadius: distanceM <= office.radiusM,
  };
}

export function assertWithinOfficeRadius(point: { lat: number; lng: number }) {
  const result = compareWithOffice(point);
  if (!result.configured || !result.office) {
    throw new Error('Chưa cấu hình vị trí chấm công. Vào Cài đặt → Lấy vị trí.');
  }

  if (!result.withinRadius) {
    throw new Error(
      `Bạn đang cách ${result.office.name} ${Math.round(result.distanceM)}m, vượt quá bán kính ${result.office.radiusM}m.`,
    );
  }

  return result;
}

const PROJECT_LOCATIONS_KEY = 'jarviz_project_locations';

type ProjectLocationRecord = {
  lat: string;
  lng: string;
  radiusM: number;
  updatedAt: string;
};

function readProjectLocations(): Record<string, ProjectLocationRecord> {
  try {
    const stored = localStorage.getItem(PROJECT_LOCATIONS_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as Record<string, ProjectLocationRecord>;
  } catch {
    return {};
  }
}

export function saveProjectLocation(
  projectId: string,
  point: { lat: number; lng: number },
  radiusM = getAppSettings().officeRadiusM,
) {
  const store = readProjectLocations();
  store[projectId] = {
    lat: point.lat.toFixed(6),
    lng: point.lng.toFixed(6),
    radiusM: Math.max(50, Number(radiusM) || DEFAULT_APP_SETTINGS.officeRadiusM),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(PROJECT_LOCATIONS_KEY, JSON.stringify(store));
}

export function getProjectLocation(projectId: string, projectName?: string): OfficeLocation | null {
  const record = readProjectLocations()[projectId];
  if (!record) return null;

  const lat = Number(record.lat);
  const lng = Number(record.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    name: projectName?.trim() || 'Dự án',
    lat,
    lng,
    radiusM: record.radiusM,
  };
}

export function getCheckInLocation(projectId?: string, projectName?: string): OfficeLocation | null {
  if (projectId) {
    const projectLocation = getProjectLocation(projectId, projectName);
    if (projectLocation) return projectLocation;
  }
  return getOfficeLocation();
}

export function compareWithCheckInLocation(
  point: { lat: number; lng: number },
  projectId?: string,
  projectName?: string,
) {
  const office = getCheckInLocation(projectId, projectName);
  if (!office) {
    return { configured: false as const, office: null, distanceM: 0, withinRadius: false };
  }

  const distanceM = distanceMeters(point.lat, point.lng, office.lat, office.lng);
  return {
    configured: true as const,
    office,
    distanceM,
    withinRadius: distanceM <= office.radiusM,
  };
}

export function assertWithinCheckInRadius(
  point: { lat: number; lng: number },
  projectId?: string,
  projectName?: string,
) {
  const result = compareWithCheckInLocation(point, projectId, projectName);
  if (!result.configured || !result.office) {
    throw new Error('Chưa cấu hình vị trí cho dự án này. Vào Cài đặt → Dự án → Lấy vị trí.');
  }

  if (!result.withinRadius) {
    throw new Error(
      `Bạn đang cách ${result.office.name} ${Math.round(result.distanceM)}m, vượt quá bán kính ${result.office.radiusM}m.`,
    );
  }

  return result;
}
