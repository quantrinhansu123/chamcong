import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EmployeeIdentity } from '../lib/attendanceService';
import { getActiveTodayAttendance, getTodayAttendanceSessions } from '../lib/attendanceService';
import { getProjectsForUser } from '../lib/projectService';
import { isAnonymousUserId, isValidQueryUserId, resolveQueryUserId } from '../lib/staffService';
import {
  getProjectLocationFromDb,
  PROJECT_LOCATION_UPDATED_EVENT,
} from '../lib/projectLocationService';
import { getOfficeLocation, type OfficeLocation } from '../lib/settingsService';
import { getSupabaseConfigError } from '../lib/supabase';
import type { AttendanceDbRecord, CheckInProductSelection, ProductWithLocations } from '../types';

function completedProjectIds(sessions: AttendanceDbRecord[]) {
  return new Set(
    sessions
      .filter((row) => Boolean(row.project_id && row.check_in_at && row.check_out_at))
      .map((row) => row.project_id as string),
  );
}

export function useProductCheckIn(employee?: (EmployeeIdentity & { resolving?: boolean }) | null) {
  const employeeId = employee?.id?.trim() ?? '';
  const employeeName = employee?.name?.trim() ?? '';
  const employeeResolving = Boolean(employee?.resolving);
  const [projects, setProjects] = useState<ProductWithLocations[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceDbRecord | null>(null);
  const [todaySessions, setTodaySessions] = useState<AttendanceDbRecord[]>([]);
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
      setTodaySessions([]);
      setLoadError('Missing employee name. Open the link with ?name=... or ?userId=...');
      setLoading(false);
      return;
    }

    if (isAnonymousUserId(employeeId) && !employeeName) {
      setProjects([]);
      setTodayRecord(null);
      setTodaySessions([]);
      setLoadError('Could not identify employee. Open the link with ?name=...');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const resolvedId = isValidQueryUserId(employeeId)
        ? employeeId
        : await resolveQueryUserId({ id: employeeId, name: employeeName });

      const [projectRows, sessions] = await Promise.all([
        getProjectsForUser(resolvedId ?? employeeId, employeeName),
        getTodayAttendanceSessions().catch(() => [] as AttendanceDbRecord[]),
      ]);

      const active = sessions.find((row) => Boolean(row.check_in_at) && !row.check_out_at)
        ?? await getActiveTodayAttendance().catch(() => null);
      const latest = active ?? sessions[0] ?? null;

      setTodaySessions(sessions);
      setTodayRecord(latest);

      const isWorking = Boolean(active?.check_in_at && !active?.check_out_at);
      const doneIds = completedProjectIds(sessions);

      // Đang làm việc: khóa đúng dự án hiện tại
      if (isWorking && active?.project_id) {
        const current = projectRows.find((project) => project.id === active.project_id)
          ?? {
            id: active.project_id,
            name: active.product_name ?? active.project_id,
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

      // Ẩn dự án đã check-in + check-out trong ngày
      const available = projectRows.filter((project) => !doneIds.has(project.id));
      setProjects(available);
      setSelectedProductId((current) => {
        if (current && available.some((project) => project.id === current)) return current;
        return available.length === 1 ? available[0].id : '';
      });
    } catch (err) {
      setProjects([]);
      setTodaySessions([]);
      setLoadError(err instanceof Error ? err.message : 'Could not load project list.');
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

  const isWorking = Boolean(todayRecord?.check_in_at && !todayRecord?.check_out_at);

  const completedSessions = useMemo(
    () => todaySessions.filter((row) => Boolean(row.check_in_at && row.check_out_at)),
    [todaySessions],
  );

  const selection = useMemo((): CheckInProductSelection | null => {
    const project = projects.find((p) => p.id === selectedProductId);
    if (!project) return null;
    if (isWorking) return null;

    return {
      projectId: project.id,
      projectName: project.name,
      locationName: checkInLocation?.name ?? project.name,
    };
  }, [projects, selectedProductId, checkInLocation, isWorking]);

  return {
    products: projects,
    loading: loading || locationLoading,
    loadError,
    selectedProductId,
    selectedProjectName: selectedProject?.name ?? '',
    officeLocation: checkInLocation,
    handleProductChange: setSelectedProductId,
    selection,
    canCheckIn: Boolean(selection) && projects.length > 0 && !isWorking,
    checkedOutToday: Boolean(todayRecord?.check_out_at) && !isWorking,
    checkedInToday: isWorking,
    todaySessions,
    completedSessions,
    refreshProjects: loadData,
  };
}
