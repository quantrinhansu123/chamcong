import { supabase } from './supabase';
import { isValidQueryUserId, resolveQueryUserId } from './staffService';
import type { ProductWithLocations } from '../types';

type ProjectRow = {
  project_id: string;
  name: string;
  status: string | null;
};

function mapProject(row: ProjectRow): ProductWithLocations {
  const id = String(row.project_id);
  return {
    id,
    name: row.name,
    code: null,
    is_active: true,
    created_at: '',
    updated_at: '',
    locations: [],
  };
}

export async function getProjectsForCheckIn(): Promise<ProductWithLocations[]> {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  const { data, error } = await supabase
    .from('projects')
    .select('project_id, name, status')
    .order('name', { ascending: true });

  if (error) throw error;
  if (!data?.length) return [];

  return (data as ProjectRow[]).map(mapProject);
}

export async function getAllProjects(): Promise<ProductWithLocations[]> {
  return getProjectsForCheckIn();
}

async function getProjectIdsFromWorkSessions(userId: string): Promise<string[]> {
  if (!supabase || !isValidQueryUserId(userId)) return [];

  const { data, error } = await supabase
    .from('work_sessions')
    .select('project_id')
    .eq('user_id', userId);

  if (error || !data?.length) return [];

  return Array.from(
    new Set(
      data
        .map((row) => String((row as { project_id?: string | number | null }).project_id ?? ''))
        .filter(Boolean),
    ),
  );
}

async function resolveEffectiveUserId(userId: string, userName?: string): Promise<string | null> {
  const trimmedId = userId.trim();
  if (isValidQueryUserId(trimmedId)) return trimmedId;
  if (!userName?.trim()) return null;
  return resolveQueryUserId({ id: trimmedId, name: userName.trim() });
}

export async function getManagedProjectIds(userId: string, userName?: string): Promise<string[]> {
  if (!supabase) return [];

  const effectiveId = await resolveEffectiveUserId(userId, userName);
  if (!effectiveId || !isValidQueryUserId(effectiveId)) return [];

  return getProjectIdsFromWorkSessions(effectiveId);
}

export async function getTeamUserIdsForProjects(projectIds: string[]): Promise<string[]> {
  if (!supabase || projectIds.length === 0) return [];

  const { data, error } = await supabase
    .from('work_sessions')
    .select('user_id')
    .in('project_id', projectIds);

  if (error || !data?.length) return [];

  return Array.from(
    new Set(
      data
        .map((row) => String((row as { user_id?: string | number | null }).user_id ?? ''))
        .filter(Boolean),
    ),
  );
}

export async function getProjectsInCharge(userId: string, userName?: string): Promise<ProductWithLocations[]> {
  const projectIds = await getManagedProjectIds(userId, userName);
  if (projectIds.length === 0) return [];
  return getProjectsByIds(projectIds);
}

async function getProjectsByIds(projectIds: string[]): Promise<ProductWithLocations[]> {
  if (!supabase || projectIds.length === 0) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('project_id, name, status')
    .in('project_id', projectIds)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as ProjectRow[] | null)?.map(mapProject) ?? [];
}

export async function getProjectsForUser(userId: string, userName?: string): Promise<ProductWithLocations[]> {
  const effectiveId = await resolveEffectiveUserId(userId, userName);
  if (!effectiveId) return getProjectsForCheckIn();

  const sessionProjectIds = await getProjectIdsFromWorkSessions(effectiveId).catch(() => []);
  if (sessionProjectIds.length > 0) {
    const projects = await getProjectsByIds(sessionProjectIds);
    if (projects.length > 0) return projects;
  }

  return getProjectsForCheckIn();
}
