import { useEffect, useState } from 'react';
import {
  Bell,
  MoreHorizontal,
  Calendar,
  Briefcase,
  Clock,
  Timer,
  UserMinus,
  Download,
  AlertCircle,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import type { AttendanceDbRecord } from '../types';
import { ROUTES } from '../types';
import { useEmployee } from '../context/EmployeeContext';
import { getAllEmployees, getAttendanceRecordsInRange, type EmployeeRecord } from '../lib/attendanceService';
import { getSupabaseConfigError, getSupabaseRequestErrorMessage } from '../lib/supabase';
import { isLate } from '../lib/attendanceUtils';
import AttendanceStatusGrid from '../components/AttendanceStatusGrid';
import UserAvatar from '../components/UserAvatar';

type PeriodKey = 'current' | 'previous';

type ReportState = {
  records: AttendanceDbRecord[];
  startDate: Date;
  endDate: Date;
};

function getMonthRange(period: PeriodKey) {
  const now = new Date();
  const base = period === 'previous'
    ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);

  const startDate = new Date(base.getFullYear(), base.getMonth(), 1);
  const endDate = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { startDate, endDate };
}

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getWeekdayCount(startDate: Date, endDate: Date) {
  let count = 0;
  const cursor = new Date(startDate);
  const lastDay = startOfDay(endDate);

  while (cursor <= lastDay) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

function getWorkedMinutes(record: AttendanceDbRecord, now: Date) {
  if (!record.check_in_at) return 0;

  const startTime = new Date(record.check_in_at).getTime();
  const endTime = record.check_out_at
    ? new Date(record.check_out_at).getTime()
    : record.work_date === toDateKey(now)
      ? now.getTime()
      : startTime;

  return Math.max(0, Math.floor((endTime - startTime) / 60_000));
}


function formatHours(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!minutes) return `${hours}`;
  return `${hours}.${Math.floor((minutes / 60) * 10)}`;
}

function formatHoursLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${`${minutes}`.padStart(2, '0')}m`;
}

function getWeekLabel(index: number) {
  return `Tuần ${index + 1}`;
}

export default function Reports() {
  const employee = useEmployee();
  const [period, setPeriod] = useState<PeriodKey>('current');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportState, setReportState] = useState<ReportState | null>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);

  useEffect(() => {
    const configError = getSupabaseConfigError();
    if (configError) {
      setLoading(false);
      setError(configError);
      return;
    }

    const { startDate, endDate } = getMonthRange(period);

    setLoading(true);
    setError(null);

    Promise.all([
      getAllEmployees(),
      getAttendanceRecordsInRange(toDateKey(startDate), toDateKey(endDate)),
    ])
      .then(([employeeRows, records]) => {
        setEmployees(employeeRows);
        setReportState({ records, startDate, endDate });
      })
      .catch((err) => setError(getSupabaseRequestErrorMessage(err, 'Could not load report data.')))
      .finally(() => setLoading(false));
  }, [period]);

  const now = new Date();
  const records = reportState?.records || [];
  const checkedInRecords = records.filter((record) => Boolean(record.check_in_at));
  const lateRecords = checkedInRecords.filter(isLate);
  const absentRecords = records.filter((record) => !record.check_in_at);
  const onTimeRecords = checkedInRecords.length - lateRecords.length;
  const totalMinutes = checkedInRecords.reduce((sum, record) => sum + getWorkedMinutes(record, now), 0);
  const uniqueEmployeeIds = Array.from(new Set(records.map((record) => record.employee_id)));
  const businessDays = reportState ? getWeekdayCount(reportState.startDate, reportState.endDate) : 0;

  const weeklyMinutes = Array.from({ length: 5 }, () => 0);
  records.forEach((record) => {
    const dayOfMonth = new Date(`${record.work_date}T00:00:00`).getDate();
    const weekIndex = Math.min(4, Math.floor((dayOfMonth - 1) / 7));
    weeklyMinutes[weekIndex] += getWorkedMinutes(record, now);
  });

  const maxWeeklyMinutes = Math.max(...weeklyMinutes, 1);
  const statusTotal = Math.max(onTimeRecords + lateRecords.length + absentRecords.length, 1);

  const topEmployees = Array.from(
    records.reduce((map, record) => {
      const existing = map.get(record.employee_id) || {
        id: record.employee_id,
        name: record.employee_name,
        days: 0,
        late: 0,
        minutes: 0,
        projects: new Set<string>(),
        lastStatus: record.status,
      };

      if (record.check_in_at) {
        existing.days += 1;
        existing.minutes += getWorkedMinutes(record, now);
        if (isLate(record)) {
          existing.late += 1;
        }
      }

      if (record.product_name) {
        existing.projects.add(record.product_name);
      }

      existing.lastStatus = record.status;
      map.set(record.employee_id, existing);
      return map;
    }, new Map<string, { id: string; name: string; days: number; late: number; minutes: number; projects: Set<string>; lastStatus: AttendanceDbRecord['status'] }>()),
  )
    .map(([, value]) => ({
      ...value,
      projectLabels: Array.from(value.projects),
    }))
    .sort((left, right) => right.minutes - left.minutes || right.days - left.days)
    .slice(0, 5);

  const statusItems = [
    { icon: CheckCircle2, label: 'Đúng giờ', value: onTimeRecords, tone: 'onTime' as const },
    { icon: AlertTriangle, label: 'Đi muộn', value: lateRecords.length, tone: 'amber' as const },
    { icon: XCircle, label: 'Nghỉ', value: absentRecords.length, tone: 'absent' as const },
  ];

  const toneStyles = {
    onTime: { card: 'bg-red-50 border-red-100', icon: 'text-red-600', value: 'text-red-800', label: 'text-red-700' },
    amber: { card: 'bg-amber-50 border-amber-100', icon: 'text-amber-500', value: 'text-amber-800', label: 'text-amber-700' },
    absent: { card: 'bg-rose-50 border-rose-100', icon: 'text-rose-500', value: 'text-rose-800', label: 'text-rose-700' },
  };

  const stats = [
    { icon: Briefcase, label: 'Ngày công', value: `${checkedInRecords.length}`, sub: `${uniqueEmployeeIds.length} nhân sự`, color: 'text-red-600' },
    { icon: Clock, label: 'Giờ làm', value: formatHours(totalMinutes), unit: 'h', sub: formatHoursLabel(totalMinutes), color: 'text-amber-600' },
    { icon: Timer, label: 'Đi muộn', value: `${lateRecords.length}`, sub: checkedInRecords.length ? `${Math.round((lateRecords.length / checkedInRecords.length) * 100)}% ca` : '0% ca', color: 'text-on-surface-variant' },
    { icon: UserMinus, label: 'Chưa check-in', value: `${absentRecords.length}`, sub: `${businessDays} ngày làm việc`, color: 'text-red-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 py-4 sm:px-5"
    >
      <div className="flex justify-between items-center py-3 bg-surface sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <UserAvatar name={employee.name || 'Jarviz'} size="sm" className="border border-outline-variant/30" />
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant leading-none">Xin chào,</p>
            <h1 className="text-xl font-bold text-primary tracking-tight">{employee.name || 'Jarviz'}</h1>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:opacity-80 transition-all border border-outline-variant/10 shadow-sm active:scale-95">
          <Bell size={20} />
        </button>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-primary tracking-tight">Báo cáo</h2>
          <Link
            to={ROUTES.attendanceSheet}
            className="rounded-xl bg-red-600 px-3 py-2 text-[12px] font-bold text-white hover:bg-red-700"
          >
            Bảng chấm công
          </Link>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-xl border border-outline-variant/20">
          <button
            onClick={() => setPeriod('current')}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              period === 'current' ? 'bg-white shadow-md text-primary' : 'text-on-surface-variant/70 hover:text-primary'
            }`}
          >
            Tháng này
          </button>
          <button
            onClick={() => setPeriod('previous')}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              period === 'previous' ? 'bg-white shadow-md text-primary' : 'text-on-surface-variant/70 hover:text-primary'
            }`}
          >
            Tháng trước
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-white transition-all group">
            <Calendar size={18} className="group-hover:text-primary" />
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="bg-white rounded-xl p-3 sm:p-4 border border-outline-variant/10 space-y-3 overflow-hidden">
        <h3 className="text-sm font-bold text-primary">Tổng hợp</h3>

        <div className="grid grid-cols-3 gap-2">
          {statusItems.map((item) => {
            const tone = toneStyles[item.tone];
            return (
              <div key={item.label} className={`rounded-lg border px-2 py-2.5 text-center ${tone.card}`}>
                <item.icon size={16} className={`mx-auto mb-1 ${tone.icon}`} />
                <p className={`text-[9px] font-bold uppercase tracking-wide ${tone.label}`}>{item.label}</p>
                <p className={`text-lg font-extrabold leading-tight ${tone.value}`}>
                  {loading ? '—' : item.value}
                  {!loading && statusTotal > 0 && (
                    <span className="block text-[9px] font-semibold opacity-70">
                      {Math.round((item.value / statusTotal) * 100)}%
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-outline-variant/10 bg-surface-container-low/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <stat.icon size={14} className={stat.color} />
                <span className="text-[11px] font-semibold text-on-surface-variant">{stat.label}</span>
              </div>
              <p className="text-xl font-extrabold text-primary leading-none">
                {loading ? '—' : stat.value}
                {stat.unit && <span className="text-xs font-bold text-on-surface-variant ml-0.5">{stat.unit}</span>}
              </p>
              {!loading && <p className="text-[10px] text-on-surface-variant/70 mt-0.5">{stat.sub}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl p-3 sm:p-4 border border-outline-variant/10 space-y-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary">Bảng công</h3>
          <div className="flex gap-2.5 text-[9px] font-semibold text-on-surface-variant">
            <span className="flex items-center gap-0.5"><span className="text-red-600">✓</span> Đúng giờ</span>
            <span className="flex items-center gap-0.5"><span className="text-amber-500">!</span> Muộn</span>
            <span className="flex items-center gap-0.5"><span className="text-red-500">✕</span> Nghỉ</span>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-on-surface-variant gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-medium">Đang tải...</span>
          </div>
        ) : reportState ? (
          <AttendanceStatusGrid
            employees={employees}
            records={records}
            year={reportState.startDate.getFullYear()}
            monthIndex={reportState.startDate.getMonth()}
            daysInMonth={reportState.endDate.getDate()}
          />
        ) : null}
      </section>

      <section className="bg-white rounded-xl p-4 border border-outline-variant/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary">Giờ làm theo tuần</h3>
          <button className="text-on-surface-variant hover:text-primary transition-all p-1">
            <MoreHorizontal size={20} />
          </button>
        </div>
        <div className="h-32 flex items-end justify-between gap-3 px-1 relative pt-2">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 opacity-40">
            {[1, 2, 3, 4].map((line) => <div key={line} className="border-b border-outline-variant/30 w-full" />)}
          </div>
          {weeklyMinutes.map((minutes, index) => {
            const isActive = minutes === Math.max(...weeklyMinutes) && minutes > 0;
            const heightPercent = Math.max(14, Math.round((minutes / maxWeeklyMinutes) * 100));

            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-3 relative z-10 group cursor-pointer">
                <div
                  className={`w-full max-w-[32px] rounded-t-lg transition-all duration-500 overflow-visible relative ${
                    isActive ? 'bg-primary-container shadow-lg' : 'bg-primary-fixed-dim/40 group-hover:bg-primary-container/30'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                >
                  <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                    isActive ? 'bg-primary text-white opacity-100 scale-100' : 'bg-on-surface text-white opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
                  }`}>
                    {formatHoursLabel(minutes)}
                  </div>
                </div>
                <span className={`text-[11px] font-bold transition-all ${isActive ? 'text-primary' : 'text-on-surface-variant/60'}`}>
                  {getWeekLabel(index)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-xl p-4 border border-outline-variant/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-primary">Nhân sự hoạt động</h3>
          <span className="text-[11px] font-bold text-on-surface-variant">
            {uniqueEmployeeIds.length} người
          </span>
        </div>
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-6 text-on-surface-variant gap-2">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm font-medium">Đang tải báo cáo...</span>
            </div>
          )}

          {!loading && topEmployees.length === 0 && (
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-5 text-sm font-medium text-on-surface-variant">
              No attendance data for the selected period.
            </div>
          )}

          {!loading && topEmployees.map((employee) => (
            <div key={employee.id} className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-surface-container-low transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary-fixed/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                  {employee.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-primary truncate">{employee.name}</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {employee.days} ngày · {formatHoursLabel(employee.minutes)}
                    {employee.projectLabels.length > 0 && (
                      <> · {employee.projectLabels.join(', ')}</>
                    )}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-on-surface-variant shrink-0 ml-2">
                {employee.late ? `${employee.late} muộn` : 'Đúng giờ'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-2 pb-10">
        <button className="bg-red-600 text-white w-full px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
          <Download size={18} />
          Xuất báo cáo
        </button>
      </section>
    </motion.div>
  );
}
