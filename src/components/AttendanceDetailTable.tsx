import { useMemo } from 'react';
import type { AttendanceDbRecord } from '../types';
import { isLate } from '../lib/attendanceUtils';
import { normalizeEmployeeName, normalizeWorkDate } from '../lib/attendanceSheetUtils';

interface AttendanceDetailTableProps {
  records: AttendanceDbRecord[];
}

function formatDate(value: string) {
  const key = normalizeWorkDate(value);
  const date = new Date(`${key}T00:00:00`);
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatClock(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function formatDuration(checkInAt?: string | null, checkOutAt?: string | null) {
  if (!checkInAt || !checkOutAt) return '—';

  const ms = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';

  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((ms % 60_000) / 1000);

  // Ví dụ: 2h 05m · hoặc 0h 00m 12s nếu dưới 1 phút
  if (totalMinutes <= 0) {
    return `0h 00m ${seconds.toString().padStart(2, '0')}s`;
  }

  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

function formatCoord(lat?: number | null, lng?: number | null) {
  if (lat == null || lng == null) return '—';
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

function getStatus(record: AttendanceDbRecord) {
  if (!record.check_in_at) {
    return { label: 'Chưa check-in', className: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
  if (!record.check_out_at) {
    return {
      label: isLate(record) ? 'Đang làm · muộn' : 'Đang làm',
      className: 'bg-rose-100 text-rose-800 border-rose-200',
    };
  }
  if (isLate(record)) {
    return { label: 'Đã out · muộn', className: 'bg-orange-50 text-orange-800 border-orange-200' };
  }
  return { label: 'Hoàn thành', className: 'bg-red-50 text-red-800 border-red-200' };
}

export default function AttendanceDetailTable({ records }: AttendanceDetailTableProps) {
  const rows = useMemo(() => {
    return [...records]
      .filter((record) => Boolean(record.check_in_at))
      .sort((left, right) => {
        const byDate = normalizeWorkDate(right.work_date).localeCompare(normalizeWorkDate(left.work_date));
        if (byDate !== 0) return byDate;
        const byName = left.employee_name.localeCompare(right.employee_name, 'vi');
        if (byName !== 0) return byName;
        return (left.check_in_at ?? '').localeCompare(right.check_in_at ?? '');
      });
  }, [records]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
        Chưa có phiên chấm công nào trong khoảng lọc.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[1100px] w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-3 py-3 whitespace-nowrap">Ngày</th>
            <th className="px-3 py-3 whitespace-nowrap">Nhân viên</th>
            <th className="px-3 py-3 min-w-[180px]">Dự án</th>
            <th className="px-3 py-3 whitespace-nowrap">Ca</th>
            <th className="px-3 py-3 whitespace-nowrap">Check-in</th>
            <th className="px-3 py-3 whitespace-nowrap">Check-out</th>
            <th className="px-3 py-3 whitespace-nowrap" title="Check-out − Check-in">
              Thời gian
              <span className="block text-[9px] font-medium normal-case tracking-normal text-slate-400">
                Out − In
              </span>
            </th>
            <th className="px-3 py-3 whitespace-nowrap">Trạng thái</th>
            <th className="px-3 py-3 min-w-[140px]">Vị trí</th>
            <th className="px-3 py-3 whitespace-nowrap">GPS In</th>
            <th className="px-3 py-3 whitespace-nowrap">GPS Out</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((record, index) => {
            const status = getStatus(record);
            const prev = rows[index - 1];
            const sameDayEmployee =
              prev
              && normalizeWorkDate(prev.work_date) === normalizeWorkDate(record.work_date)
              && normalizeEmployeeName(prev.employee_name) === normalizeEmployeeName(record.employee_name);

            return (
              <tr
                key={record.id}
                className={`border-b border-slate-100 last:border-0 ${
                  sameDayEmployee ? 'bg-rose-50/40' : 'bg-white'
                }`}
              >
                <td className="px-3 py-3 align-top whitespace-nowrap text-[12px] font-semibold text-slate-800">
                  {formatDate(record.work_date)}
                </td>
                <td className="px-3 py-3 align-top">
                  <p className="text-[12px] font-bold text-slate-900">{record.employee_name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{record.employee_id}</p>
                </td>
                <td className="px-3 py-3 align-top">
                  <p className="text-[12px] font-bold text-slate-900">
                    {record.product_name || record.project_id || '—'}
                  </p>
                  {record.project_id && record.product_name && (
                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[220px]">
                      {record.project_id}
                    </p>
                  )}
                </td>
                <td className="px-3 py-3 align-top whitespace-nowrap text-[12px] text-slate-600">
                  <p className="font-semibold">{record.shift_name || '—'}</p>
                  <p className="text-[10px] text-slate-400">
                    {(record.scheduled_start || '').slice(0, 5)}–{(record.scheduled_end || '').slice(0, 5)}
                  </p>
                </td>
                <td className="px-3 py-3 align-top whitespace-nowrap text-[13px] font-bold tabular-nums text-slate-900">
                  {formatClock(record.check_in_at)}
                </td>
                <td className="px-3 py-3 align-top whitespace-nowrap text-[13px] font-bold tabular-nums text-slate-900">
                  {formatClock(record.check_out_at)}
                </td>
                <td className="px-3 py-3 align-top whitespace-nowrap text-[12px] font-semibold text-slate-700">
                  {formatDuration(record.check_in_at, record.check_out_at)}
                </td>
                <td className="px-3 py-3 align-top whitespace-nowrap">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.className}`}>
                    {status.label}
                  </span>
                </td>
                <td className="px-3 py-3 align-top text-[12px] text-slate-600">
                  {record.location_name || '—'}
                </td>
                <td className="px-3 py-3 align-top whitespace-nowrap text-[10px] font-mono text-slate-500">
                  {formatCoord(record.check_in_lat, record.check_in_lng)}
                </td>
                <td className="px-3 py-3 align-top whitespace-nowrap text-[10px] font-mono text-slate-500">
                  {formatCoord(record.check_out_lat, record.check_out_lng)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-slate-100 px-4 py-3 text-[12px] text-slate-500">
        {rows.length} phiên · cùng ngày/nhân viên có nhiều dự án được tô nền nhạt
      </div>
    </div>
  );
}
