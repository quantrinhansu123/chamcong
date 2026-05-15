import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { BadgeCheck, IdCard, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import {
  currentEmployee,
  getConfiguredEmployeeDefaults,
  hasCurrentEmployee,
  setCurrentEmployee,
} from '../lib/attendanceService';

interface EmployeeIdentityGateProps {
  children: ReactNode;
}

export default function EmployeeIdentityGate({ children }: EmployeeIdentityGateProps) {
  const defaults = getConfiguredEmployeeDefaults();
  const [isReady, setIsReady] = useState(hasCurrentEmployee());
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      setCurrentEmployee({
        id: employeeId,
        name: employeeName,
      });
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được thông tin nhân viên.');
    }
  };

  if (isReady && currentEmployee.id && currentEmployee.name) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-5">
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-3xl p-6 ambient-shadow border border-outline-variant/20 flex flex-col gap-5"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-container text-white flex items-center justify-center shrink-0">
            <BadgeCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-primary leading-tight">Chọn nhân viên</h1>
            <p className="text-sm font-medium text-on-surface-variant mt-1">
              Mỗi người dùng một mã riêng để check-in/check-out không bị trùng.
            </p>
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Mã nhân viên</span>
          <div className="flex items-center gap-3 bg-surface-container-low rounded-2xl px-4 py-3 border border-outline-variant/20">
            <IdCard size={20} className="text-outline" />
            <input
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className="w-full bg-transparent outline-none text-base font-bold text-primary placeholder:text-outline"
              placeholder={defaults?.id ? `VD: ${defaults.id}` : 'VD: NV002'}
              autoComplete="username"
            />
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Tên nhân viên</span>
          <div className="flex items-center gap-3 bg-surface-container-low rounded-2xl px-4 py-3 border border-outline-variant/20">
            <UserRound size={20} className="text-outline" />
            <input
              value={employeeName}
              onChange={(event) => setEmployeeName(event.target.value)}
              className="w-full bg-transparent outline-none text-base font-bold text-primary placeholder:text-outline"
              placeholder={defaults?.name ? `VD: ${defaults.name}` : 'VD: Trần Thị Mai'}
              autoComplete="name"
            />
          </div>
        </label>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-2xl bg-primary-container text-white py-4 font-bold text-sm active:scale-[0.98] transition-all shadow-lg shadow-primary-container/10"
        >
          VÀO CHẤM CÔNG
        </button>
      </motion.form>
    </div>
  );
}
