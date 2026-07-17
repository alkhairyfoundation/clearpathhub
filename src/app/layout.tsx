import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Providers from "@/components/Providers";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
};

export const metadata: Metadata = {
  title: {
    default: "ClearPath Edu Hub - School Management System",
    template: "%s | ClearPath Edu Hub",
  },
  description: "Complete school management system for ClearPath Edu Hub — academics, attendance, finance, and parent communication.",
  manifest: '/manifest.json',
  icons: [
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '96x96',
      url: '/icons/icon-96x96.png'
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '192x192',
      url: '/icons/icon-192x192.png'
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '512x512',
      url: '/icons/icon-512x512.png'
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      url: '/icons/icon-180x180.png'
    }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`
        }} />
      </head>
      <body className="antialiased bg-gray-50 dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}