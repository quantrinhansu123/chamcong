import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  MoreHorizontal,
  AlertCircle,
  Package,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { AttendanceDbRecord, GeoPoint } from '../types';
import ProductCheckInPicker from '../components/ProductCheckInPicker';
import { useProductCheckIn } from '../hooks/useProductCheckIn';
import UserAvatar from '../components/UserAvatar';
import { getSupabaseConfigError, getSupabaseRequestErrorMessage, isSupabaseConfigured } from '../lib/supabase';
import {
  checkIn,
  checkOut,
  currentEmployee,
  getAllEmployees,
  getBrowserLocation,
  getTodayAttendance,
  getTodayAttendanceForAll,
  saveTodayLocation,
} from '../lib/attendanceService';
import { formatDurationShort, getOvertimeMinutes } from '../lib/attendanceUtils';
import { assertWithinCheckInRadius, compareWithCheckInLocation } from '../lib/settingsService';
import { ROUTES } from '../types';

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

function getErrorMessage(err: unknown, fallback: string) {
  if (!(err instanceof Error)) return fallback;

  if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
    return 'Không kết nối được Supabase. Hãy kiểm tra mạng hoặc cấu hình Supabase rồi thử lại.';
  }

  return err.message || fallback;
}

export default function Home() {
  const [record, setRecord] = useState<AttendanceDbRecord | null>(null);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<'check-in' | 'check-out' | 'location' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationCompareText, setLocationCompareText] = useState<string | null>(null);
  const [overview, setOverview] = useState({
    total: 0,
    checkedIn: 0,
    notCheckedIn: 0,
    absent: 0,
    loading: true,
  });
  const {
    products,
    loading: productsLoading,
    selectedProductId,
    selectedProjectName,
    officeLocation,
    handleProductChange,
    selection: productSelection,
    canCheckIn,
    loadError: projectsLoadError,
  } = useProductCheckIn();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const configError = getSupabaseConfigError();
    if (configError) {
      setLoading(false);
      setError(configError);
      return;
    }

    getTodayAttendance()
      .then(setRecord)
      .catch((err) => setError(getSupabaseRequestErrorMessage(err, getErrorMessage(err, 'Không tải được dữ liệu chấm công.'))))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (getSupabaseConfigError()) {
      setOverview((prev) => ({ ...prev, loading: false }));
      return;
    }

    Promise.all([getAllEmployees(), getTodayAttendanceForAll()])
      .then(([employees, todayRecords]) => {
        const activeEmployees = employees.filter((emp) => !emp.status || emp.status === 'active');
        const checkedInIds = new Set(
          todayRecords.filter((row) => row.check_in_at).map((row) => row.employee_id),
        );
        const absent = todayRecords.filter((row) => !row.check_in_at).length;

        setOverview({
          total: activeEmployees.length,
          checkedIn: checkedInIds.size,
          notCheckedIn: Math.max(0, activeEmployees.length - checkedInIds.size),
          absent,
          loading: false,
        });
      })
      .catch(() => setOverview((prev) => ({ ...prev, loading: false })));
  }, []);

  const duration = useMemo(
    () => formatDuration(record?.check_in_at, record?.check_out_at, now),
    [record?.check_in_at, record?.check_out_at, now],
  );

  const overtimeMinutes = useMemo(() => {
    if (!record) return 0;
    return getOvertimeMinutes(record, now);
  }, [record, now]);

  const locationText = useMemo(() => {
    if (!record?.last_lat || !record?.last_lng) return 'Chưa ghi nhận GPS';
    return `${Number(record.last_lat).toFixed(6)}, ${Number(record.last_lng).toFixed(6)}`;
  }, [record?.last_lat, record?.last_lng]);

  const formatLocationCompare = (point: GeoPoint) => {
    const result = compareWithCheckInLocation(point, selectedProductId, selectedProjectName);
    if (!result.configured || !result.office) {
      return 'Chưa cấu hình vị trí chấm công trong Cài đặt.';
    }

    const distance = Math.round(result.distanceM);
    if (result.withinRadius) {
      return `Trong phạm vi ${result.office.name} (${distance}m / ${result.office.radiusM}m)`;
    }

    return `Ngoài phạm vi ${result.office.name} (${distance}m, cho phép ${result.office.radiusM}m)`;
  };

  const getLocationForAttendance = async (): Promise<{ location: GeoPoint | null; warning: string | null }> => {
    try {
      const location = await getBrowserLocation();
      setLocationError(null);
      return { location, warning: null };
    } catch (err) {
      const warning = getErrorMessage(err, 'Không lấy được vị trí GPS.');
      setLocationError(warning);
      return { location: null, warning };
    }
  };

  const runAction = async (
    action: 'check-in' | 'check-out' | 'location',
    callback: () => Promise<{ record: AttendanceDbRecord; message?: string; locationError?: string | null }>,
  ) => {
    setBusyAction(action);
    setError(null);
    setMessage(null);

    try {
      const result = await callback();
      setRecord(result.record);
      if ('locationError' in result) {
        setLocationError(result.locationError ?? null);
      }
      setMessage(
        result.message ??
          (action === 'check-in'
            ? 'Đã lưu check-in vào Supabase.'
            : action === 'check-out'
              ? 'Đã lưu check-out vào Supabase.'
              : 'Đã lưu GPS vào Supabase.'),
      );
    } catch (err) {
      const errorMessage = getErrorMessage(err, 'Có lỗi khi lưu dữ liệu.');
      setError(errorMessage);
      if (action === 'location') {
        setLocationError(errorMessage);
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleCheckIn = () => {
    if (record?.check_in_at) return;
    if (!productSelection) {
      setError(
        officeLocation
          ? 'Vui lòng chọn dự án trước khi check-in.'
          : 'Chưa cấu hình vị trí cho dự án. Vào Cài đặt → Dự án → Lấy vị trí.',
      );
      return;
    }
    runAction('check-in', async () => {
      const { location, warning } = await getLocationForAttendance();
      if (location) {
        assertWithinCheckInRadius(location, selectedProductId, selectedProjectName);
        setLocationCompareText(formatLocationCompare(location));
      }
      const updatedRecord = await checkIn(location, productSelection);
      return {
        record: updatedRecord,
        locationError: warning,
        message: warning
          ? 'Đã lưu check-in, nhưng chưa lấy được GPS. Bấm Thử lại ở phần Vị trí hiện tại để cập nhật sau.'
          : location
            ? `Check-in thành công. ${formatLocationCompare(location)}`
            : 'Đã lưu check-in vào Supabase.',
      };
    });
  };

  const handleCheckOut = () => {
    if (!record?.check_in_at || record.check_out_at) return;
    runAction('check-out', async () => {
      const { location, warning } = await getLocationForAttendance();
      const updatedRecord = await checkOut(record, location);
      return {
        record: updatedRecord,
        locationError: warning,
        message: warning
          ? 'Đã lưu check-out, nhưng chưa lấy được GPS. Bấm Thử lại ở phần Vị trí hiện tại để cập nhật sau.'
          : 'Đã lưu check-out vào Supabase.',
      };
    });
  };

  const handleSaveLocation = () => {
    runAction('location', async () => {
      const location = await getBrowserLocation();
      const compareText = formatLocationCompare(location);
      setLocationCompareText(compareText);
      const updatedRecord = await saveTodayLocation(location);
      return {
        record: updatedRecord,
        locationError: null,
        message: compareText,
      };
    });
  };

  const checkInDisabled =
    loading
    || productsLoading
    || Boolean(busyAction)
    || Boolean(record?.check_in_at)
    || !isSupabaseConfigured
    || !canCheckIn;
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
            <UserAvatar name={currentEmployee.name} size="md" className="border border-primary-fixed/20 shadow-lg" />
            <div>
              <p className="text-[12px] text-white/70 font-medium">Xin chào,</p>
              <h1 className="text-xl font-bold text-white tracking-tight">{currentEmployee.name}</h1>
            </div>
          </div>
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
          {(record?.product_name || record?.location_name) && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-on-surface-variant mt-1">
              <Package size={12} className="text-emerald-600" />
              <span>{record.product_name}{record.location_name ? ` · ${record.location_name}` : ''}</span>
            </div>
          )}
        </div>

        {!record?.check_in_at && (
          <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low/50 p-3 space-y-2">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Dự án chấm công</p>
            <ProductCheckInPicker
              products={products}
              loading={productsLoading}
              loadError={projectsLoadError}
              selectedProductId={selectedProductId}
              onProductChange={handleProductChange}
              compact
            />
            {officeLocation ? (
              <p className="text-[10px] text-on-surface-variant">
                Vị trí chấm công: <span className="font-bold text-primary">{officeLocation.name}</span>
                {' '}· bán kính {officeLocation.radiusM}m
                {' '}(
                {officeLocation.lat.toFixed(6)}, {officeLocation.lng.toFixed(6)}
                )
              </p>
            ) : (
              <p className="text-[10px] text-amber-700">
                Chưa cấu hình vị trí.{' '}
                <Link to={ROUTES.settings} className="font-bold underline">
                  Vào Cài đặt → Dự án → Lấy vị trí
                </Link>
              </p>
            )}
          </div>
        )}

        {(message || error) && (
          <div
            className={`rounded-xl px-4 py-3 text-[12px] font-bold flex items-center gap-2 ${
              error ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}
          >
            {error && <AlertCircle size={16} className="shrink-0" />}
            <span className="flex-1">{error || message}</span>
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
        className={`glass-card p-5 flex items-start gap-4 text-left disabled:opacity-60 active:scale-[0.99] transition-all ${
          locationError ? 'border-red-100 bg-red-50/80' : ''
        }`}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner ${
          locationError ? 'bg-red-50 text-red-600' : 'bg-surface-container text-on-surface-variant'
        }`}>
          {busyAction === 'location' ? (
            <Loader2 size={20} className="animate-spin" />
          ) : locationError ? (
            <AlertCircle size={20} />
          ) : (
            <MapPin size={20} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mb-1">VỊ TRÍ HIỆN TẠI</p>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-[10px] font-bold text-outline uppercase tracking-wider">GPS</span>
          </div>
          <h3 className={`font-bold text-lg leading-tight mb-1 ${locationError ? 'text-red-700' : 'text-on-surface truncate'}`}>
            {locationError ? 'Chưa lấy được GPS' : locationText}
          </h3>
          <p className={`text-[12px] leading-relaxed ${locationError ? 'text-red-700' : 'text-on-surface-variant'}`}>
            {locationError
              || locationCompareText
              || (officeLocation
                ? `So sánh với ${officeLocation.name} (bán kính ${officeLocation.radiusM}m)`
                : 'Cấu hình vị trí trong Cài đặt trước khi chấm công')}
          </p>
          {!locationError && record?.location_accuracy_m && (
            <p className="text-[11px] text-on-surface-variant mt-1">
              Độ chính xác khoảng {Math.round(Number(record.location_accuracy_m))}m
            </p>
          )}
          {locationError && (
            <p className="text-[12px] font-extrabold text-primary-container mt-2">Thử lại</p>
          )}
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
            {overtimeMinutes > 0 && (
              <p className="text-[11px] font-bold text-violet-600 mt-1">
                OT +{formatDurationShort(overtimeMinutes)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-5 flex flex-col gap-4 mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-on-surface">Tổng quan hôm nay</h3>
          <Link to="/bao-cao" className="text-[12px] font-bold text-on-surface flex items-center gap-1 hover:opacity-80 transition-opacity">
            Xem báo cáo <ChevronRight size={14} />
          </Link>
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
                strokeDashoffset={
                  overview.total > 0
                    ? 251.2 * (1 - overview.checkedIn / overview.total)
                    : 251.2
                }
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-on-surface">
                {overview.loading ? '—' : overview.total}
              </span>
              <span className="text-[10px] font-bold text-outline uppercase">Nhân sự</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-container" />
                <span className="text-[12px] text-on-surface-variant font-medium">Đã check-in</span>
              </div>
              <span className="text-[12px] font-bold">
                {overview.loading ? '—' : overview.checkedIn}
                {!overview.loading && overview.total > 0 && (
                  <span className="text-outline font-normal text-[10px]">
                    {' '}({Math.round((overview.checkedIn / overview.total) * 100)}%)
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary-container" />
                <span className="text-[12px] text-on-surface-variant font-medium">Chưa check-in</span>
              </div>
              <span className="text-[12px] font-bold">
                {overview.loading ? '—' : overview.notCheckedIn}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[12px] text-on-surface-variant font-medium">Ghi nhận vắng</span>
              </div>
              <span className="text-[12px] font-bold">{overview.loading ? '—' : overview.absent}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
