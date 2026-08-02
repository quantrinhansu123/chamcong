import { CheckCircle2, Clock3, Package } from 'lucide-react';
import type { AttendanceDbRecord } from '../types';

function formatTime(value?: string | null) {
  if (!value) return '--:--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

interface TodayAttendanceCardsProps {
  sessions: AttendanceDbRecord[];
  compact?: boolean;
}

export default function TodayAttendanceCards({ sessions, compact = false }: TodayAttendanceCardsProps) {
  if (sessions.length === 0) return null;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <p
        className={`font-bold text-on-surface-variant uppercase tracking-wider ${
          compact ? 'text-[10px]' : 'text-xs'
        }`}
      >
        Đã điểm danh hôm nay
      </p>
      <div className="space-y-2">
        {sessions.map((session) => {
          const working = Boolean(session.check_in_at && !session.check_out_at);
          return (
            <div
              key={session.id}
              className={`rounded-xl border px-3 py-2.5 ${
                working
                  ? 'bg-red-50 border-red-100'
                  : 'bg-surface-container-low/70 border-outline-variant/15'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    working ? 'bg-red-100 text-red-700' : 'bg-white text-red-700'
                  }`}
                >
                  {working ? <Clock3 size={16} /> : <CheckCircle2 size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Package size={12} className="text-red-600 shrink-0" />
                    <p className={`font-bold text-on-surface truncate ${compact ? 'text-[12px]' : 'text-sm'}`}>
                      {session.product_name || session.project_id || 'Dự án'}
                    </p>
                  </div>
                  {session.location_name && (
                    <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                      {session.location_name}
                    </p>
                  )}
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    In {formatTime(session.check_in_at)}
                    {session.check_out_at
                      ? ` · Out ${formatTime(session.check_out_at)}`
                      : ' · Đang làm'}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    working
                      ? 'bg-red-100 text-red-700'
                      : 'bg-white text-on-surface-variant border border-outline-variant/20'
                  }`}
                >
                  {working ? 'Đang làm' : 'Xong'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
