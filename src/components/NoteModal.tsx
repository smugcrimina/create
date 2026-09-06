"use client";

import type { Job } from "./JobList";

interface Props { job: Job; onClose: () => void; }

export default function NoteModal({ job, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-5 py-4 text-center">
          <h3 className="text-base font-bold text-white">📝 Not</h3>
          <p className="text-white/80 text-sm font-semibold mt-0.5">{job.companyName}</p>
        </div>
        <div className="p-5 space-y-3">
          {job.notes && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 font-medium leading-relaxed">
              {job.notes}
            </div>
          )}
          {job.reminder && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 font-medium leading-relaxed">
              🔔 {job.reminder}
            </div>
          )}
          {!job.notes && !job.reminder && (
            <div className="text-center text-gray-400 py-4">Not bulunmuyor</div>
          )}
          <button onClick={onClose} className="btn-press w-full py-2.5 border-2 border-gray-200 text-gray-500 font-semibold rounded-xl text-sm">Kapat</button>
        </div>
      </div>
    </div>
  );
}
