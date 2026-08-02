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
  shiftName: 'Standard shift',
  scheduledStart: '08:00',
  scheduledEnd: '17:30',
  officeName: 'Jarviz Office',
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
  return settings.officeName || 'Office GPS not configured';
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
    throw new Error('Check-in location is not configured. Go to Settings → Get location.');
  }

  if (!result.withinRadius) {
    throw new Error(
      `You are ${Math.round(result.distanceM)}m from ${result.office.name}, outside the ${result.office.radiusM}m radius.`,
    );
  }

  return result;
}

export function compareWithLocation(
  point: { lat: number; lng: number },
  location: OfficeLocation | null,
) {
  if (!location) {
    return { configured: false as const, office: null, distanceM: 0, withinRadius: false };
  }

  const distanceM = distanceMeters(point.lat, point.lng, location.lat, location.lng);
  return {
    configured: true as const,
    office: location,
    distanceM,
    withinRadius: distanceM <= location.radiusM,
  };
}

export function assertWithinLocation(
  point: { lat: number; lng: number },
  location: OfficeLocation | null,
) {
  const result = compareWithLocation(point, location);
  if (!result.configured || !result.office) {
    throw new Error('Location is not configured for this project. Go to Settings → Projects → Save coordinates.');
  }

  if (!result.withinRadius) {
    throw new Error(
      `You are ${Math.round(result.distanceM)}m from ${result.office.name}, outside the ${result.office.radiusM}m radius.`,
    );
  }

  return result;
}

export function compareWithCheckInLocation(
  point: { lat: number; lng: number },
  projectId?: string,
  projectName?: string,
) {
  void projectId;
  void projectName;
  return compareWithLocation(point, getOfficeLocation());
}

export function assertWithinCheckInRadius(
  point: { lat: number; lng: number },
  _projectId?: string,
  _projectName?: string,
) {
  return assertWithinLocation(point, getOfficeLocation());
}
