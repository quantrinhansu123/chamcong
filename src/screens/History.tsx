import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Calendar,
  Briefcase,
  Clock,
  UserX,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { AttendanceDbRecord, AttendanceRecord } from '../types';
import {
  currentEmployee,
  getEmployeeAttendanceRecords,
} from '../lib/attendanceService';
import { getSupabaseConfigError, getSupabaseRequestErrorMessage } from '../lib/supabase';
import { isLate } from '../lib/attendanceUtils';

const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}

function formatTime(value?: string | null) {
  if (!value) return '--:--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function formatDuration(start?: string | null, end?: string | null, now = new Date()) {
  if (!start) return '0h 0m';
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : now.getTime();
  const diffMinutes = Math.max(0, Math.floor((endMs - startMs) / 60_000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h 0m`;
}

function getLateMinutes(record: AttendanceDbRecord) {
  if (!record.check_in_at) return 0;
  const scheduled = new Date(`${record.work_date}T${record.scheduled_start}`).getTime();
  return Math.max(0, Math.floor((new Date(record.check_in_at).getTime() - scheduled) / 60_000));
}

function mapRecord(record: AttendanceDbRecord, now: Date): AttendanceRecord {
  const date = new Date(`${record.work_date}T00:00:00`);
  let status: AttendanceRecord['status'] = 'absent';
  if (record.check_in_at) {
    status = isLate(record) ? 'late' : 'on-time';
  }

  return {
    date: new Intl.DateTimeFormat('vi-VN').format(date),
    day: dayNames[date.getDay()],
    shift: record.shift_name,
    checkIn: formatTime(record.check_in_at),
    checkOut: formatTime(record.check_out_at),
    duration: formatDuration(record.check_in_at, record.check_out_at, now),
    status,
    lateMinutes: status === 'late' ? getLateMinutes(record) : undefined,
  };
}

export default function History() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);
  const { start, end } = useMemo(() => getMonthRange(now), [now]);

  const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: '2-digit', year: 'numeric' }).format(now);

  useEffect(() => {
    const configError = getSupabaseConfigError();
    if (configError) {
      setLoading(false);
      setError(configError);
      return;
    }

    getEmployeeAttendanceRecords(currentEmployee.id, toDateKey(start), toDateKey(end))
      .then((rows) => setRecords(rows.map((row) => mapRecord(row, now))))
      .catch((err) => setError(getSupabaseRequestErrorMessage(err, 'Không tải được lịch sử chấm công.')))
      .finally(() => setLoading(false));
  }, [start, end, now]);

  const checkedIn = records.filter((r) => r.status !== 'absent');
  const lateCount = records.filter((r) => r.status === 'late').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6"
    >
      <div className="flex justify-between items-center py-4 bg-surface sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button type="button" className="p-2 -ml-2 hover:bg-surface-container rounded-full transition-colors active:scale-90">
            <ArrowLeft size={20} className="text-on-surface-variant" />
          </button>
          <h1 className="text-xl font-bold text-primary tracking-tight">Lịch sử chấm công</h1>
        </div>
        <button type="button" className="p-2 hover:bg-surface-container rounded-full transition-colors active:scale-90">
          <Download size={20} className="text-on-surface-variant" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/30 rounded-full shrink-0 ambient-shadow font-bold text-sm text-on-surface">
          Tháng {monthLabel}
          <Calendar size={18} className="text-on-surface-variant" />
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 bg-primary-container text-white rounded-2xl p-5 flex justify-between items-center ambient-shadow relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <Calendar size={100} strokeWidth={1} />
          </div>
          <div className="z-10 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-primary-fixed-dim uppercase tracking-widest">Tổng ngày công</span>
            <span className="text-[36px] font-bold leading-none">{loading ? '—' : checkedIn.length}</span>
          </div>
          <div className="z-10 bg-primary/20 p-4 rounded-3xl border border-white/5">
            <Briefcase size={28} className="fill-primary-fixed-dim text-primary-fixed-dim" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 ambient-shadow border border-outline-variant/20 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-600">
            <Clock size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Đi muộn</span>
          </div>
          <span className="text-2xl font-bold text-on-surface">{loading ? '—' : lateCount}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 ambient-shadow border border-outline-variant/20 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-500">
            <UserX size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Vắng mặt</span>
          </div>
          <span className="text-2xl font-bold text-on-surface">{loading ? '—' : absentCount}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-4">
        <h2 className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 px-1">
          Chi tiết tháng {monthLabel}
        </h2>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-on-surface-variant">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm font-medium">Đang tải...</span>
          </div>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-sm font-medium text-on-surface-variant border border-outline-variant/10">
            Chưa có dữ liệu chấm công trong tháng này.
          </div>
        )}

        {!loading &&
          records.map((record, index) => (
            <div
              key={index}
              className={`bg-white rounded-2xl p-5 ambient-shadow border border-outline-variant/10 flex flex-col gap-4 ${
                record.status === 'absent' ? 'opacity-70 grayscale-[0.3]' : ''
              } ${record.status === 'late' ? 'border-l-4 border-l-amber-400' : ''} ${record.status === 'absent' ? 'border-l-4 border-l-red-400' : ''}`}
            >
              <div className="flex justify-between items-start border-b border-surface-container pb-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-on-surface">{record.day}, {record.date}</span>
                  <span className="text-[11px] font-medium text-on-surface-variant">{record.shift}</span>
                </div>

                <div
                  className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 ${
                    record.status === 'on-time'
                      ? 'bg-emerald-50 text-emerald-700'
                      : record.status === 'late'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
                  }`}
                >
                  {record.status === 'on-time' && <CheckCircle2 size={12} className="fill-current" />}
                  {record.status === 'late' && <AlertTriangle size={12} className="fill-current" />}
                  {record.status === 'absent' && <XCircle size={12} className="fill-current" />}
                  {record.status === 'on-time'
                    ? 'Đúng giờ'
                    : record.status === 'late'
                      ? `Đi muộn ${record.lateMinutes}m`
                      : 'Vắng mặt'}
                </div>
              </div>

              <div className="flex justify-around items-center px-2 py-1">
                {record.status === 'absent' ? (
                  <span className="text-[12px] font-medium text-on-surface-variant italic py-2">
                    Không có dữ liệu chấm công
                  </span>
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-outline-variant uppercase">Check-in</span>
                      <span className={`text-lg font-bold ${record.status === 'late' ? 'text-amber-600' : 'text-on-surface'}`}>
                        {record.checkIn}
                      </span>
                    </div>

                    <div className="flex-1 px-4 relative flex items-center h-px bg-outline-variant/30">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[10px] font-bold text-on-surface-variant whitespace-nowrap">
                        {record.duration}
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-outline-variant uppercase">Check-out</span>
                      <span className="text-lg font-bold text-on-surface">{record.checkOut}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
      </div>
    </motion.div>
  );
}
