import { useEffect, useMemo, useState } from 'react';
import { getProjectsForCheckIn } from '../lib/projectService';
import { getCheckInLocation } from '../lib/settingsService';
import { getSupabaseConfigError } from '../lib/supabase';
import type { CheckInProductSelection, ProductWithLocations } from '../types';

export function useProductCheckIn() {
  const [projects, setProjects] = useState<ProductWithLocations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

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
  const checkInLocation = getCheckInLocation(selectedProductId, selectedProject?.name);

  const selection = useMemo((): CheckInProductSelection | null => {
    const project = projects.find((p) => p.id === selectedProductId);
    const location = getCheckInLocation(selectedProductId, project?.name);
    if (!project || !location) return null;

    return {
      productId: project.id,
      productLocationId: `loc-${location.lat}-${location.lng}`,
      productName: project.name,
      locationName: location.name,
    };
  }, [projects, selectedProductId, checkInLocation?.lat, checkInLocation?.lng, checkInLocation?.name]);

  return {
    products: projects,
    loading,
    loadError,
    selectedProductId,
    selectedProjectName: selectedProject?.name ?? '',
    officeLocation: checkInLocation,
    handleProductChange: setSelectedProductId,
    selection,
    canCheckIn: Boolean(selection) && projects.length > 0,
  };
}
