import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
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
import { useEmployee } from '../context/EmployeeContext';
import {
  checkIn,
  checkOut,
  getBrowserLocation,
  getBrowserLocationQuiet,
  getTodayAttendance,
  saveTodayLocation,
  startBackgroundLocationTracking,
} from '../lib/attendanceService';
import { getTodayOverviewForProjects } from '../lib/overviewService';
import { isAnonymousUserId, isValidQueryUserId, resolveQueryUserId } from '../lib/staffService';
import { compareWithLocation } from '../lib/settingsService';
import { ROUTES } from '../types';

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
  const employee = useEmployee();
  const employeeResolving = Boolean(employee.resolving);
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
    projectNames: [] as string[],
    projectCount: 0,
    siteVisits: [] as Array<{
      id: string;
      projectName: string;
      locationName: string | null;
      employeeName: string;
      checkInAt: string | null;
      checkOutAt: string | null;
      status: 'working' | 'checked_out';
    }>,
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
    checkedOutToday,
    refreshProjects,
  } = useProductCheckIn(employee);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshTodayRecord = useCallback(async () => {
    try {
      const todayRecord = await getTodayAttendance();
      setRecord(todayRecord);
    } catch {
      // ignore — record may not exist yet
    }
  }, []);

  useEffect(() => {
    const configError = getSupabaseConfigError();
    if (configError) {
      setLoading(false);
      setError(configError);
      return;
    }

    if (employeeResolving) {
      return;
    }

    refreshTodayRecord()
      .catch((err) => setError(getSupabaseRequestErrorMessage(err, getErrorMessage(err, 'Không tải được dữ liệu chấm công.'))))
      .finally(() => setLoading(false));
  }, [refreshTodayRecord, employee?.id, employeeResolving]);

  const loadOverview = useCallback(async () => {
    if (getSupabaseConfigError()) {
      setOverview((prev) => ({ ...prev, loading: false }));
      return;
    }

    if (employeeResolving) {
      return;
    }

    const userId = employee?.id?.trim() ?? '';
    const userName = employee?.name?.trim() ?? '';
    if (!userId && !userName) {
      setOverview({
        total: 0,
        checkedIn: 0,
        notCheckedIn: 0,
        absent: 0,
        projectNames: [],
        projectCount: 0,
        siteVisits: [],
        loading: false,
      });
      return;
    }

    if (isAnonymousUserId(userId) && !userName) {
      setOverview({
        total: 0,
        checkedIn: 0,
        notCheckedIn: 0,
        absent: 0,
        projectNames: [],
        projectCount: 0,
        siteVisits: [],
        loading: false,
      });
      return;
    }

    setOverview((prev) => ({ ...prev, loading: true }));
    try {
      const resolvedId = isValidQueryUserId(userId)
        ? userId
        : await resolveQueryUserId({ id: userId, name: userName });

      if (!resolvedId) {
        setOverview({
          total: 0,
          checkedIn: 0,
          notCheckedIn: 0,
          absent: 0,
          projectNames: [],
        projectCount: 0,
        siteVisits: [],
          loading: false,
        });
        return;
      }

      const data = await getTodayOverviewForProjects(resolvedId, userName);
      setOverview({
        total: data.total ?? 0,
        checkedIn: data.checkedIn ?? 0,
        notCheckedIn: data.notCheckedIn ?? 0,
        absent: data.absent ?? 0,
        projectNames: data.projectNames ?? [],
        projectCount: data.projectCount ?? 0,
        siteVisits: data.siteVisits ?? [],
        loading: false,
      });
    } catch {
      setOverview({
        total: 0,
        checkedIn: 0,
        notCheckedIn: 0,
        absent: 0,
        projectNames: [],
        projectCount: 0,
        siteVisits: [],
        loading: false,
      });
    }
  }, [employee?.id, employee?.name, employeeResolving]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const isActiveCheckIn = Boolean(record?.check_in_at && !record?.check_out_at);

  const activeSiteName = useMemo(() => {
    if (!isActiveCheckIn) return null;
    return record?.product_name?.trim() || selectedProjectName || null;
  }, [isActiveCheckIn, record?.product_name, selectedProjectName]);

  const locationText = useMemo(() => {
    if (isActiveCheckIn && activeSiteName) return activeSiteName;
    if (!record?.last_lat || !record?.last_lng) return 'Chưa ghi nhận GPS';
    return `${Number(record.last_lat).toFixed(6)}, ${Number(record.last_lng).toFixed(6)}`;
  }, [isActiveCheckIn, activeSiteName, record?.last_lat, record?.last_lng]);

  const locationSubtext = useMemo(() => {
    if (locationError) return null;

    if (isActiveCheckIn && activeSiteName) {
      const parts: string[] = [];
      if (record?.location_name) parts.push(record.location_name);
      if (record?.last_lat && record?.last_lng) {
        parts.push(`${Number(record.last_lat).toFixed(6)}, ${Number(record.last_lng).toFixed(6)}`);
      } else if (!record?.location_name) {
        parts.push('Chưa ghi nhận GPS — bấm để cập nhật');
      }
      if (record?.check_in_at) {
        parts.push(`Check-in ${formatTime(record.check_in_at)}`);
      }
      return parts.join(' · ');
    }

    if (locationCompareText) return locationCompareText;
    if (officeLocation) {
      return `So sánh với ${officeLocation.name} (bán kính ${officeLocation.radiusM}m)`;
    }
    return 'Cấu hình vị trí trong Cài đặt trước khi chấm công';
  }, [
    isActiveCheckIn,
    activeSiteName,
    locationError,
    locationCompareText,
    officeLocation,
    record?.location_name,
    record?.last_lat,
    record?.last_lng,
    record?.check_in_at,
  ]);

  const formatLocationCompare = (point: GeoPoint) => {
    const result = compareWithLocation(point, officeLocation);
    if (!result.configured || !result.office) {
      return 'Chưa cấu hình vị trí chấm công trong Cài đặt.';
    }

    const distance = Math.round(result.distanceM);
    if (result.withinRadius) {
      return `Trong phạm vi ${result.office.name} (${distance}m / ${result.office.radiusM}m)`;
    }

    return `Ngoài phạm vi ${result.office.name} (${distance}m, cho phép ${result.office.radiusM}m)`;
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
      const errorMessage = getSupabaseRequestErrorMessage(err, getErrorMessage(err, 'Có lỗi khi lưu dữ liệu.'));
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
      setError('Vui lòng chọn dự án trước khi check-in.');
      return;
    }
    runAction('check-in', async () => {
      const location = await getBrowserLocationQuiet();
      if (location) {
        setLocationCompareText(formatLocationCompare(location));
        setLocationError(null);
      } else {
        setLocationError('GPS đang lấy nền — sẽ cập nhật khi có tín hiệu.');
      }
      const updatedRecord = await checkIn(location, productSelection);
      await refreshTodayRecord();
      refreshProjects();
      loadOverview();
      return {
        record: updatedRecord,
        locationError: location ? null : 'GPS đang chạy nền. Sẽ tự cập nhật khi lấy được vị trí.',
        message: location
          ? `Check-in thành công. ${formatLocationCompare(location)}`
          : 'Check-in thành công. GPS đang chạy nền.',
      };
    });
  };

  const handleCheckOut = () => {
    if (!record?.check_in_at || record.check_out_at) return;
    runAction('check-out', async () => {
      const location = await getBrowserLocationQuiet();
      const updatedRecord = await checkOut(record, location);
      await refreshTodayRecord();
      refreshProjects();
      loadOverview();
      return {
        record: updatedRecord,
        locationError: location ? null : 'GPS đang chạy nền. Sẽ tự cập nhật khi lấy được vị trí.',
        message: location
          ? `Check-out thành công. ${formatLocationCompare(location)}`
          : 'Check-out thành công. GPS đang chạy nền.',
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

  useEffect(() => {
    const active = Boolean(record?.check_in_at && !record?.check_out_at);
    if (!active || !isSupabaseConfigured) return;

    const stop = startBackgroundLocationTracking(async (point) => {
      try {
        const updated = await saveTodayLocation(point);
        setRecord(updated);
        const result = compareWithLocation(point, officeLocation);
        if (result.configured && result.office) {
          const distance = Math.round(result.distanceM);
          setLocationCompareText(
            result.withinRadius
              ? `Trong phạm vi ${result.office.name} (${distance}m / ${result.office.radiusM}m)`
              : `Ngoài phạm vi ${result.office.name} (${distance}m, cho phép ${result.office.radiusM}m)`,
          );
        }
        setLocationError(null);
      } catch {
        // giữ im lặng — GPS nền không làm gián đoạn UI
      }
    });

    return stop;
  }, [record?.check_in_at, record?.check_out_at, officeLocation]);

  const checkInDisabled =
    loading
    || productsLoading
    || Boolean(busyAction)
    || Boolean(record?.check_in_at)
    || !isSupabaseConfigured
    || !canCheckIn;
  const checkOutDisabled = loading || Boolean(busyAction) || !record?.check_in_at || Boolean(record?.check_out_at) || !isSupabaseConfigured;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6 pb-8"
    >
      <div className="header-bg -mx-5 px-5 pt-12 pb-20 mb-[-80px]">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <UserAvatar name={employee.name} size="md" className="border border-primary-fixed/20 shadow-lg" />
            <div>
              <p className="text-[12px] text-white/70 font-medium">Xin chào,</p>
              <h1 className="text-xl font-bold text-white tracking-tight">{employee.name}</h1>
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

        {checkedOutToday && (
          <p className="text-[11px] font-medium text-on-surface-variant bg-surface-container-low rounded-xl px-3 py-2">
            Bạn đã check-out hôm nay. Không còn trong danh sách đang làm việc.
          </p>
        )}

        {!record?.check_in_at && !checkedOutToday && (
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
            <p className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mb-1">
              {isActiveCheckIn ? 'CÔNG TRÌNH ĐANG LÀM' : 'VỊ TRÍ HIỆN TẠI'}
            </p>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
              isActiveCheckIn
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-surface-container-low border-outline-variant/30 text-outline'
            }`}>
              {isActiveCheckIn ? 'Đang làm' : 'GPS'}
            </span>
          </div>
          <h3 className={`font-bold text-lg leading-tight mb-1 ${locationError ? 'text-red-700' : 'text-on-surface truncate'}`}>
            {locationError ? 'Chưa lấy được GPS' : locationText}
          </h3>
          <p className={`text-[12px] leading-relaxed ${locationError ? 'text-red-700' : 'text-on-surface-variant'}`}>
            {locationError || locationSubtext}
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

      <div className="glass-card p-5 flex flex-col gap-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Tổng quan hôm nay</h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {overview.loading || employeeResolving
                ? 'Đang tải dự án...'
                : (overview.projectNames ?? []).length > 0
                  ? (overview.projectNames ?? []).join(', ')
                  : 'Chưa có dự án assignees khớp tên của bạn'}
            </p>
          </div>
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
                  overview.projectCount > 0
                    ? 251.2 * (1 - overview.checkedIn / Math.max(overview.total, 1))
                    : 251.2
                }
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-on-surface">
                {overview.loading ? '—' : overview.projectCount}
              </span>
              <span className="text-[10px] font-bold text-outline uppercase">Dự án</span>
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

        <div className="border-t border-outline-variant/15 pt-4">
          <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Địa điểm đã check-in / check-out
          </p>
          {overview.loading || employeeResolving ? (
            <p className="text-[12px] text-on-surface-variant">Đang tải...</p>
          ) : (overview.siteVisits ?? []).length === 0 ? (
            <p className="text-[12px] text-on-surface-variant">Chưa có ai check-in hôm nay.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {(overview.siteVisits ?? []).map((visit) => (
                <div
                  key={visit.id}
                  className="rounded-xl border border-outline-variant/15 bg-surface-container-low/60 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-on-surface truncate">{visit.projectName}</p>
                      <p className="text-[11px] text-on-surface-variant truncate">
                        {visit.employeeName}
                        {visit.locationName ? ` · ${visit.locationName}` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      visit.status === 'working'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-surface-container text-outline border border-outline-variant/20'
                    }`}>
                      {visit.status === 'working' ? 'Đang làm' : 'Đã out'}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1.5">
                    In {formatTime(visit.checkInAt)}
                    {visit.checkOutAt ? ` · Out ${formatTime(visit.checkOutAt)}` : ' · Chưa check-out'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
