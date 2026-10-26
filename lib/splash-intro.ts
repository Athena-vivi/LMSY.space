/**
 * The intro splash is an entry moment, not a page transition.
 *
 * Two separate questions have to be answered here, and they used to be answered
 * by one shared flag - which is why the door kept opening again on every return
 * to the homepage:
 *
 *   1. "Is this a document load that has never seen the door?" - the answer has
 *      to be readable BEFORE the first paint, otherwise the black overlay
 *      flashes on every language switch. That is what the inline script in each
 *      root layout is for: it reads storage and marks <html>, and globals.css
 *      hides the overlay for that attribute.
 *
 *   2. "Has the door already opened in THIS document?" - a client-side return to
 *      the homepage (from /timeline, from a door page) re-mounts the wrapper
 *      without reloading the document. The <html> attribute was never set,
 *      because at first load there was nothing in storage yet, so the overlay
 *      rendered again and the whole intro replayed. The component therefore
 *      hides its own curtain in a layout effect when this tab has already
 *      played - before paint, so nothing flashes.
 *
 * Storage is the shared answer to (1) and (2): written when the hold ends, read
 * before paint on the next document load, read again on every remount.
 * sessionStorage means "this tab", i.e. one door per visit - closing the tab and
 * coming back opens it again, reloading the page does not.
 */
export const SPLASH_STORAGE_KEY = 'lmsy-splash-seen';

/** Runs synchronously at the top of <body>, before the splash is parsed. */
export const SPLASH_INIT_SCRIPT = `try{if(sessionStorage.getItem('${SPLASH_STORAGE_KEY}')==='1'){document.documentElement.setAttribute('data-splash','seen');}}catch(e){}`;

/** True when this tab has already played the intro. Never throws. */
export function hasPlayedSplash(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Remembers that the door has opened in this tab. Private-mode storage failures
 * are ignored: the intro then plays again on the next document load, but the
 * in-document check still prevents a replay on client-side navigation.
 *
 * Deliberately does NOT set the <html> attribute: the attribute is what hides
 * the overlay before paint, and setting it here would kill the curtain
 * mid-fade. It only matters at the next document load, where the inline script
 * reads storage and sets it.
 */
export function markSplashPlayed(): void {
  try {
    sessionStorage.setItem(SPLASH_STORAGE_KEY, '1');
  } catch {
    /* storage blocked: the splash simply plays again next time */
  }
}
