/**
 * Shared helpers for the local operations scripts.
 * Loads .env.local into process.env without printing any values.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, dirname } from 'path';

export function loadEnv(projectRoot = process.cwd()) {
  const path = resolve(projectRoot, '.env.local');
  if (!existsSync(path)) {
    console.error('FATAL: .env.local not found at ' + path);
    process.exit(1);
  }
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && value) process.env[key] = value;
  }
}

export function requireEnv(names) {
  const missing = names.filter(n => !process.env[n]);
  if (missing.length) {
    console.error('FATAL: missing required environment variables: ' + missing.join(', '));
    process.exit(1);
  }
}

export function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '');
}

export function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  return path;
}

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function writeJson(path, data) {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(data, null, 1), 'utf-8');
}

/** Convert an absolute or relative path to a path relative to the repo root. */
export function rel(p, root = process.cwd()) {
  return p.replace(root, '').replace(/\\/g, '/').replace(/^\//, '');
}
