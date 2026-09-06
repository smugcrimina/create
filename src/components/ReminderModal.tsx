"use client";

import { useState, useEffect, useRef } from "react";
import type { Job } from "./JobList";

interface Props {
  job: Job;
  presets: string[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ReminderModal({ job, presets, onClose, onSaved }: Props) {
  const [text, setText] = useState(job.reminder || "");
  const [loading, setLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play notification sound when modal opens with existing reminder
  useEffect(() => {
    if (job.reminder) {
      setShowNotification(true);
      // Create and play notification sound
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.value = 0.3;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
        // Second beep
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = 1100;
          osc2.type = "sine";
          gain2.gain.value = 0.3;
          osc2.start();
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          osc2.stop(ctx.currentTime + 0.5);
        }, 200);
      } catch {
        // Audio not available
      }
    }
  }, [job.reminder]);

  async function save() {
    setLoading(true);
    await fetch(`/api/jobs/${job.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reminder: text || null }) });
    setLoading(false);
    onSaved();
  }

  async function clear() {
    setLoading(true);
    await fetch(`/api/jobs/${job.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reminder: null }) });
    setLoading(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <audio ref={audioRef} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 text-center">
          <div className="text-3xl mb-1">🔔</div>
          <h3 className="text-base font-bold text-white">Hatırlatma</h3>
          <p className="text-white/80 text-sm font-semibold mt-0.5">{job.companyName}</p>
        </div>

        {/* Notification popup when reminder exists */}
        {showNotification && job.reminder && (
          <div className="bg-amber-50 border-b-2 border-amber-200 px-5 py-3 animate-fade-in">
            <div className="flex items-start gap-2">
              <span className="text-xl animate-pulse">🔔</span>
              <div>
                <p className="font-bold text-amber-800 text-sm">{job.companyName}</p>
                <p className="text-amber-700 text-sm mt-0.5">{job.reminder}</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          {presets.length > 0 && (
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Hazır Hatırlatmalar</label>
              <div className="flex flex-wrap gap-1.5">
                {presets.map(p => (
                  <button key={p} type="button" onClick={() => setText((prev: string) => prev ? prev + ", " + p : p)}
                    className="btn-press text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Özel Hatırlatma</label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
              className="input-field resize-none text-sm" placeholder="Hatırlatma notu..." />
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-press flex-1 py-2.5 border-2 border-gray-200 text-gray-500 font-semibold rounded-xl text-sm">Kapat</button>
            {job.reminder && (
              <button onClick={clear} disabled={loading} className="btn-press py-2.5 px-4 bg-red-50 text-red-500 font-semibold rounded-xl text-sm border border-red-200">Kaldır</button>
            )}
            <button onClick={save} disabled={loading}
              className="btn-press flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-sm shadow-lg disabled:opacity-50">
              {loading ? "..." : "💾 Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
