import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Loader2, LocateFixed, MapPin } from 'lucide-react';
import { getBrowserLocation } from '../lib/attendanceService';
import { getAllProjects } from '../lib/projectService';
import {
  getAllProjectLocationsFromDb,
  getGoogleMapsUrl,
  getProjectLocationFromDb,
  saveProjectLocationToDb,
} from '../lib/projectLocationService';
import { getAppSettings } from '../lib/settingsService';
import type { OfficeLocation } from '../lib/settingsService';
import { getSupabaseConfigError, getSupabaseRequestErrorMessage } from '../lib/supabase';
import type { ProductWithLocations } from '../types';

const inputClass =
  'w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-2.5 px-3 text-sm text-on-surface';

interface ProductSettingsPanelProps {
  onCountChange?: (count: number) => void;
  onSaved?: (message: string) => void;
}

type PanelView = 'list' | 'edit';

export default function ProductSettingsPanel({ onCountChange, onSaved }: ProductSettingsPanelProps) {
  const [projects, setProjects] = useState<ProductWithLocations[]>([]);
  const [locations, setLocations] = useState<Record<string, OfficeLocation>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [view, setView] = useState<PanelView>('list');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [draftLocation, setDraftLocation] = useState({
    lat: '',
    lng: '',
    radiusM: getAppSettings().officeRadiusM,
  });

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, locationMap] = await Promise.all([
        getAllProjects(),
        getAllProjectLocationsFromDb(),
      ]);
      setProjects(rows);
      setLocations(locationMap);
      onCountChange?.(rows.length);
    } catch (err) {
      setError(getSupabaseRequestErrorMessage(err, 'Không tải được danh sách dự án.'));
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadSavedLocation = useCallback(async (projectId: string, projectName?: string) => {
    if (!projectId) {
      setLocationLabel('');
      setDraftLocation({ lat: '', lng: '', radiusM: getAppSettings().officeRadiusM });
      return;
    }

    const cached = locations[projectId];
    if (cached) {
      setLocationLabel(`${cached.lat.toFixed(6)}, ${cached.lng.toFixed(6)}`);
      setDraftLocation({
        lat: cached.lat.toFixed(6),
        lng: cached.lng.toFixed(6),
        radiusM: cached.radiusM,
      });
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
  }, [locations]);

  const openEditView = (projectId: string) => {
    setSelectedProjectId(projectId);
    setView('edit');
    setSuccess(null);
    setError(null);
  };

  const backToList = () => {
    setView('list');
    setSelectedProjectId('');
    setSuccess(null);
    setError(null);
  };

  useEffect(() => {
    if (view !== 'edit' || !selectedProjectId) return;
    loadSavedLocation(selectedProjectId, selectedProject?.name);
  }, [view, selectedProjectId, selectedProject?.name, loadSavedLocation]);

  const openGoogleMaps = (project: ProductWithLocations) => {
    const location = locations[project.id];
    if (!location) {
      setError(`Dự án "${project.name}" chưa có tọa độ. Bấm vào tên dự án để cấu hình.`);
      return;
    }

    setError(null);
    window.open(getGoogleMapsUrl(location.lat, location.lng), '_blank', 'noopener,noreferrer');
  };

  const persistLocation = async (lat: number, lng: number, radiusM: number): Promise<string | null> => {
    if (!selectedProject) {
      setError('Vui lòng chọn dự án trước.');
      return null;
    }

    if (getSupabaseConfigError()) {
      setError(getSupabaseConfigError());
      return null;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveProjectLocationToDb(selectedProject.id, { lat, lng }, radiusM);
      const saved: OfficeLocation = {
        name: selectedProject.name,
        lat,
        lng,
        radiusM,
      };
      setLocations((current) => ({ ...current, [selectedProject.id]: saved }));
      const label = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setLocationLabel(label);
      setDraftLocation({ lat: lat.toFixed(6), lng: lng.toFixed(6), radiusM });
      return `Đã lưu vị trí cho dự án "${selectedProject.name}".`;
    } catch (err) {
      setError(getSupabaseRequestErrorMessage(err, 'Không lưu được vị trí. Chạy migrate-project-locations.sql trên Supabase.'));
      return null;
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
      const message = await persistLocation(point.lat, point.lng, draftLocation.radiusM);
      if (message) setSuccess(message);
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

    const message = await persistLocation(lat, lng, draftLocation.radiusM);
    if (message && onSaved) {
      onSaved(message);
    } else if (message) {
      setSuccess(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-on-surface-variant text-sm">
        <Loader2 size={16} className="animate-spin" />
        Đang tải dự án...
      </div>
    );
  }

  if (view === 'edit' && selectedProject) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={backToList}
          className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 w-fit"
        >
          <ChevronLeft size={18} />
          Danh sách dự án
        </button>

        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low/50 px-3 py-3 space-y-4">
          <p className="text-sm font-bold text-on-surface">{selectedProject.name}</p>
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

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-on-surface-variant">
        Danh sách dự án. Bấm nút vị trí để mở Google Maps, bấm tên dự án để cấu hình tọa độ.
      </p>

      {projects.length === 0 ? (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-3">
          Chưa có dự án trong bảng projects.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-outline-variant/10 rounded-xl border border-outline-variant/15 overflow-hidden">
          {projects.map((project) => {
            const location = locations[project.id];
            return (
              <div
                key={project.id}
                className="flex items-center gap-3 px-3 py-3 bg-white hover:bg-surface-container-low/60 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => openEditView(project.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-bold text-on-surface truncate">{project.name}</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">
                    {location
                      ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)} · ${location.radiusM}m`
                      : 'Chưa có vị trí'}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => openGoogleMaps(project)}
                  disabled={!location}
                  title={location ? 'Mở Google Maps' : 'Chưa có tọa độ'}
                  className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <MapPin size={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
