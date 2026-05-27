import { useState, type FormEvent, type ReactNode } from 'react';
import { Loader2, LogIn, UserRound } from 'lucide-react';
import {
  currentEmployee,
  getConfiguredEmployeeDefaults,
  hasCurrentEmployee,
  saveEmployeeToSupabase,
  setCurrentEmployee,
} from '../lib/attendanceService';

interface EmployeeIdentityGateProps {
  children: ReactNode;
}

export default function EmployeeIdentityGate({ children }: EmployeeIdentityGateProps) {
  const configuredDefaults = getConfiguredEmployeeDefaults();
  const [ready, setReady] = useState(hasCurrentEmployee());
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeePhone, setEmployeePhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready) {
    return <>{children}</>;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      setCurrentEmployee({
        id: employeeId,
        name: employeeName,
        phone: employeePhone || undefined,
      });

      await saveEmployeeToSupabase().catch((err) => {
        console.warn('Failed to sync employee profile:', err);
      });

      setReady(Boolean(currentEmployee.id && currentEmployee.name));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được thông tin nhân viên.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-5 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white border border-outline-variant/20 shadow-xl shadow-primary-container/10 rounded-2xl p-6 flex flex-col gap-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container">
            <UserRound size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-primary leading-tight">Thông tin chấm công</h1>
            <p className="text-[12px] font-medium text-on-surface-variant mt-1">
              Nhập đúng nhân viên đang dùng máy này.
            </p>
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Mã nhân viên</span>
          <input
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            placeholder={configuredDefaults?.id || 'VD: NV001'}
            className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-sm font-bold text-on-surface outline-none focus:border-primary-container focus:ring-4 focus:ring-primary-fixed/60"
            autoComplete="username"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Tên nhân viên</span>
          <input
            value={employeeName}
            onChange={(event) => setEmployeeName(event.target.value)}
            placeholder={configuredDefaults?.name || 'VD: Nguyễn Văn An'}
            className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-sm font-bold text-on-surface outline-none focus:border-primary-container focus:ring-4 focus:ring-primary-fixed/60"
            autoComplete="name"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Số điện thoại</span>
          <input
            value={employeePhone}
            onChange={(event) => setEmployeePhone(event.target.value)}
            placeholder="Không bắt buộc"
            className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-sm font-bold text-on-surface outline-none focus:border-primary-container focus:ring-4 focus:ring-primary-fixed/60"
            autoComplete="tel"
            inputMode="tel"
          />
        </label>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-bold text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-primary-container px-5 py-4 text-sm font-extrabold text-white flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 transition-all"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
          Vào chấm công
        </button>
      </form>
    </div>
  );
}
