import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  UserX,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { AttendanceDbRecord } from '../types';
import { getAllEmployees, getAttendanceRecordsInRange, type EmployeeRecord } from '../lib/attendanceService';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  formatDurationShort,
  formatTimeShort,
  getOvertimeMinutes,
  getWorkedMinutes,
  hasOvertime,
  isLate,
  toDateKey,
} from '../lib/attendanceUtils';

interface TimesheetBoardProps {
  onClose: () => void;
}

function getMonthRange(base: Date) {
  const startDate = new Date(base.getFullYear(), base.getMonth(), 1);
  const endDate = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { startDate, endDate };
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(date);
}

function getCellClass(record?: AttendanceDbRecord, now = new Date()) {
  if (!record || !record.check_in_at) {
    return 'text-outline/40';
  }
  if (hasOvertime(record, now)) {
    return 'text-violet-700 font-bold';
  }
  if (isLate(record)) {
    return 'text-amber-600 font-bold';
  }
  return 'text-emerald-700 font-bold';
}

export default function TimesheetBoard({ onClose }: TimesheetBoardProps) {
  const [month, setMonth] = useState(() => new Date());
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [records, setRecords] = useState<AttendanceDbRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);

  const { startDate, endDate } = useMemo(() => getMonthRange(month), [month]);
  const daysInMonth = endDate.getDate();
  const dayNumbers = useMemo(
    () => Array.from({ length: daysInMonth }, (_, index) => index + 1),
    [daysInMonth],
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setError('Chưa cấu hình Supabase.');
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      getAllEmployees(),
      getAttendanceRecordsInRange(toDateKey(startDate), toDateKey(endDate)),
    ])
      .then(([employeeRows, attendanceRows]) => {
        setEmployees(employeeRows);
        setRecords(attendanceRows);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được bảng công.'))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  const recordMap = useMemo(() => {
    const map = new Map<string, AttendanceDbRecord>();
    records.forEach((record) => {
      map.set(`${record.employee_id}:${record.work_date}`, record);
    });
    return map;
  }, [records]);

  const getRecord = (employeeId: number, day: number) => {
    const workDate = toDateKey(new Date(month.getFullYear(), month.getMonth(), day));
    return recordMap.get(`${employeeId}:${workDate}`);
  };

  const getEmployeeStats = (employeeId: number) => {
    let workDays = 0;
    let lateDays = 0;
    let totalMinutes = 0;
    let overtimeMinutes = 0;

    dayNumbers.forEach((day) => {
      const record = getRecord(employeeId, day);
      if (!record?.check_in_at) return;

      workDays += 1;
      totalMinutes += getWorkedMinutes(record, now);
      overtimeMinutes += getOvertimeMinutes(record, now);
      if (isLate(record)) lateDays += 1;
    });

    return { workDays, lateDays, totalMinutes, overtimeMinutes };
  };

  const shiftMonth = (offset: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const totalWorkDays = records.filter((record) => Boolean(record.check_in_at)).length;
  const totalLate = records.filter((record) => record.check_in_at && isLate(record)).length;
  const totalOvertimeMinutes = records.reduce(
    (sum, record) => sum + getOvertimeMinutes(record, now),
    0,
  );
  const uniqueStaff = new Set(records.map((record) => record.employee_id)).size;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="fixed inset-0 z-50 bg-surface overflow-y-auto"
    >
      <div className="w-full max-w-lg mx-auto min-h-screen flex flex-col px-5 pt-2 pb-24">
        <div className="flex justify-between items-center py-4 bg-surface sticky top-0 z-40">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 -ml-2 hover:bg-surface-container rounded-full transition-colors active:scale-90 shrink-0"
            >
              <ArrowLeft size={20} className="text-on-surface-variant" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-primary tracking-tight">Bảng công</h1>
              <p className="text-[12px] font-medium text-on-surface-variant">Tất cả nhân sự</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Users size={20} />
          </div>
        </div>

        <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-outline-variant/10 mb-4">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
          >
            <ChevronLeft size={20} className="text-on-surface-variant" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-emerald-600" />
            <span className="text-sm font-bold text-primary capitalize">{formatMonthLabel(month)}</span>
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
          >
            <ChevronRight size={20} className="text-on-surface-variant" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-outline-variant/10 text-center">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase">Ngày công</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{totalWorkDays}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-outline-variant/10 text-center">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase">Đi muộn</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{totalLate}</p>
          </div>
          <div className="col-span-2 bg-violet-600 text-white rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-violet-200 uppercase tracking-widest">Tổng OT tháng</p>
              <p className="text-2xl font-bold mt-1">{formatDurationShort(totalOvertimeMinutes)}</p>
            </div>
            <div className="bg-white/15 p-3 rounded-2xl">
              <Zap size={24} className="text-violet-100" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4 px-1 text-[10px] font-semibold text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Đúng giờ
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Đi muộn
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            OT (vượt giờ)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-outline/30" />
            Không chấm
          </span>
        </div>

        <section className="flex flex-col gap-3 mb-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-on-surface-variant">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm font-medium">Đang tải bảng công...</span>
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          {!loading && !error && employees.length === 0 && (
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3 border border-outline-variant/10 text-center">
              <UserX size={28} className="text-on-surface-variant/50" />
              <p className="text-sm font-semibold text-on-surface-variant">Chưa có nhân sự.</p>
            </div>
          )}

          {!loading && !error && employees.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant/10">
                      <th className="sticky left-0 z-20 bg-surface-container-low px-3 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider min-w-[120px] border-r border-outline-variant/10">
                        Nhân viên
                      </th>
                      {dayNumbers.map((day) => (
                        <th
                          key={day}
                          className="px-1 py-3 text-[10px] font-bold text-on-surface-variant text-center min-w-[42px]"
                        >
                          {day}
                        </th>
                      ))}
                      <th className="sticky right-[104px] z-20 bg-surface-container-low px-2 py-3 text-[10px] font-bold text-on-surface-variant uppercase text-center min-w-[40px] border-l border-outline-variant/10">
                        NC
                      </th>
                      <th className="sticky right-[52px] z-20 bg-surface-container-low px-2 py-3 text-[10px] font-bold text-on-surface-variant uppercase text-center min-w-[48px] border-l border-outline-variant/10">
                        Giờ
                      </th>
                      <th className="sticky right-0 z-20 bg-violet-50 px-2 py-3 text-[10px] font-bold text-violet-700 uppercase text-center min-w-[52px] border-l border-violet-100">
                        OT
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => {
                      const stats = getEmployeeStats(employee.id);

                      return (
                        <tr
                          key={employee.id}
                          className="border-b border-outline-variant/5 last:border-0 hover:bg-surface-container-low/40"
                        >
                          <td className="sticky left-0 z-10 bg-white px-3 py-2.5 border-r border-outline-variant/10 min-w-[120px]">
                            <p className="text-[11px] font-bold text-primary leading-tight truncate max-w-[110px]">
                              {employee.full_name}
                            </p>
                            <p className="text-[9px] text-on-surface-variant truncate max-w-[110px]">
                              {employee.position || employee.email}
                            </p>
                          </td>
                          {dayNumbers.map((day) => {
                            const record = getRecord(employee.id, day);
                            const cellClass = getCellClass(record, now);
                            const otMinutes = record ? getOvertimeMinutes(record, now) : 0;

                            return (
                              <td key={day} className="px-1 py-2 text-center align-top">
                                <div className="flex flex-col items-center gap-0.5 min-h-[28px]">
                                  <span className={`text-[9px] leading-none ${cellClass}`}>
                                    {formatTimeShort(record?.check_in_at)}
                                  </span>
                                  {otMinutes > 0 && (
                                    <span className="text-[8px] font-bold text-violet-600 leading-none">
                                      +{formatDurationShort(otMinutes)}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="sticky right-[104px] z-10 bg-white px-2 py-2.5 text-center border-l border-outline-variant/10">
                            <span className="text-[11px] font-bold text-emerald-700">{stats.workDays}</span>
                          </td>
                          <td className="sticky right-[52px] z-10 bg-white px-2 py-2.5 text-center border-l border-outline-variant/10">
                            <span className="text-[10px] font-bold text-on-surface-variant">
                              {formatDurationShort(stats.totalMinutes)}
                            </span>
                          </td>
                          <td className="sticky right-0 z-10 bg-violet-50/80 px-2 py-2.5 text-center border-l border-violet-100">
                            <span
                              className={`text-[10px] font-bold ${
                                stats.overtimeMinutes > 0 ? 'text-violet-700' : 'text-outline/40'
                              }`}
                            >
                              {stats.overtimeMinutes > 0 ? formatDurationShort(stats.overtimeMinutes) : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && !error && employees.length > 0 && (
            <p className="text-[11px] text-on-surface-variant px-1 flex items-center gap-1.5">
              <Briefcase size={12} />
              OT = thời gian làm sau giờ ca ({uniqueStaff > 0 ? `${uniqueStaff} nhân sự có chấm công` : 'chưa có dữ liệu'})
            </p>
          )}
        </section>
      </div>
    </motion.div>
  );
}
