import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, CheckCircle2, Clock, Loader2, LogIn, LogOut, MapPin, Timer } from 'lucide-react';
import { motion } from 'motion/react';
import type { AttendanceDbRecord } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  checkIn,
  checkOut,
  currentEmployee,
  getBrowserLocation,
  getTodayAttendance,
  saveTodayLocation,
} from '../lib/attendanceService';

const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function formatTime(value?: string | null) {
  if (!value) return '--:--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function formatDate(date = new Date()) {
  return `${dayNames[date.getDay()]}, ${new Intl.DateTimeFormat('vi-VN').format(date)}`;
}

function formatDuration(start?: string | null, end?: string | null, now = new Date()) {
  if (!start) return '0h 00m';
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : now.getTime();
  const diffMinutes = Math.max(0, Math.floor((endMs - startMs) / 60_000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = `${diffMinutes % 60}`.padStart(2, '0');
  return `${hours}h ${minutes}m`;
}

function getStatusLabel(record: AttendanceDbRecord | null) {
  if (!record?.check_in_at) return 'Chưa check-in';
  if (record.check_out_at) return 'Đã check-out';
  return 'Đã check-in';
}

export default function Attendance() {
  const [record, setRecord] = useState<AttendanceDbRecord | null>(null);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<'check-in' | 'check-out' | 'location' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setError('Chưa cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.');
      return;
    }

    getTodayAttendance()
      .then(setRecord)
      .catch((err) => setError(err.message || 'Không tải được dữ liệu chấm công.'))
      .finally(() => setLoading(false));
  }, []);

  const duration = useMemo(
    () => formatDuration(record?.check_in_at, record?.check_out_at, now),
    [record?.check_in_at, record?.check_out_at, now],
  );

  const locationText = useMemo(() => {
    if (!record?.last_lat || !record?.last_lng) return 'Chưa ghi nhận GPS';
    return `${Number(record.last_lat).toFixed(6)}, ${Number(record.last_lng).toFixed(6)}`;
  }, [record?.last_lat, record?.last_lng]);

  const runAction = async (
    action: 'check-in' | 'check-out' | 'location',
    callback: () => Promise<AttendanceDbRecord>,
  ) => {
    setBusyAction(action);
    setError(null);
    setMessage(null);

    try {
      const updatedRecord = await callback();
      setRecord(updatedRecord);
      setMessage(
        action === 'check-in'
          ? 'Đã lưu check-in vào Supabase.'
          : action === 'check-out'
            ? 'Đã lưu check-out vào Supabase.'
            : 'Đã lưu GPS vào Supabase.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi lưu dữ liệu.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCheckIn = () => {
    if (record?.check_in_at) return;
    runAction('check-in', async () => {
      const location = await getBrowserLocation();
      return checkIn(location);
    });
  };

  const handleCheckOut = () => {
    if (!record?.check_in_at || record.check_out_at) return;
    runAction('check-out', async () => {
      const location = await getBrowserLocation();
      return checkOut(record, location);
    });
  };

  const handleSaveLocation = () => {
    runAction('location', async () => {
      const location = await getBrowserLocation();
      return saveTodayLocation(location);
    });
  };

  const checkInDisabled = loading || Boolean(busyAction) || Boolean(record?.check_in_at) || !isSupabaseConfigured;
  const checkOutDisabled = loading || Boolean(busyAction) || !record?.check_in_at || Boolean(record?.check_out_at) || !isSupabaseConfigured;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-6"
    >
      <div className="flex justify-between items-center py-4 bg-surface sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button className="p-2 -ml-2 hover:bg-surface-container rounded-full transition-colors active:scale-90">
            <ArrowLeft size={20} className="text-primary" />
          </button>
          <h1 className="text-xl font-bold text-primary tracking-tight">Trang chủ</h1>
        </div>
        <button className="p-2 hover:bg-surface-container rounded-full transition-colors active:scale-90 relative">
          <Bell size={20} className="text-primary" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full border-2 border-surface" />
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-xl shadow-primary-container/5 border border-primary-fixed-dim/20 relative overflow-hidden flex flex-col gap-6">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-between items-center relative z-10">
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">CA LÀM HÔM NAY</p>
            <h2 className="text-lg font-bold text-on-surface leading-tight">{record?.shift_name || 'Ca hành chính'}</h2>
            <p className="text-[12px] font-medium text-outline">08:00 - 17:30</p>
          </div>
          <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center justify-center">
            <span className="text-[10px] font-bold text-emerald-700 whitespace-nowrap">
              {record?.status === 'checked_out' ? 'Hoàn tất' : record?.status === 'working' ? 'Đang làm việc' : 'Sẵn sàng'}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-4 z-10">
          <div className="flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100/50">
            {loading ? (
              <Loader2 size={16} className="text-emerald-600 animate-spin" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-600 fill-emerald-600/10" />
            )}
            <span className="text-[12px] font-bold text-emerald-600">{loading ? 'Đang tải' : getStatusLabel(record)}</span>
          </div>
          <h1 className="text-[56px] font-extrabold text-primary tracking-tighter leading-none mb-1">
            {formatTime(record?.check_in_at)}
          </h1>
          <p className="text-sm font-medium text-on-surface-variant">{formatDate(now)}</p>
        </div>

        <button
          type="button"
          onClick={handleSaveLocation}
          disabled={loading || Boolean(busyAction) || !isSupabaseConfigured}
          className="bg-surface-container-low rounded-xl p-4 flex items-center gap-4 z-10 border border-outline-variant/10 text-left disabled:opacity-60 active:scale-[0.99] transition-all"
        >
          <div className="bg-surface-container-lowest rounded-full p-2.5 shadow-sm shrink-0 border border-outline-variant/10">
            {busyAction === 'location' ? (
              <Loader2 size={20} className="text-primary animate-spin" />
            ) : (
              <MapPin size={20} className="text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-on-surface-variant leading-tight mb-0.5">
              {record?.location_accuracy_m ? `Độ chính xác khoảng ${Math.round(Number(record.location_accuracy_m))}m` : 'Bấm để lấy GPS hiện tại'}
            </p>
            <p className="text-[12px] font-bold text-primary truncate">{locationText}</p>
          </div>
          <span className="bg-surface-container-high px-2 py-0.5 rounded text-[10px] font-bold text-outline">GPS</span>
        </button>

        {(message || error) && (
          <div
            className={`z-10 rounded-xl px-4 py-3 text-[12px] font-bold ${
              error ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mt-2">
          <button
            onClick={handleCheckIn}
            disabled={checkInDisabled}
            className="bg-emerald-600 text-white rounded-xl py-4 flex justify-center items-center gap-2 font-bold text-sm shadow-lg shadow-emerald-600/10 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {busyAction === 'check-in' ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
            CHECK-IN
          </button>
          <button
            onClick={handleCheckOut}
            disabled={checkOutDisabled}
            className="bg-white border-1.5 border-amber-500 text-amber-600 rounded-xl py-4 flex justify-center items-center gap-2 font-bold text-sm hover:bg-amber-50 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {busyAction === 'check-out' ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
            CHECK-OUT
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Clock size={16} />
            <span className="text-[12px] font-bold uppercase tracking-wider">Thời gian</span>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center border-b border-surface-container-high pb-2">
              <span className="text-[12px] font-medium text-outline">Giờ vào</span>
              <span className="text-sm font-bold text-primary">{formatTime(record?.check_in_at)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[12px] font-medium text-outline">Giờ ra</span>
              <span className="text-sm font-bold text-outline">{formatTime(record?.check_out_at)}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Timer size={16} />
            <span className="text-[12px] font-bold uppercase tracking-wider">Tổng thời gian</span>
          </div>
          <div className="flex flex-col items-start pt-4">
            <div className="text-[28px] font-bold text-primary leading-tight">{duration}</div>
            <div className="mt-2 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold text-amber-600 border border-amber-100">
              {currentEmployee.id}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
