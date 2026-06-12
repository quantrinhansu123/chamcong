import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, LocateFixed, Package, Plus } from 'lucide-react';
import { getBrowserLocation } from '../lib/attendanceService';
import {
  createProductLocation,
  createProductWithLocation,
  getAllProductsWithLocations,
} from '../lib/productService';
import { getSupabaseRequestErrorMessage } from '../lib/supabase';
import type { ProductWithLocations } from '../types';

const inputClass =
  'w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none';

interface ProductSettingsPanelProps {
  onCountChange?: (count: number) => void;
}

export default function ProductSettingsPanel({ onCountChange }: ProductSettingsPanelProps) {
  const [products, setProducts] = useState<ProductWithLocations[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radiusM, setRadiusM] = useState(200);

  const [addLocationProductId, setAddLocationProductId] = useState<string | null>(null);
  const [extraLocationName, setExtraLocationName] = useState('');
  const [extraLat, setExtraLat] = useState('');
  const [extraLng, setExtraLng] = useState('');
  const [extraRadiusM, setExtraRadiusM] = useState(200);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getAllProductsWithLocations();
      setProducts(rows);
      onCountChange?.(rows.length);
    } catch (err) {
      setError(getSupabaseRequestErrorMessage(err, 'Không tải được danh sách sản phẩm.'));
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const fillGps = async (target: 'create' | 'extra') => {
    setLocating(true);
    setError(null);
    try {
      const point = await getBrowserLocation();
      if (target === 'create') {
        setLat(point.lat.toFixed(6));
        setLng(point.lng.toFixed(6));
      } else {
        setExtraLat(point.lat.toFixed(6));
        setExtraLng(point.lng.toFixed(6));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lấy được GPS.');
    } finally {
      setLocating(false);
    }
  };

  const resetCreateForm = () => {
    setProductName('');
    setProductCode('');
    setLocationName('');
    setLat('');
    setLng('');
    setRadiusM(200);
    setShowCreate(false);
  };

  const handleCreateProduct = async () => {
    setSaving(true);
    setError(null);
    try {
      await createProductWithLocation({
        productName: productName,
        productCode: productCode || undefined,
        locationName,
        lat: Number(lat),
        lng: Number(lng),
        radiusM,
      });
      resetCreateForm();
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được sản phẩm.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async (productId: string) => {
    setSaving(true);
    setError(null);
    try {
      await createProductLocation({
        productId,
        name: extraLocationName,
        lat: Number(extraLat),
        lng: Number(extraLng),
        radiusM: extraRadiusM,
      });
      setAddLocationProductId(null);
      setExtraLocationName('');
      setExtraLat('');
      setExtraLng('');
      setExtraRadiusM(200);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thêm được vị trí.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-on-surface-variant text-sm">
          <Loader2 size={16} className="animate-spin" />
          Đang tải...
        </div>
      )}

      {!loading && products.length === 0 && !showCreate && (
        <p className="text-[12px] text-on-surface-variant bg-surface-container-low rounded-xl px-3 py-3">
          Chưa có sản phẩm. Mỗi sản phẩm cần ít nhất một vị trí GPS để nhân sự chọn khi điểm danh.
        </p>
      )}

      {!loading && products.map((product) => (
        <div key={product.id} className="rounded-xl border border-outline-variant/15 overflow-hidden">
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === product.id ? null : product.id)}
            className="w-full flex items-center justify-between px-3 py-3 bg-surface-container-low/60 text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Package size={16} className="text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-primary truncate">{product.name}</p>
                <p className="text-[10px] text-on-surface-variant">
                  {product.locations.length} vị trí
                  {product.code ? ` · ${product.code}` : ''}
                </p>
              </div>
            </div>
            {expandedId === product.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {expandedId === product.id && (
            <div className="px-3 py-3 space-y-2 border-t border-outline-variant/10">
              {product.locations.map((loc) => (
                <div key={loc.id} className="rounded-lg bg-white border border-outline-variant/10 px-2.5 py-2">
                  <p className="text-[12px] font-bold text-on-surface">{loc.name}</p>
                  <p className="text-[10px] text-on-surface-variant font-mono">
                    {Number(loc.lat).toFixed(5)}, {Number(loc.lng).toFixed(5)} · {loc.radius_m}m
                  </p>
                </div>
              ))}

              {addLocationProductId === product.id ? (
                <div className="space-y-2 pt-1">
                  <input
                    value={extraLocationName}
                    onChange={(e) => setExtraLocationName(e.target.value)}
                    className={inputClass}
                    placeholder="Tên vị trí (VD: Công trường A)"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={extraLat} onChange={(e) => setExtraLat(e.target.value)} className={inputClass} placeholder="Vĩ độ" />
                    <input value={extraLng} onChange={(e) => setExtraLng(e.target.value)} className={inputClass} placeholder="Kinh độ" />
                  </div>
                  <button
                    type="button"
                    onClick={() => fillGps('extra')}
                    disabled={locating}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-bold"
                  >
                    {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
                    Lấy GPS hiện tại
                  </button>
                  <input
                    type="number"
                    min={50}
                    value={extraRadiusM}
                    onChange={(e) => setExtraRadiusM(Number(e.target.value))}
                    className={inputClass}
                    placeholder="Bán kính (m)"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAddLocationProductId(null)}
                      className="flex-1 py-2 rounded-lg border text-[12px] font-bold"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleAddLocation(product.id)}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-[12px] font-bold disabled:opacity-50"
                    >
                      Lưu vị trí
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddLocationProductId(product.id)}
                  className="text-[11px] font-bold text-emerald-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Thêm vị trí
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {showCreate ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
          <p className="text-[12px] font-bold text-primary">Sản phẩm mới + vị trí đầu tiên</p>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className={inputClass}
            placeholder="Tên sản phẩm *"
          />
          <input
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
            className={inputClass}
            placeholder="Mã sản phẩm (tùy chọn)"
          />
          <input
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className={inputClass}
            placeholder="Tên vị trí *"
          />
          <div className="grid grid-cols-2 gap-2">
            <input value={lat} onChange={(e) => setLat(e.target.value)} className={inputClass} placeholder="Vĩ độ *" />
            <input value={lng} onChange={(e) => setLng(e.target.value)} className={inputClass} placeholder="Kinh độ *" />
          </div>
          <button
            type="button"
            onClick={() => fillGps('create')}
            disabled={locating}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-emerald-200 bg-white text-emerald-700 text-[11px] font-bold"
          >
            {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
            Lấy GPS hiện tại
          </button>
          <input
            type="number"
            min={50}
            value={radiusM}
            onChange={(e) => setRadiusM(Number(e.target.value))}
            className={inputClass}
            placeholder="Bán kính (m)"
          />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={resetCreateForm} className="flex-1 py-2.5 rounded-xl border text-[12px] font-bold">
              Hủy
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleCreateProduct}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-[12px] font-bold disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Tạo sản phẩm'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-emerald-300 text-emerald-700 text-[12px] font-bold"
        >
          <Plus size={16} /> Thêm sản phẩm
        </button>
      )}

      {error && (
        <p className="text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
