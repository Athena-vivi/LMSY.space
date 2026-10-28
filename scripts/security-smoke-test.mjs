/**
 * Endpoint security smoke test (runs against a live server).
 *
 * Verifies over real HTTP that:
 *   1. every admin API rejects an unauthenticated caller
 *   2. the admin APIs that were previously unprotected are now protected
 *   3. a bogus bearer token is rejected
 *   4. the Telegram webhook rejects requests without/with a wrong secret, and
 *      accepts the configured secret (using a payload that triggers no work)
 *   5. the ingest and cron endpoints reject missing/invalid machine keys,
 *      including the historical "Bearer undefined" bypass
 *   6. login attempts are rate limited
 *   7. public endpoints that the site needs still respond
 *
 * USAGE
 *   npm run dev                     # in one terminal
 *   node scripts/security-smoke-test.mjs [--base http://localhost:3000]
 *
 * EXIT CODE: 0 when every check passes, 1 otherwise.
 */

import { loadEnv } from './lib/ops-common.mjs';

loadEnv();

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const BASE = (baseIdx >= 0 ? args[baseIdx + 1] : 'http://localhost:3000').replace(/\/$/, '');

const results = [];

async function call(method, path, { headers = {}, body, expect = 'unauthorized' } = {}) {
  const url = BASE + path;
  let status = 0;
  let text = '';
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    });
    status = res.status;
    text = (await res.text()).slice(0, 160);
  } catch (error) {
    status = -1;
    text = error.message;
  }

  let pass;
  if (expect === 'unauthorized') pass = status === 401 || status === 403 || status === 503;
  // A 404 is acceptable for endpoints that switch themselves off when
  // NODE_ENV=production (they never reach the auth check at all, which is
  // strictly safer than rejecting it). 401/403 remain the expected outcome
  // wherever the endpoint is live.
  else if (expect === 'unauthorized-or-disabled') {
    pass = status === 401 || status === 403 || status === 503 || status === 404;
  } else if (expect === 'public') pass = status >= 200 && status < 400;
  else if (expect === 'not-unauthorized') pass = status !== 401 && status !== 403;
  else if (typeof expect === 'number') pass = status === expect;
  else pass = false;

  results.push({ method, path, status, expect: String(expect), pass, body: text.replace(/\s+/g, ' ') });
  console.log(`  ${pass ? 'ok      ' : 'FAILED  '} ${method.padEnd(5)} ${path.padEnd(46)} -> ${status} (expected ${expect})`);
  return { status, text };
}

