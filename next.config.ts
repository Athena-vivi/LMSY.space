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
  /**
   * Legacy URL compatibility (phase 7).
   *
   * The seven retired entry points stay reachable, but as real 308s from the
   * edge rather than as prerendered pages that ship a meta-refresh body. The
   * page-level `redirect()` calls are kept as a fallback; these rules are the
   * ones visitors and crawlers actually hit.
   *
   * `/exhibitions/category/:type` forwards the raw old type (`series`,
   * `magazine`, ...) and lets lib/category-registry.ts normalise it, so one
   * rule covers every historical spelling and unknown values fall back to the
   * unfiltered index instead of 404ing.
   *
   * Query strings are preserved by Next when the destination has no query of
   * its own, which is what keeps `/chronicle?year=2024` working.
   */
  async redirects() {
    return [
      // /exhibitions/category/<type> is handled by its page, which translates
      // the legacy type through the registry and sends it to whichever door
      // owns that hall now. A static rule here could only point at /projects,
      // which no longer lists the five homepage halls.
      { source: '/exhibitions', destination: '/projects', permanent: true },
      { source: '/chronicle', destination: '/timeline', permanent: true },
      // /editorial/<slug> is a real page again (2026-10-21): the issue is the
      // entry, and an entry owns an address of its own. The old rule sent every
      // issue to /projects/<id>, which is no longer where it lives.
      { source: '/profiles', destination: '/people', permanent: true },
      { source: '/profiles/:id', destination: '/people/:id', permanent: true },
      // Door 1 moved to its own front door (2026-10-21). The three series keep
      // one canonical address each; /projects/<slug> for a drama_work row now
      // redirects, so no series exists under two URLs.
      { source: '/projects/affair', destination: '/dramas/affair', permanent: true },
      { source: '/projects/harmony-secret', destination: '/dramas/harmony-secret', permanent: true },
      { source: '/projects/hometown-romance', destination: '/dramas/hometown-romance', permanent: true },
    ];
  },

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
