/**
 * URL guard for server-side media downloads (remediation B2-T5, audit P2-3).
 *
 * WHY: /api/ingest downloads whatever media URL the caller presents. Without
 * a guard, a key holder could point it at loopback / private / cloud-metadata
 * addresses and use the server as an SSRF probe.
 *
 * WHAT THIS BLOCKS
 *   - non-HTTP(S) protocols (file:, gopher:, ...)
 *   - IP literals in loopback / private / link-local / carrier-NAT /
 *     reserved ranges (IPv4 and IPv6, including IPv4-mapped IPv6)
 *   - well-known metadata hostnames (localhost, metadata.google.internal, ...)
 *
 * WHAT THIS DOES NOT COVER (accepted for this phase, see REMEDIATION_PLAN
 * B2-T5 / B3-T2)
 *   - DNS rebinding: a public hostname that resolves to a private IP is not
 *     detected here (the fetch layer connects to the resolved address).
 *     Closing that gap needs resolve-then-connect or an egress proxy.
 *   - A domain allowlist: deferred until the browser-extension question
 *     (P1-6 / B3-T2) settles, because the set of legitimate ingest sources
 *     cannot be enumerated while an entry point's source is unknown.
 *
 * Callers MUST also re-check every redirect hop (see downloadMedia), which is
 * why the check is a pure function over a URL string.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata',
  'instance-data',
  'metadata.google.internal',
]);

const BLOCKED_DOMAIN_SUFFIXES = ['.localhost', '.internal', '.local', '.localdomain'];

/** IPv4 CIDR ranges that must never be fetched server-side. */
const BLOCKED_IPV4_RANGES: Array<[number, number]> = [
  // [network as 32-bit int, prefix length]
  cidr('0.0.0.0', 8), // "this network"
  cidr('10.0.0.0', 8), // RFC1918 private
  cidr('100.64.0.0', 10), // carrier-grade NAT
  cidr('127.0.0.0', 8), // loopback
  cidr('169.254.0.0', 16), // link-local incl. cloud metadata (169.254.169.254)
  cidr('172.16.0.0', 12), // RFC1918 private
  cidr('192.0.0.0', 24), // IETF protocol assignments
  cidr('192.0.2.0', 24), // TEST-NET-1
  cidr('192.168.0.0', 16), // RFC1918 private
  cidr('198.18.0.0', 15), // benchmarking
  cidr('198.51.100.0', 24), // TEST-NET-2
  cidr('203.0.113.0', 24), // TEST-NET-3
  cidr('224.0.0.0', 4), // multicast
  cidr('240.0.0.0', 4), // reserved
];

function cidr(base: string, prefix: number): [number, number] {
  return [ipv4ToInt(base), prefix];
}

function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return -1;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export interface UrlGuardResult {
  blocked: boolean;
  reason?: string;
}

function guardIpv4(ip: string): UrlGuardResult {
  const value = ipv4ToInt(ip);
  if (value === -1) return { blocked: true, reason: 'malformed IPv4 address' };
  for (const [network, prefix] of BLOCKED_IPV4_RANGES) {
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    if ((value & mask) === (network & mask)) {
      return { blocked: true, reason: `IPv4 address in blocked range ${ip}` };
    }
  }
  return { blocked: false };
}

function guardIpv6(host: string): UrlGuardResult {
  const lower = host.toLowerCase().replace(/^\[|\]$/g, '');
  // IPv4-mapped / IPv4-compatible (::ffff:a.b.c.d). WHATWG URL normalizes the
  // address to hex form (e.g. ::ffff:127.0.0.1 becomes ::ffff:7f00:1), so both
  // the dotted and the hex spelling must be recognized.
  const mapped = lower.match(/^::ffff:(.+)$/);
  if (mapped) {
    const tail = mapped[1];
    if (/^\d+\.\d+\.\d+\.\d+$/.test(tail)) {
      return guardIpv4(tail);
    }
    const hexParts = tail.split(':');
    if (hexParts.length === 2 && hexParts.every((p) => /^[0-9a-f]{1,4}$/.test(p))) {
      const value = ((parseInt(hexParts[0], 16) << 16) | parseInt(hexParts[1], 16)) >>> 0;
      const dotted = [
        (value >>> 24) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 8) & 0xff,
        value & 0xff,
      ].join('.');
      return guardIpv4(dotted);
    }
    return { blocked: true, reason: 'IPv4-mapped IPv6 address in unrecognized form' };
  }
  const compressed = lower.replace(/(^|:)0+([0-9a-f])/g, '$1$2');
  if (compressed === '::1' || compressed === '::') {
    return { blocked: true, reason: 'IPv6 loopback/unspecified address' };
  }
  if (/^f[cd][0-9a-f]{2}:/.test(compressed)) {
    return { blocked: true, reason: 'IPv6 unique-local address (fc00::/7)' };
  }
  if (/^fe[89ab][0-9a-f]:/.test(compressed)) {
    return { blocked: true, reason: 'IPv6 link-local address (fe80::/10)' };
  }
  return { blocked: false };
}

/** Pure check: may this URL be fetched from the server? */
export function isBlockedMediaUrl(rawUrl: string): UrlGuardResult {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { blocked: true, reason: 'unparseable URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { blocked: true, reason: `unsupported protocol ${parsed.protocol}` };
  }

  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (host.startsWith('[') && host.endsWith(']')) {
    return guardIpv6(host);
  }

  if (BLOCKED_HOSTNAMES.has(host) || BLOCKED_DOMAIN_SUFFIXES.some((s) => host.endsWith(s))) {
    return { blocked: true, reason: `blocked hostname ${host}` };
  }

  // Plain IPv4 literal (URL.hostname keeps it as written)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return guardIpv4(host);
  }

  // Decimal / octal / hex integer forms of IPv4 (e.g. http://2130706433/)
  if (/^\d{8,10}$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
    const asInt = Number(host);
    if (Number.isInteger(asInt) && asInt >= 0 && asInt <= 0xffffffff) {
      const dotted = [
        (asInt >>> 24) & 0xff,
        (asInt >>> 16) & 0xff,
        (asInt >>> 8) & 0xff,
        asInt & 0xff,
      ].join('.');
      return guardIpv4(dotted);
    }
  }

  return { blocked: false };
}
