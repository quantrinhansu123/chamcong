import { useEffect, useState } from 'react';
import {
  Bell,
  MoreHorizontal,
  Calendar,
  Briefcase,
  Clock,
  Timer,
  UserMinus,
  ChevronRight,
  Download,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { AttendanceDbRecord } from '../types';
import { currentEmployee, getAttendanceRecordsInRange } from '../lib/attendanceService';
import { isSupabaseConfigured } from '../lib/supabase';

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

function getScheduledDateTime(record: AttendanceDbRecord) {
  return new Date(`${record.work_date}T${record.scheduled_start}`);
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

function isLate(record: AttendanceDbRecord) {
  if (!record.check_in_at) return false;
  return new Date(record.check_in_at).getTime() > getScheduledDateTime(record).getTime();
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
  const [period, setPeriod] = useState<PeriodKey>('current');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportState, setReportState] = useState<ReportState | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setError('Chưa cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.');
      return;
    }

    const { startDate, endDate } = getMonthRange(period);

    setLoading(true);
    setError(null);

    getAttendanceRecordsInRange(toDateKey(startDate), toDateKey(endDate))
      .then((records) => {
        setReportState({
          records,
          startDate,
          endDate,
        });
      })
      .catch((err) => setError(err.message || 'Không tải được dữ liệu báo cáo.'))
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

  const employees = Array.from(
    records.reduce((map, record) => {
      const existing = map.get(record.employee_id) || {
        id: record.employee_id,
        name: record.employee_name,
        days: 0,
        late: 0,
        minutes: 0,
        lastStatus: record.status,
      };

      if (record.check_in_at) {
        existing.days += 1;
        existing.minutes += getWorkedMinutes(record, now);
        if (isLate(record)) {
          existing.late += 1;
        }
      }

      existing.lastStatus = record.status;
      map.set(record.employee_id, existing);
      return map;
    }, new Map<string, { id: string; name: string; days: number; late: number; minutes: number; lastStatus: AttendanceDbRecord['status'] }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.minutes - left.minutes || right.days - left.days)
    .slice(0, 5);

  const stats = [
    {
      icon: Briefcase,
      label: 'Ngày công',
      value: `${checkedInRecords.length}`,
      sub: `${uniqueEmployeeIds.length} nhân sự`,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      icon: Clock,
      label: 'Giờ làm',
      value: formatHours(totalMinutes),
      unit: 'h',
      sub: `${formatHoursLabel(totalMinutes)} thực tế`,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      icon: Timer,
      label: 'Đi muộn',
      value: `${lateRecords.length}`,
      sub: `${checkedInRecords.length ? Math.round((lateRecords.length / checkedInRecords.length) * 100) : 0}% ca làm`,
      color: 'text-on-tertiary-container',
      bg: 'bg-surface-container-high',
    },
    {
      icon: UserMinus,
      label: 'Chưa check-in',
      value: `${absentRecords.length}`,
      sub: `${businessDays} ngày làm việc`,
      color: 'text-red-500',
      bg: 'bg-red-50',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6"
    >
      <div className="flex justify-between items-center py-4 bg-surface sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img
            alt="User"
            className="w-10 h-10 rounded-full object-cover border border-outline-variant/30 active:scale-95 transition-all"
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=100&h=100"
          />
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant leading-none">Xin chào,</p>
            <h1 className="text-xl font-bold text-primary tracking-tight">{currentEmployee.name || 'Jarviz'}</h1>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:opacity-80 transition-all border border-outline-variant/10 shadow-sm active:scale-95">
          <Bell size={20} />
        </button>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-primary tracking-tight">Báo cáo</h2>
        <div className="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/20 shadow-sm">
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
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 ambient-shadow flex flex-col gap-4 relative overflow-hidden group border border-outline-variant/10">
            <div className="flex items-center justify-between">
              <stat.icon size={20} className={stat.color} />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.color} ${stat.bg}`}>
                {loading ? '...' : stat.sub}
              </span>
            </div>
            <div>
              <p className="text-[12px] font-bold text-on-surface-variant/80 mb-0.5">{stat.label}</p>
              <p className="text-3xl font-extrabold text-primary">
                {loading ? '--' : stat.value}
                {stat.unit && <span className="text-sm font-bold text-on-surface-variant ml-1">{stat.unit}</span>}
              </p>
            </div>
            <div className={`absolute -bottom-6 -right-6 w-20 h-20 ${stat.bg} opacity-20 rounded-full blur-2xl group-hover:scale-125 transition-transform`} />
          </div>
        ))}
      </section>

      <section className="bg-white rounded-2xl p-6 ambient-shadow border border-outline-variant/10 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">Biểu đồ giờ làm theo tuần</h3>
          <button className="text-on-surface-variant hover:text-primary transition-all p-1">
            <MoreHorizontal size={20} />
          </button>
        </div>
        <div className="h-40 flex items-end justify-between gap-4 px-2 relative pt-2">
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

      <section className="bg-white rounded-2xl p-6 ambient-shadow border border-outline-variant/10 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">Phân bổ trạng thái</h3>
          <button className="text-on-surface-variant hover:text-primary transition-all">
            <MoreHorizontal size={20} />
          </button>
        </div>
        <div className="flex items-center justify-center py-4">
          <div
            className="w-40 h-40 rounded-full relative flex items-center justify-center shadow-lg"
            style={{
              background: `conic-gradient(from 0deg, var(--color-primary-fixed) 0% ${(onTimeRecords / statusTotal) * 100}%, var(--color-secondary-container) ${(onTimeRecords / statusTotal) * 100}% ${((onTimeRecords + lateRecords.length) / statusTotal) * 100}%, #ffdad6 ${((onTimeRecords + lateRecords.length) / statusTotal) * 100}% 100%)`,
            }}
          >
            <div className="w-24 h-24 bg-white rounded-full absolute shadow-inner border border-outline-variant/5" />
            <div className="z-10 text-center flex flex-col items-center">
              <span className="text-[28px] font-extrabold text-primary leading-tight">{checkedInRecords.length}</span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ca đã chấm công</span>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-4 flex-wrap pb-2">
          {[
            { color: 'bg-primary-fixed', label: 'Đúng giờ', count: onTimeRecords },
            { color: 'bg-secondary-container', label: 'Đi muộn', count: lateRecords.length },
            { color: 'bg-red-100', label: 'Chưa check-in', count: absentRecords.length },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 bg-surface-container-low/50 px-3 py-1.5 rounded-full border border-outline-variant/10">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              <span className="text-[11px] font-bold text-on-surface-variant">
                {item.label} <span className="opacity-50">({item.count})</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl p-6 ambient-shadow border border-outline-variant/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-primary">Nhân sự hoạt động</h3>
          <button className="text-[12px] font-bold text-secondary hover:underline transition-all">
            {uniqueEmployeeIds.length} người
          </button>
        </div>
        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-6 text-on-surface-variant gap-2">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm font-medium">Đang tải báo cáo...</span>
            </div>
          )}

          {!loading && employees.length === 0 && (
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-5 text-sm font-medium text-on-surface-variant">
              Chưa có dữ liệu chấm công trong kỳ đã chọn.
            </div>
          )}

          {!loading && employees.map((employee) => (
            <div key={employee.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-all group border border-transparent hover:border-outline-variant/20">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-primary-fixed/20 flex items-center justify-center text-primary shadow-sm font-bold">
                  {employee.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">{employee.name}</p>
                  <p className="text-[12px] font-medium text-on-surface-variant/80">
                    {employee.days} ngày công, {formatHoursLabel(employee.minutes)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-bold text-on-surface-variant">
                  {employee.late ? `${employee.late} muộn` : 'Đúng giờ'}
                </span>
                <ChevronRight size={18} className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-4 pb-12 flex flex-col gap-4">
        <button className="bg-emerald-600 text-white w-full px-6 py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/30 active:scale-95 transition-all overflow-hidden relative group">
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <Download size={20} />
          Xuất báo cáo
        </button>
      </section>
    </motion.div>
  );
}
