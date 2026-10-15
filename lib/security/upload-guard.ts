/**
 * Server-side upload validation.
 *
 * The existing lib/security/file-validator.ts only runs in the browser and
 * therefore cannot be trusted: any client can call the API directly.
 * This module is the authoritative check and must be used by every upload
 * entry point (multipart upload, presigned URL registration, ingest).
 *
 * Policy:
 * - Size limit enforced on the server (in addition to any client-side check).
 * - MIME allowlist. SVG is intentionally NOT allowed: it is an active content
 *   type (scripts, external references) and this site only serves photos.
 * - Magic-byte sniffing so a renamed file cannot smuggle another format.
 * - Object-key sanity check to block path traversal into other prefixes.
 */

export const UPLOAD_POLICY = {
  maxFileSizeBytes: 50 * 1024 * 1024, // 50MB per file
  maxFilenameLength: 180,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
  ],
} as const;

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

const MAGIC_SIGNATURES: Array<{ mime: string; test: (bytes: Uint8Array) => boolean }> = [
  { mime: 'image/jpeg', test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', test: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: 'image/gif', test: b => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  {
    mime: 'image/webp',
    test: b =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  {
    mime: 'image/avif',
    // ISO-BMFF: ....ftyp{avif|avis|mif1}
    test: b => {
      const brand = String.fromCharCode(...Array.from(b.slice(8, 12)));
      return brand === 'ftyp';
    },
  },
];

/** Sniff the real type from the first bytes. Returns null when unknown. */
export function sniffImageMime(bytes: Uint8Array): string | null {
  for (const sig of MAGIC_SIGNATURES) {
    if (sig.test(bytes)) return sig.mime;
  }
  return null;
}

export function isAllowedMimeType(mime: string | null | undefined): boolean {
  if (!mime) return false;
  return (UPLOAD_POLICY.allowedMimeTypes as readonly string[]).includes(mime.toLowerCase());
}

/**
 * Validate an uploaded File: size, declared type, and real content type.
 * Reads only the first 16 bytes for sniffing.
 */
export async function validateUploadFile(file: File | null | undefined): Promise<UploadValidationResult> {
  if (!file || typeof file === 'string') {
    return { ok: false, error: 'No file provided', status: 400 };
  }

  if (file.size <= 0) {
    return { ok: false, error: 'Uploaded file is empty', status: 400 };
  }

  if (file.size > UPLOAD_POLICY.maxFileSizeBytes) {
    const maxMb = Math.round(UPLOAD_POLICY.maxFileSizeBytes / 1024 / 1024);
    return { ok: false, error: `File too large (max ${maxMb}MB)`, status: 413 };
  }

  if (!isAllowedMimeType(file.type)) {
    return {
      ok: false,
      error: `Unsupported file type. Allowed: ${UPLOAD_POLICY.allowedMimeTypes.join(', ')}`,
      status: 415,
    };
  }

  try {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const sniffed = sniffImageMime(head);
    if (!sniffed) {
      return { ok: false, error: 'File content does not look like a supported image', status: 415 };
    }
    if (!isAllowedMimeType(sniffed)) {
      return { ok: false, error: 'File content type is not allowed', status: 415 };
    }
  } catch {
    return { ok: false, error: 'Could not read uploaded file', status: 400 };
  }

  return { ok: true };
}

/**
 * Validate a client-supplied object key before signing/using it.
 * Blocks traversal and forces the key into an expected prefix.
 */
export function validateObjectKey(key: string, allowedPrefixes: string[]): UploadValidationResult {
  if (!key || typeof key !== 'string') {
    return { ok: false, error: 'Object key is required', status: 400 };
  }
  const normalized = key.replace(/\\/g, '/').trim();
  if (normalized.length > 512) {
    return { ok: false, error: 'Object key is too long', status: 400 };
  }
  if (normalized.includes('..') || normalized.startsWith('/') || normalized.includes('//')) {
    return { ok: false, error: 'Invalid object key', status: 400 };
  }
  if (!allowedPrefixes.some(prefix => normalized.startsWith(prefix))) {
    return { ok: false, error: 'Object key is outside the allowed upload prefixes', status: 400 };
  }
  return { ok: true };
}

/** Strip directory components and unsafe characters from a filename. */
export function sanitizeFilename(name: string | null | undefined): string {
  const base = (name || 'upload').replace(/\\/g, '/').split('/').pop() || 'upload';
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/^[.-]+/, '')
    .slice(0, UPLOAD_POLICY.maxFilenameLength);
  return cleaned || 'upload';
}
