import { useMemo } from 'react';
import { Check, Clock3, Plus } from 'lucide-react';
import type { AttendanceDbRecord } from '../types';
import type { StaffRecord } from '../lib/staffService';
import { isLate, toDateKey } from '../lib/attendanceUtils';
import {
  buildAttendanceRecordMap,
  findAttendanceRecords,
  normalizeWorkDate,
} from '../lib/attendanceSheetUtils';

export interface AttendanceShiftGroup {
  id: string;
  name: string;
  start: string;
  end: string;
  employees: StaffRecord[];
}

interface AttendanceSheetGridProps {
  shiftGroups: AttendanceShiftGroup[];
  records: AttendanceDbRecord[];
  year: number;
  monthIndex: number;
  today: Date;
}

const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

type DayCellStatus = 'present' | 'late' | 'absent' | 'empty' | 'future' | 'working';

function formatShiftTime(value: string) {
  return value.slice(0, 5);
}

function formatClock(value?: string | null) {
  if (!value) return '--:--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function shortProjectName(record: AttendanceDbRecord) {
  const name = (record.product_name || record.location_name || record.project_id || 'Project').trim();
  return name.length > 14 ? `${name.slice(0, 13)}…` : name;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  );
}

function getSessionStatus(
  record: AttendanceDbRecord,
  dayDate: Date,
  today: Date,
): DayCellStatus {
  const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (dayStart > todayStart) return 'future';
  if (!record.check_in_at) return 'absent';

  if (isSameDay(dayDate, today) && !record.check_out_at) {
    return isLate(record) ? 'late' : 'working';
  }

  if (isLate(record)) return 'late';
  return 'present';
}

function getDayAggregateStatus(
  sessions: AttendanceDbRecord[],
  dayDate: Date,
  today: Date,
): DayCellStatus {
  const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (dayStart > todayStart) return 'future';

  const withCheckIn = sessions.filter((row) => Boolean(row.check_in_at));
  if (withCheckIn.length === 0) {
    return dayStart < todayStart ? 'absent' : 'empty';
  }

  if (withCheckIn.some((row) => !row.check_out_at)) {
    return withCheckIn.some((row) => !row.check_out_at && isLate(row)) ? 'late' : 'working';
  }

  if (withCheckIn.some((row) => isLate(row))) return 'late';
  return 'present';
}

const sessionStyles = {
  present: {
    box: 'bg-red-50 border-red-200 text-red-800',
    icon: 'text-red-600',
  },
  working: {
    box: 'bg-rose-100 border-rose-300 text-rose-900',
    icon: 'text-rose-700',
  },
  late: {
    box: 'bg-orange-50 border-orange-200 text-orange-800',
    icon: 'text-orange-500',
  },
  absent: {
    box: 'bg-red-50 border-red-200 text-red-700',
    icon: 'text-red-500',
  },
} as const;

