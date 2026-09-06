"use client";

import { useState, useEffect, useCallback } from "react";
import type { AppUser } from "@/app/page";
import { toTitleCase } from "@/lib/utils";
import CompleteJobModal from "./CompleteJobModal";
import EditJobModal from "./EditJobModal";
import ReminderModal from "./ReminderModal";
import NoteModal from "./NoteModal";
import ImageModal from "./ImageModal";

interface Completion {
  id: number; jobId: number; completedBy: number; techniques: string | null;
  completionNote: string | null; imageUrl: string | null; completedAt: string; completedByName: string | null;
}

export interface Job {
  id: number; assignedTo: number | null; companyName: string; deadlineDays: number | null;
  deadlineDate: string | null; paymentStatus: string; jobType: string; technique: string | null;
  priority: string; imageUrl: string | null; notes: string | null; reminder: string | null;
  status: string; createdAt: string; updatedAt: string; assignedFullName: string | null;
  completions: Completion[];
}

interface JobListProps { user: AppUser; onRefresh: () => void; settings: Record<string, string>; }

function getRemainingDays(job: Job): number | null {
  if (!job.deadlineDate) return null;
  const dl = new Date(job.deadlineDate); const now = new Date();
  now.setHours(0,0,0,0); dl.setHours(0,0,0,0);
  return Math.ceil((dl.getTime() - now.getTime()) / (1000*60*60*24));
}
function fmtDay(job: Job): string {
  const r = getRemainingDays(job); if (r === null) return "-";
  if (r <= 0) return "Gecikti!"; if (r === 1) return "Bugün"; return `${r} Gün`;
}
function fmtDayS(job: Job): string {
  const r = getRemainingDays(job); if (r === null) return "-";
  if (r <= 0) return "Gecik"; if (r === 1) return "Bugün"; return `${r}g`;
}
function fmtTech(t: string | null): string {
  if (!t) return ""; return t.split(",").map(s => s.trim()).filter(Boolean).join(" | ");
}
function isKomple(job: Job): boolean {
  for (const c of job.completions) { if (c.techniques) { try { if (JSON.parse(c.techniques).includes("Komple")) return true; } catch {} } } return false;
}

