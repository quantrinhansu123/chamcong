import { useCallback, useEffect, useState } from 'react';
import { Loader2, LocateFixed } from 'lucide-react';
import { getBrowserLocation } from '../lib/attendanceService';
import { getAllProjects } from '../lib/projectService';
import {
  getProjectLocationFromDb,
  saveProjectLocationToDb,
} from '../lib/projectLocationService';
import { getAppSettings } from '../lib/settingsService';
import { getSupabaseConfigError, getSupabaseRequestErrorMessage } from '../lib/supabase';
import type { ProductWithLocations } from '../types';

const selectClass =
  'w-full bg-white border border-outline-variant/20 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none';

const inputClass =
  'w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-2.5 px-3 text-sm text-on-surface';

interface ProductSettingsPanelProps {
  onCountChange?: (count: number) => void;
}

export default function ProductSettingsPanel({ onCountChange }: ProductSettingsPanelProps) {
  const [projects, setProjects] = useState<ProductWithLocations[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [draftLocation, setDraftLocation] = useState({
    lat: '',
    lng: '',
    radiusM: getAppSettings().officeRadiusM,
  });

  const loadSavedLocation = useCallback(async (projectId: string, projectName?: string) => {
    if (!projectId) {
      setLocationLabel('');
      setDraftLocation({ lat: '', lng: '', radiusM: getAppSettings().officeRadiusM });
      return;
    }

    try {
      const saved = await getProjectLocationFromDb(projectId, projectName);
      if (!saved) {
        setLocationLabel('');
        setDraftLocation({ lat: '', lng: '', radiusM: getAppSettings().officeRadiusM });
        return;
      }

      setLocationLabel(`${saved.lat.toFixed(6)}, ${saved.lng.toFixed(6)}`);
      setDraftLocation({
        lat: saved.lat.toFixed(6),
        lng: saved.lng.toFixed(6),
        radiusM: saved.radiusM,
      });
    } catch (err) {
      setError(getSupabaseRequestErrorMessage(err, 'Không tải được vị trí đã lưu.'));
    }
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getAllProjects();
      setProjects(rows);
      onCountChange?.(rows.length);
      setSelectedProjectId((current) => {
        if (current && rows.some((p) => p.id === current)) return current;
        return rows[0]?.id ?? '';
      });
    } catch (err) {
      setError(getSupabaseRequestErrorMessage(err, 'Không tải được danh sách dự án.'));
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  useEffect(() => {
    loadSavedLocation(selectedProjectId, selectedProject?.name);
  }, [selectedProjectId, selectedProject?.name, loadSavedLocation]);

  const persistLocation = async (lat: number, lng: number, radiusM: number) => {
    if (!selectedProject) {
      setError('Vui lòng chọn dự án trước.');
      return;
    }

    if (getSupabaseConfigError()) {
      setError(getSupabaseConfigError());
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveProjectLocationToDb(selectedProject.id, { lat, lng }, radiusM);
      const label = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setLocationLabel(label);
      setDraftLocation({ lat: lat.toFixed(6), lng: lng.toFixed(6), radiusM });
      setSuccess(`Đã lưu vị trí cho dự án "${selectedProject.name}" trên Supabase.`);
    } catch (err) {
      setError(getSupabaseRequestErrorMessage(err, 'Không lưu được vị trí. Chạy migrate-project-locations.sql trên Supabase.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCaptureLocation = async () => {
    setLocating(true);
    setError(null);
    setSuccess(null);
    try {
      const point = await getBrowserLocation();
      setDraftLocation({
        lat: point.lat.toFixed(6),
        lng: point.lng.toFixed(6),
        radiusM: draftLocation.radiusM,
      });
      await persistLocation(point.lat, point.lng, draftLocation.radiusM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lấy được vị trí GPS.');
    } finally {
      setLocating(false);
    }
  };

  const handleSaveLocation = async () => {
    const lat = Number(draftLocation.lat);
    const lng = Number(draftLocation.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Vui lòng nhập tọa độ lat và lng hợp lệ.');
      return;
    }

    await persistLocation(lat, lng, draftLocation.radiusM);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-on-surface-variant text-sm">
        <Loader2 size={16} className="animate-spin" />
        Đang tải dự án...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-on-surface-variant">
        Chọn dự án và lưu vị trí chấm công. Dữ liệu lưu trên Supabase, dùng chung mọi thiết bị.
      </p>

      {projects.length === 0 ? (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-3">
          Chưa có dự án trong bảng projects.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-bold text-on-surface-variant">Dự án</label>
          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setSuccess(null);
              setError(null);
            }}
            className={selectClass}
          >
            <option value="">— Chọn dự án —</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedProject && (
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low/50 px-3 py-3 space-y-4">
          <p className="text-[11px] font-bold text-on-surface-variant uppercase">Vị trí chấm công</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant">Vĩ độ (lat)</label>
              <input
                value={draftLocation.lat}
                onChange={(e) => setDraftLocation((current) => ({ ...current, lat: e.target.value }))}
                placeholder="21.028511"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant">Kinh độ (lng)</label>
              <input
                value={draftLocation.lng}
                onChange={(e) => setDraftLocation((current) => ({ ...current, lng: e.target.value }))}
                placeholder="105.804817"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant">Bán kính (m)</label>
              <input
                type="number"
                min={50}
                value={draftLocation.radiusM}
                onChange={(e) => setDraftLocation((current) => ({ ...current, radiusM: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant">Tọa độ đã lưu</label>
              <input readOnly value={locationLabel} placeholder="Chưa có tọa độ" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleCaptureLocation}
              disabled={locating || saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60"
            >
              {locating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
              Lấy vị trí
            </button>
            <button
              type="button"
              onClick={handleSaveLocation}
              disabled={saving || locating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-900 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Lưu tọa độ
            </button>
          </div>
        </div>
      )}

      {success && (
        <p className="text-[12px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
          {success}
        </p>
      )}

      {error && (
        <p className="text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
