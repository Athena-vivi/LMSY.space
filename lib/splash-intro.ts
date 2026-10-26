/**
 * The intro splash is an entry moment, not a page transition.
 *
 * Switching language between / and /zh is a FULL document load, not a client
 * transition: the two live under different root layouts (app/(en)/ and
 * app/[lang]/), and React remounts from scratch. Any in-memory flag is lost,
 * so "already played" has to survive a reload - sessionStorage, one value per
 * tab.
 *
 * The read has to happen before the browser paints, otherwise the black
 * overlay appears for a frame and then vanishes on every language switch. A
 * blocking inline script in each root layout sets the attribute on <html>,
 * and globals.css hides the overlay when it is there. React keeps rendering
 * the splash in both cases, so server and client markup still match.
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
 * Remembers that the intro played. Private-mode storage failures are ignored.
 *
 * Deliberately does NOT set the <html> attribute: the attribute is what hides
 * the overlay, and setting it here would kill the splash mid-animation on the
 * very visit that is supposed to show it. It only matters at the next document
 * load, where the inline script reads storage and sets it before paint.
 */
export function markSplashPlayed(): void {
  try {
    sessionStorage.setItem(SPLASH_STORAGE_KEY, '1');
  } catch {
    /* storage blocked: the splash simply plays again next time */
  }
}