export default function JobList({ user, onRefresh, settings }: JobListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selJob, setSelJob] = useState<Job | null>(null);
  const [modal, setModal] = useState<"complete"|"edit"|"reminder"|"note"|null>(null);
  const [imgView, setImgView] = useState<{url:string;title:string}|null>(null);
  const [emps, setEmps] = useState<{id:number;fullName:string}[]>([]);

  const techList = (settings.techniques || "Komple").split(",").filter(Boolean);
  const remPresets = (settings.reminders || "").split(",").filter(Boolean);
  const adm = user.role === "admin";

  const load = useCallback(async () => {
    try {
      const [jR, uR] = await Promise.all([fetch("/api/jobs"), fetch("/api/users")]);
      if (jR.ok) setJobs(await jR.json());
      if (uR.ok) { const u = await uR.json(); setEmps(u.filter((x:{role:string}) => x.role==="employee").map((x:{id:number;fullName:string}) => ({id:x.id,fullName:x.fullName}))); }
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Self-polling: refresh data every 2 seconds without remounting
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const r = await fetch("/api/jobs");
        if (r.ok) setJobs(await r.json());
      } catch {}
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const [delJob, setDelJob] = useState<Job|null>(null);

  async function confirmDel() {
    if (!delJob) return;
    const id = delJob.id;
    setJobs(prev => prev.filter(j => j.id !== id)); // anında kaldır (seri)
    setDelJob(null);
    try { await fetch(`/api/jobs/${id}`, { method: "DELETE" }); } catch {}
    load();
  }
  async function payTog(job: Job) {
    const next = job.paymentStatus === "Ödendi" ? "Ödenmedi" : "Ödendi";
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, paymentStatus: next } : j)); // anında (seri)
    try { await fetch(`/api/jobs/${job.id}`, { method: "PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({paymentStatus: next}) }); } catch {}
  }
  function open(job: Job, t: "complete"|"edit"|"reminder"|"note") { setSelJob(job); setModal(t); }
  function close() { setModal(null); setSelJob(null); }
  function done() { close(); load(); }
  void onRefresh; // polling handles cross-user sync

  const tot = jobs.length, paid = jobs.filter(j => j.paymentStatus === "Ödendi").length;

  if (loading) return <div className="space-y-1">{[1,2,3].map(i=><div key={i} className="bg-white rounded-lg p-3 border border-gray-100"><div className="h-4 w-1/3 shimmer rounded mb-1"></div><div className="h-3 w-1/2 shimmer rounded"></div></div>)}</div>;

  return (
    <>
      <div className="flex justify-between items-center mb-1.5 md:mb-2">
        <span className="text-[10px] md:text-xs font-bold text-gray-400">İş Listesi</span>
        <div className="flex gap-1.5">
          <div className="border border-green-400 rounded px-2 py-0.5 bg-white flex items-center gap-1">
            <span className="text-sm font-extrabold text-green-600">{tot}</span>
            <span className="text-[7px] md:text-[9px] font-bold text-gray-400">Toplam</span>
          </div>
          {adm && <div className="border border-green-400 rounded px-2 py-0.5 bg-white flex items-center gap-1">
            <span className="text-sm font-extrabold text-green-600">{paid}</span>
            <span className="text-[7px] md:text-[9px] font-bold text-gray-400">Ödeme</span>
          </div>}
        </div>
      </div>

      {/* ===== MOBILE ===== */}
      <div className="md:hidden bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-green-700 text-white text-[7px] tracking-wide font-bold flex">
          <div className="flex-[3] p-0.5 px-1 border-r border-green-600">İş</div>
          <div className="flex-[4] p-0.5 px-1 border-r border-green-600">Tür</div>
          <div className="flex-[3] p-0.5 px-1 border-r border-green-600">Teknik</div>
          <div className="w-9 p-0.5 text-center border-r border-green-600 flex-shrink-0">Gün</div>
          <div className="w-9 p-0.5 text-center border-r border-green-600 flex-shrink-0">Görsel</div>
          <div className={`p-0.5 text-center flex-shrink-0 ${adm?"w-[44px]":"w-[34px]"}`}>İşlem</div>
        </div>
        {jobs.length === 0 ? <div className="p-6 text-center text-gray-400 text-sm">📭 İş yok</div>
        : jobs.map((job, idx) => {
          const rem = getRemainingDays(job);
          const urg = rem !== null && rem <= 3;
          const over = rem !== null && rem <= 0;
          const komp = isKomple(job);
          const hasC = job.completions.length > 0;
          const hasN = !!(job.notes || job.reminder);
          const tech = job.technique ? fmtTech(toTitleCase(job.technique)) : "";

          return (
            <div key={job.id} className={`flex border-b border-gray-200 table-row-enter ${urg?"deadline-flash":""}`} style={{animationDelay:`${idx*15}ms`}}>
              {/* İş */}
              <div className="flex-[3] p-1 border-r border-gray-100 min-w-0">
                <div className="font-bold text-[11px] text-gray-900 leading-tight break-words">{toTitleCase(job.companyName)}</div>
              </div>
              {/* Tür */}
              <div className="flex-[4] p-1 border-r border-gray-100 min-w-0">
                <div className="text-[10px] text-orange-600 font-semibold leading-tight break-words">{toTitleCase(job.jobType)}</div>
              </div>
              {/* Teknik */}
              <div className="flex-[3] p-1 border-r border-gray-100 min-w-0">
                {tech ? <div className="text-[9px] font-bold text-gray-600 leading-tight break-words">{tech}</div> : <span className="text-gray-300 text-[9px]">-</span>}
              </div>
              {/* Gün + Not ikonu altında */}
              <div className="w-9 p-0.5 border-r border-gray-100 flex-shrink-0 flex flex-col items-center pt-1 gap-0.5">
                <span className={`font-bold text-[10px] ${over?"text-red-600 animate-pulse":urg?"text-red-500":"text-gray-600"}`}>{fmtDayS(job)}</span>
                {hasN && <button onClick={() => open(job,"note")} className="btn-press w-4 h-4 rounded-full bg-red-500 flex items-center justify-center animate-pulse" title="Not Var">
                  <span className="text-white text-[7px] font-bold">!</span>
                </button>}
              </div>
              {/* Görsel */}
              <div className="w-9 p-0.5 border-r border-gray-100 flex-shrink-0 flex items-start justify-center pt-1">
                {job.imageUrl ? (
                  <button onClick={() => setImgView({url:job.imageUrl!,title:job.companyName})} className="btn-press w-6 h-6 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-sm hover:bg-violet-200">
                    🖼️
                  </button>
                ) : <span className="text-gray-300 text-[9px]">-</span>}
              </div>
              {/* İşlem */}
              <div className={`p-0.5 flex-shrink-0 flex items-start pt-0.5 ${adm?"w-[44px]":"w-[34px]"}`}>
                <div className="flex flex-wrap gap-px">
                  <button onClick={() => open(job,"complete")} className={`btn-press w-5 h-5 rounded flex items-center justify-center ${komp?"bg-green-500 text-white":hasC?"bg-orange-400 text-white":"bg-green-50 text-green-600"}`}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                  </button>
                  {adm && <>
                    <button onClick={() => open(job,"edit")} className="btn-press w-5 h-5 rounded bg-blue-50 text-blue-500 flex items-center justify-center">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>
                    </button>
                    <button onClick={() => setDelJob(job)} className="btn-press w-5 h-5 rounded bg-red-50 text-red-400 flex items-center justify-center">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                    </button>
                    <button onClick={() => open(job,"reminder")} className={`btn-press w-5 h-5 rounded flex items-center justify-center text-[8px] ${job.reminder?"bg-amber-100 text-amber-600":"bg-gray-50 text-gray-300"}`}>🔔</button>
                  </>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== DESKTOP ===== */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-green-700 text-white text-sm tracking-wider">
              <th className="px-3 py-3 text-left font-bold w-10 border-r border-green-600">#</th>
              <th className="px-3 py-3 text-left font-bold border-r border-green-600">İş</th>
              <th className="px-3 py-3 text-left font-bold border-r border-green-600">İş Türü</th>
              <th className="px-3 py-3 text-left font-bold border-r border-green-600">Teknik</th>
              <th className="px-3 py-3 text-center font-bold w-20 border-r border-green-600">Gün</th>
              {adm && <th className="px-3 py-3 text-center font-bold w-20 border-r border-green-600">Ödeme</th>}
              <th className="px-3 py-3 text-center font-bold w-14 border-r border-green-600">Görsel</th>
              <th className="px-3 py-3 text-center font-bold w-40">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? <tr><td colSpan={adm?8:7} className="px-4 py-12 text-center text-gray-400 text-lg">📭 İş yok</td></tr>
            : jobs.map((job, idx) => {
              const rem = getRemainingDays(job);
              const urg = rem !== null && rem <= 3;
              const over = rem !== null && rem <= 0;
              const komp = isKomple(job);
              const hasC = job.completions.length > 0;
              const hasN = !!(job.notes || job.reminder);
              const tech = job.technique ? fmtTech(toTitleCase(job.technique)) : "";

              return (
                <tr key={job.id} className={`border-b-2 border-gray-200 hover:bg-green-50/30 transition table-row-enter ${urg?"deadline-flash":""}`} style={{animationDelay:`${idx*20}ms`}}>
                  <td className="px-3 py-3 text-gray-400 font-bold text-base border-r border-gray-100">{idx+1}</td>
                  <td className="px-3 py-3 border-r border-gray-100"><div className="font-extrabold text-base text-gray-900">{toTitleCase(job.companyName)}</div></td>
                  <td className="px-3 py-3 border-r border-gray-100"><div className="text-sm text-orange-700 font-semibold">{toTitleCase(job.jobType)}</div></td>
                  <td className="px-3 py-3 border-r border-gray-100">{tech ? <div className="text-sm font-bold text-gray-800">{tech}</div> : <span className="text-gray-300">-</span>}</td>
                  <td className="px-3 py-3 text-center border-r border-gray-100">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`font-bold text-sm ${over?"text-red-600 animate-pulse":urg?"text-red-500":"text-gray-700"}`}>{fmtDay(job)}</span>
                      {hasN && <button onClick={() => open(job,"note")} className="btn-press w-5 h-5 rounded-full bg-red-500 flex items-center justify-center animate-pulse" title="Not Var">
                        <span className="text-white text-[8px] font-bold">!</span>
                      </button>}
                    </div>
                  </td>
                  {adm && <td className="px-3 py-3 text-center border-r border-gray-100">
                    <button onClick={() => payTog(job)} className={`text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer hover:opacity-70 ${job.paymentStatus==="Ödendi"?"bg-green-100 text-green-700":job.paymentStatus==="Beklemede"?"bg-amber-100 text-amber-700":"bg-red-100 text-red-600"}`}>
                      {job.paymentStatus==="Ödendi"?"Var":job.paymentStatus==="Beklemede"?"Bekle":"Yok"}
                    </button>
                  </td>}
                  <td className="px-3 py-3 text-center border-r border-gray-100">
                    {job.imageUrl ? <button onClick={() => setImgView({url:job.imageUrl!,title:job.companyName})} className="btn-press w-8 h-8 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 flex items-center justify-center mx-auto text-base">🖼️</button> : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => open(job,"complete")} className={`btn-press w-8 h-8 rounded-lg flex items-center justify-center ${komp?"bg-green-500 text-white":hasC?"bg-orange-400 text-white":"bg-green-50 text-green-600"}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                      </button>
                      {adm && <>
                        <button onClick={() => open(job,"edit")} className="btn-press w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg></button>
                        <button onClick={() => setDelJob(job)} className="btn-press w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg></button>
                        <button onClick={() => open(job,"reminder")} className={`btn-press w-8 h-8 rounded-lg flex items-center justify-center text-sm ${job.reminder?"bg-amber-100 text-amber-600":"bg-gray-50 text-gray-300"}`}>🔔</button>
                      </>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation popup */}
      {delJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDelJob(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-500 to-rose-600 px-5 py-4 text-center">
              <div className="text-3xl mb-1">🗑️</div>
              <h3 className="text-base font-bold text-white">İşi Sil</h3>
            </div>
            <div className="p-5 text-center space-y-3">
              <p className="text-sm text-gray-700">
                <span className="font-bold text-gray-900">&ldquo;{delJob.companyName}&rdquo;</span> işi silinecek ve geçmişe kaydedilecek.
              </p>
              <p className="text-xs text-gray-400">Geçmişten geri yükleyebilirsiniz.</p>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setDelJob(null)} className="btn-press flex-1 py-2.5 border-2 border-gray-200 text-gray-500 font-semibold rounded-xl text-sm">Vazgeç</button>
                <button onClick={confirmDel} className="btn-press flex-1 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl text-sm shadow-lg">🗑️ Sil</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal==="complete" && selJob && <CompleteJobModal job={selJob} techniques={techList} onClose={close} onCompleted={done}/>}
      {modal==="edit" && selJob && <EditJobModal job={selJob} employees={emps} techniques={techList} onClose={close} onSaved={done}/>}
      {modal==="reminder" && selJob && <ReminderModal job={selJob} presets={remPresets} onClose={close} onSaved={done}/>}
      {modal==="note" && selJob && <NoteModal job={selJob} onClose={close}/>}
      {imgView && <ImageModal url={imgView.url} title={imgView.title} onClose={() => setImgView(null)}/>}
    </>
  );
}
