import { getTeamUserIdsForProjects } from './projectService';
import { isValidQueryUserId, resolveQueryUserId } from './staffService';
import { supabase } from './supabase';

export type WorkTask = {
  id: string;
  name: string;
  featureId: string | null;
};

type TaskRow = {
  task_id: string | number;
  name: string;
  feature_id?: string | number | null;
};

async function resolveEffectiveUserId(userId: string, userName?: string): Promise<string | null> {
  const trimmedId = userId.trim();
  if (isValidQueryUserId(trimmedId)) return trimmedId;
  if (!userName?.trim()) return null;
  return resolveQueryUserId({ id: trimmedId, name: userName.trim() });
}

export async function getTasksForUser(userId: string, userName?: string): Promise<WorkTask[]> {
  const effectiveId = await resolveEffectiveUserId(userId, userName);
  if (!supabase || !effectiveId) return [];

  const { data, error } = await supabase
    .from('tasks')
    .select('task_id, name, feature_id')
    .eq('assigned_to', effectiveId)
    .order('name', { ascending: true });

  if (error || !data?.length) return [];

  return (data as TaskRow[]).map((row) => ({
    id: String(row.task_id),
    name: row.name,
    featureId: row.feature_id != null ? String(row.feature_id) : null,
  }));
}

async function getProjectIdsForFeatures(featureIds: string[]): Promise<string[]> {
  if (!supabase || featureIds.length === 0) return [];

  const { data, error } = await supabase
    .from('features')
    .select('project_id')
    .in('feature_id', featureIds);

  if (error || !data?.length) return [];

  return Array.from(
    new Set(
      data
        .map((row) => String((row as { project_id?: string | number | null }).project_id ?? ''))
        .filter(Boolean),
    ),
  );
}

export async function getTeamUserIdsForWorkTasks(
  featureIds: string[],
  projectIds: string[],
): Promise<string[]> {
  const assigneeIds = new Set<string>();

  if (supabase && featureIds.length > 0) {
    const { data, error } = await supabase
      .from('tasks')
      .select('assigned_to')
      .in('feature_id', featureIds)
      .not('assigned_to', 'is', null);

    if (!error && data?.length) {
      data.forEach((row) => {
        const id = String((row as { assigned_to?: string | number | null }).assigned_to ?? '');
        if (isValidQueryUserId(id)) assigneeIds.add(id);
      });
    }
  }

  if (projectIds.length > 0) {
    const sessionUserIds = await getTeamUserIdsForProjects(projectIds);
    sessionUserIds.forEach((id) => assigneeIds.add(id));
  }

  return Array.from(assigneeIds);
}

export async function getProjectIdsForUserTasks(userId: string, userName?: string): Promise<string[]> {
  const tasks = await getTasksForUser(userId, userName);
  const featureIds = Array.from(
    new Set(tasks.map((task) => task.featureId).filter(Boolean) as string[]),
  );
  return getProjectIdsForFeatures(featureIds);
}
