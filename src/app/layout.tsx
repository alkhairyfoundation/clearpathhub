import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClearPath Edu Hub - School Management System",
  description: "Comprehensive school management system for ClearPath Edu Hub",
  viewport: 'width=device-width, initial-scale=1',
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
      <body className="antialiased bg-gray-50">{children}</body>
      {/* Service Worker Registration */}
      <script id="sw-register" dangerouslySetInnerHTML={{ __html: `
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
      ` }} />
    </html>
  );
}