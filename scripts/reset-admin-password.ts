/**
 * Reset Admin Password Script
 * Run with: npx tsx scripts/reset-admin-password.ts [email] [--out <path>]
 *
 * SECURITY RULES (do not weaken):
 * - The generated plaintext password MUST NEVER be committed to the repository.
 * - It MUST NEVER be printed to stdout/stderr; this script writes it to a 0600
 *   file and prints only the file path and a masked hint.
 * - It MUST be delivered to the admin OUT-OF-BAND (never via chat, email body,
 *   or any shared or logged channel).
 * - After delivery the operator MUST move it into the owner password manager
 *   and then delete the generated file.
 * - The output file lives under backups/, which is already gitignored.
 *
 * This script uses the Supabase Admin Client to reset a user's password.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { randomBytes } from 'node:crypto';

// Load .env.local
function loadEnvFile() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          process.env[key] = value;
        }
      }
    });

    console.log('✅ Loaded .env.local');
  } catch (error) {
    console.error('❌ Could not load .env.local:', error);
    process.exit(1);
  }
}

loadEnvFile();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

// Validate environment variables
if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase admin client
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Get user by email using Supabase Admin API
 */
async function getUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return data.users.find((u: any) => u.email === email);
}

/**
 * Update user password using Supabase Admin API
 */
async function updateUserPassword(userId: string, newPassword: string) {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    throw new Error(`Failed to update password: ${error.message}`);
  }

  return data;
}

// Character classes with ambiguous glyphs removed (no 0/O/o, 1/l/I).
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*-_=+';
const ALL_CHARS = LOWER + UPPER + DIGITS + SYMBOLS;

/**
 * Uniformly random integer in [0, max) using rejection sampling.
 * Avoids the modulo bias of (randomByte % max).
 */
function randomIndex(max: number): number {
  const limit = Math.floor(256 / max) * max;
  let byte = 0;
  do {
    byte = randomBytes(1)[0];
  } while (byte >= limit);
  return byte % max;
}

function pick(alphabet: string): string {
  return alphabet.charAt(randomIndex(alphabet.length));
}

/**
 * Generate a crypto-random password with guaranteed character-class coverage.
 * At least 16 chars, mixed classes, no ambiguous characters.
 */
function generatePassword(length: number = 20): string {
  const chars: string[] = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < length) {
    chars.push(pick(ALL_CHARS));
  }
  // Fisher-Yates shuffle so the required-class chars are not in a fixed order.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }
  return chars.join('');
}

/**
 * Write the plaintext password to a 0600 file. The plaintext is never logged.
 */
function writePasswordFile(filePath: string, email: string, password: string): string {
  const absolutePath = resolve(process.cwd(), filePath);
  const dir = dirname(absolutePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  const content = [
    'LMSY admin password reset',
    '',
    `Email:      ${email}`,
    `Password:   ${password}`,
    `Generated:  ${new Date().toISOString()}`,
    '',
    'Move this password into the owner password manager, then delete this file.',
    '',
  ].join('\n');
  writeFileSync(absolutePath, content, { mode: 0o600 });
  return absolutePath;
}

function defaultOutputPath(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `backups/admin-password-${stamp}.txt`;
}

async function main() {
  console.log('\n=== Admin Password Reset Tool ===\n');

  // Parse args: optional positional email plus optional --out <path>.
  const argv = process.argv.slice(2);
  let outPath: string | null = null;
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') {
      outPath = argv[i + 1] || null;
      i++;
    } else {
      positionals.push(argv[i]);
    }
  }

  const email = positionals[0] || ADMIN_EMAIL;

  if (!email) {
    console.error('❌ No email provided. Usage: npx tsx scripts/reset-admin-password.ts [email] [--out <path>]');
    process.exit(1);
  }

  console.log(`📧 Target email: ${email}\n`);

  try {
    // Step 1: Find the user
    console.log('🔍 Looking up user...');
    const user = await getUserByEmail(email);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.log('\n💡 Tip: You may need to create the user first via Supabase Dashboard');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString('zh-CN')}`);
    console.log(`   Last sign in: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-CN') : 'Never'}`);

    // Step 2: Generate new password (CSPRNG; plaintext is never printed).
    const newPassword = generatePassword(20);
    const maskedHint = `${newPassword.slice(0, 2)}***`;
    console.log('\nGenerated a new password (20 characters, CSPRNG).');

    // Step 3: Update password
    console.log('\nUpdating password...');
    const result = await updateUserPassword(user.id, newPassword);

    // Step 4: Deliver the plaintext out-of-band via a 0600 file.
    const targetPath = outPath || defaultOutputPath();
    const absolutePath = writePasswordFile(targetPath, email, newPassword);

    console.log('\nPassword reset successful.\n');
    console.log('---------------------------------------------------');
    console.log(`  Email:         ${email}`);
    console.log(`  Password hint: ${maskedHint}`);
    console.log(`  Password file: ${absolutePath}`);
    console.log('---------------------------------------------------');
    console.log('\nWARNING: the plaintext password was written to the file above.');
    console.log('Move it into the owner password manager, deliver it OUT-OF-BAND to');
    console.log('the admin, then DELETE the file. Never commit or paste the password.');
    console.log(`\nLogin at: ${SUPABASE_URL!.replace('https://', 'https://').replace('/auth/v1', '')}/auth/login\n`);

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Uncaught error:', error);
  process.exit(1);
});
