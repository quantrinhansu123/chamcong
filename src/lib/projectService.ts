import { supabase } from './supabase';
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
