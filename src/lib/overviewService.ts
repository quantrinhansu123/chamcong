import { getAllEmployees, getTodayAttendanceForAll } from './attendanceService';
import {
  getProjectsForUser,
  getTeamUserIdsForProjects,
} from './projectService';

export type TodayOverview = {
  total: number;
  checkedIn: number;
  notCheckedIn: number;
  absent: number;
  projectNames: string[];
  projectCount: number;
};

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

  return {
    total: teamEmployees.length,
    checkedIn: checkedInIds.size,
    notCheckedIn: Math.max(0, teamEmployees.length - checkedInIds.size),
    absent,
    projectNames,
    projectCount: projectNames.length,
  };
}
