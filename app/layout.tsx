import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./room.css";

export const metadata: Metadata = {
  title: "Ex Libris: your reading shelf",
  description: "A private online bookshelf and reading journal for the books you've finished.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2320" },
  ],
};

// Sets the dark class before first paint so there's no flash of the wrong theme.
const themeScript = `(function(){try{var m=localStorage.getItem('exlibris:mode')||'system';var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://fonts.googleapis.com/css2?family=Gloock&family=JetBrains+Mono:wght@400;500&family=Libre+Franklin:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
