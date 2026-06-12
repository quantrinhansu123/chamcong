import { Loader2 } from 'lucide-react';
import type { ProductWithLocations } from '../types';

const selectClass =
  'w-full bg-white border border-outline-variant/25 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:opacity-50';

interface ProductCheckInPickerProps {
  products: ProductWithLocations[];
  loading: boolean;
  loadError?: string | null;
  selectedProductId: string;
  onProductChange: (productId: string) => void;
  compact?: boolean;
}

export default function ProductCheckInPicker({
  products,
  loading,
  loadError,
  selectedProductId,
  onProductChange,
  compact = false,
}: ProductCheckInPickerProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-on-surface-variant py-2">
        <Loader2 size={16} className="animate-spin" />
        Đang tải danh sách dự án...
      </div>
    );
  }

  if (loadError) {
    return (
      <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
        {loadError}
      </p>
    );
  }

  if (products.length === 0) {
    return (
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        Chưa có dự án trong bảng projects. Thêm dự án trong hệ thống Jarviz trước.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className={`font-bold text-on-surface-variant ${compact ? 'text-[10px]' : 'text-sm'}`}>
        Dự án *
      </label>
      <select
        value={selectedProductId}
        onChange={(e) => onProductChange(e.target.value)}
        className={compact ? `${selectClass} py-2.5 text-[12px]` : selectClass}
      >
        <option value="">— Chọn dự án —</option>
        {products.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
}
