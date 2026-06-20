import { getAllEmployees, getTodayAttendanceForAll } from './attendanceService';
import type { AttendanceDbRecord } from '../types';
import {
  getProjectsForUser,
  getTeamUserIdsForProjects,
} from './projectService';

export type TodaySiteVisit = {
  id: string;
  projectId: string;
  projectName: string;
  locationName: string | null;
  employeeId: string;
  employeeName: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: 'working' | 'checked_out';
};

export type TodayOverview = {
  total: number;
  checkedIn: number;
  notCheckedIn: number;
  absent: number;
  projectNames: string[];
  projectCount: number;
  siteVisits: TodaySiteVisit[];
};

function mapSiteVisit(record: AttendanceDbRecord): TodaySiteVisit | null {
  if (!record.check_in_at || !record.project_id) return null;

  return {
    id: record.id,
    projectId: String(record.project_id),
    projectName: record.product_name?.trim() || String(record.project_id),
    locationName: record.location_name,
    employeeId: String(record.employee_id),
    employeeName: record.employee_name,
    checkInAt: record.check_in_at,
    checkOutAt: record.check_out_at,
    status: record.check_out_at ? 'checked_out' : 'working',
  };
}

function buildSiteVisits(
  todayRecords: AttendanceDbRecord[],
  projectIds: Set<string>,
): TodaySiteVisit[] {
  return todayRecords
    .filter((record) => record.project_id && projectIds.has(String(record.project_id)))
    .map(mapSiteVisit)
    .filter((visit): visit is TodaySiteVisit => visit != null)
    .sort((a, b) => {
      const aTime = a.checkInAt ? new Date(a.checkInAt).getTime() : 0;
      const bTime = b.checkInAt ? new Date(b.checkInAt).getTime() : 0;
      return bTime - aTime;
    });
}

export async function getTodayOverviewForProjects(
  userId: string,
  userName?: string,
): Promise<TodayOverview> {
  const userProjects = await getProjectsForUser(userId, userName);
  const projectIds = new Set(userProjects.map((project) => project.id));
  const projectNames = userProjects.map((project) => project.name);

  if (projectIds.size === 0) {
    return {
      total: 0,
      checkedIn: 0,
      notCheckedIn: 0,
      absent: 0,
      projectNames: [],
      projectCount: 0,
      siteVisits: [],
    };
  }

  const teamUserIds = await getTeamUserIdsForProjects(Array.from(projectIds));
  const teamIdSet = new Set(teamUserIds.map(String));

  const [employees, todayRecords] = await Promise.all([
    getAllEmployees(),
    getTodayAttendanceForAll(),
  ]);

  const teamEmployees = employees.filter(
    (emp) => teamIdSet.has(String(emp.id)) && (!emp.status || emp.status === 'active'),
  );

  const projectRecords = todayRecords.filter(
    (record) => record.project_id && projectIds.has(String(record.project_id)),
  );

  const checkedInIds = new Set(
    projectRecords
      .filter((record) => record.check_in_at && !record.check_out_at)
      .map((record) => String(record.employee_id)),
  );

  const absent = projectRecords.filter((record) => !record.check_in_at).length;

  const siteVisits = buildSiteVisits(todayRecords, projectIds);

  return {
    total: teamEmployees.length,
    checkedIn: checkedInIds.size,
    notCheckedIn: Math.max(0, teamEmployees.length - checkedInIds.size),
    absent,
    projectNames,
    projectCount: projectNames.length,
    siteVisits,
  };
}
