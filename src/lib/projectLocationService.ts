import { supabase } from './supabase';
import type { OfficeLocation } from './settingsService';

type ProjectLocationRow = {
  project_id: string;
  lat: number;
  lng: number;
  radius_m: number;
};

function mapRow(row: ProjectLocationRow, projectName?: string): OfficeLocation {
  return {
    name: projectName?.trim() || 'Dự án',
    lat: Number(row.lat),
    lng: Number(row.lng),
    radiusM: Math.max(50, Number(row.radius_m) || 200),
  };
}

export const PROJECT_LOCATION_UPDATED_EVENT = 'project-location-updated';

export function notifyProjectLocationUpdated(projectId: string) {
  window.dispatchEvent(new CustomEvent(PROJECT_LOCATION_UPDATED_EVENT, { detail: { projectId } }));
}

export async function getAllProjectLocationsFromDb(): Promise<Record<string, OfficeLocation>> {
  if (!supabase) return {};

  const { data, error } = await supabase
    .from('project_checkin_locations')
    .select('project_id, lat, lng, radius_m');

  if (error) throw error;

  const result: Record<string, OfficeLocation> = {};
  for (const row of (data ?? []) as ProjectLocationRow[]) {
    result[row.project_id] = mapRow(row);
  }
  return result;
}

export function getGoogleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export async function getProjectLocationFromDb(
  projectId: string,
  projectName?: string,
): Promise<OfficeLocation | null> {
  if (!supabase || !projectId) return null;

  const { data, error } = await supabase
    .from('project_checkin_locations')
    .select('project_id, lat, lng, radius_m')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapRow(data as ProjectLocationRow, projectName);
}

export async function saveProjectLocationToDb(
  projectId: string,
  point: { lat: number; lng: number },
  radiusM: number,
) {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  const { error } = await supabase
    .from('project_checkin_locations')
    .upsert(
      {
        project_id: projectId,
        lat: point.lat,
        lng: point.lng,
        radius_m: Math.max(50, Number(radiusM) || 200),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id' },
    );

  if (error) throw error;
  notifyProjectLocationUpdated(projectId);
}

export async function getConfiguredProjectLocationCount(): Promise<number> {
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('project_checkin_locations')
    .select('project_id', { count: 'exact', head: true });

  if (error) return 0;
  return count ?? 0;
}
