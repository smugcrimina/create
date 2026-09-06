"use client";

import { useState, useRef } from "react";
import type { Job } from "./JobList";
import ImageModal from "./ImageModal";

interface Props { job: Job; techniques: string[]; onClose: () => void; onCompleted: () => void; }

const techColors = [
  { bg: "bg-emerald-50", border: "border-emerald-300", ring: "ring-emerald-200", text: "text-emerald-700" },
  { bg: "bg-purple-50", border: "border-purple-300", ring: "ring-purple-200", text: "text-purple-700" },
  { bg: "bg-blue-50", border: "border-blue-300", ring: "ring-blue-200", text: "text-blue-700" },
  { bg: "bg-orange-50", border: "border-orange-300", ring: "ring-orange-200", text: "text-orange-700" },
  { bg: "bg-pink-50", border: "border-pink-300", ring: "ring-pink-200", text: "text-pink-700" },
  { bg: "bg-red-50", border: "border-red-300", ring: "ring-red-200", text: "text-red-700" },
  { bg: "bg-cyan-50", border: "border-cyan-300", ring: "ring-cyan-200", text: "text-cyan-700" },
  { bg: "bg-amber-50", border: "border-amber-300", ring: "ring-amber-200", text: "text-amber-700" },
];

export default function CompleteJobModal({ job, techniques, onClose, onCompleted }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [imgView, setImgView] = useState<{url:string;title:string}|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Parse existing completions
  const prevComps = job.completions.map(c => {
    let techs: string[] = []; try { if (c.techniques) techs = JSON.parse(c.techniques); } catch {}
    return { ...c, parsedTechs: techs };
  });
  const isAlreadyKomple = prevComps.some(c => c.parsedTechs.includes("Komple"));
  const kompleBy = prevComps.find(c => c.parsedTechs.includes("Komple"))?.completedByName || "";
  const doneTechs = new Set(prevComps.flatMap(c => c.parsedTechs));

  function toggle(tech: string) {
    if (doneTechs.has(tech)) return; // Already done, can't toggle
    setSelected(prev => { const n = new Set(prev); if (n.has(tech)) n.delete(tech); else n.add(tech); return n; });
  }

  async function uploadFile(file: File) {
    setUploading(true); setUploadPercent(10);
    try {
      // Resize for old Android
      const resized = await resizeImage(file, 1200);
      setUploadPercent(40);
      const fd = new FormData(); fd.append("source", resized);
      setUploadPercent(60);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      setUploadPercent(90);
      const data = await res.json();
      setUploadPercent(100);
      if (data.url) setImageUrl(data.url); else alert("Yükleme başarısız");
    } catch { alert("Yükleme hatası"); }
    finally { setTimeout(() => { setUploading(false); setUploadPercent(0); }, 300); }
  }

  function resizeImage(file: File, maxSize: number): Promise<File> {
    return new Promise((resolve) => {
      if (file.size < 500000) { resolve(file); return; }
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(url); let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) { if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; } else { w = Math.round(w * maxSize / h); h = maxSize; } }
        const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d"); if (ctx) ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => { if (blob) resolve(new File([blob], file.name, { type: "image/jpeg" })); else resolve(file); }, "image/jpeg", 0.85);
      }; img.onerror = () => resolve(file); img.src = url;
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (file) uploadFile(file);
    if (e.target) e.target.value = "";
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/complete`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ techniques: JSON.stringify(Array.from(selected)), completionNote: note || null, imageUrl: imageUrl || null }),
      });
      if (res.ok) onCompleted(); else alert("Hata");
    } catch { alert("Sunucu hatası"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-center sticky top-0 z-10">
          <h2 className="text-sm font-bold text-white">✅ İşi Tamamla — {job.companyName}</h2>
        </div>
        <div className="p-3 sm:p-4 space-y-3">

          {/* TECHNIQUES — show done ones as disabled with user name */}
          {techniques.length > 0 && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">İş Teknikleri</label>
              <div className="grid grid-cols-3 gap-1.5">
                {techniques.map((tech, i) => {
                  const c = techColors[i % techColors.length];
                  const isDone = doneTechs.has(tech);
                  const isSel = selected.has(tech);
                  const doneBy = prevComps.find(pc => pc.parsedTechs.includes(tech))?.completedByName;

                  if (isDone) {
                    return (
                      <div key={tech} className="relative py-2 px-1.5 rounded-xl border-2 border-green-300 bg-green-50 text-center opacity-80">
                        <div className="font-bold text-sm text-green-700">{tech}</div>
                        <div className="text-[10px] text-green-600 mt-0.5">✅ {doneBy}</div>
                      </div>
                    );
                  }

                  return (
                    <button key={tech} type="button" onClick={() => toggle(tech)}
                      className={`btn-press relative py-2 px-1.5 rounded-xl border-2 font-bold text-xs transition-all ${isSel ? `${c.bg} ${c.border} ring-2 ${c.ring} ${c.text}` : "bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100"}`}>
                      {tech}
                      {isSel && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center"><svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg></div>}
                    </button>
                  );
                })}
              </div>
              {isAlreadyKomple && <div className="text-xs text-green-600 font-bold mt-1 text-center">✅ Komple tamamlanmış — {kompleBy}</div>}
            </div>
          )}

          {/* PREVIOUS NOTES — shown with user names */}
          {prevComps.some(c => c.completionNote) && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Önceki Notlar</label>
              <div className="space-y-1 max-h-[80px] overflow-y-auto">
                {prevComps.filter(c => c.completionNote).map(c => (
                  <div key={c.id} className="bg-amber-50 rounded-lg px-2 py-1 text-sm">
                    <span className="font-bold text-gray-700">👤 {c.completedByName}:</span>
                    <span className="text-gray-600 ml-1">{c.completionNote}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PREVIOUS IMAGES — shown with user names */}
          {prevComps.some(c => c.imageUrl) && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Yüklenen Görseller</label>
              <div className="flex flex-wrap gap-1.5">
                {prevComps.filter(c => c.imageUrl).map(c => (
                  <button key={c.id} type="button" onClick={() => setImgView({url:c.imageUrl!,title:`${c.completedByName} — ${job.companyName}`})}
                    className="btn-press bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-xs text-blue-700 font-bold hover:bg-blue-100">
                    🖼️ {c.completedByName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* NEW NOTE */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Yeni Not Ekle</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="input-field resize-none text-sm" placeholder="Durum notu..." />
          </div>

          {/* NEW IMAGE UPLOAD */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">📸 Yeni Görsel Yükle</label>
            {uploading && (
              <div className="mb-1.5">
                <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold mb-0.5">
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                  Yükleniyor %{uploadPercent}
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${uploadPercent}%` }}></div>
                </div>
              </div>
            )}
            {imageUrl && (
              <div className="mb-1.5 animate-scale-in flex items-center gap-2">
                <button type="button" onClick={() => setImgView({url:imageUrl,title:job.companyName})} className="btn-press text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">🖼️ Görseli Aç</button>
                <button type="button" onClick={() => setImageUrl("")} className="text-xs text-red-400">✕</button>
              </div>
            )}
            <label className="btn-press flex items-center justify-center gap-2 py-2.5 w-full bg-violet-50 border-2 border-violet-200 text-violet-600 font-bold rounded-xl cursor-pointer hover:bg-violet-100 transition text-sm">
              📷 Fotoğraf Çek
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          {/* BUTTONS */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-press flex-1 py-2.5 border-2 border-gray-200 text-gray-500 font-semibold rounded-xl text-sm">Vazgeç</button>
            <button type="button" onClick={handleSubmit} disabled={loading || (isAlreadyKomple && selected.size === 0 && !note && !imageUrl)}
              className="btn-press flex-[2] py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl text-sm shadow-xl disabled:opacity-50">
              {loading ? "⏳..." : "✅ Tamamla"}
            </button>
          </div>
        </div>
      </div>
      {imgView && <ImageModal url={imgView.url} title={imgView.title} onClose={() => setImgView(null)}/>}
    </div>
  );
}
