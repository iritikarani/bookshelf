import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./room.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  applicationName: SITE_NAME,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  icons: { icon: `${base}/icon.svg`, apple: `${base}/apple-touch-icon.png` },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME}: ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_IN",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "SelfShelf: a virtual bookshelf with colourful book spines" }],
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME}: ${SITE_TAGLINE}`, description: SITE_DESCRIPTION, images: ["/og.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Android Chrome: the on-screen keyboard shrinks the page instead of covering it.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2320" },
  ],
};

// Sets the dark class before first paint so there's no flash of the wrong theme.
const themeScript = `(function(){try{var m=localStorage.getItem('exlibris:mode')||'system';var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

// Marks returning readers (a saved sign-in or a guest shelf) before first paint, so they see the
// splash rather than a flash of the landing page that newcomers and search engines get.
const hasAccounts = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const sessionScript = `(function(){try{var s=${hasAccounts ? "false" : "true"};if(!s){if(localStorage.getItem('exlibris:guest')==='1')s=true;else for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&/^sb-.*-auth-token$/.test(k)){s=true;break;}}}if(s)document.documentElement.classList.add('has-session');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: sessionScript }} />
        {/* Open the connections to the book catalogues and cover server early. */}
        <link rel="preconnect" href="https://covers.openlibrary.org" />
        <link rel="preconnect" href="https://openlibrary.org" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://books.google.com" />
        {process.env.NEXT_PUBLIC_SUPABASE_URL && <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Gloock&family=JetBrains+Mono:wght@400;500&family=Libre+Franklin:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
