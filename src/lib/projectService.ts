import { normalizeEmployeeName } from './attendanceSheetUtils';
import { isValidQueryUserId, resolveQueryUserId } from './staffService';
import { supabase } from './supabase';
import type { ProductWithLocations } from '../types';

type ProjectRow = {
  project_id: string;
  name: string;
  status: string | null;
  assignees?: unknown;
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

function assigneeMatchesName(assignee: unknown, targetNames: string[]) {
  const assigneeName = typeof assignee === 'string'
    ? assignee
    : assignee && typeof assignee === 'object' && 'name' in assignee
      ? String((assignee as { name?: string }).name ?? '')
      : String(assignee ?? '');

  if (!assigneeName.trim()) return false;

  const normalizedAssignee = normalizeEmployeeName(assigneeName);
  return targetNames.some((target) => {
    const normalizedTarget = normalizeEmployeeName(target);
    if (!normalizedTarget) return false;
    return normalizedAssignee === normalizedTarget
      || normalizedAssignee.includes(normalizedTarget)
      || normalizedTarget.includes(normalizedAssignee);
  });
}

async function collectNamesForAssigneeMatch(_userId: string, userName?: string): Promise<string[]> {
  const names = new Set<string>();

  // Chỉ lấy tên từ đường link (?name=...)
  if (userName?.trim()) {
    names.add(userName.trim());
    return Array.from(names);
  }

  // Fallback: nếu không có ?name= mà userId là tên (không phải UUID)
  if (_userId?.trim() && !isValidQueryUserId(_userId)) {
    names.add(_userId.trim());
  }

  return Array.from(names);
}

async function getProjectsByAssigneeNames(names: string[]): Promise<ProductWithLocations[]> {
  const uniqueNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
  if (!supabase || uniqueNames.length === 0) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('project_id, name, status, assignees')
    .not('assignees', 'is', null)
    .order('name', { ascending: true });

  if (error) throw error;
  if (!data?.length) return [];

  return (data as ProjectRow[])
    .filter((row) => Array.isArray(row.assignees)
      && row.assignees.some((assignee) => assigneeMatchesName(assignee, uniqueNames)))
    .map(mapProject);
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

/** Chỉ dự án có tên trên link (?name=) nằm trong assignees. */
export async function getProjectsForUser(userId: string, userName?: string): Promise<ProductWithLocations[]> {
  const namesToMatch = await collectNamesForAssigneeMatch(userId, userName);
  if (namesToMatch.length === 0) return [];
  return getProjectsByAssigneeNames(namesToMatch);
}
