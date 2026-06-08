import type { AttendanceDbRecord } from '../types';

export function toDateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getScheduledStartDateTime(record: AttendanceDbRecord) {
  return new Date(`${record.work_date}T${record.scheduled_start}`);
}

export function getScheduledEndDateTime(record: AttendanceDbRecord) {
  return new Date(`${record.work_date}T${record.scheduled_end}`);
}

export function getScheduledShiftMinutes(record: AttendanceDbRecord) {
  const start = getScheduledStartDateTime(record).getTime();
  const end = getScheduledEndDateTime(record).getTime();
  return Math.max(0, Math.floor((end - start) / 60_000));
}

export function getWorkedEndTime(record: AttendanceDbRecord, now = new Date()) {
  if (!record.check_in_at) return null;

  if (record.check_out_at) {
    return new Date(record.check_out_at);
  }

  if (record.work_date === toDateKey(now)) {
    return now;
  }

  return null;
}

export function getWorkedMinutes(record: AttendanceDbRecord, now = new Date()) {
  if (!record.check_in_at) return 0;

  const endTime = getWorkedEndTime(record, now);
  if (!endTime) return 0;

  const startTime = new Date(record.check_in_at).getTime();
  return Math.max(0, Math.floor((endTime.getTime() - startTime) / 60_000));
}

/** OT = thời gian làm sau giờ scheduled_end */
export function getOvertimeMinutes(record: AttendanceDbRecord, now = new Date()) {
  if (!record.check_in_at) return 0;

  const endTime = getWorkedEndTime(record, now);
  if (!endTime) return 0;

  const scheduledEnd = getScheduledEndDateTime(record).getTime();
  if (endTime.getTime() <= scheduledEnd) return 0;

  return Math.floor((endTime.getTime() - scheduledEnd) / 60_000);
}

export function hasOvertime(record: AttendanceDbRecord, now = new Date()) {
  return getOvertimeMinutes(record, now) > 0;
}

export function isLate(record: AttendanceDbRecord) {
  if (!record.check_in_at) return false;
  return new Date(record.check_in_at).getTime() > getScheduledStartDateTime(record).getTime();
}

export function formatDurationShort(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}p`;
  if (!mins) return `${hours}h`;
  return `${hours}h${`${mins}`.padStart(2, '0')}`;
}

export function formatTimeShort(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}
