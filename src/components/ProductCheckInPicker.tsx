import { Loader2 } from 'lucide-react';
import type { ProductWithLocations } from '../types';

interface ProductCheckInPickerProps {
  products: ProductWithLocations[];
  loading: boolean;
  selectedProductId: string;
  selectedLocationId: string;
  onProductChange: (productId: string) => void;
  onLocationChange: (locationId: string) => void;
  variant?: 'mobile' | 'desktop';
}

export default function ProductCheckInPicker({
  products,
  loading,
  selectedProductId,
  selectedLocationId,
  onProductChange,
  onLocationChange,
  variant = 'mobile',
}: ProductCheckInPickerProps) {
  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-on-surface-variant py-2">
        <Loader2 size={16} className="animate-spin" />
        Đang tải sản phẩm...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        Chưa có sản phẩm. Vào Cài đặt → Sản phẩm để tạo sản phẩm và vị trí GPS.
      </p>
    );
  }

  if (variant === 'desktop') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-on-surface-variant">Sản phẩm *</label>
          <select
            value={selectedProductId}
            onChange={(e) => onProductChange(e.target.value)}
            className="w-full bg-white border border-outline-variant/25 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          >
            <option value="">— Chọn sản phẩm —</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-on-surface-variant">Vị trí *</label>
          <select
            value={selectedLocationId}
            onChange={(e) => onLocationChange(e.target.value)}
            disabled={!selectedProduct}
            className="w-full bg-white border border-outline-variant/25 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:opacity-50"
          >
            <option value="">— Chọn vị trí —</option>
            {selectedProduct?.locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => onProductChange(product.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              selectedProductId === product.id
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-outline-variant/20 text-on-surface'
            }`}
          >
            {product.name}
          </button>
        ))}
      </div>
      {selectedProduct && selectedProduct.locations.length > 1 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedProduct.locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => onLocationChange(loc.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                selectedLocationId === loc.id
                  ? 'bg-primary-container text-white'
                  : 'bg-white border border-outline-variant/20 text-on-surface-variant'
              }`}
            >
              {loc.name}
            </button>
          ))}
        </div>
      )}
      {selectedProduct && selectedProduct.locations.length === 1 && (
        <p className="text-[10px] text-on-surface-variant">
          Vị trí: <span className="font-bold">{selectedProduct.locations[0].name}</span>
        </p>
      )}
      {selectedProduct && selectedProduct.locations.length > 1 && !selectedLocationId && (
        <p className="text-[10px] font-bold text-amber-600">Chọn vị trí làm việc</p>
      )}
    </div>
  );
}
