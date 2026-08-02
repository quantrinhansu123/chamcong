import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FilterX,
  Loader2,
  Table2,
} from 'lucide-react';
import AttendanceDetailTable from '../components/AttendanceDetailTable';
import AttendanceSheetGrid from '../components/AttendanceSheetGrid';
import { getAllEmployees, getAttendanceRecordsInRange } from '../lib/attendanceService';
import {
  buildShiftGroups,
  filterShiftGroupsByEmployees,
  mergeEmployeesWithAttendance,
  normalizeEmployeeName,
  normalizeWorkDate,
} from '../lib/attendanceSheetUtils';
import { toDateKey } from '../lib/attendanceUtils';
import { getSupabaseConfigError, getSupabaseRequestErrorMessage } from '../lib/supabase';
import type { AttendanceDbRecord } from '../types';
import { ROUTES } from '../types';
import type { StaffRecord } from '../lib/staffService';

const monthFormatter = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' });

type ViewMode = 'detail' | 'month';

const selectClass =
  'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/15';

function getMonthRange(year: number, monthIndex: number) {
  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex + 1, 0);
  return { startDate, endDate };
}

function parseDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function AttendanceSheet() {
  const today = useMemo(() => new Date(), []);
  const initialRange = useMemo(() => getMonthRange(today.getFullYear(), today.getMonth()), [today]);

  const [fromDate, setFromDate] = useState(() => toDateKey(initialRange.startDate));
  const [toDate, setToDate] = useState(() => toDateKey(initialRange.endDate));
  const [employeeId, setEmployeeId] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [employees, setEmployees] = useState<StaffRecord[]>([]);
  const [records, setRecords] = useState<AttendanceDbRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('detail');

  const rangeStart = useMemo(() => {
    const from = parseDateInput(fromDate);
    const to = parseDateInput(toDate);
    if (!from || !to) return fromDate;
    return from <= to ? fromDate : toDate;
  }, [fromDate, toDate]);

  const rangeEnd = useMemo(() => {
    const from = parseDateInput(fromDate);
    const to = parseDateInput(toDate);
    if (!from || !to) return toDate;
    return from <= to ? toDate : fromDate;
  }, [fromDate, toDate]);

  const cursor = useMemo(() => {
    const start = parseDateInput(rangeStart) ?? today;
    return new Date(start.getFullYear(), start.getMonth(), 1);
  }, [rangeStart, today]);

  const year = cursor.getFullYear();
  const monthIndex = cursor.getMonth();

  useEffect(() => {
    const configError = getSupabaseConfigError();
    if (configError) {
      setError(configError);
      setLoading(false);
      return;
    }

    if (!parseDateInput(rangeStart) || !parseDateInput(rangeEnd)) {
      setError('Invalid date range.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      getAllEmployees(),
      getAttendanceRecordsInRange(rangeStart, rangeEnd),
    ])
      .then(([staffRows, attendanceRows]) => {
        setEmployees(staffRows);
        setRecords(attendanceRows);
      })
      .catch((err) => {
        setError(getSupabaseRequestErrorMessage(err, 'Could not load attendance sheet.'));
      })
      .finally(() => setLoading(false));
  }, [rangeStart, rangeEnd]);

  const roster = useMemo(
    () => mergeEmployeesWithAttendance(employees, records),
    [employees, records],
  );

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((record) => {
      const id = (record.project_id || '').trim();
      const name = (record.product_name || record.location_name || id || '').trim();
      if (!id && !name) return;
      const key = id || `name:${normalizeEmployeeName(name)}`;
      if (!map.has(key)) map.set(key, name || id);
    });
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const dateKey = normalizeWorkDate(record.work_date);
      if (dateKey < rangeStart || dateKey > rangeEnd) return false;

      if (employeeId) {
        const selected = roster.find((emp) => String(emp.id) === employeeId);
        const byId = String(record.employee_id) === employeeId;
        const byName = selected
          ? normalizeEmployeeName(record.employee_name) === normalizeEmployeeName(selected.full_name)
          : false;
        if (!byId && !byName) return false;
      }

      if (projectKey) {
        const id = (record.project_id || '').trim();
        const name = (record.product_name || record.location_name || '').trim();
        const key = id || (name ? `name:${normalizeEmployeeName(name)}` : '');
        if (key !== projectKey) return false;
      }

      return true;
    });
  }, [records, rangeStart, rangeEnd, employeeId, projectKey, roster]);

  const filteredEmployees = useMemo(() => {
    if (!employeeId) return roster;
    return roster.filter((emp) => String(emp.id) === employeeId);
  }, [roster, employeeId]);

  const shiftGroups = useMemo(() => {
    const groups = buildShiftGroups(filteredEmployees, filteredRecords);
    return filterShiftGroupsByEmployees(groups, filteredEmployees);
  }, [filteredEmployees, filteredRecords]);

  const monthLabel = monthFormatter.format(cursor).replace(/^./, (char) => char.toUpperCase());
  const hasActiveFilters = Boolean(employeeId || projectKey)
    || fromDate !== toDateKey(initialRange.startDate)
    || toDate !== toDateKey(initialRange.endDate);

  const applyMonthRange = (yearValue: number, monthValue: number) => {
    const { startDate, endDate } = getMonthRange(yearValue, monthValue);
    setFromDate(toDateKey(startDate));
    setToDate(toDateKey(endDate));
    setApproved(false);
  };

  const goPrevMonth = () => {
    applyMonthRange(year, monthIndex - 1);
  };

  const goNextMonth = () => {
    applyMonthRange(year, monthIndex + 1);
  };

  const goThisMonth = () => {
    applyMonthRange(today.getFullYear(), today.getMonth());
  };

  const clearFilters = () => {
    applyMonthRange(today.getFullYear(), today.getMonth());
    setEmployeeId('');
    setProjectKey('');
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-bold text-slate-900">Bảng chấm công</h1>
              <Link
                to={ROUTES.reports}
                className="text-[12px] font-semibold text-red-700 hover:underline"
              >
                Báo cáo
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  viewMode === 'month'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Calendar size={16} />
                Theo tháng
              </button>

              <button
                type="button"
                onClick={() => setViewMode('detail')}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  viewMode === 'detail'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Table2 size={16} />
                Bảng chi tiết
              </button>

              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  className="px-2.5 py-2.5 text-slate-500 hover:bg-slate-50"
                  aria-label="Tháng trước"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="min-w-[130px] px-2 text-center text-sm font-bold text-slate-800">
                  {monthLabel}
                </span>
                <button
                  type="button"
                  onClick={goNextMonth}
                  className="px-2.5 py-2.5 text-slate-500 hover:bg-slate-50"
                  aria-label="Tháng sau"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <button
                type="button"
                onClick={goThisMonth}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tháng này
              </button>

              <button
                type="button"
                onClick={() => setApproved(true)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors ${
                  approved ? 'bg-red-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <CheckCircle2 size={16} />
                {approved ? 'Đã duyệt' : 'Duyệt chấm công'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-2 xl:grid-cols-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Từ ngày</span>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  setApproved(false);
                }}
                className={selectClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Đến ngày</span>
              <input
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(event.target.value);
                  setApproved(false);
                }}
                className={selectClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Nhân sự</span>
              <select
                value={employeeId}
                onChange={(event) => {
                  setEmployeeId(event.target.value);
                  setApproved(false);
                }}
                className={selectClass}
              >
                <option value="">Tất cả nhân sự</option>
                {roster.map((employee) => (
                  <option key={employee.id} value={String(employee.id)}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Dự án</span>
              <select
                value={projectKey}
                onChange={(event) => {
                  setProjectKey(event.target.value);
                  setApproved(false);
                }}
                className={selectClass}
              >
                <option value="">Tất cả dự án</option>
                {projectOptions.map((project) => (
                  <option key={project.key} value={project.key}>
                    {project.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FilterX size={16} />
                Xóa lọc
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-600">
            <span>
              Khoảng: <strong className="text-slate-800">{rangeStart}</strong>
              {' → '}
              <strong className="text-slate-800">{rangeEnd}</strong>
            </span>
            <span>·</span>
            <span>
              {filteredRecords.filter((row) => row.check_in_at).length} phiên
              {records.length !== filteredRecords.length ? ` / ${records.length}` : ''}
            </span>
            {viewMode === 'detail' ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={14} className="text-rose-600" />
                Mỗi dòng = 1 phiên theo dự án
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-0.5 rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold text-red-800">
                  <Check size={10} strokeWidth={3} /> Project
                </span>
                Lưới tháng (lọc theo bộ lọc phía trên)
              </span>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Đang tải bảng chấm công...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && viewMode === 'detail' && (
          <AttendanceDetailTable records={filteredRecords} />
        )}

        {!loading && !error && viewMode === 'month' && (
          <AttendanceSheetGrid
            shiftGroups={shiftGroups}
            records={filteredRecords}
            year={year}
            monthIndex={monthIndex}
            today={today}
          />
        )}
      </div>
    </div>
  );
}
