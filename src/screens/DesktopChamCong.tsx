import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Package,
  Route,
} from 'lucide-react';
import ProductCheckInPicker from '../components/ProductCheckInPicker';
import TodayAttendanceCards from '../components/TodayAttendanceCards';
import UserAvatar from '../components/UserAvatar';
import { useProductCheckIn } from '../hooks/useProductCheckIn';
import { useEmployee } from '../context/EmployeeContext';
import {
  checkIn,
  checkOut,
  getBrowserLocationQuiet,
  getTodayAttendance,
  saveTodayLocation,
  startBackgroundLocationTracking,
} from '../lib/attendanceService';
import { compareWithLocation, type OfficeLocation } from '../lib/settingsService';
import { getSupabaseConfigError, getSupabaseRequestErrorMessage, isSupabaseConfigured } from '../lib/supabase';
import { ROUTES, type AttendanceDbRecord, type GeoPoint } from '../types';

function formatTime(value?: string | null) {
  if (!value) return '--:--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getStatusLabel(record: AttendanceDbRecord | null) {
  if (!record?.check_in_at) return 'Chưa check-in';
  if (record.check_out_at) return 'Đã check-out';
  return 'Đang làm việc';
}

function formatLocationCompare(point: GeoPoint, location: OfficeLocation | null) {
  const result = compareWithLocation(point, location);
  if (!result.configured || !result.office) {
    return 'Check-in location is not configured in Settings.';
  }

  const distance = Math.round(result.distanceM);
  if (result.withinRadius) {
    return `Within range of ${result.office.name} (${distance}m / ${result.office.radiusM}m)`;
  }

  return `Outside range of ${result.office.name} (${distance}m, allowed ${result.office.radiusM}m)`;
}

