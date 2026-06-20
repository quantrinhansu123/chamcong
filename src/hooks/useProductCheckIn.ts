import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EmployeeIdentity } from '../lib/attendanceService';
import { getTodayAttendance } from '../lib/attendanceService';
import { getProjectsForUser } from '../lib/projectService';
import { isAnonymousUserId, isValidQueryUserId, resolveQueryUserId } from '../lib/staffService';
import {
  getProjectLocationFromDb,
  PROJECT_LOCATION_UPDATED_EVENT,
} from '../lib/projectLocationService';
import { getOfficeLocation, type OfficeLocation } from '../lib/settingsService';
import { getSupabaseConfigError } from '../lib/supabase';
import type { AttendanceDbRecord, CheckInProductSelection, ProductWithLocations } from '../types';

export function useProductCheckIn(employee?: (EmployeeIdentity & { resolving?: boolean }) | null) {
  const employeeId = employee?.id?.trim() ?? '';
  const employeeName = employee?.name?.trim() ?? '';
  const employeeResolving = Boolean(employee?.resolving);
  const [projects, setProjects] = useState<ProductWithLocations[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceDbRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkInLocation, setCheckInLocation] = useState<OfficeLocation | null>(null);

  const loadData = useCallback(async () => {
    if (getSupabaseConfigError()) {
      setLoading(false);
      return;
    }

    if (employeeResolving) {
      return;
    }

    if (!employeeId || !employeeName) {
      setProjects([]);
      setTodayRecord(null);
      setLoadError('Thiếu tên nhân viên. Mở link có tham số ?name=... hoặc ?userId=...');
      setLoading(false);
      return;
    }

    if (isAnonymousUserId(employeeId) && !employeeName) {
      setProjects([]);
      setTodayRecord(null);
      setLoadError('Không xác định được nhân viên. Mở link với ?name=...');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const resolvedId = isValidQueryUserId(employeeId)
        ? employeeId
        : await resolveQueryUserId({ id: employeeId, name: employeeName });

      const [projectRows, record] = await Promise.all([
        getProjectsForUser(resolvedId ?? employeeId, employeeName),
        getTodayAttendance().catch(() => null),
      ]);

      setTodayRecord(record);

      if (record?.check_out_at) {
        setProjects([]);
        setSelectedProductId('');
        return;
      }

      if (record?.check_in_at && record.project_id) {
        const current = projectRows.find((project) => project.id === record.project_id)
          ?? {
            id: record.project_id,
            name: record.product_name ?? record.project_id,
            code: null,
            is_active: true,
            created_at: '',
            updated_at: '',
            locations: [],
          };
        setProjects([current]);
        setSelectedProductId(current.id);
        return;
      }

      setProjects(projectRows);
      setSelectedProductId((current) => {
        if (current && projectRows.some((project) => project.id === current)) return current;
        return projectRows.length === 1 ? projectRows[0].id : '';
      });
    } catch (err) {
      setProjects([]);
      setLoadError(err instanceof Error ? err.message : 'Không tải được danh sách dự án.');
    } finally {
      setLoading(false);
    }
  }, [employeeId, employeeName, employeeResolving]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    if (todayRecord?.check_out_at) return null;

    return {
      projectId: project.id,
      projectName: project.name,
      locationName: checkInLocation.name,
    };
  }, [projects, selectedProductId, checkInLocation, todayRecord?.check_out_at]);

  const checkedOutToday = Boolean(todayRecord?.check_out_at);
  const checkedInToday = Boolean(todayRecord?.check_in_at && !todayRecord.check_out_at);

  return {
    products: projects,
    loading: loading || locationLoading,
    loadError,
    selectedProductId,
    selectedProjectName: selectedProject?.name ?? '',
    officeLocation: checkInLocation,
    handleProductChange: setSelectedProductId,
    selection,
    canCheckIn: Boolean(selection) && projects.length > 0 && !checkedOutToday,
    checkedOutToday,
    checkedInToday,
    refreshProjects: loadData,
  };
}
