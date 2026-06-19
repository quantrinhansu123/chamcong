import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Bell,
  History,
  Loader2,
  LogOut,
  MapPin,
  Megaphone,
  ShieldCheck,
  ChevronRight,
  X,
  LocateFixed,
  Package,
} from 'lucide-react';
import ProductSettingsPanel from '../components/ProductSettingsPanel';
import { getAllProjects } from '../lib/projectService';
import { getSupabaseConfigError } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useEmployee } from '../context/EmployeeContext';
import { clearCurrentEmployee, getBrowserLocation } from '../lib/attendanceService';
import UserAvatar from '../components/UserAvatar';
import {
  DEFAULT_APP_SETTINGS,
  formatLocationSummary,
  formatShiftSummary,
  getAppSettings,
  saveAppSettings,
  type AppSettings,
} from '../lib/settingsService';

type SettingsPanel = 'shift' | 'location' | 'notification' | 'policy' | 'products' | null;

export default function Settings() {
  const employee = useEmployee();
  const [settings, setSettings] = useState<AppSettings>(() => getAppSettings());
  const [activePanel, setActivePanel] = useState<SettingsPanel>(null);
  const [productCount, setProductCount] = useState(0);
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [productSuccessMessage, setProductSuccessMessage] = useState<string | null>(null);

  const refreshSettings = useCallback(() => {
    const next = getAppSettings();
    setSettings(next);
    setDraft(next);
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    if (getSupabaseConfigError()) return;
    getAllProjects()
      .then((rows) => setProductCount(rows.length))
      .catch(() => setProductCount(0));
  }, [activePanel]);

  useEffect(() => {
    if (!productSuccessMessage) return;
    const timer = window.setTimeout(() => setProductSuccessMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [productSuccessMessage]);

  const handleProjectLocationSaved = (message: string) => {
    setActivePanel(null);
    setFormError(null);
    setProductSuccessMessage(message);
  };

  const openPanel = (panel: SettingsPanel) => {
    setDraft(getAppSettings());
    setFormError(null);
    setActivePanel(panel);
  };

  const closePanel = () => {
    if (saving) return;
    setActivePanel(null);
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);

    if (!draft.shiftName.trim()) {
      setFormError('Vui lòng nhập tên ca làm việc.');
      return;
    }

    if (!draft.scheduledStart || !draft.scheduledEnd) {
      setFormError('Vui lòng nhập giờ bắt đầu và kết thúc ca.');
      return;
    }

    if (draft.scheduledStart >= draft.scheduledEnd) {
      setFormError('Giờ kết thúc ca phải sau giờ bắt đầu.');
      return;
    }

    setSaving(true);
    try {
      saveAppSettings({
        ...draft,
        shiftName: draft.shiftName.trim(),
        officeName: draft.officeName.trim(),
        officeLat: draft.officeLat.trim(),
        officeLng: draft.officeLng.trim(),
        officeRadiusM: Math.max(50, Number(draft.officeRadiusM) || 200),
        lateGraceMinutes: Math.max(0, Number(draft.lateGraceMinutes) || 0),
      });
      refreshSettings();
      setActivePanel(null);
    } catch {
      setFormError('Không lưu được cài đặt.');
    } finally {
      setSaving(false);
    }
  };

  const applyGpsToSettings = (point: { lat: number; lng: number }, saveImmediately = false) => {
    const lat = point.lat.toFixed(6);
    const lng = point.lng.toFixed(6);
    const next = {
      ...getAppSettings(),
      officeLat: lat,
      officeLng: lng,
    };

    if (saveImmediately) {
      saveAppSettings(next);
      refreshSettings();
    }

    setDraft((current) => ({ ...current, officeLat: lat, officeLng: lng }));
    return { lat, lng };
  };

  const handleUseCurrentLocation = async (saveImmediately = false) => {
    setLocating(true);
    setFormError(null);
    setLocationMessage(null);
    try {
      const point = await getBrowserLocation();
      applyGpsToSettings(point, saveImmediately);
      setLocationMessage(
        saveImmediately
          ? `Đã lưu vị trí: ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`
          : `Đã điền vị trí: ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không lấy được vị trí GPS.';
      setFormError(message);
      setLocationMessage(null);
    } finally {
      setLocating(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
      clearCurrentEmployee();
      setTimeout(() => window.location.reload(), 500);
    }
  };

  const menuItems = [
    {
      id: 'shift' as const,
      icon: History,
      label: 'Ca làm việc',
      subtitle: formatShiftSummary(settings),
    },
    {
      id: 'products' as const,
      icon: Package,
      label: 'Dự án',
      subtitle: productCount ? `${productCount} dự án` : 'Từ bảng projects',
    },
    {
      id: 'location' as const,
      icon: MapPin,
      label: 'Địa điểm văn phòng',
      subtitle: formatLocationSummary(settings),
    },
    {
      id: 'notification' as const,
      icon: Megaphone,
      label: 'Thông báo',
      subtitle: settings.notificationsEnabled ? 'Đang bật' : 'Đang tắt',
    },
    {
      id: 'policy' as const,
      icon: ShieldCheck,
      label: 'Chính sách',
      subtitle: `Muộn > ${settings.lateGraceMinutes} phút · OT sau ${settings.scheduledEnd}`,
    },
  ];

  const panelTitle =
    activePanel === 'shift' ? 'Ca làm việc'
    : activePanel === 'products' ? 'Dự án'
    : activePanel === 'location' ? 'Địa điểm văn phòng'
    : activePanel === 'notification' ? 'Thông báo'
    : activePanel === 'policy' ? 'Chính sách chấm công'
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6"
    >
      <div className="flex justify-between items-center py-6 bg-surface sticky top-0 z-40">
        <h1 className="text-[32px] font-extrabold text-primary tracking-tight">Cài đặt</h1>
        <button type="button" className="p-2 hover:bg-surface-container rounded-full transition-colors active:scale-90">
          <Bell size={24} className="text-on-surface-variant" />
        </button>
      </div>

      <div className="bg-white shadow-xl shadow-primary-container/5 rounded-3xl p-6 flex items-center gap-5 border border-surface-container-highest relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary-fixed/20 rounded-full blur-3xl -mr-12 -mt-12" />
        <UserAvatar name={employee.name} size="lg" className="border-4 border-surface-container shadow-inner" />
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="text-xl font-bold text-primary truncate leading-tight">{employee.name}</h2>
          <p className="text-[13px] font-medium text-on-surface-variant/80 truncate">
            {employee.phone || employee.id}
          </p>
        </div>
      </div>

      <div className="bg-white shadow-xl shadow-primary-container/5 rounded-3xl p-5 border border-surface-container-highest flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <MapPin size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Vị trí GPS</p>
            <p className="text-sm font-bold text-primary mt-1 truncate">
              {settings.officeLat && settings.officeLng
                ? `${settings.officeLat}, ${settings.officeLng}`
                : 'Chưa có vị trí'}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {settings.officeName || 'Địa điểm văn phòng'} · bán kính {settings.officeRadiusM}m
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleUseCurrentLocation(true)}
          disabled={locating}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 active:scale-[0.99] transition-all"
        >
          {locating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
          Lấy vị trí
        </button>
        {(locationMessage || formError) && (
          <p
            className={`text-[12px] font-medium rounded-xl px-3 py-2 ${
              formError
                ? 'text-red-700 bg-red-50 border border-red-100'
                : 'text-emerald-700 bg-emerald-50 border border-emerald-100'
            }`}
          >
            {formError || locationMessage}
          </p>
        )}
      </div>

      <div className="bg-white shadow-xl shadow-primary-container/5 rounded-3xl flex flex-col overflow-hidden border border-surface-container-highest">
        {menuItems.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openPanel(item.id)}
            className={`flex items-center justify-between p-5 hover:bg-surface-container-low transition-all active:scale-[0.99] group text-left ${
              idx !== menuItems.length - 1 ? 'border-b border-surface-container-highest' : ''
            }`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-2 rounded-xl bg-surface-container-low group-hover:bg-primary-fixed/30 transition-colors shrink-0">
                <item.icon size={20} className="text-surface-tint" />
              </div>
              <div className="min-w-0">
                <span className="text-[15px] font-bold tracking-tight text-on-surface block">{item.label}</span>
                <span className="text-[11px] font-medium text-on-surface-variant truncate block mt-0.5">
                  {item.subtitle}
                </span>
              </div>
            </div>
            <ChevronRight size={20} className="text-outline-variant group-hover:translate-x-1 transition-transform shrink-0" />
          </button>
        ))}
      </div>

      {productSuccessMessage && (
        <p className="text-[12px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
          {productSuccessMessage}
        </p>
      )}

      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center justify-center w-full py-4.5 px-6 rounded-2xl border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 transition-all font-bold text-[15px] group active:scale-[0.98] mt-2 mb-10"
      >
        <div className="flex items-center gap-2">
          <LogOut size={20} className="group-hover:translate-x-[-2px] transition-transform" />
          <span>Đăng xuất</span>
        </div>
      </button>

      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 pb-20"
            onClick={closePanel}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-6 shadow-2xl max-h-[80vh] overflow-y-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-primary">{panelTitle}</h3>
                <button
                  type="button"
                  onClick={closePanel}
                  disabled={saving}
                  className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {activePanel === 'shift' && (
                  <>
                    <Field label="Tên ca">
                      <input
                        value={draft.shiftName}
                        onChange={(e) => setDraft({ ...draft, shiftName: e.target.value })}
                        className={inputClass}
                        placeholder="Ca hành chính"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Giờ bắt đầu">
                        <input
                          type="time"
                          value={draft.scheduledStart}
                          onChange={(e) => setDraft({ ...draft, scheduledStart: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Giờ kết thúc">
                        <input
                          type="time"
                          value={draft.scheduledEnd}
                          onChange={(e) => setDraft({ ...draft, scheduledEnd: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      OT được tính khi check-out sau {draft.scheduledEnd || '17:30'}.
                    </p>
                  </>
                )}

                {activePanel === 'products' && (
                  <ProductSettingsPanel
                    onCountChange={setProductCount}
                    onSaved={handleProjectLocationSaved}
                  />
                )}

                {activePanel === 'location' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUseCurrentLocation(false)}
                      disabled={locating}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {locating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
                      Lấy vị trí
                    </button>
                    <Field label="Tên địa điểm">
                      <input
                        value={draft.officeName}
                        onChange={(e) => setDraft({ ...draft, officeName: e.target.value })}
                        className={inputClass}
                        placeholder="Văn phòng Jarviz"
                      />
                    </Field>
                    <Field label="Vị trí (tự điền khi bấm Lấy vị trí)">
                      <input
                        readOnly
                        value={
                          draft.officeLat && draft.officeLng
                            ? `${draft.officeLat}, ${draft.officeLng}`
                            : ''
                        }
                        placeholder="Bấm Lấy vị trí để điền"
                        className={`${inputClass} bg-surface-container-low`}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Vĩ độ (lat)">
                        <input
                          value={draft.officeLat}
                          onChange={(e) => setDraft({ ...draft, officeLat: e.target.value })}
                          className={inputClass}
                          placeholder="21.028511"
                        />
                      </Field>
                      <Field label="Kinh độ (lng)">
                        <input
                          value={draft.officeLng}
                          onChange={(e) => setDraft({ ...draft, officeLng: e.target.value })}
                          className={inputClass}
                          placeholder="105.804817"
                        />
                      </Field>
                    </div>
                    <Field label="Bán kính cho phép (mét)">
                      <input
                        type="number"
                        min={50}
                        value={draft.officeRadiusM}
                        onChange={(e) => setDraft({ ...draft, officeRadiusM: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </Field>
                  </>
                )}

                {activePanel === 'notification' && (
                  <>
                    <ToggleRow
                      label="Bật thông báo"
                      description="Nhận nhắc nhở chấm công trên thiết bị"
                      checked={draft.notificationsEnabled}
                      onChange={(checked) => setDraft({ ...draft, notificationsEnabled: checked })}
                    />
                    <ToggleRow
                      label="Nhắc trước ca"
                      description={`Nhắc trước giờ vào ca ${draft.scheduledStart}`}
                      checked={draft.remindBeforeShift}
                      onChange={(checked) => setDraft({ ...draft, remindBeforeShift: checked })}
                      disabled={!draft.notificationsEnabled}
                    />
                  </>
                )}

                {activePanel === 'policy' && (
                  <>
                    <Field label="Cho phép muộn (phút)">
                      <input
                        type="number"
                        min={0}
                        value={draft.lateGraceMinutes}
                        onChange={(e) => setDraft({ ...draft, lateGraceMinutes: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </Field>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      Check-in sau {draft.scheduledStart} + {draft.lateGraceMinutes} phút sẽ bị ghi nhận đi muộn.
                      OT tính từ {draft.scheduledEnd} trở đi.
                    </p>
                    <button
                      type="button"
                      onClick={() => setDraft({ ...DEFAULT_APP_SETTINGS })}
                      className="text-[12px] font-bold text-on-surface-variant underline"
                    >
                      Khôi phục mặc định
                    </button>
                  </>
                )}

                {formError && (
                  <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    {formError}
                  </p>
                )}

                {activePanel !== 'products' && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 mt-2"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                    Lưu cài đặt
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const inputClass =
  'w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[12px] font-bold text-on-surface-variant">{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-low ${disabled ? 'opacity-50' : ''}`}>
      <div>
        <p className="text-sm font-bold text-on-surface">{label}</p>
        <p className="text-[11px] text-on-surface-variant mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-emerald-600' : 'bg-outline/30'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}
