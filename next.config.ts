import type { NextConfig } from "next";
import createMDX from '@next/mdx'

/**
 * Cache strategy
 * --------------
 * The previous config sent `no-store, no-cache, must-revalidate` from `/:path*`
 * to EVERY response, including hashed `/_next/static` assets. That made every
 * JS/CSS chunk re-download on every navigation and defeated the CDN.
 *
 * It is replaced with a per-resource-type policy:
 *   - hashed build assets      -> immutable, 1 year (safe: URL content hash)
 *   - static public files      -> 7 days + stale-while-revalidate
 *   - service worker / manifest-> never cached (must always revalidate)
 *   - /api/**                  -> no-store (auth, session, mutations)
 *   - /admin/**                -> no-store + noindex (private UI)
 *   - everything else (HTML)   -> untouched, so Next/Vercel defaults apply
 *                                 (public pages are client-rendered shells)
 *
 * Note on /_next/image: the image optimizer is an internal Next route. Its
 * `Cache-Control: public, max-age=<images.minimumCacheTTL>, must-revalidate`
 * (+ `Vary: Accept`) is managed by the framework; defining a `headers()` rule
 * for it does not produce the intended value and can even make it worse, so no
 * entry is defined here. Verified on 16.1.1 with minimumCacheTTL=2592000:
 * response is `public, max-age=2592000, must-revalidate`, content-type
 * image/avif.
 */
const IMMUTABLE = 'public, max-age=31536000, immutable';
const NEVER = 'no-store, no-cache, must-revalidate, max-age=0';

const STATIC_PUBLIC = [
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/lmsy-logo.png',
  '/lmsy-main-visual.png',
  '/lmsy-001.jpg',
  '/hero-reveal.jpg',
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Every stored image_url points at the CDN; a `'**'` wildcard was both
    // unnecessary and risky (it would let any remote URL through the optimizer).
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.lmsy.space',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000, // 30 days
  },
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  async headers() {
    return [
      {
        // Content-hashed build output: safe to cache forever.
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: IMMUTABLE }],
      },
      ...STATIC_PUBLIC.map((source) => ({
        source,
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      })),
      {
        // Service worker must always be revalidated, otherwise updates stall.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
      {
        source: '/site.webmanifest',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
      {
        // API responses are user-specific, auth-bearing or mutations: never cache.
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: NEVER },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      {
        // Admin UI is private: never cache, never index.
        source: '/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: NEVER },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

const withMDX = createMDX({
  options: {},
})

export default withMDX(nextConfig)
