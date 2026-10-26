// Fonts are bundled locally (npm packages) instead of next/font/google:
// build-time Google Fonts fetch is unreachable from this network (P8 root cause).
// CSS variable names stay identical, so globals.css and components are untouched.
import { GeistMono } from 'geist/font/mono';
import '@fontsource-variable/inter';
import '@fontsource-variable/playfair-display';
import '../globals.css';
import { SiteChrome } from '@/components/site-chrome';
import { siteMetadata } from '@/lib/site-metadata';

const mono = GeistMono;

/**
 * Root layout for the English site — the unprefixed routes (/, /editorial, ...).
 *
 * The language-prefixed routes have their own root layout in app/[lang]/,
 * because <html lang> can only be set by a root layout and a Portuguese page
 * must not ship lang="en". Both layouts render the same SiteChrome and the
 * same metadata builder, so the two cannot drift apart.
 */
export const metadata = siteMetadata('en');

/**
 * Runs before paint to align <html lang> with a stored preference. Only needed
 * here: on unprefixed routes the URL says nothing about the visitor's
 * language, so the stored preference decides. Prefixed routes already get the
 * right lang from the server.
 */
const LANGUAGE_INIT_SCRIPT = `try{var l=localStorage.getItem('lmsy-language');if(l==='zh'||l==='th'||l==='es'||l==='pt'||l==='en'){document.documentElement.lang=l;}}catch(e){}`;

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
        <SiteChrome lang="en">{children}</SiteChrome>
      </body>
    </html>
  );
}
