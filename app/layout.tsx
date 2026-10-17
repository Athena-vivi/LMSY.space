import type { Metadata } from "next";
// Fonts are bundled locally (npm packages) instead of next/font/google:
// build-time Google Fonts fetch is unreachable from this network (P8 root cause).
// CSS variable names stay identical, so globals.css and components are untouched.
import { GeistMono } from "geist/font/mono";
import "@fontsource-variable/inter";
import "@fontsource-variable/playfair-display";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";
import { ServiceWorkerProvider } from "@/components/service-worker-provider";
import { FrontendChrome } from "@/components/frontend-chrome";
import { AuthProvider } from "@/components/auth-provider";

const mono = GeistMono;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://lmsy.space'),
  title: {
    default: "LMSY | Lookmhee & Sonya Official Fan Site",
    template: "%s | LMSY Official Fan Site"
  },
  description: "Welcome to the official fan website for Thai GL duo LMSY (Lookmhee & Sonya) - Stars of Affair series. Explore profiles, gallery, projects, and schedule updates.",
  keywords: ["LMSY", "Lookmhee", "Sonya", "Affair", "Thai GL", "Girl's Love", "Lookmhee Sonya", "Affair Series", "Thai Drama", "GL Series"],
  authors: [{ name: "Astra", url: "https://lmsy.space" }],
  creator: "Astra",
  publisher: "lmsy.space",
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'LMSY | Lookmhee & Sonya Official Fan Site',
    description: 'Official fan website for Thai GL duo LMSY (Lookmhee & Sonya) - Stars of Affair series',
    siteName: 'LMSY Fan Site',
    images: [
      {
        url: '/lmsy-main-visual.png',
        width: 1200,
        height: 630,
        alt: 'LMSY - Lookmhee & Sonya',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMSY | Lookmhee & Sonya Official Fan Site',
    description: 'Official fan website for Thai GL duo LMSY (Lookmhee & Sonya) - Stars of Affair series',
    images: ['/lmsy-main-visual.png'],
    creator: '@lmsyofficial',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  category: 'entertainment',
};

/**
 * Runs before paint to align <html lang> with the visitor's stored language,
 * so non-English visitors do not get an English-configured document (a11y,
 * hyphenation, screen readers) nor a flash of the wrong language.
 */
const LANGUAGE_INIT_SCRIPT = `try{var l=localStorage.getItem('lmsy-language');if(l==='zh'||l==='th'||l==='en'){document.documentElement.lang=l;}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${mono.variable} antialiased`}
        style={{ backgroundColor: '#030303', color: 'rgba(255, 255, 255, 0.9)' }}
      >
        <script dangerouslySetInnerHTML={{ __html: LANGUAGE_INIT_SCRIPT }} />
        <ServiceWorkerProvider />
        <AuthProvider>
          <ThemeProvider defaultTheme="dark" storageKey="lmsy-theme">
            <LanguageProvider defaultLanguage="en">
              {/* Front-end chrome wraps route content: header above, footer below; hidden on /admin */}
              <FrontendChrome>
                <main className="flex-1">{children}</main>
              </FrontendChrome>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