export default function DesktopChamCong() {
  const employee = useEmployee();
  const [record, setRecord] = useState<AttendanceDbRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<'check-in' | 'check-out' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const {
    products,
    loading: productsLoading,
    selectedProductId,
    selectedProjectName,
    officeLocation,
    handleProductChange,
    selection,
    canCheckIn,
    loadError: projectsLoadError,
    checkedOutToday,
    todaySessions,
    refreshProjects,
  } = useProductCheckIn(employee);

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
      .catch((err) => setError(getSupabaseRequestErrorMessage(err, 'Could not load attendance data.')))
      .finally(() => setLoading(false));
  }, []);

  const locationText = useMemo(() => {
    if (!record?.last_lat || !record?.last_lng) return 'No GPS recorded';
    return `${Number(record.last_lat).toFixed(6)}, ${Number(record.last_lng).toFixed(6)}`;
  }, [record?.last_lat, record?.last_lng]);

  const isActiveCheckIn = Boolean(record?.check_in_at && !record?.check_out_at);

  const handleCheckIn = async () => {
    if (isActiveCheckIn || !selection) {
      if (!selection) {
        setError('Please select a project before checking in.');
      }
      return;
    }

    setBusyAction('check-in');
    setError(null);
    setMessage(null);
    try {
      const location = await getBrowserLocationQuiet();
      const updated = await checkIn(location, selection);
      setRecord(updated);
      refreshProjects();
      setMessage(
        location
          ? `Check-in successful. ${formatLocationCompare(location, officeLocation)}`
          : 'Check-in successful. GPS is running in the background.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check in.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCheckOut = async () => {
    if (!record?.check_in_at || record.check_out_at) return;

    setBusyAction('check-out');
    setError(null);
    setMessage(null);
    try {
      const location = await getBrowserLocationQuiet();
      const updated = await checkOut(record, location);
      setRecord(updated);
      refreshProjects();
      setMessage(
        location
          ? `Check-out successful. You can select another project to check in again. ${formatLocationCompare(location, officeLocation)}`
          : 'Check-out successful. You can select another project to check in again.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check out.');
    } finally {
      setBusyAction(null);
    }
  };

  useEffect(() => {
    const active = Boolean(record?.check_in_at && !record?.check_out_at);
    if (!active || !isSupabaseConfigured) return;

    return startBackgroundLocationTracking(async (point) => {
      try {
        const updated = await saveTodayLocation(point);
        setRecord(updated);
      } catch {
        // GPS nền im lặng
      }
    });
  }, [record?.check_in_at, record?.check_out_at]);

  const checkInDisabled =
    loading || productsLoading || Boolean(busyAction) || isActiveCheckIn || !canCheckIn || !isSupabaseConfigured;
  const checkOutDisabled =
    loading || Boolean(busyAction) || !record?.check_in_at || Boolean(record?.check_out_at) || !isSupabaseConfigured;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">Chấm công</p>
          <h1 className="text-2xl font-bold text-primary">Điểm danh hôm nay</h1>
        </div>
        <div className="flex items-center gap-3">
          <UserAvatar name={employee.name} size="sm" />
          <div className="text-right">
            <p className="text-sm font-bold text-primary">{employee.name}</p>
            <p className="text-xs text-on-surface-variant">{employee.id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-outline-variant/15 p-6 space-y-5">
          <div className="flex items-center gap-2 text-red-700">
            <Package size={18} />
            <h2 className="font-bold">Chọn dự án</h2>
          </div>

          {!isActiveCheckIn ? (
            <div className="space-y-2">
              {checkedOutToday && products.length > 0 && (
                <p className="text-sm text-on-surface-variant bg-surface-container-low rounded-xl px-4 py-3">
                  Checked out. Select another remaining project to check in again.
                </p>
              )}
              <ProductCheckInPicker
                products={products}
                loading={productsLoading}
                loadError={projectsLoadError}
                selectedProductId={selectedProductId}
                onProductChange={handleProductChange}
                emptyMessage={
                  todaySessions.some((s) => s.check_in_at && s.check_out_at)
                    ? 'You have already checked in to all assigned projects today.'
                    : undefined
                }
              />
              {officeLocation && products.length > 0 ? (
                <p className="text-xs text-on-surface-variant">
                  Vị trí chấm công: <span className="font-bold text-primary">{officeLocation.name}</span>
                  {' '}· bán kính {officeLocation.radiusM}m
                  {' '}({officeLocation.lat.toFixed(6)}, {officeLocation.lng.toFixed(6)})
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-sm font-bold text-red-800">{record?.product_name || '—'}</p>
              <p className="text-xs text-red-700 mt-0.5">{record?.location_name || '—'}</p>
              <p className="text-xs text-red-700 mt-1">Check-out xong mới chọn được dự án khác.</p>
            </div>
          )}

          {(message || error) && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                error ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {error && <AlertCircle size={16} className="shrink-0" />}
              <span>{error || message}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={checkInDisabled}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-600 text-white font-bold text-sm disabled:opacity-50"
            >
              {busyAction === 'check-in' ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              Check-in
            </button>
            <button
              type="button"
              onClick={handleCheckOut}
              disabled={checkOutDisabled}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-secondary text-secondary font-bold text-sm disabled:opacity-50"
            >
              {busyAction === 'check-out' ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
              Check-out
            </button>
          </div>

          <TodayAttendanceCards sessions={todaySessions.filter((s) => Boolean(s.check_in_at))} />

          <Link
            to={ROUTES.attendanceSheet}
            className="flex items-center gap-3 rounded-xl border border-outline-variant/15 bg-surface-container-low/50 px-4 py-3 hover:bg-surface-container-low transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0">
              <Route size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-on-surface">Xem toàn bộ bảng công</p>
              <p className="text-xs text-on-surface-variant">Theo dõi lộ trình chấm công theo ngày</p>
            </div>
            <ChevronRight size={18} className="text-outline shrink-0" />
          </Link>
        </section>

        <section className="bg-white rounded-2xl border border-outline-variant/15 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-primary-container text-xs font-bold">
              {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              {loading ? 'Đang tải' : getStatusLabel(record)}
            </span>
            <span className="text-xs text-on-surface-variant">{formatDate(now)}</span>
          </div>

          <div className="text-center py-4">
            <p className="text-5xl font-extrabold text-primary tabular-nums">{formatTime(record?.check_in_at)}</p>
            <p className="text-sm text-on-surface-variant mt-2">Giờ check-in</p>
            {record?.check_out_at && (
              <p className="text-sm font-semibold text-on-surface mt-1">
                Check-out: {formatTime(record.check_out_at)}
              </p>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-surface-container-low px-4 py-3">
            <MapPin size={18} className="text-on-surface-variant shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase">GPS hiện tại</p>
              <p className="text-sm font-medium text-on-surface">{locationText}</p>
              {officeLocation && (
                <p className="text-xs text-on-surface-variant mt-1">
                  Compared with {officeLocation.name} · radius {officeLocation.radiusM}m
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
