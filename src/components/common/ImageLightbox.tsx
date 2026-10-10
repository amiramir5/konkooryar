import React from 'react';
import { X, ZoomIn } from 'lucide-react';

interface ImageLightboxProps {
  src: string | null;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, onClose }) => {
  if (!src) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        title="بستن"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border border-white/10 bg-slate-900">
        <img
          src={src}
          alt="تصویر سوال یا نکته"
          className="w-auto h-auto max-h-[85vh] max-w-full object-contain mx-auto select-none"
        />
        <div className="absolute bottom-2 left-3 text-[11px] text-white/60 bg-black/40 backdrop-blur-xs px-2 py-1 rounded-md flex items-center gap-1">
          <ZoomIn className="w-3 h-3" />
          <span>بزرگ‌نمایی با کیفیت کامل</span>
        </div>
      </div>
    </div>
  );
};
