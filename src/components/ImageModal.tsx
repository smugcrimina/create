"use client";

interface Props {
  url: string;
  title: string;
  onClose: () => void;
}

export default function ImageModal({ url, title, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={onClose}>
      {/* Header */}
      <div className="flex-shrink-0 bg-black/50 backdrop-blur px-4 py-3 flex items-center justify-between" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-sm truncate flex-1 mr-3">{title}</h3>
        <button onClick={onClose} className="text-white/70 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center">✕</button>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto" onClick={e => e.stopPropagation()}>
        <img
          src={url}
          alt={title}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150' fill='%23666'%3E%3Crect width='200' height='150' fill='%23222'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='14' fill='%23666'%3EGörsel yüklenemedi%3C/text%3E%3C/svg%3E"; }}
        />
      </div>

      {/* Footer buttons */}
      <div className="flex-shrink-0 bg-black/50 backdrop-blur px-4 py-3 flex gap-3" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="btn-press flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition">
          ← Geri
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="btn-press flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm text-center transition">
          Yeni Sekmede Aç ↗
        </a>
      </div>
    </div>
  );
}
