"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AppUser } from "@/app/page";
import { playNotificationSound, unlockAudio, requestNotifyPermission, showSystemNotification, subscribePush } from "@/lib/sound";
import JobList from "./JobList";
import AddJob from "./AddJob";
import UsersPanel from "./UsersPanel";
import LoginLogsPanel from "./LoginLogsPanel";
import HistoryPanel from "./HistoryPanel";
import SettingsPanel from "./SettingsPanel";
import ThemeSwitcher from "./ThemeSwitcher";

interface DashboardProps { user: AppUser; onLogout: () => void; }
type Tab = "jobs" | "add" | "history" | "users" | "logs" | "settings";
interface Toast { id: number; message: string; type: "success" | "info" | "complete" | "reminder"; }

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("jobs");
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set<Tab>(["jobs"]));
  const [refreshKey, setRefreshKey] = useState(0);
  const [showTheme, setShowTheme] = useState(false);
  const [s, setS] = useState<Record<string, string>>({});
  const [isOnline, setIsOnline] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevRef = useRef<number | null>(null);
  const tidRef = useRef(0);
  

  const loadS = useCallback(async () => {
    try {
      const [sR, stR] = await Promise.all([fetch("/api/settings"), fetch("/api/status")]);
      if (sR.ok) setS(await sR.json());
      if (stR.ok) { const d = await stR.json(); setIsOnline(d.supabase); }
    } catch {}
  }, []);
  useEffect(() => { loadS(); }, [loadS]);

  // Ziyaret edilen sekmeler mount'ta kalır → sekme geçişleri anında (seri) olur
  useEffect(() => {
    setVisited(v => (v.has(activeTab) ? v : new Set(v).add(activeTab)));
  }, [activeTab]);

  // Bildirimler: service worker kaydı + ilk dokunuşta sesi aç ve bildirim izni iste
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onFirst = async () => {
      unlockAudio();
      const granted = await requestNotifyPermission();
      if (granted) {
        // Push aboneliğini kur
        await subscribePush();
      }
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
    window.addEventListener("pointerdown", onFirst);
    window.addEventListener("keydown", onFirst);
    return () => {
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
  }, []);

  // Apply admin mute setting to this user's localStorage
  useEffect(() => {
    const mutedIds = (s.muted_users || "").split(",").filter(Boolean);
    const amIMuted = mutedIds.includes(String(user.id));
    localStorage.setItem("ist_sound_mute", amIMuted ? "true" : "false");
  }, [s.muted_users, user.id]);

  function refresh() { setRefreshKey(k => k + 1); }

  function toast(msg: string, type: Toast["type"] = "info") {
    const id = ++tidRef.current;
    setToasts(p => [...p, { id, message: msg, type }]);
    playNotificationSound();
    showSystemNotification(type === "complete" ? "✅ İş Tamamlandı" : type === "reminder" ? "🔔 Hatırlatma" : "🔔 İş Takip", msg);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
  }

  const prevCompRef = useRef<string | null>(null);

  // Ana polling: yeni işler, tamamlanmalar ve hatırlatmalar
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const res = await fetch("/api/jobs"); if (!res.ok) return;
        const all = await res.json();
        const cnt = all.length;

        // Build a hash of all data to detect ANY change  
        const totalComps = all.reduce((s: number, j: {completions?:unknown[]}) => s + (j.completions?.length || 0), 0);
        const reminders = all.map((j: {reminder?:string|null}) => j.reminder || "").join("");
        const hash = `${cnt}-${totalComps}-${reminders.length}`;

        if (prevRef.current !== null && prevCompRef.current !== null) {
          const prevCnt = prevRef.current;
          const changed = hash !== prevCompRef.current;

          if (changed) {
            if (user.role === "employee") {
              if (cnt > prevCnt) {
                toast("📋 Yeni iş eklendi!");
              }
              // Check for new reminders
              const prevRemLen = parseInt(prevCompRef.current.split("-")[2] || "0");
              if (reminders.length > prevRemLen) {
                const jobWithReminder = all.find((j: {reminder?:string|null}) => j.reminder);
                if (jobWithReminder) toast(`🔔 ${jobWithReminder.companyName} — ${jobWithReminder.reminder}`, "reminder");
              }
            }

            if (user.role === "admin" && totalComps > parseInt(prevCompRef.current.split("-")[1] || "0")) {
              for (const j of all) {
                if (j.completions?.length > 0) {
                  const lt = j.completions[j.completions.length - 1];
                  // Skip if admin did it themselves
                  if (lt.completedBy === user.id) break;
                  const tl = lt.techniques ? JSON.parse(lt.techniques) : [];
                  const isK = tl.includes("Komple");
                  const age = Date.now() - new Date(lt.completedAt).getTime();
                  if (age < 10000) {
                    const by = lt.completedByName || "";
                    if (isK) {
                      toast(`${j.companyName} — İş komple tamamlanmıştır ✅ (${by})`, "complete");
                    } else {
                      // Show separate details
                      const msgs: string[] = [];
                      if (tl.length > 0 && !isK) msgs.push(`Teknik: ${tl.join(", ")}`);
                      if (lt.completionNote) msgs.push(`Not: ${lt.completionNote}`);
                      if (lt.imageUrl) msgs.push("Görsel eklendi 📷");
                      const detail = msgs.length > 0 ? msgs.join(" | ") : "Tamamlama eklendi";
                      toast(`${j.companyName} — ${detail} (${by})`, "info");
                    }
                    break;
                  }
                }
              }
            }
          }
        }

        prevRef.current = cnt;
        prevCompRef.current = hash;
      } catch {}
    }, 2000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.role]);

  // Hatırlatma polling: sunucuda bekleyen hatırlatmaları kontrol et ve push gönder
  useEffect(() => {
    const reminderIv = setInterval(async () => {
      try {
        const res = await fetch("/api/reminders/check", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.fired > 0) {
            // Hatırlatma bildirimi gönderildi
            for (const name of (data.jobs || [])) {
              toast(`🔔 ${name}`, "reminder");
            }
          }
        }
      } catch {}
    }, 5000); // 5 saniyede bir kontrol et
    return () => clearInterval(reminderIv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appName = s.app_name || "İş Takip";
  const appDesc = s.app_desc || "Profesyonel İş Yönetim Sistemi";

  // Tarayıcı sekmesi başlığı = firma/uygulama adı (ayarlardan)
  useEffect(() => { document.title = appName; }, [appName]);

  const tabs: { id: Tab; label: string; icon: string; adminOnly?: boolean }[] = [
    { id: "add", label: "Yeni İş Ekle", icon: "➕", adminOnly: true },
    { id: "jobs", label: "İş Listesi", icon: "📊" },
    { id: "history", label: "Geçmiş", icon: "📦", adminOnly: true },
    { id: "users", label: "Kullanıcılar", icon: "👥", adminOnly: true },
    { id: "logs", label: "Giriş Kayıtları", icon: "🕐", adminOnly: true },
    { id: "settings", label: "Ayarlar", icon: "⚙️", adminOnly: true },
  ];
  const fTabs = tabs.filter(t => !t.adminOnly || user.role === "admin");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50/30">
      {/* Toasts */}
      <div className="fixed top-2 right-2 z-[100] space-y-2 max-w-[300px]">
        {toasts.map(t => (
          <div key={t.id} className={`animate-slide-down px-3 py-2 rounded-xl shadow-2xl border text-xs font-bold flex items-center gap-2 ${
            t.type === "complete" ? "bg-green-600 text-white border-green-500" : 
            t.type === "reminder" ? "bg-amber-500 text-white border-amber-400" :
            "bg-blue-50 text-blue-700 border-blue-200"
          }`}>{t.type === "complete" ? "✅" : t.type === "reminder" ? "🔔" : "📋"} {t.message}</div>
        ))}
      </div>

      {/* Header */}
      <header className="flex-shrink-0 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm z-40">
        <div className="max-w-[1800px] mx-auto px-2 sm:px-5">
          <div className="flex items-center justify-between h-11 sm:h-14">
            <div className="flex items-center gap-2">
              {s.app_logo ? (
                <img src={s.app_logo} alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/></svg>
                </div>
              )}
              <div>
                <h1 className="text-xs sm:text-base font-extrabold text-gray-800 leading-none">{appName}</h1>
                <p className="text-[8px] sm:text-[10px] text-gray-400 font-semibold leading-none mt-0.5">
                  {user.role === "admin" ? "👑" : "👷"} {user.fullName}
                  <span className="hidden sm:inline"> — {appDesc}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-full ${isOnline ? "bg-emerald-50" : "bg-amber-50"}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOnline ? "bg-emerald-400" : "bg-amber-400"}`}></span>
                <span className={`text-[10px] font-bold ${isOnline ? "text-emerald-600" : "text-amber-600"}`}>{isOnline ? "Online" : "Offline"}</span>
              </div>
              <button onClick={() => setShowTheme(true)} title="Tema"
                className="btn-press flex items-center justify-center bg-white border border-gray-200 hover:border-emerald-200 hover:bg-emerald-50 text-gray-500 w-7 h-7 sm:w-8 sm:h-8 rounded-lg transition-all text-sm">
                🎨
              </button>
              <button onClick={onLogout} className="btn-press flex items-center gap-1 bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-400 hover:text-red-500 font-medium px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg transition-all text-[10px] sm:text-xs">
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>
                <span className="hidden sm:inline">Çıkış</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex-shrink-0 max-w-[1800px] w-full mx-auto px-2 sm:px-5 pt-1.5 sm:pt-2.5 pb-0.5">
        <div className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
          {fTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`btn-press flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-6 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-[11px] sm:text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg" : "bg-white text-gray-500 border border-gray-200"
              }`}>
              <span className="text-sm sm:text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content — sekmeler mount edilip gizlenir; ilk açılıştan sonra geçiş anında (seri) */}
      <div className="flex-1 max-w-[1800px] w-full mx-auto px-2 sm:px-5 py-1.5 sm:py-2 overflow-y-auto">
        {visited.has("jobs") && <div className={activeTab === "jobs" ? "" : "hidden"}><JobList user={user} onRefresh={refresh} settings={s} /></div>}
        {user.role === "admin" && visited.has("add") && <div className={activeTab === "add" ? "" : "hidden"}><AddJob onJobAdded={() => { refresh(); setActiveTab("jobs"); }} settings={s} /></div>}
        {user.role === "admin" && visited.has("history") && <div className={activeTab === "history" ? "" : "hidden"}><HistoryPanel user={user} /></div>}
        {user.role === "admin" && visited.has("users") && <div className={activeTab === "users" ? "" : "hidden"}><UsersPanel /></div>}
        {user.role === "admin" && visited.has("logs") && <div className={activeTab === "logs" ? "" : "hidden"}><LoginLogsPanel /></div>}
        {user.role === "admin" && visited.has("settings") && <div className={activeTab === "settings" ? "" : "hidden"}><SettingsPanel settings={s} onSave={loadS} /></div>}
      </div>

      {/* Tema seçme popup — tüm kullanıcılar (çalışan dahil) */}
      {showTheme && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setShowTheme(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-xs w-full overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 text-center">
              <h3 className="text-sm font-bold text-white">🎨 Tema Seç</h3>
            </div>
            <div className="p-4">
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
