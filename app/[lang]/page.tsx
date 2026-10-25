/**
 * /<lang> — the same homepage as /, re-exported from the root route; the
 * provider seeds the language from the URL prefix. The root page reads hero
 * media on the server per request, so the shell keeps its force-dynamic
 * segment config. (Homepage metadata localization lands in step 6.)
 */
export const dynamic = 'force-dynamic';

export { default } from '../page';
