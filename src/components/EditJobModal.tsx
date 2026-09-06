"use client";

import { useState, useRef, useCallback } from "react";
import type { Job } from "./JobList";
import { toTitleCase } from "@/lib/utils";

interface Props {
  job: Job;
  employees: { id: number; fullName: string }[];
  techniques: string[];
  onClose: () => void;
  onSaved: () => void;
}

export default function EditJobModal({ job, employees, techniques, onClose, onSaved }: Props) {
  const [companyName, setCompanyName] = useState(job.companyName);
  const [deadlineDays, setDeadlineDays] = useState(job.deadlineDays?.toString() || "");
  const [paymentStatus, setPaymentStatus] = useState(job.paymentStatus);
  const [jobType, setJobType] = useState(job.jobType);
  const [technique, setTechnique] = useState(job.technique || "");
  const [notes, setNotes] = useState(job.notes || "");
  const [assignedTo, setAssignedTo] = useState(job.assignedTo?.toString() || "");
  const [imageUrl, setImageUrl] = useState(job.imageUrl || "");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const fd = new FormData(); fd.append("source", file);
    try { const r = await fetch("/api/upload", { method: "POST", body: fd }); const d = await r.json(); return d.url || null; } catch { return null; }
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const url = await uploadFile(file);
    if (url) setImageUrl(url);
    setUploading(false);
    if (e.target) e.target.value = "";
  }

  async function handlePaste() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imgType = item.types.find(t => t.startsWith("image/"));
        if (imgType) {
          const blob = await item.getType(imgType);
          setUploading(true);
          const url = await uploadFile(new File([blob], "pasted.png", { type: imgType }));
          if (url) setImageUrl(url);
          setUploading(false);
          return;
        }
      }
      const text = await navigator.clipboard.readText();
      if (text?.startsWith("http")) setImageUrl(text);
    } catch {}
  }

  async function handleSave() {
    setLoading(true);
    try {
      let deadlineDate: string | null = null;
      if (deadlineDays) { const d = new Date(); d.setDate(d.getDate() + parseInt(deadlineDays)); deadlineDate = d.toISOString().split("T")[0]; }
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, deadlineDays: deadlineDays ? parseInt(deadlineDays) : null, deadlineDate, paymentStatus, jobType, technique, notes, imageUrl: imageUrl || null, assignedTo: assignedTo ? parseInt(assignedTo) : null }),
      });
      if (res.ok) onSaved(); else alert("Hata");
    } catch { alert("Sunucu hatası"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3">
          <h3 className="text-sm font-bold text-white">✏️ İşi Düzenle — {job.companyName}</h3>
        </div>
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label-sm">🏢 Firma</label>
              <input type="text" value={companyName} onChange={e => setCompanyName(toTitleCase(e.target.value))} className="input-field text-xs" />
            </div>
            <div>
              <label className="label-sm">👤 Çalışan</label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="input-field text-xs">
                <option value="">Tümü</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            </div>
          </div>
          {/* Row 2 */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label-sm">📅 Gün</label>
              <input type="number" value={deadlineDays} onChange={e => setDeadlineDays(e.target.value)} className="input-field text-xs" min="0" />
            </div>
            <div>
              <label className="label-sm">💰 Ödeme</label>
              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="input-field text-xs">
                <option value="Ödenmedi">Ödenmedi</option><option value="Ödendi">Ödendi</option><option value="Beklemede">Beklemede</option>
              </select>
            </div>
            <div>
              <label className="label-sm">🔧 Teknik</label>
              <input type="text" value={technique} onChange={e => setTechnique(toTitleCase(e.target.value))} className="input-field text-xs" placeholder="Teknik" />
            </div>
          </div>
          {/* İş Türü */}
          <div>
            <label className="label-sm">✂️ İş Türü</label>
            <input type="text" value={jobType} onChange={e => setJobType(toTitleCase(e.target.value))} className="input-field text-xs" />
          </div>
          {/* Görsel */}
          <div>
            <label className="label-sm">🖼️ Görsel</label>
            <div className="flex gap-1">
              <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="input-field flex-1 text-[10px]" placeholder="Link veya yapıştır" />
              <button type="button" onClick={handlePaste} className="btn-press bg-amber-500 text-white font-bold px-2 py-1 rounded-lg text-[9px] whitespace-nowrap">📋</button>
              <label className="btn-press bg-violet-600 text-white font-bold px-2 py-1 rounded-lg cursor-pointer text-[9px] whitespace-nowrap">
                📤<input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
            {uploading && <p className="text-[9px] text-blue-500 animate-pulse mt-0.5">Yükleniyor...</p>}
            {imageUrl && !uploading && (
              <div className="flex items-center gap-1 mt-0.5">
                <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">🖼️ Aç</a>
                <button type="button" onClick={() => setImageUrl("")} className="text-[9px] text-red-400">✕</button>
              </div>
            )}
          </div>
          {/* Not */}
          <div>
            <label className="label-sm">📝 Not</label>
            <input type="text" value={notes} onChange={e => setNotes(toTitleCase(e.target.value))} className="input-field text-xs" placeholder="Not" />
          </div>
          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-press flex-1 py-2 border-2 border-gray-200 text-gray-500 font-semibold rounded-xl text-xs">Vazgeç</button>
            <button onClick={handleSave} disabled={loading}
              className="btn-press flex-1 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl text-xs shadow-lg disabled:opacity-50">
              {loading ? "..." : "💾 Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
