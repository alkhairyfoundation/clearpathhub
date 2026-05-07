import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Providers from "@/components/Providers";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
      sizes: '192x192',
      url: '/icons/icon-192x192.png'
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      url: '/icons/icon-192x192.png'
    }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        <Providers>{children}</Providers>
        <Script id="sw-register" strategy="lazyOnload">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  })
                  .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}