function DayCell({
  sessions,
  dayDate,
  today,
}: {
  sessions: AttendanceDbRecord[];
  dayDate: Date;
  today: Date;
}) {
  const status = getDayAggregateStatus(sessions, dayDate, today);
  const visible = sessions.filter((row) => Boolean(row.check_in_at));

  if (status === 'future') {
    return <span className="inline-block h-5 w-5 rounded-md border border-slate-200 bg-slate-100/80" />;
  }

  if (status === 'absent') {
    const style = sessionStyles.absent;
    return (
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-md border ${style.box}`}
        title="Absent / no check-in"
      >
        <Check size={12} strokeWidth={3} className={style.icon} />
      </span>
    );
  }

  if (status === 'empty' || visible.length === 0) {
    return <span className="inline-block h-5 w-5 rounded-md border border-slate-200/80 bg-slate-50" />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[96px] flex-col gap-0.5 px-0.5">
      {visible.map((session) => {
        const sessionStatus = getSessionStatus(session, dayDate, today);
        const style =
          sessionStatus === 'working' || sessionStatus === 'late' || sessionStatus === 'present'
            ? sessionStyles[sessionStatus]
            : sessionStyles.present;
        const title = [
          session.product_name || session.project_id || 'Project',
          `In ${formatClock(session.check_in_at)}`,
          session.check_out_at ? `Out ${formatClock(session.check_out_at)}` : 'Working',
        ].join(' · ');

        return (
          <div
            key={session.id}
            title={title}
            className={`flex items-center gap-0.5 rounded border px-1 py-0.5 ${style.box}`}
          >
            {sessionStatus === 'working' ? (
              <Clock3 size={9} className={`shrink-0 ${style.icon}`} />
            ) : (
              <Check size={9} strokeWidth={3} className={`shrink-0 ${style.icon}`} />
            )}
            <span className="truncate text-[8px] font-semibold leading-tight">
              {shortProjectName(session)}
            </span>
          </div>
        );
      })}
      {visible.length > 1 && (
        <p className="text-[8px] font-bold text-slate-400 leading-none">{visible.length} dự án</p>
      )}
    </div>
  );
}

export default function AttendanceSheetGrid({
  shiftGroups,
  records,
  year,
  monthIndex,
  today,
}: AttendanceSheetGridProps) {
  const daysInMonth = useMemo(
    () => new Date(year, monthIndex + 1, 0).getDate(),
    [year, monthIndex],
  );

  const recordMap = useMemo(() => buildAttendanceRecordMap(records), [records]);

  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, index) => index + 1),
    [daysInMonth],
  );

  const rows = useMemo(() => {
    const result: Array<{
      shift: AttendanceShiftGroup;
      employee: StaffRecord;
      isFirstInShift: boolean;
      shiftRowSpan: number;
    }> = [];

    shiftGroups.forEach((shift) => {
      shift.employees.forEach((employee, index) => {
        result.push({
          shift,
          employee,
          isFirstInShift: index === 0,
          shiftRowSpan: shift.employees.length,
        });
      });
    });

    return result;
  }, [shiftGroups]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
        Chưa có nhân viên để hiển thị bảng công.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-max w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            <th className="sticky left-0 z-30 min-w-[140px] border-r border-slate-200 bg-slate-50 px-3 py-3 text-left">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Ca làm việc
                <Plus size={14} className="text-slate-400" />
              </div>
            </th>
            <th className="sticky left-[140px] z-30 min-w-[130px] border-r border-slate-200 bg-slate-50 px-3 py-3 text-left">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Nhân viên
                <Plus size={14} className="text-slate-400" />
              </div>
            </th>
            {days.map((day) => {
              const date = new Date(year, monthIndex, day);
              const isSunday = date.getDay() === 0;
              const isToday = isSameDay(date, today);

              return (
                <th key={day} className="min-w-[88px] px-0.5 py-2 text-center align-bottom">
                  <p className={`text-[10px] font-medium ${isSunday ? 'text-red-500' : 'text-slate-400'}`}>
                    {weekdayLabels[date.getDay()]}
                  </p>
                  <p
                    className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center text-[11px] font-bold ${
                      isToday
                        ? 'rounded-full bg-red-600 text-white'
                        : isSunday
                          ? 'text-red-500'
                          : 'text-slate-700'
                    }`}
                  >
                    {`${day}`.padStart(2, '0')}
                  </p>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const employeeKey = String(row.employee.id);

            return (
              <tr key={`${row.shift.id}-${employeeKey}`} className="border-b border-slate-100 last:border-0">
                {row.isFirstInShift && (
                  <td
                    rowSpan={row.shiftRowSpan}
                    className="sticky left-0 z-20 border-r border-slate-200 bg-white px-3 py-3 align-top"
                  >
                    <p className="text-[12px] font-bold uppercase tracking-wide text-slate-800">
                      {row.shift.name}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                      {formatShiftTime(row.shift.start)} - {formatShiftTime(row.shift.end)}
                    </p>
                  </td>
                )}
                <td className="sticky left-[140px] z-20 border-r border-slate-200 bg-white px-3 py-3 align-middle">
                  <p className="max-w-[120px] truncate text-[12px] font-semibold uppercase text-slate-800">
                    {row.employee.full_name}
                  </p>
                </td>
                {days.map((day) => {
                  const date = new Date(year, monthIndex, day);
                  const dateKey = normalizeWorkDate(toDateKey(date));
                  const sessions = findAttendanceRecords(recordMap, row.employee, dateKey);

                  return (
                    <td key={day} className="px-0.5 py-2 text-center align-middle">
                      <DayCell sessions={sessions} dayDate={date} today={today} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
