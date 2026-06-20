import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import AttendanceSheetGrid from '../components/AttendanceSheetGrid';
import { getAllEmployees, getAttendanceRecordsInRange } from '../lib/attendanceService';
import {
  buildShiftGroups,
  filterEmployeesBySearch,
  filterShiftGroupsByEmployees,
  mergeEmployeesWithAttendance,
} from '../lib/attendanceSheetUtils';
import { toDateKey } from '../lib/attendanceUtils';
import { getSupabaseConfigError, getSupabaseRequestErrorMessage } from '../lib/supabase';
import type { AttendanceDbRecord } from '../types';
import { ROUTES } from '../types';
import type { StaffRecord } from '../lib/staffService';

const monthFormatter = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' });

function getMonthRange(year: number, monthIndex: number) {
  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex + 1, 0);
  return { startDate, endDate };
}

export default function AttendanceSheet() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [employees, setEmployees] = useState<StaffRecord[]>([]);
  const [records, setRecords] = useState<AttendanceDbRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [approved, setApproved] = useState(false);

  const year = cursor.getFullYear();
  const monthIndex = cursor.getMonth();
  const { startDate, endDate } = useMemo(() => getMonthRange(year, monthIndex), [year, monthIndex]);

  useEffect(() => {
    const configError = getSupabaseConfigError();
    if (configError) {
      setError(configError);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      getAllEmployees(),
      getAttendanceRecordsInRange(toDateKey(startDate), toDateKey(endDate)),
    ])
      .then(([staffRows, attendanceRows]) => {
        setEmployees(staffRows);
        setRecords(attendanceRows);
      })
      .catch((err) => {
        setError(getSupabaseRequestErrorMessage(err, 'Không tải được bảng chấm công.'));
      })
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  const roster = useMemo(
    () => mergeEmployeesWithAttendance(employees, records),
    [employees, records],
  );

  const filteredEmployees = useMemo(
    () => filterEmployeesBySearch(roster, search),
    [roster, search],
  );

  const shiftGroups = useMemo(() => {
    const groups = buildShiftGroups(roster, records);
    return filterShiftGroupsByEmployees(groups, filteredEmployees);
  }, [roster, records, filteredEmployees]);

  const monthLabel = monthFormatter.format(cursor).replace(/^./, (char) => char.toUpperCase());

  const goPrevMonth = () => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
    setApproved(false);
  };

  const goNextMonth = () => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
    setApproved(false);
  };

  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setApproved(false);
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
                className="text-[12px] font-semibold text-emerald-700 hover:underline"
              >
                Báo cáo
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px] flex-1 sm:flex-none sm:w-[220px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm kiếm nhân viên"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                />
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
              >
                <Calendar size={16} />
                Theo tháng
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
                onClick={goToday}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Chọn
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
              >
                <Clock3 size={16} />
                Xem theo ca
              </button>

              <button
                type="button"
                onClick={() => setApproved(true)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors ${
                  approved ? 'bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <CheckCircle2 size={16} />
                {approved ? 'Đã duyệt' : 'Duyệt chấm công'}
              </button>

              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50"
                aria-label="Tùy chọn"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[12px] text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50">
                <Check size={12} strokeWidth={3} className="text-emerald-600" />
              </span>
              Đang làm việc hôm nay
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-orange-200 bg-orange-50">
                <Check size={12} strokeWidth={3} className="text-orange-500" />
              </span>
              Đi muộn
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-red-200 bg-red-50">
                <Check size={12} strokeWidth={3} className="text-red-500" />
              </span>
              Nghỉ / chưa check-in
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-5 w-5 rounded-md border border-slate-200 bg-slate-50" />
              Chưa check-in / đã check-out hôm nay
            </span>
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

        {!loading && !error && (
          <AttendanceSheetGrid
            shiftGroups={shiftGroups}
            records={records}
            year={year}
            monthIndex={monthIndex}
            today={today}
          />
        )}
      </div>
    </div>
  );
}
