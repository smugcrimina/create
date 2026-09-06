"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toTitleCase } from "@/lib/utils";
import { playNotificationSound } from "@/lib/sound";

interface UserOption { id: number; fullName: string; role: string; }
interface AddJobProps { onJobAdded: () => void; settings: Record<string, string>; }

export default function AddJob({ onJobAdded, settings }: AddJobProps) {
  const [employees, setEmployees] = useState<UserOption[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("-");
  const [jobType, setJobType] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAssignPopup, setShowAssignPopup] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);

  const techniques = (settings.techniques || "Komple").split(",").filter(Boolean);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) { const d = await res.json(); setEmployees(d.filter((u: UserOption) => u.role === "employee")); }
      } catch {}
    })();
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const fd = new FormData(); fd.append("source", file);
    try { const r = await fetch("/api/upload", { method: "POST", body: fd }); const d = await r.json(); return d.url || null; } catch { return null; }
  }, []);

  async function handleImageUpload() {
    if (!fileInputRef.current?.files?.[0]) return;
    setUploading(true);
    const url = await uploadFile(fileInputRef.current.files[0]);
    if (url) setImageUrl(url); else alert("Görsel yüklenemedi");
    setUploading(false);
  }

  async function handlePaste(e: React.ClipboardEvent) {
    for (const item of Array.from(e.clipboardData?.items || [])) {
      if (item.type.startsWith("image/")) {
        e.preventDefault(); const file = item.getAsFile(); if (!file) continue;
        setUploading(true); const url = await uploadFile(file); if (url) setImageUrl(url); setUploading(false); return;
      }
    }
  }

  function toggleEmployee(id: number) { setSelectedEmployees(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); }
  function toggleTechnique(t: string) { setSelectedTechniques(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]); }
  function getSelectedNames() { return selectedEmployees.map(id => employees.find(e => e.id === id)?.fullName || "").filter(Boolean); }

  // Build technique display: "Montaj - Ahmet, Takım - Mehmet" format
  function buildTechniqueStr(): string {
    if (selectedTechniques.length === 0 && selectedEmployees.length === 0) return "";
    const names = getSelectedNames();
    if (selectedTechniques.length > 0 && names.length > 0) {
      // pair them: tech - name format
      return selectedTechniques.map((t, i) => {
        const name = names[i] || names[names.length - 1] || "";
        return name ? `${t} - ${name}` : t;
      }).join(", ");
    }
    if (selectedTechniques.length > 0) return selectedTechniques.join(", ");
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!companyName || !jobType) { setError("Firma ismi ve işin türü zorunludur"); return; }

    setLoading(true);
    try {
      const assignedTo = selectedEmployees.length > 0 ? selectedEmployees[0] : null;
      const techStr = buildTechniqueStr();
      const allEmps = getSelectedNames();
      const noteExtra = selectedEmployees.length > 1 ? `[Çalışanlar: ${allEmps.join(", ")}]` : "";
      const fullNotes = [notes, noteExtra].filter(Boolean).join(" ");
      const actualPayment = paymentStatus === "-" ? "Ödenmedi" : paymentStatus;

      const res = await fetch("/api/jobs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo, companyName, deadlineDays: deadlineDays || null, paymentStatus: actualPayment, jobType, technique: techStr || null, priority, imageUrl, notes: fullNotes || null }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Hata"); setLoading(false); return; }

      setSuccess("İş başarıyla eklendi! ✅");
      playNotificationSound();
      setCompanyName(""); setDeadlineDays(""); setPaymentStatus("-");
      setJobType(""); setPriority("Normal"); setImageUrl(""); setNotes("");
      setSelectedEmployees([]); setSelectedTechniques([]);
      setTimeout(onJobAdded, 500);
    } catch { setError("Sunucu hatası"); }
    finally { setLoading(false); }
  }

  const priorityOptions = [
    { value: "Düşük", color: "bg-blue-400", sel: "border-blue-400 bg-blue-50 text-blue-700 ring-blue-200" },
    { value: "Normal", color: "bg-emerald-400", sel: "border-emerald-400 bg-emerald-50 text-emerald-700 ring-emerald-200" },
    { value: "Yüksek", color: "bg-amber-400", sel: "border-amber-400 bg-amber-50 text-amber-700 ring-amber-200" },
    { value: "Acil", color: "bg-red-500", sel: "border-red-500 bg-red-50 text-red-700 ring-red-200" },
  ];

  return (
    <>
    <div className="animate-fade-in">
      <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-3 sm:px-5 py-2 sm:py-3">
          <h2 className="text-xs sm:text-sm font-bold text-white">📝 İŞ BİLGİLERİNİ GİRİN</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-2 sm:p-4 space-y-2 sm:space-y-3">
          {/* Row 1: Firma + Gün + Ödeme + Öncelik */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="label-sm">🏢 Firma İsmi</label>
              <input type="text" value={companyName} onChange={e => setCompanyName(toTitleCase(e.target.value))} required className="input-field text-sm" placeholder="Firma adı" />
            </div>
            <div>
              <label className="label-sm">📅 Gün</label>
              <input type="number" value={deadlineDays} onChange={e => setDeadlineDays(e.target.value)} className="input-field text-sm" placeholder="Kaç gün?" min="0" />
            </div>
            <div>
              <label className="label-sm">💰 Ödeme</label>
              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="input-field text-sm">
                <option value="-">- Gizli</option>
                <option value="Ödenmedi">❌ Ödenmedi</option>
                <option value="Ödendi">✅ Ödendi</option>
                <option value="Beklemede">⏳ Beklemede</option>
              </select>
            </div>
            <div>
              <label className="label-sm">🚩 Öncelik</label>
              <div className="grid grid-cols-2 gap-1">
                {priorityOptions.map(p => (
                  <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                    className={`btn-press flex items-center gap-1 px-2 py-1.5 rounded-lg border-2 text-[11px] font-semibold transition-all ${priority === p.value ? `${p.sel} ring-1` : "border-gray-100 bg-gray-50 text-gray-500"}`}>
                    <span className={`w-2 h-2 rounded-full ${p.color}`}></span>{p.value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: İş Türü */}
          <div>
            <label className="label-sm">✂️ İşin Türü</label>
            <textarea value={jobType} onChange={e => setJobType(toTitleCase(e.target.value))} required rows={1} className="input-field resize-none text-xs sm:text-sm" placeholder="İşin detaylarını yazın..." />
          </div>

          {/* Row 3: Çalışan + Teknik */}
          <div>
            <label className="label-sm">👤🔧 Çalışan & Teknik</label>
            {(selectedEmployees.length > 0 || selectedTechniques.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {getSelectedNames().map(n => <span key={n} className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">👤 {n}</span>)}
                {selectedTechniques.map(t => <span key={t} className="text-[11px] font-bold bg-violet-50 text-violet-700 px-2 py-1 rounded-lg">🔧 {t}</span>)}
                {buildTechniqueStr() && <span className="text-[10px] text-gray-400 self-center ml-1">→ {buildTechniqueStr()}</span>}
              </div>
            )}
            <button type="button" onClick={() => setShowAssignPopup(true)}
              className="btn-press w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-semibold text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition">
              ➕ {selectedEmployees.length === 0 ? "Çalışan & Teknik Seç" : "Değiştir"}
            </button>
          </div>

          {/* Row 4: Image */}
          <div>
            <label className="label-sm">🖼️ Görsel</label>
            {!imageUrl ? (
              <div className="flex gap-1">
                <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} onPaste={handlePaste}
                  className="input-field flex-1 text-xs" placeholder="Link veya Ctrl+V" />
                <button type="button" onClick={async () => {
                  try {
                    const items = await navigator.clipboard.read();
                    for (const item of items) {
                      const imgType = item.types.find(t => t.startsWith("image/"));
                      if (imgType) {
                        const blob = await item.getType(imgType);
                        const file = new File([blob], "pasted.png", { type: imgType });
                        setUploading(true);
                        const url = await uploadFile(file);
                        if (url) setImageUrl(url);
                        setUploading(false);
                        return;
                      }
                    }
                    const text = await navigator.clipboard.readText();
                    if (text && (text.startsWith("http://") || text.startsWith("https://"))) setImageUrl(text);
                  } catch { /* clipboard API not available */ }
                }} className="btn-press bg-amber-500 text-white font-bold px-3 py-2 rounded-lg text-[10px] whitespace-nowrap">
                  📋 Yapıştır
                </button>
                <label className="btn-press bg-violet-600 text-white font-bold px-3 py-2 rounded-lg cursor-pointer text-[10px] whitespace-nowrap">
                  📤 Yükle<input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg p-1.5">
                <img src={imageUrl} alt="" className="w-9 h-9 rounded-md object-cover border border-gray-200 flex-shrink-0" />
                <span className="flex-1 text-xs font-bold text-emerald-600">✓ Görsel eklendi</span>
                <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="btn-press text-[10px] font-bold text-blue-600 bg-white border border-blue-100 px-2 py-1 rounded">Aç</a>
                <button type="button" onClick={() => setImageUrl("")} className="btn-press text-[10px] font-bold text-red-500 bg-white border border-red-100 px-2 py-1 rounded">✕ Kaldır</button>
              </div>
            )}
            {uploading && <p className="text-[10px] text-blue-500 mt-1 animate-pulse">⏳ Yükleniyor...</p>}
          </div>

          {/* Row 5: Notes */}
          <div>
            <label className="label-sm">📝 Not</label>
            <textarea value={notes} onChange={e => setNotes(toTitleCase(e.target.value))} rows={2} className="input-field resize-none text-xs" placeholder="Ek notlar..." />
          </div>

          {error && <div className="bg-red-50 border border-red-100 text-red-600 px-3 py-2 rounded-lg text-xs font-medium">⚠️ {error}</div>}
          {success && <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-3 py-2 rounded-lg text-xs font-medium">{success}</div>}

          <div className="flex justify-end">
            <button type="submit" disabled={loading}
              className="btn-press bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-lg disabled:opacity-50">
              {loading ? "⏳ Ekleniyor..." : "✅ İŞ EKLE"}
            </button>
          </div>
        </form>
      </div>
    </div>

      {/* POPUP */}
      {showAssignPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={() => setShowAssignPopup(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-3 text-center">
              <h3 className="text-sm font-bold text-white">👤🔧 Çalışan & Teknik Seç</h3>
              <p className="text-white/60 text-[10px] mt-0.5">Birden fazla seçebilirsiniz</p>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="label-sm">👤 Çalışanlar</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {employees.map(emp => (
                    <button key={emp.id} type="button" onClick={() => toggleEmployee(emp.id)}
                      className={`btn-press px-2.5 py-2 rounded-lg border-2 text-xs font-semibold flex items-center gap-1.5 ${
                        selectedEmployees.includes(emp.id) ? "border-violet-400 bg-violet-50 text-violet-700" : "border-gray-100 bg-gray-50 text-gray-600"
                      }`}>
                      <span className="w-6 h-6 rounded bg-gradient-to-br from-violet-400 to-purple-600 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">{emp.fullName.charAt(0)}</span>
                      {emp.fullName}
                      {selectedEmployees.includes(emp.id) && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label-sm">🔧 Teknikler</label>
                <div className="flex flex-wrap gap-1.5">
                  {techniques.map(t => (
                    <button key={t} type="button" onClick={() => toggleTechnique(t)}
                      className={`btn-press px-3 py-2 rounded-lg border-2 text-xs font-semibold ${
                        selectedTechniques.includes(t) ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-gray-100 bg-gray-50 text-gray-600"
                      }`}>{t} {selectedTechniques.includes(t) && "✓"}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAssignPopup(false)} className="btn-press flex-1 py-2 border-2 border-gray-200 text-gray-500 font-semibold rounded-lg text-xs">Kapat</button>
                <button type="button" onClick={() => setShowAssignPopup(false)} className="btn-press flex-1 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-lg text-xs shadow">✅ Tamam</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
