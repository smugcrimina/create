"use client";

import { useState, useEffect } from "react";
import ThemeSwitcher from "./ThemeSwitcher";

interface Props { settings: Record<string, string>; onSave: () => void; }

// NOT: Bu bileşen ana bileşenin DIŞINDA tanımlı olmalı. İçeride tanımlanırsa her
// tuş vuruşunda yeniden oluşur, input odağı kaybolur ve yazı "tek tek" yazılır.
function Section({ icon, title, color, isOpen, onToggle, children }: { icon: string; title: string; color: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={onToggle} className={`w-full flex items-center justify-between px-4 py-2.5 ${color} text-white text-sm font-bold`}>
        <span>{icon} {title}</span>
        <span className="text-lg">{isOpen ? "▾" : "▸"}</span>
      </button>
      {isOpen && <div className="p-3 sm:p-4">{children}</div>}
    </div>
  );
}

export default function SettingsPanel({ settings, onSave }: Props) {
  const [techniques, setTechniques] = useState(settings.techniques || "Komple");
  const [newTech, setNewTech] = useState("");
  const [imageApiUrl, setImageApiUrl] = useState(settings.image_api_url || "https://imgcdn.dev/api/1/upload");
  const [imageApiKey, setImageApiKey] = useState(settings.image_api_key || "5386e05a3562c7a8f984e73401540836");
  const [websiteUrl, setWebsiteUrl] = useState(settings.website_url || "");
  const [reminders, setReminders] = useState(settings.reminders || "Malzeme bekleniyor,Ölçü kontrolü gerekli,Müşteri onayı bekleniyor,Dosya eksik");
  const [newReminder, setNewReminder] = useState("");
  const [appName, setAppName] = useState(settings.app_name || "İş Takip");
  const [appDesc, setAppDesc] = useState(settings.app_desc || "Profesyonel İş Yönetim Sistemi");
  const [appLogo, setAppLogo] = useState(settings.app_logo || "");
  const [mutedUsers, setMutedUsers] = useState(settings.muted_users || "");
  const [allUsers, setAllUsers] = useState<{id:number;fullName:string;username:string;role:string}[]>([]);
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabase_url || "");
  const [supabaseKey, setSupabaseKey] = useState(settings.supabase_anon_key || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<"offline"|"online">("offline");
  const [openSection, setOpenSection] = useState<string|null>(null);

  const techList = techniques.split(",").filter(Boolean);
  const remList = reminders.split(",").filter(Boolean);
  const mutedList = mutedUsers.split(",").filter(Boolean);

  useEffect(() => {
    fetch("/api/status").then(r => r.json()).then(d => setMode(d.supabase ? "online" : "offline")).catch(() => {});
    fetch("/api/users").then(r => r.json()).then(d => setAllUsers(d)).catch(() => {});
  }, []);

  async function save(key: string, value: string) {
    await fetch("/api/settings", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({key, value}) });
  }
  async function handleSaveAll() {
    setSaving(true);
    try {
      await Promise.all([
        save("techniques", techniques), save("reminders", reminders),
        save("image_api_url", imageApiUrl), save("image_api_key", imageApiKey),
        save("website_url", websiteUrl), save("app_name", appName),
        save("app_desc", appDesc), save("app_logo", appLogo),
        save("muted_users", mutedUsers), save("supabase_url", supabaseUrl),
        save("supabase_anon_key", supabaseKey),
      ]);
      setSaved(true); onSave(); setTimeout(() => setSaved(false), 3000);
    } catch { alert("Hata"); } finally { setSaving(false); }
  }

  function toggle(section: string) { setOpenSection(openSection === section ? null : section); }

  const supabaseSQL = `CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, full_name VARCHAR(200) NOT NULL,
  role VARCHAR(20) DEFAULT 'employee' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY, assigned_to INTEGER REFERENCES users(id),
  company_name VARCHAR(300) NOT NULL, deadline_days INTEGER,
  deadline_date VARCHAR(50), payment_status VARCHAR(20) DEFAULT 'Ödenmedi' NOT NULL,
  job_type TEXT NOT NULL, technique VARCHAR(500),
  priority VARCHAR(20) DEFAULT 'Normal' NOT NULL, image_url TEXT,
  notes TEXT, reminder TEXT,
  status VARCHAR(20) DEFAULT 'Bekliyor' NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE TABLE IF NOT EXISTS job_completions (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  completed_by INTEGER REFERENCES users(id) NOT NULL,
  techniques TEXT, completion_note TEXT, image_url TEXT,
  completed_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE TABLE IF NOT EXISTS deleted_jobs (
  id SERIAL PRIMARY KEY, original_id INTEGER,
  company_name VARCHAR(300) NOT NULL, job_type TEXT NOT NULL,
  technique VARCHAR(500), priority VARCHAR(50),
  payment_status VARCHAR(50), assigned_full_name VARCHAR(200),
  notes TEXT, reminder TEXT, image_url TEXT, completions_data TEXT,
  status VARCHAR(50), job_created_at TIMESTAMP,
  deleted_at TIMESTAMP DEFAULT NOW() NOT NULL,
  deleted_by INTEGER REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS login_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  login_at TIMESTAMP DEFAULT NOW() NOT NULL,
  ip_address VARCHAR(100)
);
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(200) UNIQUE NOT NULL, value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
-- Admin kullanıcı (şifre: admin123)
INSERT INTO users (username, password, full_name, role)
VALUES ('admin', '\\$2a\\$10\\$rQKzJvGqTMjLZx8X5hKjXOvGv8rW8u7YBk5hVnKz0kR9Wp0aR8XHy', 'Sistem Yöneticisi', 'admin')
ON CONFLICT (username) DO NOTHING;`;

  return (
    <div className="space-y-2">
      {/* SAVE BUTTON — always visible at top */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800">⚙️ Ayarlar</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${mode === "online" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
            {mode === "online" ? "🟢 Online" : "🟡 Offline"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-emerald-600 font-bold animate-fade-in">✅ Kaydedildi</span>}
          <button onClick={handleSaveAll} disabled={saving}
            className="btn-press bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-2 px-5 rounded-xl text-xs shadow-lg disabled:opacity-50">
            {saving ? "⏳" : "💾 Kaydet"}
          </button>
        </div>
      </div>

      {/* TEMA */}
      <Section icon="🎨" title="Tema (Görünüm)" color="bg-gradient-to-r from-fuchsia-500 to-purple-600" isOpen={openSection === "theme"} onToggle={() => toggle("theme")}>
        <p className="text-[11px] text-gray-400 mb-2">Bu cihaz için görünüm temasını seç. Her kullanıcı kendi cihazında ayarlar.</p>
        <ThemeSwitcher />
      </Section>

      {/* BRANDING */}
      <Section icon="🏷️" title="Uygulama Kimliği" color="bg-gradient-to-r from-gray-700 to-gray-900" isOpen={openSection === "brand"} onToggle={() => toggle("brand")}>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label-sm">Ad</label><input type="text" value={appName} onChange={e => setAppName(e.target.value)} className="input-field text-xs" /></div>
          <div><label className="label-sm">Açıklama</label><input type="text" value={appDesc} onChange={e => setAppDesc(e.target.value)} className="input-field text-xs" /></div>
        </div>
        <div className="mt-2"><label className="label-sm">Logo URL</label><input type="text" value={appLogo} onChange={e => setAppLogo(e.target.value)} className="input-field text-[10px] font-mono" placeholder="Boş = varsayılan ikon" /></div>
      </Section>

      {/* TECHNIQUES */}
      <Section icon="🔧" title="İş Teknikleri" color="bg-gradient-to-r from-violet-500 to-purple-600" isOpen={openSection === "tech"} onToggle={() => toggle("tech")}>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {techList.map(t => (
            <div key={t} className="flex items-center gap-1 bg-violet-50 text-violet-700 px-2 py-1 rounded-lg text-xs font-bold group">
              {t}
              <button onClick={() => setTechniques(techList.filter(x => x !== t).join(","))} className="text-violet-400 hover:text-red-500 text-[10px]">×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input type="text" value={newTech} onChange={e => setNewTech(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (newTech.trim()) { setTechniques([...techList,newTech.trim()].join(",")); setNewTech(""); } }}}
            className="input-field flex-1 text-xs" placeholder="Yeni teknik..." />
          <button onClick={() => { if (newTech.trim()) { setTechniques([...techList,newTech.trim()].join(",")); setNewTech(""); }}}
            className="btn-press bg-violet-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs">+</button>
        </div>
      </Section>

      {/* REMINDERS */}
      <Section icon="🔔" title="Hatırlatma Şablonları" color="bg-gradient-to-r from-amber-500 to-orange-500" isOpen={openSection === "rem"} onToggle={() => toggle("rem")}>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {remList.map(r => (
            <div key={r} className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg text-xs font-bold group">
              {r}
              <button onClick={() => setReminders(remList.filter(x => x !== r).join(","))} className="text-amber-400 hover:text-red-500 text-[10px]">×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input type="text" value={newReminder} onChange={e => setNewReminder(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (newReminder.trim()) { setReminders([...remList,newReminder.trim()].join(",")); setNewReminder(""); }}}}
            className="input-field flex-1 text-xs" placeholder="Yeni hatırlatma..." />
          <button onClick={() => { if (newReminder.trim()) { setReminders([...remList,newReminder.trim()].join(",")); setNewReminder(""); }}}
            className="btn-press bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs">+</button>
        </div>
      </Section>

      {/* SOUND MUTE */}
      <Section icon="🔊" title="Bildirim Sesleri" color="bg-gradient-to-r from-rose-500 to-pink-600" isOpen={openSection === "sound"} onToggle={() => toggle("sound")}>
        <div className="space-y-1.5">
          {allUsers.map(u => {
            const isMuted = mutedList.includes(String(u.id));
            return (
              <div key={u.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${u.role === "admin" ? "bg-purple-500" : "bg-blue-500"}`}>{u.fullName.charAt(0)}</div>
                  <div><div className="text-xs font-bold text-gray-800">{u.fullName}</div><div className="text-[9px] text-gray-400">{u.role === "admin" ? "Yönetici" : "Çalışan"}</div></div>
                </div>
                <button onClick={() => setMutedUsers(isMuted ? mutedList.filter(x => x !== String(u.id)).join(",") : [...mutedList, String(u.id)].join(","))}
                  className={`btn-press px-2.5 py-1 rounded-lg text-[10px] font-bold ${isMuted ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
                  {isMuted ? "🔇 Kapalı" : "🔊 Açık"}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-[9px] text-gray-400 mt-2">Kapalı kullanıcılara bildirim gelir ama ses çalmaz</p>
      </Section>

      {/* IMAGE UPLOAD */}
      <Section icon="🖼️" title="Görsel Yükleme API" color="bg-gradient-to-r from-blue-500 to-cyan-600" isOpen={openSection === "img"} onToggle={() => toggle("img")}>
        <div className="space-y-2">
          <div><label className="label-sm">API URL</label><input type="text" value={imageApiUrl} onChange={e => setImageApiUrl(e.target.value)} className="input-field text-[10px] font-mono" /></div>
          <div><label className="label-sm">API Key</label><input type="text" value={imageApiKey} onChange={e => setImageApiKey(e.target.value)} className="input-field text-[10px] font-mono" /></div>
        </div>
      </Section>

      {/* SUPABASE */}
      <Section icon="🌐" title="Supabase Online Mod" color="bg-gradient-to-r from-emerald-500 to-green-600" isOpen={openSection === "supa"} onToggle={() => toggle("supa")}>
        <div className="space-y-3">
          {/* Step by step */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            <h4 className="font-bold text-emerald-800 text-xs mb-2">📋 Adım Adım Kurulum</h4>
            <ol className="text-emerald-700 space-y-1 text-[11px] list-decimal list-inside">
              <li><a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline font-bold">supabase.com</a> → Ücretsiz hesap → New Project</li>
              <li>SQL Editor → Aşağıdaki SQL kodunu yapıştır → Run</li>
              <li>Settings → Database → Connection string (URI) kopyala</li>
              <li>.env dosyasına <code className="bg-emerald-100 px-1 rounded font-mono text-[10px]">SUPABASE_DB_URL=postgresql://...</code> ekle</li>
              <li>Sunucuyu yeniden başlat → Otomatik online ✅</li>
            </ol>
          </div>

          {/* SQL Code */}
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800">
              <span className="text-[9px] font-bold text-gray-400 uppercase">SQL — Tablo Oluşturma</span>
              <button onClick={() => {
                navigator.clipboard.writeText(supabaseSQL);
                alert("SQL kopyalandı!");
              }} className="btn-press text-[9px] font-bold px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600">📋 Kopyala</button>
            </div>
            <pre className="text-[9px] text-green-400 font-mono overflow-x-auto p-3 leading-relaxed max-h-[200px] overflow-y-auto">{supabaseSQL}</pre>
          </div>

          {/* ENV example */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-gray-400 uppercase">.env Dosyası</span>
              <button onClick={() => {
                navigator.clipboard.writeText("SUPABASE_DB_URL=postgresql://postgres.[PROJE-REF]:[SIFRE]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres");
                alert(".env kopyalandı!");
              }} className="btn-press text-[9px] font-bold px-2 py-1 rounded bg-gray-200 text-gray-600">📋 Kopyala</button>
            </div>
            <code className="text-[10px] text-emerald-700 font-mono block bg-gray-900 rounded p-2 text-green-400">
              SUPABASE_DB_URL=postgresql://postgres.[PROJE-REF]:[SIFRE]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
            </code>
          </div>

          <div><label className="label-sm">Supabase URL</label><input type="text" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} className="input-field text-[10px] font-mono" placeholder="https://xxx.supabase.co" /></div>
          <div><label className="label-sm">Anon Key</label><input type="text" value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} className="input-field text-[10px] font-mono" placeholder="eyJ..." /></div>

          <div className={`flex items-center gap-2 rounded-xl p-2 border ${mode === "online" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <span className="text-lg">{mode === "online" ? "✅" : "⚠️"}</span>
            <span className={`text-xs font-bold ${mode === "online" ? "text-emerald-700" : "text-amber-700"}`}>
              {mode === "online" ? "Supabase Bağlı — Online" : "Offline — .env'ye SUPABASE_DB_URL ekleyin"}
            </span>
          </div>
        </div>
      </Section>

      {/* WEBSITE */}
      <Section icon="🌍" title="Web Sitesi" color="bg-gradient-to-r from-orange-500 to-rose-500" isOpen={openSection === "web"} onToggle={() => toggle("web")}>
        <div><label className="label-sm">Site URL</label><input type="text" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} className="input-field text-[10px] font-mono" placeholder="https://is-takip.sirketiniz.com" /></div>
        {websiteUrl && <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline mt-1 block">🔗 {websiteUrl}</a>}
      </Section>

      {/* BOTTOM SAVE */}
      <div className="flex justify-end pb-4">
        <button onClick={handleSaveAll} disabled={saving}
          className="btn-press bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-2.5 px-8 rounded-xl text-sm shadow-lg disabled:opacity-50">
          {saving ? "⏳ Kaydediliyor..." : "💾 TÜM AYARLARI KAYDET"}
        </button>
      </div>
    </div>
  );
}
