import { useEffect, useMemo, useState } from 'react';
import {
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  MoreHorizontal,
} from 'lucide-react';
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
const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

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

export default function Home() {
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
  const currentDay = now.getDate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6 pb-8"
    >
      <div className="header-bg -mx-5 px-5 pt-12 pb-20 mb-[-80px]">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-primary-fixed/20 shadow-lg">
              <img
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=100&h=100"
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-[12px] text-white/70 font-medium">Xin chào,</p>
              <h1 className="text-xl font-bold text-white tracking-tight">{currentEmployee.name}</h1>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all border border-white/5">
            <BarChart2 size={20} />
          </button>
        </div>
      </div>

      <div className="glass-card p-6 flex flex-col gap-4 relative z-10">
        <div className="flex justify-between items-center">
          <h2 className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">TRẠNG THÁI HÔM NAY</h2>
          <button className="text-outline-variant hover:text-on-surface transition-colors p-1">
            <MoreHorizontal size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-4 gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-primary-container text-[12px] font-bold shadow-sm">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} className="fill-current" />}
            {loading ? 'Đang tải' : getStatusLabel(record)}
          </div>
          <div className="text-[64px] font-extrabold text-primary leading-none tracking-tighter mt-2">
            {formatTime(record?.check_in_at)}
          </div>
          <div className="text-sm font-medium text-outline">{formatDate(now)}</div>
        </div>

        {(message || error) && (
          <div
            className={`rounded-xl px-4 py-3 text-[12px] font-bold ${
              error ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={handleCheckIn}
            disabled={checkInDisabled}
            className="bg-primary-container text-white py-4 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary-container/10 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {busyAction === 'check-in' ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            CHECK-IN
          </button>
          <button
            onClick={handleCheckOut}
            disabled={checkOutDisabled}
            className="bg-white border-[1.5px] border-secondary text-secondary py-4 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-secondary/5 active:scale-95 transition-all text-center leading-tight disabled:opacity-50 disabled:active:scale-100"
          >
            {busyAction === 'check-out' ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
            CHECK-OUT
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSaveLocation}
        disabled={loading || Boolean(busyAction) || !isSupabaseConfigured}
        className="glass-card p-5 flex items-start gap-4 text-left disabled:opacity-60 active:scale-[0.99] transition-all"
      >
        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 shadow-inner">
          {busyAction === 'location' ? <Loader2 size={20} className="text-on-surface-variant animate-spin" /> : <MapPin size={20} className="text-on-surface-variant" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mb-1">VỊ TRÍ HIỆN TẠI</p>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-[10px] font-bold text-outline uppercase tracking-wider">GPS</span>
          </div>
          <h3 className="font-bold text-on-surface text-lg leading-tight mb-1 truncate">{locationText}</h3>
          <p className="text-[12px] text-on-surface-variant leading-relaxed">
            {record?.location_accuracy_m ? `Độ chính xác khoảng ${Math.round(Number(record.location_accuracy_m))}m` : 'Bấm để lấy GPS hiện tại'}
          </p>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Calendar size={18} />
            <h3 className="text-sm font-bold text-on-surface">Lịch làm việc</h3>
          </div>
          <p className="text-[12px] font-bold text-on-surface">{new Intl.DateTimeFormat('vi-VN').format(now)}</p>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-outline-variant/50">
            {weekDays.map((day, index) => (
              <div key={day} className={index < 5 ? 'text-outline-variant' : ''}>{day}</div>
            ))}
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className={`h-6 flex items-center justify-center ${index === Math.min(6, currentDay % 7) ? 'bg-primary text-white rounded-full' : 'text-outline'}`}
              >
                {currentDay - Math.min(6, currentDay % 7) + index}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Clock size={18} />
            <h3 className="text-sm font-bold text-on-surface">Tổng thời gian</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-2">
            <div className="text-[32px] font-bold text-on-surface leading-tight">{duration}</div>
            <p className="text-[12px] font-semibold text-outline">Hôm nay</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-5 flex flex-col gap-4 mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-on-surface">Tổng quan nhân sự</h3>
          <button className="text-[12px] font-bold text-on-surface flex items-center gap-1 hover:opacity-80 transition-opacity">
            Xem tất cả <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-surface-container-low)" strokeWidth="12" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="var(--color-primary-container)"
                strokeWidth="12"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 * (1 - 0.76)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-on-surface">128</span>
              <span className="text-[10px] font-bold text-outline uppercase">Tổng số</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-container" />
                <span className="text-[12px] text-on-surface-variant font-medium">Đã check-in</span>
              </div>
              <span className="text-[12px] font-bold">98 <span className="text-outline font-normal text-[10px]">(76%)</span></span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary-container" />
                <span className="text-[12px] text-on-surface-variant font-medium">Chưa check-in</span>
              </div>
              <span className="text-[12px] font-bold">25 <span className="text-outline font-normal text-[10px]">(20%)</span></span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[12px] text-on-surface-variant font-medium">Vắng mặt</span>
              </div>
              <span className="text-[12px] font-bold">5 <span className="text-outline font-normal text-[10px]">(4%)</span></span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
