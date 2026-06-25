import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import type { AttendanceDbRecord } from '../types';
import type { EmployeeRecord } from '../lib/attendanceService';
import { isLate, toDateKey } from '../lib/attendanceUtils';

type CellStatus = 'on-time' | 'late' | 'absent' | 'empty';

interface AttendanceStatusGridProps {
  employees: EmployeeRecord[];
  records: AttendanceDbRecord[];
  year: number;
  monthIndex: number;
  daysInMonth: number;
}

const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function getWeeksInMonth(year: number, month: number, daysInMonth: number) {
  const weeks: number[][] = [];
  let currentWeek: number[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    currentWeek.push(day);
    const weekday = new Date(year, month, day).getDay();
    if (weekday === 0 || day === daysInMonth) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) weeks.push(currentWeek);
  return weeks;
}

function getCellStatus(record?: AttendanceDbRecord): CellStatus {
  if (!record) return 'empty';
  if (!record.check_in_at) return 'absent';
  if (isLate(record)) return 'late';
  return 'on-time';
}

function StatusIcon({ status }: { status: CellStatus }) {
  if (status === 'on-time') {
    return <CheckCircle2 size={14} className="text-emerald-600 fill-emerald-100" />;
  }
  if (status === 'late') {
    return <AlertTriangle size={14} className="text-amber-500 fill-amber-100" />;
  }
  if (status === 'absent') {
    return <XCircle size={14} className="text-red-500 fill-red-100" />;
  }
  return <span className="text-[10px] text-outline/30 font-bold">—</span>;
}

export default function AttendanceStatusGrid({
  employees,
  records,
  year,
  monthIndex,
  daysInMonth,
}: AttendanceStatusGridProps) {
  const [weekIndex, setWeekIndex] = useState(0);

  const recordMap = useMemo(() => {
    const map = new Map<string, AttendanceDbRecord>();
    records.forEach((record) => map.set(`${record.employee_id}:${record.work_date}`, record));
    return map;
  }, [records]);

  const weeks = useMemo(
    () => getWeeksInMonth(year, monthIndex, daysInMonth),
    [year, monthIndex, daysInMonth],
  );

  const currentWeekDays = weeks[weekIndex] ?? [];

  const rows = useMemo(() => {
    return employees.map((employee) => {
      const days = Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const dateKey = toDateKey(new Date(year, monthIndex, day));
        const record = recordMap.get(`${employee.id}:${dateKey}`);
        return { day, status: getCellStatus(record), record };
      });

      const employeeRecords = records.filter((r) => String(r.employee_id) === String(employee.id));
      let onTime = 0;
      let late = 0;
      let absent = 0;
      employeeRecords.forEach((record) => {
        const status = getCellStatus(record);
        if (status === 'on-time') onTime += 1;
        else if (status === 'late') late += 1;
        else if (status === 'absent') absent += 1;
      });

      const weekProjects = Array.from(
        currentWeekDays.reduce((names, day) => {
          const dateKey = toDateKey(new Date(year, monthIndex, day));
          const record = recordMap.get(`${employee.id}:${dateKey}`);
          if (record?.product_name) names.add(record.product_name);
          return names;
        }, new Set<string>()),
      );

      return { employee, days, onTime, late, absent, weekProjects };
    });
  }, [employees, records, recordMap, year, monthIndex, daysInMonth, currentWeekDays]);

  if (employees.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-5 text-sm font-medium text-on-surface-variant text-center">
        Chưa có nhân sự để hiển thị bảng công.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between bg-surface-container-low rounded-lg px-2.5 py-1.5">
        <button
          type="button"
          disabled={weekIndex === 0}
          onClick={() => setWeekIndex((i) => i - 1)}
          className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-[12px] font-bold text-primary">
          Tuần {weekIndex + 1}/{weeks.length}
          {currentWeekDays.length > 0 && (
            <span className="text-on-surface-variant font-medium">
              {' '}· ngày {currentWeekDays[0]}–{currentWeekDays[currentWeekDays.length - 1]}
            </span>
          )}
        </span>
        <button
          type="button"
          disabled={weekIndex >= weeks.length - 1}
          onClick={() => setWeekIndex((i) => i + 1)}
          className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant/10">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant/10">
              <th className="sticky left-0 z-20 bg-surface-container-low px-3 py-2.5 text-[10px] font-bold text-on-surface-variant uppercase text-left min-w-[100px] border-r border-outline-variant/10">
                Nhân viên
              </th>
              <th className="sticky left-[100px] z-20 bg-surface-container-low px-2 py-2.5 text-[10px] font-bold text-on-surface-variant uppercase text-left min-w-[88px] border-r border-outline-variant/10">
                Dự án
              </th>
              {currentWeekDays.map((day) => {
                const date = new Date(year, monthIndex, day);
                return (
                  <th key={day} className="px-1 py-2.5 text-center min-w-[44px]">
                    <p className="text-[9px] text-on-surface-variant">{weekdayLabels[date.getDay()]}</p>
                    <p className="text-[11px] font-bold text-primary">{day}</p>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employee.id} className="border-b border-outline-variant/5 last:border-0">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 border-r border-outline-variant/10">
                  <p className="text-[10px] font-bold text-primary truncate max-w-[96px]">
                    {row.employee.full_name}
                  </p>
                </td>
                <td className="sticky left-[100px] z-10 bg-white px-2 py-2 border-r border-outline-variant/10 align-top">
                  {row.weekProjects.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {row.weekProjects.map((name) => (
                        <p key={name} className="text-[8px] font-semibold text-emerald-700 leading-tight line-clamp-2" title={name}>
                          {name}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[9px] text-outline/40">—</span>
                  )}
                </td>
                {currentWeekDays.map((day) => {
                  const cell = row.days[day - 1];
                  return (
                    <td key={day} className="px-1 py-2 text-center align-middle">
                      <div className="flex flex-col items-center gap-0.5">
                        <StatusIcon status={cell.status} />
                        {cell.record?.product_name && (
                          <span
                            className="text-[7px] font-semibold text-on-surface-variant leading-none max-w-[34px] truncate"
                            title={cell.record.product_name}
                          >
                            {cell.record.product_name}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-container-low border-t border-outline-variant/10">
              <td className="sticky left-0 z-10 bg-surface-container-low px-3 py-3 text-[10px] font-bold text-on-surface-variant uppercase border-r border-outline-variant/10">
                Tổng hợp
              </td>
              <td className="sticky left-[100px] z-10 bg-surface-container-low border-r border-outline-variant/10" />
              {currentWeekDays.map((day) => {
                let onTime = 0;
                let late = 0;
                let absent = 0;
                rows.forEach((row) => {
                  const status = row.days[day - 1].status;
                  if (status === 'on-time') onTime += 1;
                  else if (status === 'late') late += 1;
                  else if (status === 'absent') absent += 1;
                });

                return (
                  <td key={day} className="px-0.5 py-2 text-center align-top">
                    <div className="flex flex-col items-center gap-0.5 text-[8px] font-bold leading-none">
                      {onTime > 0 && <span className="text-emerald-600">{onTime}✓</span>}
                      {late > 0 && <span className="text-amber-500">{late}!</span>}
                      {absent > 0 && <span className="text-red-500">{absent}✕</span>}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
