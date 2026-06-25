import type { AttendanceDbRecord } from '../types';
import type { AttendanceShiftGroup } from '../components/AttendanceSheetGrid';
import type { StaffRecord } from './staffService';
import { getAppSettings } from './settingsService';

export function normalizeEmployeeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeWorkDate(value: string) {
  return value.slice(0, 10);
}

export function buildAttendanceRecordMap(records: AttendanceDbRecord[]) {
  const map = new Map<string, AttendanceDbRecord>();

  records.forEach((record) => {
    const dateKey = normalizeWorkDate(record.work_date);
    const id = String(record.employee_id);
    const nameKey = normalizeEmployeeName(record.employee_name);

    map.set(`id:${id}:${dateKey}`, record);
    map.set(`name:${nameKey}:${dateKey}`, record);
  });

  return map;
}

export function findAttendanceRecord(
  map: Map<string, AttendanceDbRecord>,
  employee: StaffRecord,
  dateKey: string,
) {
  const id = String(employee.id);
  const nameKey = normalizeEmployeeName(employee.full_name);

  return map.get(`id:${id}:${dateKey}`) ?? map.get(`name:${nameKey}:${dateKey}`);
}

export function mergeEmployeesWithAttendance(
  employees: StaffRecord[],
  records: AttendanceDbRecord[],
): StaffRecord[] {
  const merged = new Map<string, StaffRecord>();
  const nameToId = new Map<string, string>();

  employees.forEach((employee) => {
    const id = String(employee.id);
    merged.set(id, employee);
    nameToId.set(normalizeEmployeeName(employee.full_name), id);
  });

  records.forEach((record) => {
    const recordId = String(record.employee_id);
    const nameKey = normalizeEmployeeName(record.employee_name);

    if (merged.has(recordId)) return;

    const matchedUserId = nameToId.get(nameKey);
    if (matchedUserId) return;

    merged.set(recordId, {
      id: recordId,
      full_name: record.employee_name,
      email: '',
      phone: null,
      avatar_url: null,
      department: null,
      status: 'active',
      position: null,
    });
    nameToId.set(nameKey, recordId);
  });

  return Array.from(merged.values()).sort((left, right) =>
    left.full_name.localeCompare(right.full_name, 'vi'),
  );
}

function shiftKey(name: string, start: string, end: string) {
  return `${name}|${start}|${end}`;
}

function resolveEmployeeIdForRecord(
  record: AttendanceDbRecord,
  employees: StaffRecord[],
) {
  const recordId = String(record.employee_id);
  const nameKey = normalizeEmployeeName(record.employee_name);

  const byId = employees.find((employee) => String(employee.id) === recordId);
  if (byId) return String(byId.id);

  const byName = employees.find(
    (employee) => normalizeEmployeeName(employee.full_name) === nameKey,
  );
  if (byName) return String(byName.id);

  return recordId;
}

export function buildShiftGroups(
  employees: StaffRecord[],
  records: AttendanceDbRecord[],
): AttendanceShiftGroup[] {
  const settings = getAppSettings();
  const roster = mergeEmployeesWithAttendance(employees, records);
  const activeEmployees = roster.filter((emp) => !emp.status || emp.status === 'active');
  const groups = new Map<string, AttendanceShiftGroup>();

  records.forEach((record) => {
    const key = shiftKey(record.shift_name, record.scheduled_start, record.scheduled_end);
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        name: record.shift_name,
        start: record.scheduled_start,
        end: record.scheduled_end,
        employees: [],
      });
    }
  });

  if (groups.size === 0) {
    const defaultKey = shiftKey(settings.shiftName, settings.scheduledStart, settings.scheduledEnd);
    groups.set(defaultKey, {
      id: defaultKey,
      name: settings.shiftName,
      start: settings.scheduledStart,
      end: settings.scheduledEnd,
      employees: [],
    });
  }

  const employeeShiftCount = new Map<string, Map<string, number>>();

  records.forEach((record) => {
    const key = shiftKey(record.shift_name, record.scheduled_start, record.scheduled_end);
    const employeeId = resolveEmployeeIdForRecord(record, activeEmployees);
    const counts = employeeShiftCount.get(employeeId) ?? new Map<string, number>();
    counts.set(key, (counts.get(key) ?? 0) + 1);
    employeeShiftCount.set(employeeId, counts);
  });

  const employeeAssignments = new Map<string, string>();
  const defaultGroupKey = groups.keys().next().value as string;

  activeEmployees.forEach((employee) => {
    const employeeId = String(employee.id);
    const counts = employeeShiftCount.get(employeeId);
    if (!counts || counts.size === 0) {
      employeeAssignments.set(employeeId, defaultGroupKey);
      return;
    }

    let bestKey = defaultGroupKey;
    let bestCount = -1;
    counts.forEach((count, key) => {
      if (count > bestCount) {
        bestCount = count;
        bestKey = key;
      }
    });
    employeeAssignments.set(employeeId, bestKey);
  });

  activeEmployees.forEach((employee) => {
    const employeeId = String(employee.id);
    const key = employeeAssignments.get(employeeId) ?? defaultGroupKey;
    const group = groups.get(key);
    if (!group) return;
    if (!group.employees.some((item) => String(item.id) === employeeId)) {
      group.employees.push(employee);
    }
  });

  return Array.from(groups.values())
    .filter((group) => group.employees.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

export function filterEmployeesBySearch(employees: StaffRecord[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return employees;
  return employees.filter((employee) => employee.full_name.toLowerCase().includes(normalized));
}

export function filterShiftGroupsByEmployees(
  shiftGroups: AttendanceShiftGroup[],
  employees: StaffRecord[],
): AttendanceShiftGroup[] {
  const allowedIds = new Set(employees.map((employee) => String(employee.id)));
  return shiftGroups
    .map((group) => ({
      ...group,
      employees: group.employees.filter((employee) => allowedIds.has(String(employee.id))),
    }))
    .filter((group) => group.employees.length > 0);
}
