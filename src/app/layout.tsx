import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "İş Takip Sistemi",
  description: "Profesyonel İş Yönetim ve Takip Platformu — v2.0 Online & Offline",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/api/icon?size=32", apple: "/api/icon?size=192" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "İş Takip",
    startupImage: "/icon-512.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#059669" },
    { media: "(prefers-color-scheme: dark)", color: "#065f46" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('ist_theme')||'light';var e=document.documentElement;e.setAttribute('data-theme',t);if(t!=='light')e.classList.add('theme-dark');}catch(x){}" }} />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

        {/* PWA: Tam ekran, tarayıcı çubuğu gizle */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <link rel="apple-touch-icon" href="/api/icon?size=192" />
        <link rel="apple-touch-icon" sizes="512x512" href="/api/icon?size=512" />

        {/* Android TWA / PWA için */}
        <meta name="theme-color" content="#059669" />
        <meta name="application-name" content="İş Takip" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="text-gray-900 antialiased overscroll-none" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
