"use client";

import { useState, useEffect } from "react";

interface LoginLog {
  id: number;
  userId: number;
  loginAt: string;
  ipAddress: string | null;
  fullName: string | null;
  username: string | null;
}

export default function LoginLogsPanel() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/login-logs");
        if (res.ok) setLogs(await res.json());
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-xl shimmer"></div>
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-1/4 shimmer rounded"></div>
                <div className="h-2.5 w-1/3 shimmer rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Giriş Kayıtları</h2>
          <p className="text-sm text-gray-400 mt-0.5">Son 100 giriş kaydı</p>
        </div>
        <div className="bg-violet-50 px-4 py-2 rounded-xl">
          <span className="text-sm font-bold text-violet-600">{logs.length} kayıt</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {logs.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4 animate-float">📝</div>
              <p className="text-gray-400 font-medium">Henüz giriş kaydı yok</p>
            </div>
          ) : (
            logs.map((log, idx) => (
              <div key={log.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors flex items-center gap-4 table-row-enter"
                style={{ animationDelay: `${idx * 20}ms` }}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {(log.fullName || "?").charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-800">{log.fullName || "—"}</div>
                  <div className="text-xs text-gray-400 font-mono">@{log.username || "—"}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-semibold text-gray-500">
                    {new Date(log.loginAt).toLocaleString("tr-TR")}
                  </div>
                  <div className="text-[10px] text-gray-300 font-mono mt-0.5">{log.ipAddress || "—"}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
