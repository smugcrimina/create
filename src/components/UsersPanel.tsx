"use client";

import { useState, useEffect, useCallback } from "react";

interface UserItem {
  id: number;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPanel() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState("employee");
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState("");
  const [pwUser, setPwUser] = useState<UserItem | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setAddLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword, fullName: newFullName, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setShowAdd(false); setNewUsername(""); setNewPassword(""); setNewFullName(""); setNewRole("employee");
      fetchUsers();
    } catch { setError("Sunucu hatası"); }
    finally { setAddLoading(false); }
  }

  async function toggleActive(u: UserItem) {
    const prev = users;
    // Anında güncelle (seri tepki), sonra sunucuya gönder
    setUsers(users.map((x) => (x.id === u.id ? { ...x, isActive: !x.isActive } : x)));
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      if (!res.ok) { alert("Güncelleme hatası"); setUsers(prev); }
    } catch { alert("Güncelleme hatası"); setUsers(prev); }
  }

  async function handleDelete(u: UserItem) {
    if (!confirm(`"${u.fullName}" kullanıcısını silmek istediğinize emin misiniz?`)) return;
    const prev = users;
    setUsers(users.filter((x) => x.id !== u.id)); // anında kaldır (seri tepki)
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Silme hatası");
        setUsers(prev); // başarısızsa geri al
      }
    } catch { alert("Silme hatası"); setUsers(prev); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwUser) return;
    if (pwValue.trim().length < 4) { setPwError("Şifre en az 4 karakter olmalı"); return; }
    setPwLoading(true); setPwError("");
    try {
      const res = await fetch(`/api/users/${pwUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwValue.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setPwError(d.error || "Şifre değiştirilemedi");
        return;
      }
      setPwUser(null); setPwValue("");
    } catch { setPwError("Sunucu hatası"); }
    finally { setPwLoading(false); }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-full shimmer"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 shimmer rounded-lg"></div>
                <div className="h-3 w-1/4 shimmer rounded-lg"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Kullanıcı Yönetimi</h2>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} kullanıcı kayıtlı</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="btn-press bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-green-500/20 hover:shadow-green-500/30 transition-all text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
          </svg>
          Yeni Kullanıcı
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAddUser} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-slide-down space-y-4">
          <h3 className="font-bold text-gray-700 text-sm">Yeni Kullanıcı Ekle</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input type="text" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="Ad Soyad" required
              className="px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-emerald-400 focus:bg-white focus:outline-none transition-all text-sm font-medium" />
            <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Kullanıcı Adı" required
              className="px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-emerald-400 focus:bg-white focus:outline-none transition-all text-sm font-medium" />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Şifre" required
              className="px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-emerald-400 focus:bg-white focus:outline-none transition-all text-sm font-medium" />
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
              className="px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-emerald-400 focus:bg-white focus:outline-none transition-all text-sm font-medium">
              <option value="employee">Çalışan</option>
              <option value="admin">Yönetici</option>
            </select>
          </div>
          {error && <p className="text-red-500 text-sm font-medium">⚠️ {error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={addLoading}
              className="btn-press bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm disabled:opacity-50">
              {addLoading ? "Ekleniyor..." : "✓ Ekle"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)}
              className="btn-press bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold px-5 py-2.5 rounded-xl transition text-sm">
              İptal
            </button>
          </div>
        </form>
      )}

      {/* User cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {users.map((u) => (
          <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-5 card-hover">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white ${
                  u.role === "admin"
                    ? "bg-gradient-to-br from-purple-400 to-violet-600"
                    : "bg-gradient-to-br from-blue-400 to-cyan-600"
                }`}>
                  {u.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">{u.fullName}</h3>
                  <p className="text-xs text-gray-400 font-mono">@{u.username}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                u.role === "admin" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
              }`}>
                {u.role === "admin" ? "YÖNETİCİ" : "ÇALIŞAN"}
              </span>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(u)}
                  className={`btn-press text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                    u.isActive ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-red-50 text-red-500 hover:bg-red-100"
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${u.isActive ? "bg-emerald-400" : "bg-red-400"}`}></span>
                  {u.isActive ? "Aktif" : "Pasif"}
                </button>
                <span className="text-[10px] text-gray-300">{new Date(u.createdAt).toLocaleDateString("tr-TR")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => { setPwUser(u); setPwValue(""); setPwError(""); }} title="Şifre Değiştir"
                  className="btn-press w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-500 flex items-center justify-center transition">
                  🔑
                </button>
                <button onClick={() => handleDelete(u)}
                  className="btn-press w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

      {/* Şifre değiştirme modalı */}
      {pwUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPwUser(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <form onSubmit={handleChangePassword} className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-4 text-center">
              <div className="text-3xl mb-1">🔑</div>
              <h3 className="text-base font-bold text-white">Şifre Değiştir</h3>
              <p className="text-white/80 text-sm font-semibold mt-0.5">{pwUser.fullName} (@{pwUser.username})</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="label-sm">Yeni Şifre</label>
                <input type="text" value={pwValue} onChange={(e) => setPwValue(e.target.value)} autoFocus
                  className="input-field text-sm" placeholder="Yeni şifre girin (en az 4 karakter)" />
              </div>
              {pwError && <p className="text-red-500 text-xs font-medium">⚠️ {pwError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setPwUser(null)} className="btn-press flex-1 py-2.5 border-2 border-gray-200 text-gray-500 font-semibold rounded-xl text-sm">Vazgeç</button>
                <button type="submit" disabled={pwLoading} className="btn-press flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl text-sm shadow-lg disabled:opacity-50">
                  {pwLoading ? "..." : "💾 Kaydet"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
