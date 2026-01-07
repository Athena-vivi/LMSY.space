import type { Metadata } from "next";
import { Inter, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";
import { ServiceWorkerProvider } from "@/components/service-worker-provider";
import { ArchiveLoading } from "@/components/archive-loading";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const sans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const serif = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://lookmheesonya-forever.com'),
  title: {
    default: "LMSY | Lookmhee & Sonya Official Fan Site",
    template: "%s | LMSY Official Fan Site"
  },
  description: "Welcome to the official fan website for Thai GL duo LMSY (Lookmhee & Sonya) - Stars of Affair series. Explore profiles, gallery, projects, and schedule updates.",
  keywords: ["LMSY", "Lookmhee", "Sonya", "Affair", "Thai GL", "Girl's Love", "Lookmhee Sonya", "Affair Series", "Thai Drama", "GL Series"],
  authors: [{ name: "Astra", url: "https://lmsy.space" }],
  creator: "Astra",
  publisher: "lmsy.space",
  alternates: {
    canonical: '/',
    languages: {
      'en': '/en',
      'zh': '/zh',
      'th': '/th',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://lookmheesonya-forever.com',
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
  verification: {
    google: 'your-google-verification-code',
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

// Force dynamic rendering to prevent caching on custom domains
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${serif.variable} ${mono.variable} antialiased`}
      >
        <ArchiveLoading />
        <ServiceWorkerProvider />
        <ThemeProvider defaultTheme="light" storageKey="lmsy-theme">
          <LanguageProvider defaultLanguage="en">
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
