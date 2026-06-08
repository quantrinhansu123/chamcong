import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Briefcase,
  CalendarDays,
  Code,
  Loader2,
  Megaphone,
  Search,
  SlidersHorizontal,
  UserPlus,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { AttendanceDbRecord, Employee } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import TimesheetBoard from '../components/TimesheetBoard';
import {
  createEmployee,
  getAllEmployees,
  getTodayAttendanceForAll,
  type EmployeeRecord,
} from '../lib/attendanceService';

const filters = ['Tất cả', 'Sale', 'Marketing', 'Kỹ thuật'];

const defaultAvatars = [
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=100&h=100',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=100&h=100',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=100&h=100',
];

function formatCheckInTime(value?: string | null) {
  if (!value) return undefined;
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

function mapAttendanceStatus(record?: AttendanceDbRecord): Employee['status'] {
  if (!record?.check_in_at) return 'offline';
  if (record.status === 'checked_out') return 'offline';
  return 'online';
}

function mapToEmployee(
  emp: EmployeeRecord,
  attendance?: AttendanceDbRecord,
  index = 0,
): Employee {
  const status = emp.status !== 'active' ? 'absent' : mapAttendanceStatus(attendance);
  return {
    id: String(emp.id),
    name: emp.full_name,
    role: emp.position || emp.email,
    department: '—',
    status,
    checkInTime: status === 'online' ? formatCheckInTime(attendance?.check_in_at) : undefined,
    avatar: emp.avatar_url || defaultAvatars[index % defaultAvatars.length],
  };
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showTimesheet, setShowTimesheet] = useState(false);

  const loadEmployees = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setError('Chưa cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [employeeRows, attendanceRows] = await Promise.all([
        getAllEmployees(),
        getTodayAttendanceForAll(),
      ]);

      const attendanceByEmployee = new Map(
        attendanceRows.map((record) => [record.employee_id, record]),
      );

      setEmployees(
        employeeRows.map((emp, index) =>
          mapToEmployee(emp, attendanceByEmployee.get(String(emp.id)), index),
        ),
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách nhân sự.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleAddEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await createEmployee({
        fullName: newName,
        email: newEmail,
        phone: newPhone || undefined,
        position: newPosition || undefined,
      });
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPosition('');
      setShowAddModal(false);
      await loadEmployees();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Không thêm được nhân sự.'));
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setShowAddModal(false);
    setFormError(null);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewPosition('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-6"
    >
      {/* Top App Bar */}
      <div className="flex justify-between items-center py-4 bg-surface sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img
            alt="Jarviz"
            className="w-10 h-10 rounded-full object-cover border border-outline-variant/30 shadow-sm"
            src="https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=100&h=100"
          />
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant leading-none">Xin chào,</p>
            <h1 className="text-xl font-bold text-primary dark:text-primary-fixed-dim leading-tight">Jarviz</h1>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary hover:opacity-80 transition-all border border-outline-variant/10 shadow-sm active:scale-95">
          <Bell size={20} />
        </button>
      </div>

      {/* Header & Search */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-primary tracking-tight">Nhân sự</h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowTimesheet(true)}
              className="flex items-center gap-2 px-3 py-2.5 bg-white text-emerald-700 rounded-full text-[12px] font-bold shadow-sm border border-emerald-200 hover:bg-emerald-50 transition-all active:scale-95"
            >
              <CalendarDays size={16} />
              Bảng công
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 py-2.5 bg-emerald-600 text-white rounded-full text-[12px] font-bold shadow-sm hover:bg-emerald-700 transition-all active:scale-95"
            >
              <UserPlus size={16} />
              Thêm
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-grow">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
            <input
              className="w-full bg-white border-0 shadow-sm rounded-full py-3.5 pl-12 pr-4 text-sm text-on-surface focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all placeholder:text-outline/60"
              placeholder="Tìm kiếm nhân viên..."
              type="text"
            />
          </div>
          <button className="w-12 h-12 bg-white shadow-sm rounded-full flex items-center justify-center text-primary border border-outline-variant/20 hover:bg-surface-container transition-all active:scale-90 shrink-0">
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
          {filters.map((filter, idx) => (
            <button
              key={filter}
              className={`px-5 py-2.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all shadow-sm ${
                idx === 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-on-surface-variant border border-outline-variant/30 hover:border-emerald-500/50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      {/* Employee List */}
      <section className="flex flex-col gap-4 mb-4">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-on-surface-variant">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm font-medium">Đang tải nhân sự...</span>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        {!loading && !error && employees.length === 0 && (
          <div className="bg-white shadow-sm rounded-2xl p-8 flex flex-col items-center gap-3 border border-outline-variant/10 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserPlus size={24} />
            </div>
            <p className="text-sm font-semibold text-on-surface-variant">
              Chưa có nhân sự nào. Bấm &quot;Thêm nhân sự&quot; để bắt đầu.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          employees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white shadow-sm ambient-shadow rounded-2xl p-5 flex flex-col gap-4 border border-outline-variant/10 hover:border-emerald-500/10 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-outline-variant/10 shadow-sm p-0.5 bg-surface-container-low group-hover:scale-105 transition-transform">
                    <img
                      alt={emp.name}
                      className="w-full h-full rounded-full object-cover"
                      src={emp.avatar}
                    />
                  </div>
                  <div>
                    <h3 className="text-md font-bold text-primary group-hover:text-emerald-800 transition-colors">
                      {emp.name}
                    </h3>
                    <p className="text-[12px] font-medium text-on-surface-variant mt-0.5">{emp.role}</p>
                  </div>
                </div>

                <div
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border ${
                    emp.status === 'online'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50'
                      : emp.status === 'offline'
                        ? 'bg-amber-50 text-amber-600 border-amber-100/50'
                        : 'bg-red-50 text-red-600 border-red-100/50'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      emp.status === 'online'
                        ? 'bg-emerald-500'
                        : emp.status === 'offline'
                          ? 'bg-amber-400'
                          : 'bg-red-500'
                    } block`}
                  />
                  {emp.status === 'online'
                    ? 'Đã check-in'
                    : emp.status === 'offline'
                      ? 'Chưa check-in'
                      : 'Vắng mặt'}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-surface-container-high pt-4 mt-1">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  {emp.department.includes('Sale') && <Briefcase size={16} className="opacity-70" />}
                  {emp.department.includes('Marketing') && (
                    <Megaphone size={16} className="opacity-70" />
                  )}
                  {emp.department.includes('Kỹ thuật') && <Code size={16} className="opacity-70" />}
                  <span className="text-[12px] font-semibold">{emp.department}</span>
                </div>
                <span
                  className={`text-[12px] font-bold ${
                    emp.status === 'online'
                      ? 'text-emerald-600'
                      : emp.status === 'absent'
                        ? 'text-red-500'
                        : 'text-outline/60'
                  }`}
                >
                  {emp.status === 'online'
                    ? emp.checkInTime
                    : emp.status === 'absent'
                      ? 'Nghỉ phép'
                      : '-'}
                </span>
              </div>
            </div>
          ))}
      </section>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={closeModal}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-8 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-primary">Thêm nhân sự mới</h3>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddEmployee} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="employee-name" className="text-[12px] font-bold text-on-surface-variant">
                    Họ và tên
                  </label>
                  <input
                    id="employee-name"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="VD: Nguyễn Văn An"
                    required
                    disabled={submitting}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 px-4 text-sm text-on-surface focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-outline/60 disabled:opacity-60"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="employee-email" className="text-[12px] font-bold text-on-surface-variant">
                    Email
                  </label>
                  <input
                    id="employee-email"
                    type="email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    placeholder="VD: an.nguyen@jarviz.vn"
                    required
                    disabled={submitting}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 px-4 text-sm text-on-surface focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-outline/60 disabled:opacity-60"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="employee-phone" className="text-[12px] font-bold text-on-surface-variant">
                    Số điện thoại
                  </label>
                  <input
                    id="employee-phone"
                    type="tel"
                    value={newPhone}
                    onChange={(event) => setNewPhone(event.target.value)}
                    placeholder="VD: 0987654321"
                    disabled={submitting}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 px-4 text-sm text-on-surface focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-outline/60 disabled:opacity-60"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="employee-position" className="text-[12px] font-bold text-on-surface-variant">
                    Chức vụ
                  </label>
                  <input
                    id="employee-position"
                    value={newPosition}
                    onChange={(event) => setNewPosition(event.target.value)}
                    placeholder="VD: Nhân viên Sale"
                    disabled={submitting}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 px-4 text-sm text-on-surface focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-outline/60 disabled:opacity-60"
                  />
                </div>

                {formError && (
                  <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !newName.trim() || !newEmail.trim()}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Thêm nhân sự
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTimesheet && <TimesheetBoard onClose={() => setShowTimesheet(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
