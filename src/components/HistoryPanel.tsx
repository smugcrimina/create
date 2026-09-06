"use client";

import { useState, useEffect, useCallback } from "react";
import type { AppUser } from "@/app/page";
import { toTitleCase } from "@/lib/utils";
import ImageModal from "./ImageModal";

interface DeletedJob {
  id: number; companyName: string; jobType: string; technique: string | null;
  priority: string | null; paymentStatus: string | null; assignedFullName: string | null;
  notes: string | null; reminder: string | null; imageUrl: string | null;
  completionsData: string | null; status: string | null;
  jobCreatedAt: string | null; deletedAt: string;
}

function fmtTech(t: string | null): string {
  if (!t) return ""; return t.split(",").map(s => s.trim()).filter(Boolean).join(" | ");
}

export default function HistoryPanel({ user }: { user: AppUser }) {
  const [deleted, setDeleted] = useState<DeletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cleanupDate, setCleanupDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [imgView, setImgView] = useState<{url:string;title:string}|null>(null);
  const [expanded, setExpanded] = useState<number|null>(null);

  function getComps(job: DeletedJob) {
    if (!job.completionsData) return [];
    try { return JSON.parse(job.completionsData) as {completedByName?:string;techniques?:string;completionNote?:string;imageUrl?:string;completedAt?:string}[]; } catch { return []; }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch("/api/deleted-jobs"); if (r.ok) setDeleted(await r.json()); }
    catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function restore(id: number) {
    setBusy(true);
    await fetch("/api/deleted-jobs", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ action: "restore", id }) });
    setBusy(false); load();
  }
  async function permDel(id: number) {
    if (!confirm("Kalıcı olarak silinecek!")) return;
    await fetch("/api/deleted-jobs", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ action: "permanent_delete", id }) });
    load();
  }
  async function cleanDate() {
    if (!cleanupDate || !confirm(`${cleanupDate} tarihine kadar tüm kayıtlar silinecek!`)) return;
    setBusy(true);
    await fetch("/api/deleted-jobs", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ action: "cleanup_before_date", date: cleanupDate }) });
    setBusy(false); load();
  }
  async function cleanAll() {
    if (!confirm("TÜM kayıtlar kalıcı silinecek!")) return;
    setBusy(true);
    await fetch("/api/deleted-jobs", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ action: "cleanup_all" }) });
    setBusy(false); load();
  }

  const fd = deleted.filter(j => j.companyName.toLowerCase().includes(search.toLowerCase()) || j.jobType.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="space-y-1">{[1,2].map(i=><div key={i} className="bg-white rounded-lg p-3 border border-gray-100"><div className="h-4 w-1/3 shimmer rounded mb-1"></div><div className="h-3 w-1/2 shimmer rounded"></div></div>)}</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] md:text-xs font-bold text-gray-400">Geçmiş ({fd.length})</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field text-xs max-w-[150px] sm:max-w-[200px] py-1" placeholder="🔍 Ara..." />
      </div>

      {fd.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-100 px-2 py-1.5 mb-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-bold text-gray-400">Temizle:</span>
          <input type="date" value={cleanupDate} onChange={e => setCleanupDate(e.target.value)} className="input-field text-[10px] py-0.5 px-1.5 w-auto max-w-[130px]" />
          <button onClick={cleanDate} disabled={!cleanupDate||busy} className="btn-press text-[9px] font-bold px-2 py-1 rounded bg-orange-50 text-orange-600 border border-orange-100 disabled:opacity-40">📅 Sil</button>
          <button onClick={cleanAll} disabled={busy} className="btn-press text-[9px] font-bold px-2 py-1 rounded bg-red-50 text-red-500 border border-red-100">🗑️ Tümü</button>
        </div>
      )}

      {/* MOBILE — same format as job list */}
      <div className="md:hidden bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-green-700 text-white text-[7px] tracking-wide font-bold flex">
          <div className="flex-[3] p-0.5 px-1 border-r border-green-600">İş</div>
          <div className="flex-[4] p-0.5 px-1 border-r border-green-600">Tür</div>
          <div className="flex-[3] p-0.5 px-1 border-r border-green-600">Teknik</div>
          <div className="w-12 p-0.5 text-center border-r border-green-600">Tarih</div>
          <div className="w-9 p-0.5 text-center border-r border-green-600">Görsel</div>
          <div className="w-[50px] p-0.5 text-center">İşlem</div>
        </div>
        {fd.length === 0 ? <div className="p-6 text-center text-gray-400 text-sm">🗑️ Kayıt yok</div>
        : fd.map((job, idx) => {
          const tech = job.technique ? fmtTech(toTitleCase(job.technique)) : "";
          const comps = getComps(job);
          const isExp = expanded === job.id;
          return (
            <div key={job.id}>
            <div className={`flex border-b border-gray-200 table-row-enter cursor-pointer ${isExp?"bg-gray-50":""}`} style={{animationDelay:`${idx*15}ms`}} onClick={() => setExpanded(isExp ? null : job.id)}>
              <div className="flex-[3] p-1 border-r border-gray-100 min-w-0">
                <div className="font-bold text-[11px] text-gray-900 leading-tight break-words">{toTitleCase(job.companyName)}</div>
                {comps.length > 0 && <div className="text-[7px] text-emerald-600 font-bold">{comps.length} tamamlama</div>}
              </div>
              <div className="flex-[4] p-1 border-r border-gray-100 min-w-0">
                <div className="text-[10px] text-orange-600 font-semibold leading-tight break-words">{toTitleCase(job.jobType)}</div>
              </div>
              <div className="flex-[3] p-1 border-r border-gray-100 min-w-0">
                {tech ? <div className="text-[9px] font-bold text-gray-600 leading-tight break-words">{tech}</div> : <span className="text-gray-300 text-[9px]">-</span>}
              </div>
              <div className="w-12 p-0.5 border-r border-gray-100 flex-shrink-0 flex flex-col items-center pt-1 text-[8px] text-gray-500">
                <div>{job.jobCreatedAt ? new Date(job.jobCreatedAt).toLocaleDateString("tr-TR") : "-"}</div>
                <div className="text-red-500 font-bold">{new Date(job.deletedAt).toLocaleDateString("tr-TR")}</div>
              </div>
              <div className="w-9 p-0.5 border-r border-gray-100 flex-shrink-0 flex items-start justify-center pt-1">
                {job.imageUrl ? <button onClick={(e) => {e.stopPropagation(); setImgView({url:job.imageUrl!,title:job.companyName});}} className="btn-press w-6 h-6 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-sm hover:bg-violet-200">🖼️</button> : <span className="text-gray-300 text-[9px]">-</span>}
              </div>
              <div className="w-[50px] p-0.5 flex-shrink-0 flex flex-col items-center pt-0.5 gap-px">
                <button onClick={(e) => {e.stopPropagation(); restore(job.id);}} disabled={busy} className="btn-press text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 disabled:opacity-40">♻️Geri</button>
                <button onClick={(e) => {e.stopPropagation(); permDel(job.id);}} className="btn-press text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-400 border border-red-100">❌Sil</button>
              </div>
            </div>
            {/* Expanded completions */}
            {isExp && comps.length > 0 && (
              <div className="bg-gray-50 border-b border-gray-200 px-2 py-1.5 animate-slide-down">
                <div className="text-[8px] font-bold text-gray-400 mb-1">Tamamlama Kayıtları</div>
                {comps.map((c, ci) => {
                  let techs: string[] = []; try { if (c.techniques) techs = JSON.parse(c.techniques); } catch {}
                  return (
                    <div key={ci} className="bg-white rounded px-1.5 py-1 mb-0.5 text-[9px] flex items-start gap-1">
                      <span className="font-bold text-gray-700 flex-shrink-0">👤 {c.completedByName}</span>
                      <div className="flex-1 min-w-0">
                        {techs.length > 0 && <span className={`font-bold ${techs.includes("Komple")?"text-green-600":"text-orange-600"}`}>{techs.join(", ")}</span>}
                        {c.completionNote && <span className="text-gray-500 ml-0.5">— {c.completionNote}</span>}
                        {c.imageUrl && <a href={c.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 ml-0.5" onClick={e => e.stopPropagation()}>🖼️</a>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          );
        })}
      </div>

      {/* DESKTOP */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-green-700 text-white text-sm tracking-wider">
              <th className="px-3 py-3 text-left font-bold w-10 border-r border-green-600">#</th>
              <th className="px-3 py-3 text-left font-bold border-r border-green-600">İş</th>
              <th className="px-3 py-3 text-left font-bold border-r border-green-600">İş Türü</th>
              <th className="px-3 py-3 text-left font-bold border-r border-green-600">Teknik</th>
              <th className="px-3 py-3 text-center font-bold w-24 border-r border-green-600">Tarih</th>
              <th className="px-3 py-3 text-center font-bold w-14 border-r border-green-600">Görsel</th>
              <th className="px-3 py-3 text-center font-bold w-36">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {fd.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-lg">🗑️ Kayıt yok</td></tr>
            : fd.map((job, idx) => {
              const tech = job.technique ? fmtTech(toTitleCase(job.technique)) : "";
              const comps = getComps(job);
              const isExp = expanded === job.id;
              return (
                <> 
                <tr key={job.id} className={`border-b-2 border-gray-200 hover:bg-green-50/30 transition table-row-enter cursor-pointer ${isExp?"bg-gray-50":""}`} style={{animationDelay:`${idx*20}ms`}} onClick={() => setExpanded(isExp?null:job.id)}>
                  <td className="px-3 py-3 text-gray-400 font-bold text-base border-r border-gray-100">{idx+1}</td>
                  <td className="px-3 py-3 border-r border-gray-100">
                    <div className="font-extrabold text-base text-gray-900">{toTitleCase(job.companyName)}</div>
                    {job.assignedFullName && <div className="text-xs text-gray-400 mt-0.5">👤 {job.assignedFullName}</div>}
                    {comps.length > 0 && <div className="text-[10px] text-emerald-600 font-bold mt-0.5">{comps.length} tamamlama kaydı</div>}
                  </td>
                  <td className="px-3 py-3 border-r border-gray-100"><div className="text-sm text-orange-700 font-semibold">{toTitleCase(job.jobType)}</div></td>
                  <td className="px-3 py-3 border-r border-gray-100">{tech ? <div className="text-sm font-bold text-gray-800">{tech}</div> : <span className="text-gray-300">-</span>}</td>
                  <td className="px-3 py-3 text-center border-r border-gray-100">
                    <div className="text-xs text-gray-500">{job.jobCreatedAt ? new Date(job.jobCreatedAt).toLocaleDateString("tr-TR") : "-"}</div>
                    <div className="text-xs text-red-500 font-bold">{new Date(job.deletedAt).toLocaleDateString("tr-TR")}</div>
                  </td>
                  <td className="px-3 py-3 text-center border-r border-gray-100">
                    {job.imageUrl ? <button onClick={(e) => {e.stopPropagation(); setImgView({url:job.imageUrl!,title:job.companyName});}} className="btn-press w-8 h-8 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 flex items-center justify-center mx-auto text-base">🖼️</button> : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={(e) => {e.stopPropagation(); restore(job.id);}} disabled={busy} className="btn-press text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40">♻️ Geri Al</button>
                      <button onClick={(e) => {e.stopPropagation(); permDel(job.id);}} className="btn-press w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 flex items-center justify-center">❌</button>
                    </div>
                  </td>
                </tr>
                {isExp && comps.length > 0 && (
                  <tr key={`exp-${job.id}`}><td colSpan={7} className="bg-gray-50 px-4 py-3 border-b-2 border-gray-200 animate-slide-down">
                    <div className="text-[10px] font-bold text-gray-400 mb-1.5">Tamamlama Kayıtları</div>
                    <div className="space-y-1.5">
                      {comps.map((c, ci) => {
                        let techs: string[] = []; try { if (c.techniques) techs = JSON.parse(c.techniques); } catch {}
                        return (
                          <div key={ci} className="bg-white rounded-lg px-3 py-2 border border-gray-100 text-xs flex items-start gap-2">
                            <span className="font-bold text-gray-700 flex-shrink-0">👤 {c.completedByName}</span>
                            <div className="flex-1 min-w-0">
                              {techs.length > 0 && <span className={`font-bold ${techs.includes("Komple")?"text-green-600":"text-orange-600"}`}>{techs.join(", ")}</span>}
                              {c.completionNote && <span className="text-gray-500 ml-1">— {c.completionNote}</span>}
                              {c.imageUrl && <a href={c.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 ml-1 underline">🖼️ Görsel</a>}
                            </div>
                            {c.completedAt && <span className="text-gray-300 text-[10px] flex-shrink-0">{new Date(c.completedAt).toLocaleDateString("tr-TR")}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </td></tr>
                )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {imgView && <ImageModal url={imgView.url} title={imgView.title} onClose={() => setImgView(null)}/>}
    </div>
  );
}
