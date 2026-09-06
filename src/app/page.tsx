"use client";

import { useState, useEffect } from "react";
import LoginPage from "@/components/LoginPage";
import Dashboard from "@/components/Dashboard";

export interface AppUser {
  id: number;
  username: string;
  fullName: string;
  role: "admin" | "employee";
}

export default function Home() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try { await fetch("/api/seed", { method: "POST" }); } catch {}
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) { const d = await res.json(); setUser(d.user); }
    } catch {}
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900">
        <div className="text-center animate-fade-in">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-400 to-green-600 animate-spin-slow opacity-50 blur-lg"></div>
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
          </div>
          <p className="text-emerald-300 text-sm font-semibold tracking-widest uppercase">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage onLogin={setUser} />;
  return <Dashboard user={user} onLogout={async () => { await fetch("/api/auth/logout", { method: "POST" }); setUser(null); }} />;
}
