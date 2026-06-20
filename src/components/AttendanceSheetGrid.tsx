import { useMemo } from 'react';
import { Check, Plus } from 'lucide-react';
import type { AttendanceDbRecord } from '../types';
import type { StaffRecord } from '../lib/staffService';
import { isLate, toDateKey } from '../lib/attendanceUtils';
import {
  buildAttendanceRecordMap,
  findAttendanceRecord,
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

type DayCellStatus = 'present' | 'late' | 'absent' | 'empty' | 'future';

function formatShiftTime(value: string) {
  return value.slice(0, 5);
}

function getDayCellStatus(
  record: AttendanceDbRecord | undefined,
  dayDate: Date,
  today: Date,
): DayCellStatus {
  const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isToday = dayStart.getTime() === todayStart.getTime();

  if (dayStart > todayStart) return 'future';
  if (!record) return 'empty';

  if (isToday) {
    if (!record.check_in_at || record.check_out_at) return 'empty';
    if (isLate(record)) return 'late';
    return 'present';
  }

  if (!record.check_in_at) return 'absent';
  if (isLate(record)) return 'late';
  return 'present';
}

const statusStyles = {
  present: {
    box: 'bg-emerald-50 border-emerald-200',
    icon: 'text-emerald-600',
  },
  late: {
    box: 'bg-orange-50 border-orange-200',
    icon: 'text-orange-500',
  },
  absent: {
    box: 'bg-red-50 border-red-200',
    icon: 'text-red-500',
  },
} as const;

function DayCell({ status }: { status: DayCellStatus }) {
  if (status === 'present' || status === 'late' || status === 'absent') {
    const style = statusStyles[status];
    return (
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-md border ${style.box}`}
      >
        <Check size={12} strokeWidth={3} className={style.icon} />
      </span>
    );
  }

  if (status === 'future') {
    return <span className="inline-block h-5 w-5 rounded-md border border-slate-200 bg-slate-100/80" />;
  }

  return <span className="inline-block h-5 w-5 rounded-md border border-slate-200/80 bg-slate-50" />;
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
              const isToday =
                date.getFullYear() === today.getFullYear()
                && date.getMonth() === today.getMonth()
                && date.getDate() === today.getDate();

              return (
                <th key={day} className="min-w-[34px] px-0.5 py-2 text-center align-bottom">
                  <p className={`text-[10px] font-medium ${isSunday ? 'text-red-500' : 'text-slate-400'}`}>
                    {weekdayLabels[date.getDay()]}
                  </p>
                  <p
                    className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center text-[11px] font-bold ${
                      isToday
                        ? 'rounded-full bg-emerald-600 text-white'
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
                  const record = findAttendanceRecord(recordMap, row.employee, dateKey);
                  const status = getDayCellStatus(record, date, today);

                  return (
                    <td key={day} className="px-0.5 py-3 text-center align-middle">
                      <DayCell status={status} />
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
