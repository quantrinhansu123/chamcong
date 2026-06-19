import { useCallback, useEffect, useMemo, useState } from 'react';
import { getProjectsForCheckIn } from '../lib/projectService';
import {
  getProjectLocationFromDb,
  PROJECT_LOCATION_UPDATED_EVENT,
} from '../lib/projectLocationService';
import { getOfficeLocation, type OfficeLocation } from '../lib/settingsService';
import { getSupabaseConfigError } from '../lib/supabase';
import type { CheckInProductSelection, ProductWithLocations } from '../types';

export function useProductCheckIn() {
  const [projects, setProjects] = useState<ProductWithLocations[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkInLocation, setCheckInLocation] = useState<OfficeLocation | null>(null);

  useEffect(() => {
    if (getSupabaseConfigError()) {
      setLoading(false);
      return;
    }

    getProjectsForCheckIn()
      .then((rows) => {
        setProjects(rows);
        setLoadError(null);
        if (rows.length === 1) {
          setSelectedProductId(rows[0].id);
        }
      })
      .catch((err) => {
        setProjects([]);
        setLoadError(err instanceof Error ? err.message : 'Không tải được danh sách dự án.');
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProductId) ?? null;

  const loadProjectLocation = useCallback(async (projectId: string, projectName?: string) => {
    if (!projectId) {
      setCheckInLocation(null);
      return;
    }

    setLocationLoading(true);
    try {
      const fromDb = await getProjectLocationFromDb(projectId, projectName);
      setCheckInLocation(fromDb ?? getOfficeLocation());
    } catch {
      setCheckInLocation(getOfficeLocation());
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjectLocation(selectedProductId, selectedProject?.name);
  }, [selectedProductId, selectedProject?.name, loadProjectLocation]);

  useEffect(() => {
    const handleUpdated = (event: Event) => {
      const projectId = (event as CustomEvent<{ projectId: string }>).detail?.projectId;
      if (projectId && projectId === selectedProductId) {
        loadProjectLocation(selectedProductId, selectedProject?.name);
      }
    };

    window.addEventListener(PROJECT_LOCATION_UPDATED_EVENT, handleUpdated);
    return () => window.removeEventListener(PROJECT_LOCATION_UPDATED_EVENT, handleUpdated);
  }, [selectedProductId, selectedProject?.name, loadProjectLocation]);

  const selection = useMemo((): CheckInProductSelection | null => {
    const project = projects.find((p) => p.id === selectedProductId);
    if (!project || !checkInLocation) return null;

    return {
      projectId: project.id,
      projectName: project.name,
      locationName: checkInLocation.name,
    };
  }, [projects, selectedProductId, checkInLocation]);

  return {
    products: projects,
    loading: loading || locationLoading,
    loadError,
    selectedProductId,
    selectedProjectName: selectedProject?.name ?? '',
    officeLocation: checkInLocation,
    handleProductChange: setSelectedProductId,
    selection,
    canCheckIn: Boolean(selection) && projects.length > 0,
  };
}