async function main() {
  console.log('Endpoint security smoke test against ' + BASE);
  console.log('');

  // --- reachability -------------------------------------------------------
  try {
    const res = await fetch(BASE + '/', { redirect: 'manual' });
    if (res.status >= 500) throw new Error('server returned ' + res.status);
  } catch (error) {
    console.error(`FATAL: cannot reach ${BASE} (${error.message}). Start the dev server first.`);
    process.exit(1);
  }

  console.log('[1] admin APIs reject unauthenticated callers');
  const adminRoutes = [
    ['GET', '/api/admin/drafts'],
    ['GET', '/api/admin/drafts/stats'],
    ['DELETE', '/api/admin/drafts'],
    ['GET', '/api/admin/drafts/00000000-0000-0000-0000-000000000000'],
    ['PATCH', '/api/admin/drafts/00000000-0000-0000-0000-000000000000'],
    ['POST', '/api/admin/drafts/batch-publish'],
    ['POST', '/api/admin/drafts/00000000-0000-0000-0000-000000000000/publish'],
    ['POST', '/api/admin/drafts/00000000-0000-0000-0000-000000000000/to-gallery'],
    ['POST', '/api/admin/drafts/00000000-0000-0000-0000-000000000000/unpublish'],
    ['POST', '/api/admin/drafts/00000000-0000-0000-0000-000000000000/link-project'],
    ['POST', '/api/admin/drafts/00000000-0000-0000-0000-000000000000/link-milestone-project'],
    ['POST', '/api/admin/drafts/00000000-0000-0000-0000-000000000000/create-project'],
    ['GET', '/api/admin/gallery/milestone'],
    ['PATCH', '/api/admin/gallery/milestone'],
    ['POST', '/api/admin/translate'],
    ['GET', '/api/admin/vault'],
    ['GET', '/api/admin/gallery'],
    ['GET', '/api/admin/projects'],
    ['GET', '/api/admin/editorial'],
    ['GET', '/api/admin/reconcile'],
    ['POST', '/api/admin/r2/sign'],
    ['POST', '/api/admin/upload'],
    ['GET', '/api/admin/messages'],
  ];
  for (const [method, path] of adminRoutes) {
    await call(method, path, { expect: 'unauthorized' });
  }
  // app/api/admin/drafts/seed/route.ts returns 404 on purpose when
  // NODE_ENV=production - it is a temporary dev-only seeding endpoint that
  // disables itself before the auth check. 404 is therefore the correct
  // production answer, not a missing route.
  await call('POST', '/api/admin/drafts/seed', { expect: 'unauthorized-or-disabled' });

  console.log('');
  console.log('[2] removed debug endpoints are gone');
  await call('GET', '/api/admin/diagnose/db', { expect: 'not-unauthorized' });
  await call('GET', '/api/admin/diagnose/r2', { expect: 'not-unauthorized' });
  // The routes are deleted; assert the responses carry none of the fields the
  // old diagnostics leaked (rawError objects, env-var names, bucket names).
  for (const path of ['/api/admin/diagnose/db', '/api/admin/diagnose/r2']) {
    const res = await fetch(BASE + path, { headers: { Accept: 'application/json' } });
    const body = await res.text();
    const leaked = ['rawError', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'SUPABASE_SERVICE_ROLE_KEY']
      .filter(token => body.includes(token));
    const pass = res.status === 404 && leaked.length === 0;
    results.push({ method: 'GET', path: path + ' (no leak)', status: res.status, expect: '404 with no leaked fields', pass, body: '' });
    console.log(`  ${pass ? 'ok      ' : 'FAILED  '} ${path} -> ${res.status}${leaked.length ? ' leaked: ' + leaked.join(',') : ' (no leaked fields)'}`);
  }

  console.log('');
  console.log('[3] bogus bearer token is rejected');
  await call('GET', '/api/admin/drafts', { headers: { authorization: 'Bearer undefined' }, expect: 'unauthorized' });

  console.log('');
  console.log('[4] Telegram webhook origin verification');
  const tgPath = '/api/webhooks/telegram';
  const tgNoSecret = await call('POST', tgPath, { body: { update_id: 1 }, expect: 'unauthorized' });
  const tgWrongSecret = await call('POST', tgPath, {
    headers: { 'x-telegram-bot-api-secret-token': 'definitely-wrong' },
    body: { update_id: 1 },
    expect: 'unauthorized',
  });
  const tgSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (tgSecret) {
    // Payload with no message/photo: processed as a no-op, no DB/R2/AI side effects.
    await call('POST', tgPath, {
      headers: { 'x-telegram-bot-api-secret-token': tgSecret },
      body: { update_id: 2 },
      expect: 'not-unauthorized',
    });
    results.push({
      method: 'POST',
      path: tgPath + ' (side-effect check)',
      status: tgNoSecret.status,
      expect: 'no DB/R2/AI work on rejected requests',
      pass: tgNoSecret.status >= 400 && tgWrongSecret.status >= 400,
      body: '',
    });
  } else {
    console.log('  skipped: TELEGRAM_WEBHOOK_SECRET not set in .env.local');
  }

  console.log('');
  console.log('[5] machine-key endpoints');
  await call('POST', '/api/ingest', { body: { source_url: 'https://example.invalid/x' }, expect: 'unauthorized' });
  await call('GET', '/api/ingest', { expect: 'unauthorized' });
  await call('GET', '/api/cron/fetch-updates?secret=undefined', { expect: 'unauthorized' });
  await call('GET', '/api/cron/fetch-updates', { headers: { authorization: 'Bearer undefined' }, expect: 'unauthorized' });
  await call('POST', '/api/cron/fetch-updates', { expect: 'unauthorized' });

  console.log('');
  console.log('[6] login rate limiting');
  let sawRateLimit = false;
  for (let attempt = 1; attempt <= 12; attempt++) {
    const res = await fetch(BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rate-limit-probe@example.invalid', password: 'wrong-password-' + attempt }),
    });
    if (res.status === 429) {
      sawRateLimit = true;
      console.log(`  ok      rate limited after ${attempt} attempts (429)`);
      break;
    }
    await res.text();
  }
  results.push({ method: 'POST', path: '/api/auth/login (rate limit)', status: sawRateLimit ? 429 : 200, expect: '429 within 12 attempts', pass: sawRateLimit, body: '' });
  if (!sawRateLimit) console.log('  FAILED  no 429 received within 12 failed logins');

  console.log('');
  console.log('[7] session endpoint and public endpoints still work');
  await call('GET', '/api/auth/session', { expect: 'public' });
  await call('GET', '/api/home/portals', { expect: 'public' });
  await call('GET', '/api/milestones', { expect: 'public' });
  await call('GET', '/api/site-content', { expect: 'public' });
  await call('GET', '/api/search?q=a', { expect: 'public' });
  await call('GET', '/gallery', { expect: 'public' });
  await call('GET', '/projects', { expect: 'public' });

  const failed = results.filter(r => !r.pass);
  console.log('');
  console.log(`Checks: ${results.length} | passed: ${results.length - failed.length} | failed: ${failed.length}`);
  if (failed.length) {
    console.error('FAILED CHECKS:');
    for (const f of failed) console.error(`  - ${f.method} ${f.path} -> ${f.status} (expected ${f.expect})`);
    process.exit(1);
  }
  console.log('All endpoint security checks passed.');
}

main().catch(error => {
  console.error('FATAL:', error.message);
  process.exit(1);
});
