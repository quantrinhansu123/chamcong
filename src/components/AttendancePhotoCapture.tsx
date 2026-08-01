import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, Loader2, RefreshCw, X } from 'lucide-react';

type AttendancePhotoCaptureProps = {
  open: boolean;
  title: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (file: Blob) => void | Promise<void>;
};

export default function AttendancePhotoCapture({
  open,
  title,
  busy = false,
  onCancel,
  onConfirm,
}: AttendancePhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<Blob | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setFile(null);
      setLocalError(null);
      return;
    }

    const timer = window.setTimeout(() => inputRef.current?.click(), 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  if (!open) return null;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    event.target.value = '';
    if (!next) return;

    if (!next.type.startsWith('image/')) {
      setLocalError('Vui lòng chụp hoặc chọn một ảnh.');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setLocalError(null);
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
  };

  const handleConfirm = async () => {
    if (!file) {
      setLocalError('Chưa có ảnh. Hãy chụp ảnh trước khi xác nhận.');
      inputRef.current?.click();
      return;
    }
    await onConfirm(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-primary" />
            <h2 className="font-bold text-on-surface">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="aspect-[3/4] rounded-xl bg-surface-container-low overflow-hidden flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Ảnh chấm công" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center px-6 text-on-surface-variant text-sm">
                Mở camera và chụp ảnh khuôn mặt / hiện trường để chấm công.
              </div>
            )}
          </div>

          {localError && (
            <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {localError}
            </p>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-outline-variant/40 font-bold text-sm text-on-surface disabled:opacity-50"
            >
              <RefreshCw size={16} />
              {previewUrl ? 'Chụp lại' : 'Chụp ảnh'}
            </button>
            <button
              type="button"
              disabled={busy || !file}
              onClick={() => void handleConfirm()}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
