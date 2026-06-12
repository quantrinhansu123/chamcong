import { useCallback, useEffect, useState } from 'react';
import { Loader2, LocateFixed } from 'lucide-react';
import { getBrowserLocation } from '../lib/attendanceService';
import { getAllProjects } from '../lib/projectService';
import { getProjectLocation, saveProjectLocation } from '../lib/settingsService';
import { getSupabaseRequestErrorMessage } from '../lib/supabase';
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [locationLabel, setLocationLabel] = useState('');

  const refreshLocationLabel = useCallback((projectId: string, projectName?: string) => {
    if (!projectId) {
      setLocationLabel('');
      return;
    }
    const saved = getProjectLocation(projectId, projectName);
    setLocationLabel(saved ? `${saved.lat.toFixed(6)}, ${saved.lng.toFixed(6)}` : '');
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
    refreshLocationLabel(selectedProjectId, selectedProject?.name);
  }, [selectedProjectId, selectedProject?.name, refreshLocationLabel]);

  const handleCaptureLocation = async () => {
    if (!selectedProject) {
      setError('Vui lòng chọn dự án trước.');
      return;
    }

    setLocating(true);
    setError(null);
    setSuccess(null);
    try {
      const point = await getBrowserLocation();
      saveProjectLocation(selectedProject.id, point);
      const label = `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
      setLocationLabel(label);
      setSuccess(`Đã lưu vị trí cho dự án "${selectedProject.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lấy được vị trí GPS.');
    } finally {
      setLocating(false);
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

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-on-surface-variant">
        Danh sách dự án lấy từ bảng <span className="font-bold">projects</span> trên Supabase.
      </p>

      {projects.length === 0 ? (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-3">
          Chưa có dự án trong bảng projects. Thêm dự án trong hệ thống Jarviz trước khi chấm công.
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
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low/50 px-3 py-3 space-y-3">
          <p className="text-[11px] font-bold text-on-surface-variant uppercase">Vị trí chấm công</p>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-on-surface-variant">Tọa độ GPS</label>
            <input
              readOnly
              value={locationLabel}
              placeholder="Bấm Lấy vị trí để điền"
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={handleCaptureLocation}
            disabled={locating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60"
          >
            {locating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
            Lấy vị trí
          </button>
          <p className="text-[10px] text-on-surface-variant">
            Vị trí này dùng để so sánh khi chấm công dự án <span className="font-bold">{selectedProject.name}</span>.
          </p>
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
